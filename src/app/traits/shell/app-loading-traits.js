import { SpyneTrait } from 'spyne';

const STATUS_SELECTOR = '[data-loading-status]';
const LEAVING_CLASS = 'is-leaving';

// Matches the 200ms opacity transition on #app-loading in index.tmpl.html,
// plus a small margin so the fade completes before the tree is removed.
const LEAVE_MS = 250;

/**
 * Logic for AppLoadingView — the cold-load splash.
 *
 * The status line is ephemeral display state: each stage writes the text
 * straight onto the adopted element, held nowhere else. [live-mirror-via-el$]
 *
 * Dismissal is self-termination on the governing event, with a fade first —
 * the same shape as a toast's timeout: the class starts the CSS transition,
 * and the dispose that removes the adopted tree follows once it has played.
 */
export class AppLoadingTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'appLoading$';
    super(context, traitPrefix);
  }

  /**
   * The bundle has booted and this view now owns the splash. The static
   * markup said "Loading application…" — that stage is over, so the line
   * advances to what the app is actually doing: asking who the user is.
   */
  static appLoading$OnRendered() {
    this.appLoading$SetStatus('Checking your session…');
  }

  /**
   * The boot-time auth answer. Authenticated means the bootstrap request is
   * now in flight (ChannelAcmeData fires it from this same emission), so the
   * status names that stage and the DATA listeners will release the splash.
   * Unauthenticated means a guest page renders from the local model with no
   * data fetch — nothing left to wait for.
   */
  static appLoading$OnAuthInit(e) {
    if (e?.payload?.isAuthenticated === true) {
      this.appLoading$SetStatus('Loading your data…');
      return;
    }

    this.appLoading$Dismiss();
  }

  static appLoading$SetStatus(text) {
    const statusEl = this.props.el$(STATUS_SELECTOR).el;

    if (statusEl != null) statusEl.innerText = text;
  }

  /**
   * The app is interactive. Guarded so the fade starts once however many
   * governing events arrive (an error followed by a landed dump, say) — the
   * timeout must not be scheduled twice against one dispose.
   */
  static appLoading$Dismiss(e, props = this.props) {
    if (props.appLoadingIsLeaving === true) return;

    props.appLoadingIsLeaving = true;
    this.props.el$().toggleClass(LEAVING_CLASS, true);

    setTimeout(() => this.disposeViewStream(), LEAVE_MS);
  }
}
