import { ViewStream } from 'spyne';
import { QuickSearchHostTraits } from 'traits/search/quick-search-host-traits.js';

/**
 * The persistent transient-host for the quick-search overlay.
 *
 * Appended once at scaffold by AppContainer and never disposed; it owns the
 * overlay's EXISTENCE and nothing else. The overlay itself is parent-governed
 * with self-termination — it disposes on the channel's CLOSE — so this host
 * only ever adds. The channel is the single author of open/close, which is why
 * the host holds no is-open state of its own: it cannot double-append because
 * the channel never emits OPEN while open. [record:modal-open-close]
 * [assign-view-lifecycle-tier]
 */
export class QuickSearchHostView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'quick-search-host';
    props.channels = ['CHANNEL_ACME_SEARCH'];
    props.traits = [QuickSearchHostTraits];

    super(props);
  }

  addActionListeners() {
    return [['CHANNEL_ACME_SEARCH_OPEN_EVENT', 'quickSearchHost$OnOpen']];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {}
}
