import { ViewStream, ChannelPayloadFilter } from 'spyne';
import { PageItemCoreTraits } from 'traits/pages/page-item-core-traits.js';
import { getPageTemplate } from 'utils/page-template-lookup.js';

/**
 * A page of the real app — anything that is not a guest page or a 404.
 *
 * The page template renders immediately: heading, layout, empty regions. The
 * page ITEMS wait for Acme data and are constructed with it, so each one is
 * handed its content rather than mounting empty and filling in.
 *
 * That split is close to what the Next.js side does with Suspense — its
 * page.tsx renders the <h1> and the grid wrappers straight away, and each
 * data-dependent child streams in behind its own boundary. The difference worth
 * naming in the comparison: Next.js shows a skeleton in the gap, this shows an
 * empty region.
 *
 * ── Why not read the data in onRendered ─────────────────────────────────────
 *
 * Because on a cold load it is not there yet. The dump is requested the moment
 * auth resolves, and the page mounts while it is still in flight. Waiting for
 * the event rather than guessing at a delay is what removes the 40ms setTimeout
 * this class used to need.
 *
 * ── Re-render ───────────────────────────────────────────────────────────────
 *
 * A mutation republishes the dump as DATA_UPDATED. The PAGE does not rebuild:
 * each data-bound item keeps itself fresh at its own tier — the stats cards
 * and latest-invoices list repaint in place from their own CHANNEL_ACME_DATA
 * listeners, and the invoices table re-syncs its rows through the invoices
 * channel — so an item with live interaction state (the search box, the
 * pagination page) is never torn down under the user. The page merely records
 * the latest status (pageItemCore$OnAcmeDataAfterCompose).
 */
export class PageAcmeView extends ViewStream {
  constructor(props = {}) {
    props.class = `page-view page-view-${props?.data?.pageId}`;
    props.channels = [['CHANNEL_ROUTE', true], 'CHANNEL_ACME_DATA'];
    props.traits = [PageItemCoreTraits];
    // props.data stays the shared, frozen model node — see PageGuestView for
    // why no clone: the page writes nothing into it, and its items receive
    // composed copies from pageItemCore rather than the node itself.

    props.acmeData = null;
    props.acmeStatus = null;

    // A page names its own layout in app.model.json via `template`, e.g.
    // "dashboard.page.tmpl.html". Unknown or absent falls back to the shared
    // page.tmpl.html, so existing pages are unaffected.
    props.template = getPageTemplate(props.data.template);

    super(props);
  }

  addActionListeners() {
    // The pipeline is narrowed so the build method fires once in the normal
    // case, rather than firing repeatedly and being gated inside the handler.
    // Only payloads carrying a landed dump are admitted — which also excludes
    // CHANNEL_ACME_DATA_REQUEST_EVENT, whose payload is fetch config with no
    // status at all, so the broad pattern is safe. [admit-by-payload-filter]
    return [
      ['CHANNEL_ROUTE_CHANGE_EVENT', 'disposeViewStream'],
      [
        'CHANNEL_ACME_DATA_.*_EVENT',
        'pageItemCore$OnAcmeData',
        new ChannelPayloadFilter({
          payload: (payload) => payload?.status?.isLoaded === true,
        }),
      ],
    ];
  }

  broadcastEvents() {
    return [['a', 'click']];
  }

  // Page items are built by pageItemCore$OnAcmeData when the data arrives, not
  // here — on a cold load the page mounts while the dump is still in flight.
  onRendered() {}
}
