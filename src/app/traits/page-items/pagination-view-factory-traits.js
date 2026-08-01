import { SpyneTrait, ViewStream } from 'spyne';
import { InvoicesPaginationArrowView } from 'components/page-items/acme/invoices-pagination-arrow-view.js';
import { InvoicesPaginationNumberView } from 'components/page-items/acme/invoices-pagination-number-view.js';
import { InvoicesPaginationEllipsisView } from 'components/page-items/acme/invoices-pagination-ellipsis-view.js';

const VIEW_LOOKUP = Object.freeze({
  previous: InvoicesPaginationArrowView,
  page: InvoicesPaginationNumberView,
  ellipsis: InvoicesPaginationEllipsisView,
  next: InvoicesPaginationArrowView,
});

/** Builds presentation ViewStreams from semantic pagination descriptors. */
export class PaginationViewFactoryTraits extends SpyneTrait {
  constructor(context) {
    super(context, 'paginationViewFactory$');
  }

  static paginationViewFactory$GetViewClass(type) {
    return VIEW_LOOKUP[type] || ViewStream;
  }

  static paginationViewFactory$Render(items = this.props.data?.items || []) {
    items.forEach((data) => {
      const ViewClass = this.paginationViewFactory$GetViewClass(data.type);
      const selector =
        data.type === 'previous'
          ? '[data-slot="arrow-left"]'
          : data.type === 'next'
            ? '[data-slot="arrow-right"]'
            : '[data-slot="numbers"]';

      this.appendView(new ViewClass({ data }), selector);
    });
  }
}
