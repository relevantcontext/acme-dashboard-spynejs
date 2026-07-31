import { SpyneTrait, ChannelPayloadFilter, safeClone } from 'spyne';

export class AppStatusTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'appStatus$';
    super(context, traitPrefix);
  }

  static appStatus$GetChannels() {
    // CHANNEL_ACME_AUTH is merged so the app does not initialise until the
    // initial auth state is known — its first emission is INIT_AUTH, resolved
    // from the unpaused session request. A failed session request still emits
    // INIT_AUTH as unauthenticated, so a downed API delays boot rather than
    // preventing it.
    this.mergeChannels([
      'CHANNEL_ROUTE',
      'CHANNEL_FETCH_MODEL',
      'CHANNEL_ACME_AUTH',
    ]).subscribe(this.appStatus$OnDataReturned.bind(this));

    const routePayloadFilter = new ChannelPayloadFilter({
      action: 'CHANNEL_ROUTE_CHANGE_EVENT',
    });

    this.getChannel('CHANNEL_ROUTE', routePayloadFilter).subscribe(
      this.appStatus$OnRouteEvent.bind(this),
    );
  }

  static appStatus$OnDataReturned(e) {
    this.props.data = e['CHANNEL_FETCH_MODEL'].payload;
    this.props.uiText = this.props.data?.text;

    const { navLinks, isDeepLink, routeData } = e['CHANNEL_ROUTE'].payload;
    const { footer, header } = e['CHANNEL_FETCH_MODEL'].payload.text;

    // isAuthenticated is deliberately NOT carried here. initData is captured
    // once, when this merge resolves, and never refreshed — so it would report
    // the boot-time value forever and be wrong the moment anyone logs in or out.
    // Auth state has one source of truth: AcmeAuthStateTraits.
   // this.props.initData = { navLinks, isDeepLink, routeData, footer, header };

    try {
      this.appStatus$SendDataEvent(routeData, true);
    } catch (e) {
      console.log('ERROR FOR ROUTE', e);
    }
  }

  static appStatus$OnRouteEvent(e) {
    const { routeData } = e.payload;
    this.appStatus$SendDataEvent(routeData);
  }

  /**
   * Emits application-level state derived from routing.
   *
   * This is the semantic gateway between routing and app behavior.
   * It determines whether content resolution should occur and
   * publishes explicit status flags for downstream consumers.
   */
  static appStatus$SendDataEvent(routeData, isInitialData = false) {
    const { initData } = this.props;

    /**
     * If any route key is '404', the route is semantically invalid.
     * Content resolution must not be attempted.
     */
    const is404Route = Object.values(routeData).includes('404');

    /**
     * Resolve content only for valid routes.
     * If resolution fails, fall back to route-only state.
     */
    const pageData = is404Route
      ? routeData
      : (this.appStatus$GetCurrentPageData(routeData) ?? routeData);

    /**
     * Select the appropriate app status event.
     */
    const action = isInitialData
      ? 'CHANNEL_APP_INIT_EVENT'
      : 'CHANNEL_APP_PAGE_DATA_EVENT';

    /**
     * Normalize payload and attach explicit state flags.
     */
    const payload = safeClone(pageData);
    payload.initData = initData;
    payload.is404 = is404Route;

    this.sendChannelPayload(action, payload);
  }


  /**
   * Progressively narrows the application content tree by route
   * identifiers, in key order. Resolution stops at the first
   * constraint that cannot be satisfied.
   *
   * Returns the matched content node, or null when any constraint
   * fails — the caller decides the fallback (e.g. route-only state
   * for 404s, empty pages, or deferred content).
   */
  static appStatus$GetCurrentPageData(
    routeData,
    data = this.props.data,
    keys = ['pageId', 'topicId', 'optionId'],
  ) {
    const constraints = keys
      .map((key) => [key, routeData[key]])
      .filter(([, value]) => value != null && value !== '');

    let node = data;
    for (const [key, value] of constraints) {
      node = node?.content?.find((child) => child[key] === value) ?? null;
      if (node === null) break;
    }
    return node;
  }
}
