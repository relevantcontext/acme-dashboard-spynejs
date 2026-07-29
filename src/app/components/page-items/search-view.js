import { ViewStream } from 'spyne';
import { withClass } from 'traits/utils/svg-icons.js';
import SearchTmpl from './templates/search.tmpl.html';

/**
 * Converted from app/ui/search.tsx.
 *
 * The source is a Next.js client component: it debounces with use-debounce and
 * pushes the term into the URL with useRouter/useSearchParams, so the server
 * component re-renders with new data.
 *
 * Here the keystroke is broadcast to CHANNEL_UI by broadcastEvents — never by a
 * manual addEventListener. ChannelAcmeApi filters on
 * `data-event-type="acmeApi"` and dispatches on `data-acme-action`, which is why
 * both attributes are on the input rather than on this root element: CHANNEL_UI
 * reports the element the event originated from.
 *
 * Debouncing is deliberately NOT done here. It belongs alongside the request,
 * in the channel that issues it, so every caller of FetchInvoices gets the same
 * behaviour rather than each view re-implementing it.
 *
 * @param {Object} props
 * @param {String} props.placeholder
 * @param {String} [props.query]        current search term, for round-tripping
 * @param {String} [props.acmeAction]   defaults to the invoices search
 */
export class SearchView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'relative flex flex-1 flex-shrink-0';
    props.template = SearchTmpl;
    props.data = {
      inputId: props.inputId || 'search',
      labelText: 'Search',
      attrPlaceholder: props.placeholder || '',
      attrValue: props.query || '',
      acmeAction: props.acmeAction || 'FetchInvoices',
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
