import { ViewStream, safeClone, SpyneAppProperties } from 'spyne';
import { PageItemCoreTraits } from 'traits/page/page-item-core-traits.js';
import { getPageTemplate } from 'traits/utils/page-template-lookup.js';

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

    // A page names its own layout in app.model.json via `template`, e.g.
    // "dashboard.page.tmpl.html". Unknown or absent falls back to the shared
    // page.tmpl.html, so existing pages are unaffected.
    props.template = getPageTemplate(props.data.template);

    super(props);

    this.pageItemViews = [];
    this.acmeData = null;
    this.acmeStatus = null;
    this.hasRendered = false;
  }

  addActionListeners() {
    // All three data actions carry complete state, so any of them is enough to
    // build the page. ERROR is included deliberately: it still carries whatever
    // has loaded, so a failed mutation must not leave the page empty.
    return [
      ['CHANNEL_ROUTE_CHANGE_EVENT', 'disposeViewStream'],
      ['CHANNEL_ACME_DATA_LOADED_EVENT', 'onAcmeData'],
      ['CHANNEL_ACME_DATA_UPDATED_EVENT', 'onAcmeData'],
      ['CHANNEL_ACME_DATA_ERROR_EVENT', 'onAcmeData'],
    ];
  }

  broadcastEvents() {
    return [['a', 'click']];
  }

  /**
   * The channel replays its last payload on subscribe, so this can fire before
   * the element exists. The values are kept and renderPageItems does nothing
   * until onRendered has run.
   */
  onAcmeData(e) {
    const { data, status } = e?.payload ?? {};
    this.acmeData = data ?? null;
    this.acmeStatus = status ?? null;
    this.renderPageItems();
  }

  onRendered() {
    this.hasRendered = true;
    this.renderPageItems();
  }

  renderPageItems() {
    if (!this.hasRendered) return;
    if (!this.props.data.pageItems) return;

    this.pageItemViews.forEach((view) => view.disposeViewStream());

    this.pageItemViews = this.pageItemCore$AddDashboardPageItems(
      this.acmeData,
      this.acmeStatus,
    );
  }
}
