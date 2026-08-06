import { ViewStream, ChannelPayloadFilter } from 'spyne';
import { withClass } from 'utils/svg-icons.js';
import QuickSearchTmpl from './templates/quick-search-view.tmpl.html';
import { QuickSearchTraits } from 'traits/shell/quick-search-traits.js';

/**
 * The global quick-search overlay (Cmd-K / Ctrl-K).
 *
 * Mounted ONCE by AppContainer alongside the two columns — the overlay is
 * app-level chrome like the sidenav, not a page item, so it survives every
 * navigation and needs no entry in app.model.json. It starts hidden and only
 * opens on the shell page ('dashboard'), the same single-page rule
 * UIContainerTraits applies to the sidenav column.
 *
 * ── How its events arrive ───────────────────────────────────────────────────
 *
 * Everything is declared channel traffic:
 *
 *   window keydown           the shortcut, Escape, arrows, Enter — bound
 *                            directly (rxjs fromEvent) rather than through
 *                            CHANNEL_WINDOW, because the window channel's
 *                            listeners are passive and the shortcut and
 *                            arrows need preventDefault. See
 *                            quickSearch$BindGlobalKeys for the full why.
 *   CHANNEL_WINDOW click     delegation for the per-keystroke rows and the
 *                            backdrop, which broadcastEvents cannot bind
 *                            because it queries elements at render time.
 *   CHANNEL_UI               the sidenav's search button (its own broadcast)
 *                            and this view's input keyup (broadcast below).
 *   CHANNEL_ACME_DATA        the held collections the matching runs against,
 *                            and the refresh that repaints an open list.
 *   CHANNEL_APP              pageId, for the shell-page gate.
 *   CHANNEL_ROUTE            any navigation closes the overlay.
 *
 * All behaviour lives in QuickSearchTraits — this class is structure and
 * event flow only.
 */
export class QuickSearchView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.id = 'quick-search';
    props.class = 'fixed inset-0 z-50 hidden';
    props.template = QuickSearchTmpl;
    props.channels = [
      'CHANNEL_APP',
      'CHANNEL_ACME_DATA',
      'CHANNEL_UI',
      'CHANNEL_WINDOW',
      'CHANNEL_ROUTE',
    ];
    props.traits = [QuickSearchTraits];
    props.data = {
      labelText: 'Quick search',
      attrPlaceholder: 'Search customers and invoices...',
      svgMagnifyingGlass: withClass(
        'magnifyingGlass',
        'absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900',
      ),
    };

    props.qsIsOpen = false;
    props.qsQuery = '';
    props.qsIndex = -1;

    super(props);
  }

  addActionListeners() {
    // Only payloads carrying a landed dump — same narrowing as the table and
    // the pages, which also excludes REQUEST_EVENT's fetch-config payloads.
    const isLoadedFilter = new ChannelPayloadFilter({
      payload: (payload) => payload?.status?.isLoaded === true,
    });

    return [
      ['CHANNEL_APP_INIT_EVENT', 'quickSearch$OnAppPage'],
      ['CHANNEL_APP_PAGE_DATA_EVENT', 'quickSearch$OnAppPage'],
      ['CHANNEL_ACME_DATA_.*_EVENT', 'quickSearch$OnAcmeData', isLoadedFilter],
      [
        'CHANNEL_UI_CLICK_EVENT',
        'quickSearch$OnOpenerClick',
        new ChannelPayloadFilter({ eventType: 'quickSearch', btnType: 'open' }),
      ],
      [
        'CHANNEL_UI_KEYUP_EVENT',
        'quickSearch$OnQueryKeyup',
        new ChannelPayloadFilter({
          eventType: 'quickSearch',
          btnType: 'query',
        }),
      ],
      ['CHANNEL_WINDOW_CLICK_EVENT', 'quickSearch$OnWindowClick'],
      ['CHANNEL_ROUTE_CHANGE_EVENT', 'quickSearch$OnRouteChange'],
    ];
  }

  broadcastEvents() {
    // The one static interactive element this view owns at render time. The
    // dynamic rows are handled by window-click delegation in the trait.
    return [['#quick-search-input', 'keyup']];
  }

  onRendered() {
    this.quickSearch$BindGlobalKeys();
  }
}
