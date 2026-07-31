import path from 'path';
import { fileURLToPath } from 'url';
import webpack from 'webpack';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import ESLintPlugin from 'eslint-webpack-plugin';

import { CmsAdapterWebpack } from '@spynejs/cms-adapter';

// Resolve __dirname for ES modules.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Constants ────────────────────────────────────────────────────────────────
const ASSETS_DIR = 'assets'; // prod asset root; empty string in dev
const PUBLIC_PATH = '/';

/**
 * Webpack config factory.
 *
 * Invoked as:
 *   dev    → `webpack serve`                     (env.build undefined, mode 'development')
 *   prod   → `webpack --mode production --env build`
 *   test   → mode 'none'                          (see web-test-runner / karma)
 *
 * All build flags live in the `ctx` object below — the single source of truth,
 * passed explicitly to helpers (no mutable module-level globals).
 */
export default (env = { mode: 'development' }) => {
  const mode = env.mode || 'development';
  const isProduction = env.build === true;
  const isTest = mode === 'none';
  const buildType = process.env.buildType;

  const assetsFolder = isProduction ? `${ASSETS_DIR}/` : '';
  const imgPath = `${PUBLIC_PATH}${assetsFolder}static/imgs/`;
  const sassStaticDir = isProduction ? `././../static/` : './static/';

  const ctx = { isProduction, isTest, buildType, assetsFolder, imgPath };

  return {
    mode,

    entry: {
      index: './src/index.js',
    },

    // Concise, high-signal build output — errors are easy (and cheap) to read.
    stats: 'errors-warnings',
    // Suppress known-noisy upstream Sass deprecation warnings (not actionable here).
    ignoreWarnings: [/sass-loader/, /Deprecation Warning/],

    output: {
      // Dev: stable filenames so agents/tests can reference built asset paths.
      // Prod: contenthash for cache-busting on deploy (matches the JSON rule below).
      filename: isProduction
        ? `${assetsFolder}js/[name].[contenthash].js`
        : `${assetsFolder}js/[name].js`,
      publicPath: PUBLIC_PATH,
      clean: true,
      crossOriginLoading: 'anonymous', // allow SRI / crossorigin on injected tags
    },

    // Full maps in prod for error tooling; fast, cheap maps for the dev rebuild loop.
    devtool: isProduction ? 'source-map' : 'eval-cheap-module-source-map',

    // Persistent cache — meaningful speedup across the many rebuilds an agent runs.
    cache: { type: 'filesystem' },

    devServer: {
      static: [
        {
          directory: path.resolve(__dirname, 'src'),
        },
        // The seed data stores avatar paths as `/customers/<name>.png`, and the
        // same rows are read by the Next.js app, where they resolve against
        // public/. The path belongs to the database, so it is served here rather
        // than rewritten — a rewrite would make the two apps disagree about what
        // the data says.
        {
          directory: path.resolve(__dirname, 'src/static/imgs/customers'),
          publicPath: '/customers',
        },
      ],
      historyApiFallback: true,

      // Fixed, not 'auto': the port is part of the comparison's documented
      // setup, and the API proxy below has to be a known quantity.
      port: 8010,

      // Plain HTTP, matching how `next dev` serves the Next.js side. Nothing in
      // this app needs a secure context, and the /api proxy below already
      // removes the mixed-content problem that HTTPS would otherwise be solving.
      // A self-signed cert would only add a browser warning on one side of a
      // side-by-side comparison.
      //
      // DEV_SERVER_PROTOCOL=https opts back in, for anyone who wants it.
      //
      // Unrelated to the database: Node connects to Postgres with
      // postgres.js `ssl: 'require'` regardless of this setting. That is a
      // server-to-server connection and is always encrypted.
      server: process.env.DEV_SERVER_PROTOCOL === 'https' ? 'https' : 'http',

      // Everything under /api is forwarded to the Node tier, so the browser only
      // ever sees ONE origin. Consequences:
      //   - nothing is cross-origin, so there is no CORS layer to build
      //   - the page and the API share a protocol, so no mixed content either
      // The API tier itself binds 127.0.0.1:8090 and is never addressed directly
      // by the page.
      //
      // API_PORT is read here for the same reason server/config.js reads it —
      // the two have to agree, so a second instance can run alongside the first
      // without either being edited.
      proxy: [
        {
          context: ['/api'],
          target: `http://127.0.0.1:${process.env.API_PORT || 8090}`,
          changeOrigin: false,
          // Surface a clear message if the API process is not up yet, rather
          // than an opaque 504 in the network panel.
          onError(err, _req, res) {
            console.error(`[proxy] ${err.message}`);
            if (res.writeHead) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  message:
                    'API tier unreachable on 127.0.0.1:8090 — is `npm start` running both processes?',
                }),
              );
            }
          },
        },
      ],
    },

    plugins: getWebpackPlugins(ctx),

    optimization: {
      // Guarantees `process.env.NODE_ENV` is substituted with a string literal
      // in EVERY mode. webpack derives this from `mode` by default, which means
      // mode 'none' (the test build) leaves the expression untouched and it
      // throws in the browser — src/index.js reads it to decide whether to load
      // the CMS. For development and production this matches the default
      // exactly, so only the test build changes.
      nodeEnv: isTest ? 'test' : mode,

      // Split everything from node_modules into a single long-lived vendor chunk.
      splitChunks: {
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            chunks: 'all',
          },
        },
      },
    },

    module: {
      rules: [
        {
          test: /\.html$/,
          loader: 'html-loader',
          options: {
            minimize: false,
            esModule: false,
          },
        },
        {
          test: /\.(sa|sc|c)ss$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            {
              loader: 'css-loader',
              options: {
                sourceMap: true,
                // NOTE: webpack does NOT rewrite url() in stylesheets (url:false).
                // Reference images at runtime via IMG_PATH, or through the copied
                // static/ paths — a raw `url(./foo.png)` will NOT be resolved.
                url: false,
              },
            },
            // Runs Tailwind + autoprefixer (see postcss.config.js). Sits
            // between css-loader and sass-loader so it processes the CSS that
            // Sass has already compiled — @tailwind directives in a .scss file
            // are passed through by Sass untouched and expanded here.
            {
              loader: 'postcss-loader',
              options: {
                sourceMap: true,
              },
            },
            {
              loader: 'sass-loader',
              options: {
                sourceMap: true,
                additionalData: `$STATIC_DIR: ${JSON.stringify(sassStaticDir)};`,
                sassOptions: {
                  includePaths: [`${assetsFolder}static/fonts/`],
                },
              },
            },
          ],
        },
        {
          test: /\.(ttf|woff|woff2)$/,
          type: 'asset/resource',
          generator: {
            filename: `${assetsFolder}static/fonts/[name][ext][query]`,
          },
        },
        {
          test: /\.(png|jpe?g|gif)$/i,
          type: 'asset',
          generator: {
            // [ext] already includes the leading dot in webpack 5 asset modules.
            filename: `${assetsFolder}static/imgs/[name][ext]`,
          },
        },
        // JSON files are emitted as file assets:
        //   dev  → stable filenames (the CMS reads/writes them in place)
        //   prod → hashed filenames for cache busting
        {
          test: /\.json$/,
          type: 'javascript/auto',
          use: [
            {
              loader: 'file-loader',
              options: {
                name: isProduction
                  ? `${assetsFolder}static/data/[name].[hash].[ext]`
                  : `${assetsFolder}static/data/[name].[ext]`,
              },
            },
          ],
        },
        {
          test: /\.svg$/i,
          type: 'asset/source', // inline raw SVG markup (replaces raw-loader)
        },
      ],
    },

    // Short-path aliases — these also document the app's architecture for readers.
    resolve: {
      alias: {
        plugins: path.resolve(__dirname, 'src/plugins/'),
        imgs: path.resolve(__dirname, 'src/static/imgs/'),
        svgs: path.resolve(__dirname, 'src/static/imgs/svgs/'),
        iframes: path.resolve(__dirname, 'src/static/iframes/'),
        fonts: path.resolve(__dirname, 'src/static/fonts/'),
        data: path.resolve(__dirname, 'src/static/data/'),
        css: path.resolve(__dirname, 'src/css/'),
        core: path.resolve(__dirname, 'src/_core/'),
        traits: path.resolve(__dirname, 'src/app/traits/'),
        channels: path.resolve(__dirname, 'src/app/channels/'),
        components: path.resolve(__dirname, 'src/app/components/'),
        // Load-bearing: resolves `@use '~node_modules/<pkg>/...'` imports in SCSS
        // (e.g. src/scss/app.scss pulls highlight.js this way). Do NOT remove —
        // without it webpack looks for node_modules/node_modules/<pkg> and fails.
        node_modules: path.resolve(__dirname, 'node_modules/'),
      },
      extensions: ['.js', '.css'],
    },
  };
};

// ── Plugins ──────────────────────────────────────────────────────────────────
function getWebpackPlugins({
                             isProduction,
                             isTest,
                             buildType,
                             assetsFolder,
                             imgPath,
                           }) {
  const definePlugin = new webpack.DefinePlugin({
    IMG_PATH: JSON.stringify(imgPath),
    NODE_ENV: JSON.stringify(process.env.NODE_ENV),
    SPYNE_APP_DIR: JSON.stringify(process.cwd()),
  });

  const htmlPlugin = new HtmlWebpackPlugin({
    template: './src/index.tmpl.html',
    minify: false,
  });

  const plugins = [htmlPlugin, definePlugin];

  if (isProduction) {
    plugins.push(
      new MiniCssExtractPlugin({
        filename: `${assetsFolder}css/main.[contenthash].css`,
      }),
      buildCopyPlugin({ assetsFolder, buildType }),
    );
  } else if (!isTest) {
    // Dev (not test): run the CMS adapter server, and surface lint inline so an
    // agent gets immediate feedback. failOnError:false keeps lint non-blocking —
    // issues show as warnings in the build output, they don't break `npm start`.
    plugins.push(
      new CmsAdapterWebpack(),
    );
    // new ESLintPlugin({ failOnError: false }), REMOVING FOR NOW TO DEFER CONFIG FORMATTING
  }

  return plugins;
}

function buildCopyPlugin({ assetsFolder, buildType }) {
  const patterns = [
    { from: './src/static/imgs', to: `${assetsFolder}static/imgs` },
    { from: './src/static/fonts', to: `${assetsFolder}static/fonts` },
    // Also emitted at /customers, outside assetsFolder: the seed data addresses
    // these by absolute path, so they have to sit at the web root whatever the
    // build type. The pattern above already copies them under static/imgs too —
    // that costs 48KB and keeps them findable where every other image lives.
    { from: './src/static/imgs/customers', to: 'customers' },
  ];

  if (buildType === 'apache') {
    patterns.push({
      from: './apache-htaccess',
      to: '.htaccess',
      toType: 'file',
    });
  }

  return new CopyWebpackPlugin({ patterns });
}
