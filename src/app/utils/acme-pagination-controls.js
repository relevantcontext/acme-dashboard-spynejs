import { withClass } from 'utils/svg-icons.js';

/**
 * Shapes PaginationTraits control descriptors into template-ready data.
 *
 * Extracted from InvoicesPaginationViewTraits when the customers page gained
 * the same control row: the two adapters translate different channel events,
 * but the rendered row is ONE appearance, and duplicating these class strings
 * would let the two pages drift apart pixel by pixel. What is domain-specific —
 * the dataset eventType a button broadcasts — lives in each items template,
 * not here.
 *
 * Pure register: input to output, no framework, no `this`. It lives beside
 * svg-icons.js rather than in acme-utils.js because withClass imports .svg
 * files the test runner cannot follow, and acme-utils.js is deliberately
 * import-free for that runner. [author-in-correct-register]
 */

const ARROW_BASE =
  'flex h-10 w-10 items-center justify-center rounded-md border';
const NUMBER_BASE = 'flex h-10 w-10 items-center justify-center text-sm border';
const ELLIPSIS_CLASS =
  'flex h-10 w-10 items-center justify-center border text-sm text-gray-300';

// Built once at module load, not per control: withClass does string work and
// both arrows are the same two strings for the life of the app.
const SVG_ARROW = Object.freeze({
  previous: withClass('arrowLeft', 'w-4'),
  next: withClass('arrowRight', 'w-4'),
});

/**
 * An arrow, resolved to one of two element variants.
 *
 * The tag differs — a disabled arrow is an inert div, an enabled one is a
 * button carrying the page request — and DomElementTemplate has no dynamic
 * tag names by design. So the decision is made here and exactly one of the
 * two keys is present, letting the template emit the matching element.
 * [conditional-via-object-section]
 */
export const shapePaginationArrow = (item) => {
  const { type, pageNumber, isDisabled } = item;
  const gutter = type === 'previous' ? 'mr-2 md:mr-4' : 'ml-2 md:ml-4';
  const state = isDisabled
    ? 'pointer-events-none text-gray-300'
    : 'hover:bg-gray-100';

  const shape = {
    attrClass: `${ARROW_BASE} ${state} ${gutter}`,
    attrAriaLabel: `${type} page`,
    svgArrow: SVG_ARROW[type],
    attrPageNumber: pageNumber,
  };

  const key = `${type === 'previous' ? 'prev' : 'next'}${isDisabled ? 'Disabled' : 'Link'}`;

  return { [key]: shape };
};

export const shapePaginationPage = (item) => {
  const { pageNumber, position, isCurrent } = item;
  const edges = [
    position === 'first' || position === 'single' ? 'rounded-l-md' : '',
    position === 'last' || position === 'single' ? 'rounded-r-md' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const state = isCurrent
    ? 'z-10 bg-blue-600 border-blue-600 text-white'
    : 'hover:bg-gray-100';

  const shape = {
    attrClass: `${NUMBER_BASE} ${edges} ${state}`.replace(/\s+/g, ' ').trim(),
    attrAriaLabel: `page ${pageNumber}`,
    attrPageNumber: pageNumber,
    pageNumber: String(pageNumber ?? ''),
  };

  return isCurrent ? { isCurrent: shape } : { isLink: shape };
};

/**
 * The control row as one template-ready object: the two arrows at the root,
 * the numbers and ellipses as an array the template iterates.
 *
 * Each entry carries everything its section needs. Nothing is read from an
 * outer scope, because measured behaviour is that outer-scope keys do not
 * reach inside a section — see buildInvoiceRows for what was tested.
 */
export const shapePaginationControlItems = (items = []) => {
  const shaped = { pages: [] };

  items.forEach((item) => {
    if (item.type === 'previous' || item.type === 'next') {
      Object.assign(shaped, shapePaginationArrow(item));
      return;
    }

    if (item.type === 'ellipsis') {
      shaped.pages.push({ isEllipsis: { attrClass: ELLIPSIS_CLASS } });
      return;
    }

    shaped.pages.push(shapePaginationPage(item));
  });

  return shaped;
};
