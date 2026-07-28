import { SpyneTrait, ChannelPayloadFilter, safeClone } from 'spyne';
import {
  compose,
  find,
  isNil,
  toPairs,
  pick,
  reject,
  reduce,
  propEq,
} from 'ramda';

export class AppStatusTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'appStatus$';
    super(context, traitPrefix);
  }

  static appStatus$GetChannels() {
    this.mergeChannels(['CHANNEL_ROUTE', 'CHANNEL_FETCH_MODEL']).subscribe(
      this.appStatus$OnDataReturned.bind(this),
    );

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
    this.props.initData = { navLinks, isDeepLink, routeData, footer, header };

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
   * Resolves the current page-level data by progressively narrowing
   * the application content tree using route identifiers.
   *
   * Resolution model:
   *   pageId  → topicId → optionId
   *
   * Only route keys with meaningful values are used as constraints.
   * If a constraint exists and cannot be satisfied, resolution stops.
   *
   * If no matching content is found, the original routeData is returned
   * intentionally — allowing callers to detect "route-only" state
   * (e.g. 404s, empty pages, or deferred content).
   */
  static appStatus$GetCurrentPageData(
    routeData,
    data = this.props.data,
    keys = ['pageId', 'topicId', 'optionId'],
  ) {
    /**
     * Reducer that attempts to match the current route key/value
     * against the current level of the content tree.
     *
     * - If content exists, we look for a matching child node.
     * - If no match is found, resolution fails and returns null.
     * - Once null, the reduction will continue to propagate failure.
     */
    const getDataReducer = (d, [k, v]) => {
      if (!d || !d.content) return null;
      return find(propEq(v, k), d.content) || null;
    };

    /**
     * Resolution pipeline:
     *
     * 1. Pick only relevant route keys (pageId, topicId, optionId)
     * 2. Remove empty or undefined values (optional depth)
     * 3. Convert to key/value pairs for reduction
     * 4. Reduce through the content tree, narrowing at each level
     */
    const content = compose(
      reduce(getDataReducer, data),
      toPairs,
      pick(keys),
      reject(([, v]) => isNil(v) || v === ''),
    )(routeData);

    /**
     * If resolution succeeds, return the matched content node.
     * If resolution fails, return routeData intentionally —
     * signaling a valid route with no resolved content.
     */
    return content ?? routeData;
  }
}
