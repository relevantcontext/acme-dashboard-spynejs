import { ViewStream } from 'spyne';
import { withClass } from 'utils/svg-icons.js';
import UISearchTmpl from './templates/ui-search-view.tmpl.html';

// Which domain channel answers this instance's btnType, and the one action
// whose payload carries the resolved `query`. The box listens to the SAME
// channel it feeds, so its value and the list it filters share one authority.
const LIST_SOURCE_BY_BTN_TYPE = {
  'filter-invoices': {
    channel: 'CHANNEL_ACME_INVOICES',
    action: 'CHANNEL_ACME_INVOICES_LIST_EVENT',
  },
  'filter-customers': {
    channel: 'CHANNEL_ACME_CUSTOMERS',
    action: 'CHANNEL_ACME_CUSTOMERS_LIST_EVENT',
  },
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

    // Subscribe to this instance's own domain channel so the box can mirror
    // the query when it changes UNDERNEATH a mounted page — a quick-search
    // customer activation writes ?query= after this view has already read
    // location.search at construction, and back/forward between two searches
    // moves the URL without rebuilding the page.
    const listSource = LIST_SOURCE_BY_BTN_TYPE[btnType];
    props.channels = listSource ? [listSource.channel] : [];
    props.listAction = listSource ? listSource.action : null;

    super(props);
  }

  addActionListeners() {
    return this.props.listAction
      ? [[this.props.listAction, 'onListEvent']]
      : [];
  }

  /**
   * Mirrors the channel's resolved query into the input. Guarded on focus:
   * while the user is typing, the input IS the source of these events and
   * overwriting it would fight the caret. [live-mirror-via-el$]
   */
  onListEvent(e) {
    const query = e?.payload?.query ?? '';
    const input = this.props.el$('input').el;

    if (input == null) return;
    if (document.activeElement === input) return;
    if (input.value === query) return;

    input.value = query;
  }

  broadcastEvents() {
    // Bound to the input itself. Spyne does not delegate, so a dynamically
    // replaced input would need its container bound instead.
    return [['input', 'keyup']];
  }

  onRendered() {}
}
