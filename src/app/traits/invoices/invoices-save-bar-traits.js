import { SpyneTrait } from 'spyne';

/**
 * Logic for InvoicesSaveBarView: mirror the edit slice riding every
 * CHANNEL_ACME_DATA payload (count, undo/redo availability, saving flag) and
 * the live selection count from the session channel onto the bar's own DOM.
 * Pure mirroring — the bar holds no state the channels don't already carry.
 * [live-mirror-via-el$] [render-empty-populate-on-event]
 *
 * Its buttons carry their whole meaning as datasets: the lifecycle four ride
 * eventType acmeData straight to the data channel; the two bulk-status
 * buttons ride eventType invoiceBulk to the TABLE, because only the table
 * knows which rows are selected. This view never hears its own clicks.
 */
export class InvoicesSaveBarTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'invoicesSaveBar$';
    super(context, traitPrefix);
  }

  static invoicesSaveBar$OnAcmeData(e, props = this.props) {
    props.editsState = e?.payload?.edits ?? {};

    this.invoicesSaveBar$Render();
  }

  static invoicesSaveBar$OnSelection(e, props = this.props) {
    props.selectedCount = (e?.payload?.invoiceIds ?? []).length;

    this.invoicesSaveBar$Render();
  }

  static invoicesSaveBar$Render(props = this.props) {
    const {
      editedCount = 0,
      canUndo = false,
      canRedo = false,
      isSaving = false,
    } = props.editsState ?? {};
    const selectedCount = props.selectedCount ?? 0;

    const isVisible = editedCount > 0 || selectedCount > 0 || isSaving === true;

    props.el$().toggleClass('is-hidden', isVisible === false);

    if (isVisible === false) return;

    const statusEl = props.el$('[data-slot="status"]').el;

    if (statusEl != null) {
      const parts = [];

      if (editedCount > 0) {
        parts.push(
          `${editedCount} invoice${editedCount === 1 ? '' : 's'} edited`,
        );
      }
      if (selectedCount > 0) {
        parts.push(`${selectedCount} selected`);
      }

      statusEl.innerText = isSaving === true ? 'Saving…' : parts.join(' · ');
    }

    props
      .el$('[data-slot="bulk"]')
      .toggleClass('is-hidden', selectedCount === 0);

    const disableWhile = (selector, disabled) => {
      const el = props.el$(selector).el;
      if (el != null) el.disabled = disabled === true;
    };

    disableWhile('[data-slot="undo"]', canUndo === false || isSaving === true);
    disableWhile('[data-slot="redo"]', canRedo === false || isSaving === true);
    disableWhile(
      '[data-slot="discard"]',
      editedCount === 0 || isSaving === true,
    );
    disableWhile('[data-slot="save"]', editedCount === 0 || isSaving === true);
  }
}
