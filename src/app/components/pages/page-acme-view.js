import { ViewStream, safeClone, SpyneAppProperties } from 'spyne';
import { PageItemCoreTraits } from 'traits/page/page-item-core-traits.js';
import { getPageTemplate } from 'traits/utils/page-template-lookup.js';
import { contentSwapFilter } from 'traits/utils/acme-data-filters.js';

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
 * A mutation republishes the dump as DATA_UPDATED. Page items are disposed and
 * rebuilt from the new data — the single-active-child pattern — because a
 * DomElementTemplate renders once by design, so a view handed its data at
 * construction has no way to be told the data changed.
 */
export class PageAcmeView extends ViewStream {
  constructor(props = {}) {
    props.class = `page-view page-view-${props?.data?.pageId}`;
    props.channels = [['CHANNEL_ROUTE', true], 'CHANNEL_ACME_DATA'];
    props.traits = [PageItemCoreTraits];
    props.data = safeClone(props.data);
    props.data.href = SpyneAppProperties.getHrefFromData(props.data);

    props.acmeData = null;
    props.acmeStatus = null;

    // A page names its own layout in app.model.json via `template`, e.g.
    // "dashboard.page.tmpl.html". Unknown or absent falls back to the shared
    // page.tmpl.html, so existing pages are unaffected.
    props.template = getPageTemplate(props.data.template);

    super(props);
  }

  addActionListeners() {
    // Admission is declared, not decided in the handler: the filter passes only
    // payloads whose status.isContentSwap is true, which is also what each page
    // item disposes on. One flag governs both halves of the swap.
    //
    // The pattern may be broad because the filter fails closed — REQUEST_EVENT
    // carries fetch config and no status, so it can never reach the handler.
    return [
      ['CHANNEL_ROUTE_CHANGE_EVENT', 'disposeViewStream'],
      [
        'CHANNEL_ACME_DATA_.*_EVENT',
        'pageItemCore$OnAcmeData',
        contentSwapFilter(),
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
