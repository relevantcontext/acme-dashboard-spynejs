import { ViewStream, ChannelPayloadFilter } from 'spyne';
import InvoicesSaveBarTmpl from './templates/invoices-save-bar-view.tmpl.html';
import { InvoicesSaveBarTraits } from 'traits/invoices/invoices-save-bar-traits.js';

/**
 * The unsaved-edits bar of the invoices page: how many invoices are edited,
 * Save All / Discard / Undo / Redo, and — while rows are range-selected — the
 * two bulk-status actions.
 *
 * Hidden until there is something to say. The edit slice rides EVERY data
 * payload (complete state), so a bar mounting mid-session shows the right
 * count from its replayed birth payload — no handshake needed. The selection
 * count arrives live from the session channel; that channel replays nothing,
 * which is fine here because a page swap that rebuilds this bar also rebuilt
 * the table whose selection died with it.
 */
export class InvoicesSaveBarView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'invoice-save-bar is-hidden';
    props.template = InvoicesSaveBarTmpl;
    props.channels = ['CHANNEL_ACME_DATA', 'CHANNEL_ACME_EDIT_SESSION'];
    props.traits = [InvoicesSaveBarTraits];

    super(props);
  }

  addActionListeners() {
    return [
      // Every loaded data payload — the edits slice it carries is this bar's
      // whole content. The isLoaded filter keeps REQUEST_EVENT (fetch config,
      // no edits) out. [admit-by-payload-filter]
      [
        'CHANNEL_ACME_DATA_.*_EVENT',
        'invoicesSaveBar$OnAcmeData',
        new ChannelPayloadFilter({
          payload: (payload) => payload?.status?.isLoaded === true,
        }),
      ],
      [
        'CHANNEL_ACME_EDIT_SESSION_SELECTION_EVENT',
        'invoicesSaveBar$OnSelection',
      ],
    ];
  }

  broadcastEvents() {
    return [['button', 'click']];
  }

  onRendered() {}
}
