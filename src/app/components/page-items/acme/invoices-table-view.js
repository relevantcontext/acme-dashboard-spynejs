import { ViewStream } from 'spyne';
import InvoicesTableTmpl from './templates/invoices-table-view.tmpl.html';
import { InvoicesTableParamsNullView } from 'components/page-items/acme/invoices-table-params-null-view.js';
import { InvoicesTableBodyView } from 'components/page-items/acme/invoices-table-body-view.js';
import { InvoicesTableTraits } from 'traits/page-items/invoices-table-traits.js';

/**
 * Converted from app/ui/invoices/table.tsx (outer markup).
 *
 * The source renders the same invoices twice — a stack of cards below `md` and
 * a real table at `md` and up. The card stack is still to come; mount
 * InvoicesCardView into [data-slot="invoice-cards"].
 *
 * ── This view owns the chrome, not the rows ────────────────────────────────
 *
 * The heading row, the wrappers and the empty tbody are its template. The rows
 * belong to InvoicesTableBodyView, which ADOPTS that tbody rather than being
 * given a place to render into. Splitting there means the rows can later be
 * replaced as a unit — dispose the body, adopt a fresh tbody — without this
 * view reaching into anyone's DOM.
 *
 * This view only ever RECEIVES the list. The URL side of the loop — applying an
 * UPDATE_PARAMS instruction and announcing the write — belongs to the null view
 * nested below, which shares this view's trait because the two halves are one
 * concern.
 *
 * No skip-first on CHANNEL_ACME_INVOICES: the channel replays, and the replayed
 * LIST payload is exactly what this view needs to render on mount. That is the
 * opposite of the null view's case, which must ignore its birth slot.
 * [choose-replay-semantics]
 */
export class InvoicesTableView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'mt-6 flow-root';
    props.template = InvoicesTableTmpl;
    props.channels = ['CHANNEL_ACME_INVOICES'];
    props.traits = [InvoicesTableTraits];

    super(props);
  }

  addActionListeners() {
    return [['CHANNEL_ACME_INVOICES_LIST_EVENT', 'invoicesTable$OnList']];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {
    new InvoicesTableParamsNullView().appendToNull();

    // The tbody from this view's own template, handed over as the body view's
    // element. appendView still runs — it is what exchanges the parent/child
    // streams, so the body disposes with this view — but an adopted child is
    // never re-attached, so the tbody does not move.
    this.appendView(
      new InvoicesTableBodyView({
        el: this.props.el$('[data-slot="invoice-rows"]').el,
        data: this.props.data,
      }),
    );
  }
}
