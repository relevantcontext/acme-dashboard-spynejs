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
      static: {
        directory: path.resolve(__dirname, 'src'),
      },
      historyApiFallback: true,
      port: 'auto',
    },

    plugins: getWebpackPlugins(ctx),

    optimization: {
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
