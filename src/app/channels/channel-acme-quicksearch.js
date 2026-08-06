import { Channel } from 'spyne';
import { AcmeQuickSearchChannelTraits } from 'traits/db/db-quicksearch-channel-traits.js';

/**
 * Cross-domain matching for the quick-search overlay (Cmd-K / Ctrl-K).
 *
 * The third client-side projection beside CHANNEL_ACME_INVOICES and
 * CHANNEL_ACME_CUSTOMERS, and separate from both for the same reason they are
 * separate from each other: those two answer "what does the current URL ask
 * for?" within one domain, while this one answers "what matches this transient
 * query?" across both at once.
 *
 * ── The query is NOT URL state ──────────────────────────────────────────────
 *
 * The list pages route every keystroke through window.location because a
 * bookmark, a back button and a keystroke must be indistinguishable. The
 * overlay is a modal palette OVER a page: the URL keeps describing the page
 * beneath it, and the query dies with the overlay. So — unlike the domain
 * channels — the current query is held HERE, the designed home for durable
 * state, so a data refresh landing mid-search can recompute the same match.
 * (Navigating from a result is a different matter: a customer row mints a
 * real /dashboard/invoices?query=… history entry — see the overlay traits.)
 *
 * ── Replay ──────────────────────────────────────────────────────────────────
 *
 * True: a current-value channel. The overlay mounts at boot, before the dump
 * lands, and later consumers need the latest match, not merely the next one.
 *
 * All behaviour lives in AcmeQuickSearchChannelTraits — this class is
 * structure and event flow only.
 */
export class ChannelAcmeQuickSearch extends Channel {
  constructor(name, props = {}) {
    name = 'CHANNEL_ACME_QUICKSEARCH';
    props.replay = true;
    props.traits = [AcmeQuickSearchChannelTraits];
    super(name, props);
  }

  onRegistered() {
    this.acmeQuickSearch$OnRegistered();
  }

  addRegisteredActions() {
    return [
      // Every id matching the current query, one payload for both kinds.
      'CHANNEL_ACME_QUICKSEARCH_RESULTS_EVENT',

      // Intake from the overlay ViewStream (sendInfoToChannel): an explicit
      // query write, used when the overlay opens with a cleared input. Typed
      // queries arrive separately, through CHANNEL_UI, like every other
      // search input in the app. Never emitted by this channel.
      ['CHANNEL_ACME_QUICKSEARCH_QUERY_EVENT', 'acmeQuickSearch$OnQueryInfo'],
    ];
  }

  onViewStreamInfo() {}
}
