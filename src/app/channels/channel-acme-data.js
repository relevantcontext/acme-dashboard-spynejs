import { Channel } from 'spyne';
import { AcmeDataChannelTraits } from 'traits/db/db-data-channel-traits.js';
import { AcmeEditsChannelTraits } from 'traits/db/db-edits-channel-traits.js';

/**
 * Every read and write of Acme business data.
 *
 * The second of the two Acme channels a view subscribes to. It emits only when
 * it has data or a data outcome — never auth lifecycle, which is
 * CHANNEL_ACME_AUTH's job.
 *
 * ── When it first speaks ────────────────────────────────────────────────────
 *
 * Not at boot. It waits for CHANNEL_ACME_AUTH to report an authenticated user,
 * requests /api/bootstrap, and emits DATA_LOADED once that returns. A page can
 * therefore treat any emission as "there is data" rather than having to check.
 *
 * ── Replay ──────────────────────────────────────────────────────────────────
 *
 * This is a current-value channel, not an ephemeral-event one: a page mounting
 * after the dump has landed needs the data, so it replays. [choose-replay-semantics]
 *
 * The consequence every action must respect is in acmeData$Publish.
 *
 * All behaviour lives in AcmeDataChannelTraits — this class is structure and
 * event flow only.
 *
 * NOTE for consumers: register only ONE listener per action name in a given
 * ViewStream. A duplicate registration for the same action clobbers the first.
 */
export class ChannelAcmeData extends Channel {
  constructor(name, props = {}) {
    name = 'CHANNEL_ACME_DATA';
    props.replay = true;
    props.traits = [AcmeDataChannelTraits, AcmeEditsChannelTraits];

    // Reconciliation state for optimistic mutations, owned here because the
    // channel is the designed home for durable state. [state-machine-in-channel]
    //
    //   acmePendingMutations  in-flight mutation requests. While > 0, a landing
    //                         bootstrap is STALE by construction — the pending
    //                         mutation's own response will request a fresh one —
    //                         and is discarded rather than applied.
    //                         [select-concurrency-operator]
    //   acmeStatusIntents     one entry per in-flight status toggle, carrying
    //                         the inverse (prevStatus) recorded at apply time.
    //                         [provisional-state-with-inverse]
    props.acmePendingMutations = 0;
    props.acmeStatusIntents = [];

    // Live payment activity, owned here for the same reason. The API tier
    // simulates continuous events while a user is signed in; this channel
    // polls it, patches the held dump, and republishes.
    // [record:live-polling-updates]
    //
    //   acmeLiveTickSub       the raw-RxJS interval subscription driving the
    //                         polls; null while signed out. Started when the
    //                         first dump lands, stopped by ClearData.
    //   acmeLiveTickInFlight  exhaust latch — a new tick is skipped, never
    //                         queued, while one is outstanding.
    //   acmeLiveFeed          the rolling conformed activity feed (newest
    //                         first, capped), riding every published payload.
    //   acmeLiveJournal       recent raw events, re-applied over a landing
    //                         bootstrap whose snapshot predates them.
    props.acmeLiveTickSub = null;
    props.acmeLiveTickInFlight = false;
    props.acmeLiveFeed = [];
    props.acmeLiveJournal = [];

    // Bulk-edit state, owned here for the same reason as the two blocks
    // above: a draft's meaning is "differs from the held dump", so the dump's
    // owner is the only home that never needs a second copy to answer it.
    // [record:undo-redo] [state-machine-in-channel]
    //
    //   acmeEditDrafts  unsaved edits, invoiceId -> partial field overlay.
    //   acmeEditUndo/   the local history — one entry per user gesture, each
    //   acmeEditRedo    change carrying its draft-layer inverse.
    //                   [provisional-state-with-inverse]
    //   acmeEditSaving  the in-flight batch save's snapshot; null when idle.
    props.acmeEditDrafts = {};
    props.acmeEditUndo = [];
    props.acmeEditRedo = [];
    props.acmeEditSaving = null;

    super(name, props);
  }

  onRegistered() {
    this.acmeData$OnRegistered();
    this.acmeEdits$OnRegistered();
  }

  addRegisteredActions() {
    return [
      // Consumed by AcmeRequesterNullView. Views do not listen for this.
      'CHANNEL_ACME_DATA_REQUEST_EVENT',
      'CHANNEL_ACME_DATA_INVOICE_SUBMIT_EVENT',

      // Transmitted by table-side views: one user gesture's worth of in-place
      // edits (a cell commit, or a bulk range-status set). Recorded as ONE
      // undo entry; never a server request.
      'CHANNEL_ACME_DATA_EDIT_COMMIT_EVENT',

      // The unsaved-edit overlay changed — commit, bulk, undo, redo, discard,
      // or a save starting/settling. Full-state like every other action; the
      // `edits` slice riding every payload is what consumers read.
      'CHANNEL_ACME_DATA_EDITS_EVENT',

      // The dump landed. LOADED is the first one after authentication; UPDATED
      // is every refresh after a mutation AND every live-tick merge (external
      // payment activity patching the held dump). Split so a view can render on
      // first load and re-render on change without inspecting a flag — the same
      // split as the auth channel's INIT / CHANGED.
      'CHANNEL_ACME_DATA_LOADED_EVENT',
      'CHANNEL_ACME_DATA_UPDATED_EVENT',

      // A create / update / delete returned, carrying the API's own message for
      // form-level feedback. DATA_UPDATED follows once the refreshed dump lands.
      'CHANNEL_ACME_DATA_MUTATION_EVENT',

      // Any failed request. Carries the url that failed — error payloads are
      // built from real request metadata, unlike success payloads, which all
      // report the fetch channel's constructor url.
      'CHANNEL_ACME_DATA_ERROR_EVENT',
    ];
  }

  onViewStreamInfo(e) {
    this.acmeData$OnViewStreamInfo(e);
  }
}
