import { SpyneTrait } from 'spyne';

/**
 * Logic for ChannelAcmeEditSession — the validate-and-rebroadcast relay for
 * the bulk-edit session's ephemeral events. Every transmit maps 1:1 to an
 * emission: the envelope is cloned and re-sent under its own action, so
 * senders (table, editor) and receivers (rows, table, save bar) stay fully
 * decoupled. [transmit-into-channel]
 *
 * It holds NO state on purpose: the cursor and selection facts live in the
 * table view that owns them, and the draft facts live on CHANNEL_ACME_DATA.
 * A copy here would be a third authority that could disagree with both.
 */
export class AcmeEditSessionChannelTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'acmeEditSession$';
    super(context, traitPrefix);
  }

  static acmeEditSession$OnViewStreamInfo(e) {
    const { action, payload } = e?.clone?.() ?? e ?? {};

    if (typeof action !== 'string' || action.endsWith('_EVENT') === false) {
      return;
    }

    this.sendChannelPayload(action, payload ?? {});
  }
}
