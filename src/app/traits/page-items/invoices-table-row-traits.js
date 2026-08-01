import { SpyneTrait } from 'spyne';

/**
 * Logic for InvoicesTableRowView — one question, asked of every list.
 *
 * ── Where the line between row and table falls ──────────────────────────────
 *
 * The table owns what the SET knows: which rows are on this page, and which of
 * those is first and last visible. No row can answer those alone, so no row
 * subscribes for them.
 *
 * Existence is the other kind of fact. "Has my invoice been deleted" is about
 * this row and nothing else, and the answer is in the payload — so the row asks
 * it, and acts on it by removing itself. A parent never holds a reference to a
 * child ViewStream, so this is not merely the tidier option: disposal can only
 * originate here. [dispose-as-unit] [dispose-by-predicate-filter]
 *
 * ── Why absence, and not a DELETED event ────────────────────────────────────
 *
 * The obvious design echoes the deleted id back from the server and disposes the
 * row that matches. It was not built, because the refreshed dump already says
 * everything needed and says it authoritatively: a successful mutation makes
 * ChannelAcmeData re-read bootstrap, ChannelAcmeInvoices republishes, and the
 * deleted id is simply not in `allIds`.
 *
 * That keeps one source of truth. An echoed id is the client patching its own
 * copy of the world and trusting it matches; absence from the refreshed set is
 * the server's answer. It also means this handles deletions the app did not
 * perform — a record removed by anything else disappears on the next dump — and
 * it needed no server change at all.
 *
 * The cost is honest: two round trips before the row goes, DELETE then
 * bootstrap. next-learn pays the same shape through revalidatePath.
 */
export class InvoicesTableRowTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'invoicesTableRow$';
    super(context, traitPrefix);
  }

  /**
   * Disposes this row when its invoice is no longer in the set.
   *
   * No skip-first is needed even though the channel replays. A row is built from
   * the same dump the channel holds, so its replayed birth payload always
   * contains its own id — and if it somehow did not, disposing would be the
   * correct response rather than the bug skip-first exists to prevent.
   */
  static invoicesTableRow$OnList(e, props = this.props) {
    const allIds = e?.payload?.allIds;

    // A payload without the list is not evidence of deletion — say nothing.
    if (Array.isArray(allIds) === false) return;

    if (allIds.includes(props.data?.attrInvoiceId) === true) return;

    this.disposeViewStream();
  }
}
