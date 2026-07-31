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
// them. A page view falls back to page.tmpl.html when `template` is absent or
// unknown.
//
// Mirrors traits/utils/page-item-template-lookup.js, which does the same for
// page-item templates.

import PageTmpl from 'components/pages/templates/page.tmpl.html';

const context = import.meta.webpackContext('components/pages/templates', {
  recursive: true,
  regExp: /\.html$/,
});

export const pageTemplateLookup = {};

context.keys().forEach((key) => {
  const filename = key.replace('./', '');
  pageTemplateLookup[filename] = context(key);
});

export const getPageTemplate = (templateName) => {
  if (typeof templateName !== 'string' || !templateName.trim()) {
    return PageTmpl;
  }

  const template = pageTemplateLookup[templateName];

  if (template === undefined) {
    console.warn(
      `Spyne Warning: unknown page template "${templateName}" — falling back to page.tmpl.html`,
    );

    return PageTmpl;
  }

  return template;
};
