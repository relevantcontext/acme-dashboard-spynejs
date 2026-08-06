import { ViewStream, ChannelPayloadFilter } from 'spyne';
import { withClass } from 'utils/svg-icons.js';
import QuickSearchOverlayTmpl from './templates/quick-search-overlay-view.tmpl.html';
import QuickSearchCustomerRowsTmpl from './templates/quick-search-customer-rows.tmpl.html';
import QuickSearchInvoiceRowsTmpl from './templates/quick-search-invoice-rows.tmpl.html';
import { QuickSearchOverlayTraits } from 'traits/shell/quick-search-overlay-traits.js';

/**
 * The global quick-search overlay: Cmd-K / Ctrl-K from any signed-in page, or
 * the sidenav's Search button. One instance for the app's lifetime, mounted
 * hidden by AppContainer beside the shell columns — a modal palette is
 * app-level chrome, not a page item, so it survives every navigation and no
 * page has to know it exists.
 *
 * ── What this view owns ─────────────────────────────────────────────────────
 *
 * The overlay frame, its open/closed state, the pre-rendered result rows, the
 * keyboard highlight, and delegation of result activation. It searches nothing
 * itself: keystrokes broadcast to CHANNEL_UI, CHANNEL_ACME_QUICKSEARCH answers
 * with matched ids, and this view sweeps visibility over rows it has already
 * rendered (see the traits for why sweep-not-rebuild is the right cost model
 * at 5,000 invoices).
 *
 * ── Event paths, all declared ───────────────────────────────────────────────
 *
 *   open      CHANNEL_WINDOW keydown (Cmd/Ctrl-K), or the sidenav button's
 *             CHANNEL_UI click (eventType quickSearch)
 *   type      the input's own keyup broadcast -> CHANNEL_UI -> quicksearch
 *             channel -> RESULTS_EVENT back here
 *   navigate  CHANNEL_WINDOW keydown (arrows / Enter / Escape)
 *   activate  one delegated click broadcast on the results CONTAINER — rows
 *             are re-rendered wholesale on data changes, and Spyne binds
 *             broadcasts per element at render time, so the stable container
 *             is bound once and the trait resolves the row from event.target
 *   close     Escape, backdrop click, or any CHANNEL_ROUTE change
 *
 * The one exception to "no manual listeners" is a keydown bound purely to
 * cancel browser defaults — CHANNEL_WINDOW attaches its listeners with
 * {passive: true}, so preventDefault through the channel is silently ignored,
 * and without it Ctrl-K also focuses the browser's address bar. All state
 * still moves through the channel; see quickSearch$BindPreventDefaults.
 */
export class QuickSearchOverlayView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'quick-search-overlay hidden';
    props.template = QuickSearchOverlayTmpl;
    props.channels = [
      'CHANNEL_APP',
      'CHANNEL_ROUTE',
      'CHANNEL_UI',
      'CHANNEL_WINDOW',
      'CHANNEL_ACME_DATA',
      'CHANNEL_ACME_INVOICES',
      'CHANNEL_ACME_QUICKSEARCH',
    ];
    props.traits = [QuickSearchOverlayTraits];

    // Row templates ride props so the trait can re-render rows per dump —
    // the view owns markup, the trait owns when it is rendered.
    props.qsCustomerRowsTmpl = QuickSearchCustomerRowsTmpl;
    props.qsInvoiceRowsTmpl = QuickSearchInvoiceRowsTmpl;

    props.data = {
      placeholder: 'Search invoices and customers...',
      svgMagnifyingGlass: withClass(
        'magnifyingGlass',
        'absolute left-6 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900',
      ),
    };

    super(props);
  }

  addActionListeners() {
    // ChannelApp applies the auth boundary before emitting, so gating the
    // overlay on its pageId means a page the user is being redirected away
    // from can never arm the shortcut.
    return [
      ['CHANNEL_APP_INIT_EVENT', 'quickSearch$OnAppPage'],
      ['CHANNEL_APP_PAGE_DATA_EVENT', 'quickSearch$OnAppPage'],
      ['CHANNEL_ROUTE_CHANGE_EVENT', 'quickSearch$OnRouteChange'],
      ['CHANNEL_WINDOW_KEYDOWN_EVENT', 'quickSearch$OnKeydown'],
      [
        'CHANNEL_UI_CLICK_EVENT',
        'quickSearch$OnUiClick',
        new ChannelPayloadFilter({
          eventType: (eventType) =>
            eventType === 'quickSearch' || eventType === 'quickSearchResults',
        }),
      ],
      ['CHANNEL_ACME_QUICKSEARCH_RESULTS_EVENT', 'quickSearch$OnResults'],
      // Every landed dump: rebuild the row DOM when the collections actually
      // changed (create/edit/delete), skip when only statuses moved — those
      // repaint in place via STATUS_EVENT below, same as the table's rows.
      [
        'CHANNEL_ACME_DATA_.*_EVENT',
        'quickSearch$OnAcmeData',
        new ChannelPayloadFilter({
          payload: (payload) => payload?.status?.isLoaded === true,
        }),
      ],
      ['CHANNEL_ACME_INVOICES_STATUS_EVENT', 'quickSearch$OnInvoiceStatus'],
    ];
  }

  broadcastEvents() {
    // The input and the two close affordances are part of this view's own
    // template, so they exist at bind time. The results container is bound
    // for CLICK as the stable delegation root over re-rendered rows;
    // data-event-prevent-default on it keeps row hrefs from full-page
    // navigating while remaining real links.
    return [
      ['input#quick-search-input', 'keyup'],
      ['[data-slot="qs-results"]', 'click'],
      ['.qs-backdrop', 'click'],
      ['button#quick-search-close', 'click'],
    ];
  }

  onRendered() {
    this.quickSearch$OnRendered();
  }

  // The overlay lives for the app's lifetime, but if it is ever disposed the
  // one manual listener (see quickSearch$BindPreventDefaults) goes with it.
  onBeforeDispose() {
    this.quickSearch$UnbindPreventDefaults();
  }
}
