import { SpyneTrait, DomElement } from 'spyne';
import QuickSearchResultsTmpl from 'components/shell/templates/quick-search-results.tmpl.html';

const RESULTS_SLOT = '[data-slot="qs-results"]';
const INPUT_SELECTOR = '#quick-search-input';
const HIGHLIGHT_CLASSES = ['bg-sky-100', 'text-blue-600'];

/**
 * Logic for QuickSearchOverlayView — paint and relay, no decisions.
 *
 * The channel owns every fact (open, query, matches, highlight); this trait
 * turns each emission into DOM: show/hide the frame, bulk-render the rows,
 * move the highlight bar, keep focus where typing goes. The one non-paint job
 * is the relay block at the bottom, which forwards the channel's activation
 * instructions to the domain channel that owns each behaviour —
 * sendInfoToChannel is a ViewStream method, so the hop through this view is
 * the sanctioned bridge (same boundary as AcmeRequesterNullView).
 */
export class QuickSearchOverlayTraits extends SpyneTrait {
  constructor(context) {
    super(context, 'quickSearchOverlay$');
  }

  // ── Paint ─────────────────────────────────────────────────────────────────

  static quickSearchOverlay$OnOpen(e) {
    this.quickSearchOverlay$RenderResults(e?.payload);
    this.props.el$().toggleClass('hidden', false);
    this.props.el.setAttribute('aria-modal', 'true');

    const input = this.props.el$(INPUT_SELECTOR).el;

    if (input == null) return;

    // The query survives close/open; selecting it makes typing replace it
    // while Enter/arrows still work against the restored result set.
    input.value = e?.payload?.query ?? '';
    input.focus();
    input.select();
  }

  static quickSearchOverlay$OnClose() {
    const input = this.props.el$(INPUT_SELECTOR).el;

    if (input != null && document.activeElement === input) input.blur();

    this.props.el$().toggleClass('hidden', true);
    this.props.el.removeAttribute('aria-modal');
  }

  /**
   * A new match set — keystroke or data refresh under an open overlay. The
   * whole region re-renders from one template pass; scrollTop is preserved so
   * a mid-scroll data refresh (a toggle confirming) does not yank the list.
   */
  static quickSearchOverlay$OnResults(e) {
    const slot = this.props.el$(RESULTS_SLOT).el;
    const scrollTop = slot == null ? 0 : slot.scrollTop;

    this.quickSearchOverlay$RenderResults(e?.payload);

    if (slot != null) slot.scrollTop = scrollTop;
  }

  static quickSearchOverlay$OnHighlight(e) {
    this.quickSearchOverlay$ApplyHighlight(e?.payload?.highlightIndex, true);
  }

  static quickSearchOverlay$RenderResults(payload) {
    const slot = this.props.el$(RESULTS_SLOT).el;

    if (slot == null || payload == null) return;

    slot.replaceChildren(
      new DomElement({
        tagName: 'div',
        template: QuickSearchResultsTmpl,
        data: payload,
      }).render(),
    );

    this.quickSearchOverlay$ApplyHighlight(payload.highlightIndex, false);
  }

  /**
   * One row wears the bar. Addressed by data-qs-index — the contract the
   * builder stamps sequentially across both groups — and scrolled into view
   * only on KEYBOARD moves: doing it on render would fight the user's wheel.
   */
  static quickSearchOverlay$ApplyHighlight(highlightIndex, scrollToRow) {
    const rows = this.props.el$(`${RESULTS_SLOT} [data-qs-index]`).els || [];
    const indexStr = String(highlightIndex);

    rows.forEach((row) => {
      const isHighlighted = row.dataset.qsIndex === indexStr;

      HIGHLIGHT_CLASSES.forEach((cls) =>
        row.classList.toggle(cls, isHighlighted),
      );
      row.setAttribute('aria-selected', isHighlighted ? 'true' : 'false');

      if (isHighlighted && scrollToRow === true) {
        row.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  // ── Relay: channel instruction -> owning domain channel ──────────────────

  static quickSearchOverlay$RelayToggle(e) {
    this.sendInfoToChannel(
      'CHANNEL_ACME_DATA',
      {
        btnType: 'toggle-invoice-status',
        invoiceId: e?.payload?.invoiceId,
      },
      'CHANNEL_ACME_DATA_INVOICE_SUBMIT_EVENT',
    );
  }

  static quickSearchOverlay$RelayEditInvoice(e) {
    this.sendInfoToChannel(
      'CHANNEL_ACME_INVOICES',
      {
        btnType: 'edit',
        invoiceId: e?.payload?.invoiceId,
      },
      'CHANNEL_ACME_INVOICES_NAV_EVENT',
    );
  }

  static quickSearchOverlay$RelayCustomerInvoices(e) {
    this.sendInfoToChannel(
      'CHANNEL_ACME_INVOICES',
      {
        btnType: 'customer-invoices',
        customerName: e?.payload?.customerName,
      },
      'CHANNEL_ACME_INVOICES_NAV_EVENT',
    );
  }
}
