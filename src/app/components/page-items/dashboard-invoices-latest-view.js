import { ViewStream } from 'spyne';
import { withClass } from 'utils/svg-icons.js';
import { buildLatestInvoiceRows } from 'utils/acme-utils.js';
import DashboardInvoicesLatestTmpl from './templates/dashboard-invoices-latest-view.tmpl.html';

/**
 * Converted from app/ui/dashboard/latest-invoices.tsx (outer markup).
 *
 * The rows are a template section over the latestInvoices slice of the
 * /api/bootstrap dump.
 *
 * ── Why the rows are markup and not modules ─────────────────────────────────
 *
 * DashboardInvoicesLatestRowView declared no connection: no broadcastEvents, no
 * listener, no channel, no trait. A constructor resolving an image path and the
 * source's `{ 'border-t': i !== 0 }` into a class, around markup that only
 * displays. [mint-module-by-declared-connection]
 *
 * This file used to argue the opposite — that a template section would render
 * whatever the store held at construction, which on a cold load was nothing.
 * That was true of the design where page items mounted empty and filled in on a
 * later event. It has not been true since page items began being CONSTRUCTED
 * with the dump: PageAcmeView admits only a loaded payload and hands acmeData
 * down in props, which is what the addActionListeners note below already says.
 * The old comment outlived its architecture — recorded here rather than quietly
 * deleted, because it nearly preserved four modules for a dead reason.
 */
export class DashboardInvoicesLatestView extends ViewStream {
  constructor(props = {}) {
    const { heading = 'Latest Invoices', updatedText = 'Updated just now' } =
      props.data || {};

    props.tagName = 'div';
    props.class = 'flex w-full flex-col md:col-span-4';
    props.template = DashboardInvoicesLatestTmpl;
    props.data = {
      ...props.data,
      heading,
      updatedText,
      svgArrowPath: withClass('arrowPath', 'h-5 w-5 text-gray-500'),
      rows: buildLatestInvoiceRows(props.data?.acmeData),
    };

    super(props);
  }

  addActionListeners() {
    // No channel. This item is parent-governed: it is built by PageAcmeView with
    // its data already in props, and it renders and disposes with the page.
    // Nothing arrives after birth, so there is nothing to listen for.
    return [];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {}
}
