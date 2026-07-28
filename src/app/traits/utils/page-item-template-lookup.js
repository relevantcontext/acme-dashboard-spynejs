// page-item-template-lookup.js (WEBPACK 5 + ESM SAFE)

const ctx = import.meta.webpackContext('components/page-items/templates', {
  recursive: false,
  regExp: /\.html$/,
});

const pageItemTemplateLookup = {};

ctx.keys().forEach((key) => {
  const filename = key.replace('./', '');
  pageItemTemplateLookup[filename] = ctx(key);
});

export default pageItemTemplateLookup;
