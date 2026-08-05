import { ViewStream } from 'spyne';
import { AppLoadingTraits } from 'traits/shell/app-loading-traits.js';

/**
 * The cold-load splash — the one view in the app that ADOPTS its element
 * rather than rendering one.
 *
 * The markup lives in index.tmpl.html so the browser paints it the moment the
 * document parses, before the bundle has even downloaded — the whole point is
 * to cover the window while the thing that could render a view is still in
 * flight. When index.js boots it hands that element to this view ({ el }),
 * which takes ownership: same wiring, same lifecycle, and disposal removes
 * the adopted tree exactly like a rendered one. [adopt-existing-element]
 *
 * ── What "the app is interactive" means, per boot path ──────────────────────
 *
 * No new channel is minted for this — boot progress is already fully spoken by
 * the two semantic channels the app owns [mint-channel-vs-ride-existing]:
 *
 *   unauthenticated  AUTH_INIT with isAuthenticated false. The guest page
 *                    (home, login) renders from the local model with no data
 *                    fetch, so the splash leaves immediately.
 *   authenticated    DATA_LOADED — the bootstrap dump landed and every page
 *                    item is constructed from it. Until then the splash stays,
 *                    with the status line naming the stage.
 *   data failed      DATA_ERROR before anything loaded. The page shell is
 *                    rendered and can surface the failure; a spinner pinned
 *                    over it would hide that, so the splash leaves.
 *
 * A failed session request still emits AUTH_INIT as unauthenticated (see
 * AppStatusTraits), so every boot path releases the splash — nothing can
 * strand it.
 *
 * All behaviour lives in AppLoadingTraits — this class is structure and event
 * flow only.
 */
export class AppLoadingView extends ViewStream {
  constructor(props = {}) {
    props.channels = ['CHANNEL_ACME_AUTH', 'CHANNEL_ACME_DATA'];
    props.traits = [AppLoadingTraits];

    super(props);
  }

  addActionListeners() {
    // LOADED and ERROR are listened to as exact labels rather than one
    // CHANNEL_ACME_DATA_.*_EVENT pattern: the splash exists only for the boot
    // window, and the two boot outcomes are these two actions — UPDATED and
    // MUTATION cannot occur before LOADED has fired. [declare-action-listeners]
    return [
      ['CHANNEL_ACME_AUTH_INIT_EVENT', 'appLoading$OnAuthInit'],
      ['CHANNEL_ACME_DATA_LOADED_EVENT', 'appLoading$Dismiss'],
      ['CHANNEL_ACME_DATA_ERROR_EVENT', 'appLoading$Dismiss'],
    ];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {
    // Fires on adoption exactly as it would after a render.
    this.appLoading$OnRendered();
  }
}
