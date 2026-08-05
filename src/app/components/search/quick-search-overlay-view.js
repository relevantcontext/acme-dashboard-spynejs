import { ViewStream } from 'spyne';
import { withClass } from 'utils/svg-icons.js';
import QuickSearchOverlayTmpl from './templates/quick-search-overlay-view.tmpl.html';
import { QuickSearchOverlayTraits } from 'traits/search/quick-search-overlay-traits.js';

/**
 * The quick-search overlay: backdrop, input, and the two result groups.
 *
 * Born by QuickSearchHostView on the channel's OPEN; disposes itself on CLOSE
 * — self-termination as the early-exit clause, never a governance transfer.
 * Every close path (Escape, Cmd/Ctrl-K, backdrop, dismiss button, navigation)
 * arrives as that one CLOSE action, so disposal is a single declared line and
 * the whole row tree goes with it. [record:modal-open-close] [dispose-as-unit]
 *
 * The backdrop and the panel are SIBLINGS, not ancestor and child: a broadcast
 * click listener reports the BOUND element as srcElement, so a dismissing
 * backdrop that contained the panel would read every panel click as a dismiss.
 *
 * Keyboard: the input's keyup broadcasts the query (dataset routes it to the
 * search channel); ArrowUp/ArrowDown/Enter arrive through CHANNEL_WINDOW and
 * drive the highlight in the trait — ephemeral display state that lives in
 * the DOM and this view's props, never in a channel. [live-mirror-via-el$]
 */
export class QuickSearchOverlayView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'quick-search-overlay';
    props.template = QuickSearchOverlayTmpl;
    props.channels = ['CHANNEL_ACME_SEARCH', 'CHANNEL_WINDOW'];
    props.traits = [QuickSearchOverlayTraits];
    props.data = {
      attrPlaceholder: 'Search invoices and customers...',
      svgMagnifyingGlass: withClass(
        'magnifyingGlass',
        'h-[18px] w-[18px] text-gray-500',
      ),
    };

    super(props);
  }

  addActionListeners() {
    return [
      ['CHANNEL_ACME_SEARCH_CLOSE_EVENT', 'disposeViewStream'],
      ['CHANNEL_ACME_SEARCH_RESULTS_EVENT', 'quickSearchOverlay$OnResults'],
      ['CHANNEL_WINDOW_KEYDOWN_EVENT', 'quickSearchOverlay$OnKeydown'],
    ];
  }

  broadcastEvents() {
    // The input carries the quick-search dataset; the backdrop and the header
    // button both carry close-quick-search. Result rows are child ViewStreams
    // and declare their own clicks at their own render.
    // [dynamic-children-ingress]
    return [
      ['input', 'keyup'],
      ['[data-qs-dismiss]', 'click'],
    ];
  }

  onRendered() {
    this.quickSearchOverlay$OnRendered();
  }
}
