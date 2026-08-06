import { ViewStream } from 'spyne';
import { withClass } from 'utils/svg-icons.js';
import QuickSearchOverlayTmpl from './templates/quick-search-overlay-view.tmpl.html';
import { QuickSearchOverlayTraits } from 'traits/search/quick-search-overlay-traits.js';

/**
 * The quick-search overlay — mounted ONCE by AppContainer at boot, hidden, and
 * painted by CHANNEL_ACME_QUICK_SEARCH for the life of the app. Persistence is
 * the point: the overlay must answer Cmd-K from any page, so it cannot belong
 * to any page.
 *
 * ── Rendering strategy for the result list ──────────────────────────────────
 *
 * Matches can number in the dozens (a broad term, in the thousands), so rows
 * are BULK MARKUP — one DomElement template render per emission into the
 * scrollable results region — not per-row ViewStreams. This is the same
 * instance-count judgment the invoices table records: a ViewStream is a
 * subscription, a listener hash and a disposal path, per instance, per
 * emission. Two views exist here regardless of match count: this frame and
 * nothing else.
 *
 * Interactivity survives that choice because the CONTAINER is the broadcast
 * boundary. Spyne does not delegate, so dynamically re-rendered rows carry no
 * bindings of their own; the results region is bound once, and the channel
 * resolves the pressed row from event.target. The pill toggle, the edit
 * anchor and the customer anchor are all plain markup with data-qs-* facts.
 *
 * ── The relay listeners ─────────────────────────────────────────────────────
 *
 * The three activation instructions are relayed from here to the owning
 * domain channel because sendInfoToChannel is a ViewStream method and Channel
 * has no equivalent — the same boundary AcmeRequesterNullView holds for
 * fetches. One listener per action name.
 */
export class QuickSearchOverlayView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.id = 'quick-search-overlay';
    props.role = 'dialog';
    props.class = 'fixed inset-0 z-50 hidden px-4';
    props.template = QuickSearchOverlayTmpl;
    props.channels = ['CHANNEL_ACME_QUICK_SEARCH'];
    props.traits = [QuickSearchOverlayTraits];
    props.data = {
      attrPlaceholder: 'Search customers and invoices...',
      svgMagnifyingGlass: withClass(
        'magnifyingGlass',
        'absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500',
      ),
    };

    super(props);
  }

  addActionListeners() {
    return [
      ['CHANNEL_ACME_QUICK_SEARCH_OPEN_EVENT', 'quickSearchOverlay$OnOpen'],
      ['CHANNEL_ACME_QUICK_SEARCH_CLOSE_EVENT', 'quickSearchOverlay$OnClose'],
      [
        'CHANNEL_ACME_QUICK_SEARCH_RESULTS_EVENT',
        'quickSearchOverlay$OnResults',
      ],
      [
        'CHANNEL_ACME_QUICK_SEARCH_HIGHLIGHT_EVENT',
        'quickSearchOverlay$OnHighlight',
      ],
      [
        'CHANNEL_ACME_QUICK_SEARCH_TOGGLE_STATUS_EVENT',
        'quickSearchOverlay$RelayToggle',
      ],
      [
        'CHANNEL_ACME_QUICK_SEARCH_EDIT_INVOICE_EVENT',
        'quickSearchOverlay$RelayEditInvoice',
      ],
      [
        'CHANNEL_ACME_QUICK_SEARCH_CUSTOMER_INVOICES_EVENT',
        'quickSearchOverlay$RelayCustomerInvoices',
      ],
    ];
  }

  broadcastEvents() {
    // Static frame elements only — all exist at render time. The results
    // region is the container binding described above; each element carries
    // its eventType/btnType in its own dataset.
    return [
      ['#quick-search-input', 'keyup'],
      ['.qs-backdrop', 'click'],
      ['[data-slot="qs-results"]', 'click'],
    ];
  }

  onRendered() {}
}
