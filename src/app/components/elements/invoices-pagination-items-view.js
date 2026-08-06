import { ViewStream } from 'spyne';
import InvoicesPaginationItemsTmpl from './templates/invoices-pagination-items-view.tmpl.html';

/**
 * One rendered pagination-state subtree: both arrows, the numbers and any
 * ellipses, in a single template.
 *
 * ── Why the controls are markup and not modules ─────────────────────────────
 *
 * The arrow, number and ellipsis were three ViewStream modules, and none of the
 * three declared a connection — no broadcastEvents, no listener, no channel, no
 * trait. Every one was a constructor computing a class string around a template
 * of `{{svgArrow}}`, `{{pageNumber}}` or a literal ellipsis. A module boundary
 * that asserts nothing about the system's connections is not spec; markup that
 * only displays belongs to the nearest template.
 *
 * The connections this module DOES declare are all real: the channel it listens
 * to, the two actions that end its life, and the one binding that turns a page
 * click into a CHANNEL_UI broadcast.
 *
 * ── Why the fold is safe here ───────────────────────────────────────────────
 *
 * broadcastEvents binds snapshot-direct — the selector runs against this view's
 * root at ITS render, once. Folding markup into a parent is therefore only safe
 * when that markup exists by then, and the page numbers change on every list.
 * This view is single-active-child: it skips the replayed event that created it
 * and disposes on the next list or channel-confirmed transition, so a new
 * instance renders and rebinds per state. Its rebirth is what makes a static
 * binding correct over changing content. 
 *  [dynamic-children-ingress recipe 1]
 *
 * The data arrives template-ready from invoicesPagination$ShapeItems — exactly
 * one of `isCurrent` / `isLink` / `isEllipsis` is present per entry, so the
 * template needs no conditional syntax it does not have.
 */
export class InvoicesPaginationItemsView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'inline-flex';
    props.template = InvoicesPaginationItemsTmpl;
    props.channels = [['CHANNEL_ACME_INVOICES', true]];

    super(props);
  }

  addActionListeners() {
    return [
      ['CHANNEL_ACME_INVOICES_LIST_EVENT', 'disposeViewStream'],
      ['CHANNEL_ACME_INVOICES_PAGINATION_EVENT', 'disposeViewStream'],
    ];
  }

  broadcastEvents() {
    // Every enabled control in this subtree, bound once at render. Disabled
    // arrows and the current page render as divs by construction, so they
    // cannot be matched and need no guard.
    return [['button', 'click']];
  }

  onRendered() {}
}
