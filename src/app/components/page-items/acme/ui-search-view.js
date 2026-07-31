import { ViewStream } from 'spyne';
import { withClass } from 'traits/utils/svg-icons.js';
import UISearchTmpl from './templates/ui-search-view.tmpl.html';

/**
 * Converted from app/ui/search.tsx.
 *
 * The source is a Next.js client component: it debounces with use-debounce and
 * pushes the term into the URL with useRouter/useSearchParams, so the server
 * component re-renders with new data.
 *
 * Here the keystroke is broadcast to CHANNEL_UI by broadcastEvents — never by a
 * manual addEventListener. The attributes are on the input rather than on this
 * root element because CHANNEL_UI reports the element the event originated from.
 *
 * ── Why this does NOT talk to the API ───────────────────────────────────────
 *
 * eventType is `acmeSearch`, not `acmeApi`, so ChannelAcmeApi never sees it.
 * Every invoice and customer is already in SpyneAppProperties from the
 * /api/bootstrap dump, so searching filters what is in hand — no request, no
 * round trip, and nothing to debounce. The table listens for this event and
 * filters itself.
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
      query = '',
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

    super(props);
  }

  addActionListeners() {
    return [];
  }

  broadcastEvents() {
    // Bound to the input itself. Spyne does not delegate, so a dynamically
    // replaced input would need its container bound instead.
    return [['input', 'keyup']];
  }

  onRendered() {}
}
