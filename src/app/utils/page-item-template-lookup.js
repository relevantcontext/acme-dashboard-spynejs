// page-item-template-lookup.js (WEBPACK 5 + ESM SAFE)
// Every page-item template, keyed by filename, for model pageItems that name a
// template with isPrototype false. Mirrors page-template-lookup.js.

const ctx = import.meta.webpackContext('components/page-items/templates', {
  recursive: true,
  regExp: /\.html$/,
});

const pageItemTemplateLookup = {};

ctx.keys().forEach((key) => {
  const filename = key.replace('./', '');
  pageItemTemplateLookup[filename] = ctx(key);
});

export default pageItemTemplateLookup;
