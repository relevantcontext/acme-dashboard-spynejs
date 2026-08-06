import { SpyneTrait } from 'spyne';
import { StageContainer } from 'components/shell/stage-container.js';
import { UIContainer } from 'components/shell/ui-container.js';
import { LocalStorageNullView } from 'components/shell/null-views/local-storage-null-view.js';
import { AcmeQueryParamsNullView } from 'components/shell/null-views/acme-query-params-null-view.js';
import { QuickSearchView } from 'components/shell/quick-search-view.js';

export class AppContainerTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'app$';
    super(context, traitPrefix);
  }

  static app$SetTheme(theme = 'dark', props = this.props) {
    props.el.dataset.theme = theme;
  }

  static app$OnLocalStorageEvent(e) {
    const { theme } = e.payload;
    this.app$SetTheme(theme);
  }

  // Where the user lands after signing out. Matches the Next.js side, whose
  // sidenav calls `signOut({ redirectTo: '/' })`.
  static SIGN_OUT_DESTINATION = '/';

  /**
   * Ends the session by replacing the document.
   *
   * ── Why a navigation and not a route change ─────────────────────────────
   *
   * Every reset the app would otherwise have to perform by hand — auth state,
   * the cached data dump, channel replay buffers, every mounted view's
   * props.data — is done by loading a new document. There is nothing to
   * enumerate and therefore nothing to miss, which is the property worth having
   * when what is being discarded is another user's data.
   *
   * It also costs nothing in fidelity: sign-out on the Next.js side is a server
   * action, so that app performs a real POST and a real navigation too.
   *
   * `replace`, not `assign`: the dashboard must not be one Back press away from
   * a session that has just been ended. Replacing leaves no history entry to
   * return to.
   *
   * Safe to call only because the POST to /api/auth/logout has already resolved
   * — ChannelAcmeAuth publishes the action from the response handler. Navigating
   * before the cookie is cleared would boot straight back into a live session.
   *
   * Deliberately NOT used for a 401. That looks like the same event, but a
   * reload on 401 can loop: boot, session check reports valid, a data request
   * 401s, reload, repeat. A 401 stays on the in-app redirect path, where no
   * loop is possible. Sign-out is user-initiated and happens once.
   */
  static app$OnSignOutCompleted() {
    window.location.replace(AppContainerTraits.SIGN_OUT_DESTINATION);
  }

  static app$OnSettingsEvent(e) {
    const { settingsType } = e.payload;

    if (settingsType === 'theme') {
      const { theme } = this.props.el.dataset;
      this.props.el.dataset.theme = theme === 'dark' ? 'light' : 'dark';
    }
  }

  /**
   * Order matters: UIContainer is the left column, so it is appended first.
   * They are siblings — neither owns the other — which is what lets each decide
   * its own visibility and contents without the other knowing.
   */
  static app$OnAppViewRendered() {
    this.appendView(new UIContainer());
    this.appendView(new StageContainer());
    // App-level chrome like the columns: mounted once, survives navigation,
    // position:fixed so document order only matters for stacking.
    this.appendView(new QuickSearchView());
    new LocalStorageNullView().appendToNull();
    new AcmeQueryParamsNullView().appendToNull();
  }
}
