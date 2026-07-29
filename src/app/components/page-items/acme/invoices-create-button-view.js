import { ViewStream } from 'spyne';
import { withClass } from 'traits/utils/svg-icons.js';
import InvoicesCreateButtonTmpl from './templates/invoices-create-button-view.tmpl.html';

/**
 * Converted from the CreateInvoice export in app/ui/invoices/buttons.tsx.
 *
 * The source file exports three components; each becomes its own module, since
 * a module here declares one root element and its attributes.
 *
 * next/link becomes a plain anchor carrying the ROUTE channel attributes, which
 * is how navigation is declared in this app.
 *
 * NOTE: the app's ROUTE config currently defines home, login and
 * dashboard/{invoices,customers} only — there is no `create` path yet. The href
 * is correct but will not resolve until that route is added through the App
 * Builder, which is where route config is authored.
 */
export class InvoicesCreateButtonView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'a';
    props.class =
      'flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';
    props.href = props.href || '/dashboard/invoices/create';
    props.dataset = {
      channel: 'ROUTE',
      pageId: 'dashboard',
      topicId: 'invoices',
      eventPreventDefault: 'true',
    };
    props.template = InvoicesCreateButtonTmpl;
    props.data = {
      label: 'Create Invoice',
      svgPlus: withClass('plus', 'h-5 md:ml-4'),
    };

    super(props);
  }

  addActionListeners() {
    return [];
  }

  broadcastEvents() {
    return [];
  }

  onRendered() {}
}
