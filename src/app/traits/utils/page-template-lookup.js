// page-template-lookup.js
//
// Every template in components/pages/templates, keyed by filename, so a page in
// app.model.json can name its own layout:
//
//   { "pageId": "dashboard", "template": "dashboard.page.tmpl.html", ... }
//
// Naming the file is deliberate over deriving it from pageId/topicId/optionId —
// a developer reading the model sees exactly which file renders the page, and
// two routes can share a layout without a filename convention deciding it for
// them. PageView falls back to page.tmpl.html when `template` is absent or
// unknown.
//
// Mirrors traits/utils/page-item-template-lookup.js, which does the same for
// page-item templates.

const ctx = import.meta.webpackContext('components/pages/templates', {
  recursive: false,
  regExp: /\.html$/,
});

const pageTemplateLookup = {};

ctx.keys().forEach((key) => {
  const filename = key.replace('./', '');
  pageTemplateLookup[filename] = ctx(key);
});

export default pageTemplateLookup;
