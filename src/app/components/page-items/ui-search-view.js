import { ViewStream } from 'spyne';
import { withClass } from 'utils/svg-icons.js';
import UISearchTmpl from './templates/ui-search-view.tmpl.html';
import { UISearchTraits } from 'traits/ui/ui-search-traits.js';

// Which domain channel resolves this instance's query, by what it filters.
// The LIST payload of either carries the resolved `query` the input mirrors.
const LIST_ACTION_BY_BTN_TYPE = {
  'filter-invoices': [
    'CHANNEL_ACME_INVOICES',
    'CHANNEL_ACME_INVOICES_LIST_EVENT',
  ],
  'filter-customers': [
    'CHANNEL_ACME_CUSTOMERS',
    'CHANNEL_ACME_CUSTOMERS_LIST_EVENT',
  ],
};

/**
 * Converted from app/ui/search.tsx.
 *
 * The source is a Next.js client component: it debounces with use-debounce and
 * pushes the term into the URL with useRouter/useSearchParams, so the server
 * component re-renders with new data.
 *
 * Here the keystroke is broadcast to CHANNEL_UI by broadcastEvents — never by
 * a manual addEventListener. The attributes are on the input rather than on
 * this root element because CHANNEL_UI reports the originating element.
 *
 * ── Why this does NOT talk to the API ───────────────────────────────────────
 *
 * eventType is `acmeSearch`, not `acmeData`, so ChannelAcmeData never sees it.
 * Every invoice and customer is already held by its domain channel from the
 * /api/bootstrap dump, so searching filters what is in hand — no request, no
 * round trip, and nothing to debounce. The corresponding domain channel
 * publishes the resolved match set.
 *
 * That is the sharpest divergence from the Next.js side, where each keystroke
 * pushes a new search param and re-runs a server component against SQL.
 *
 * @param {Object} props
 * @param {Object} props.data
 * @param {String} props.data.placeholder
 * @param {String} [props.data.query]      current search term, for round-tripping
 * @param {String} [props.data.btnType]    names what is being filtered
 */
export class UISearchView extends ViewStream {
  constructor(props = {}) {
    const {
      inputId = 'search',
      labelText = 'Search',
      placeholder = '',
      query = new URLSearchParams(window.location.search).get('query') || '',
      btnType = 'filter-invoices',
    } = props.data || {};

    props.tagName = 'div';
    props.class = 'relative flex flex-1 flex-shrink-0';
    props.template = UISearchTmpl;
    // The domain channel whose LIST resolves this instance's query — the
    // input mirrors its payload so a query written WITHOUT a keystroke here
    // (quick-search customer selection, back/forward between searches) still
    // shows in the box. An unknown btnType simply listens to nothing.
    props.channels = LIST_ACTION_BY_BTN_TYPE[btnType]
      ? [LIST_ACTION_BY_BTN_TYPE[btnType][0]]
      : [];
    props.traits = [UISearchTraits];
    props.data = {
      ...props.data,
      inputId,
      labelText,
      attrPlaceholder: placeholder,
      attrValue: query,
      btnType,
      svgMagnifyingGlass: withClass(
        'magnifyingGlass',
        'absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900',
      ),
    };

    super(props);
  }

  addActionListeners() {
    const mapping = LIST_ACTION_BY_BTN_TYPE[this.props.data?.btnType];

    return mapping ? [[mapping[1], 'uiSearch$OnList']] : [];
  }

  broadcastEvents() {
    // Bound to the input itself. Spyne does not delegate, so a dynamically
    // replaced input would need its container bound instead.
    return [['input', 'keyup']];
  }

  onRendered() {}
}
