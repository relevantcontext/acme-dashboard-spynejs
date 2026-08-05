import { ViewStream, ChannelPayloadFilter } from 'spyne';
import QuickSearchCustomerItemTmpl from './templates/quick-search-customer-item-view.tmpl.html';

/**
 * One matched customer in the quick-search overlay.
 *
 * The whole row is a button whose dataset carries the customer's name — the
 * activation payload — routed to the search channel (eventType acmeSearch /
 * btnType select-customer), which closes the overlay, navigates to the
 * invoices page and writes the query param. The name IS the filter because
 * the invoices page filters by free-text query, the ILIKE semantics both apps
 * share. [dataset-as-payload]
 *
 * Same lifecycle as the invoice row: dispose when a RESULTS emission's
 * customer matches exclude this id; the overlay's disposal cascade covers
 * close. [dispose-by-predicate-filter]
 *
 * @param {Object} props
 * @param {Object} props.data  one entry from buildQuickSearchCustomerRows
 */
export class QuickSearchCustomerItemView extends ViewStream {
  constructor(props = {}) {
    props.tagName = 'div';
    props.class = 'qs-item qs-customer-item';
    props.dataset = {
      qsKey: `customer-${props.data?.attrCustomerId}`,
      customerId: props.data?.attrCustomerId,
    };
    props.template = QuickSearchCustomerItemTmpl;
    props.channels = ['CHANNEL_ACME_SEARCH'];

    super(props);
  }

  addActionListeners() {
    const matchesExcludeMe = new ChannelPayloadFilter({
      payload: (payload) => {
        const matches = payload?.customerMatches;

        return (
          Array.isArray(matches) === true &&
          matches.some(
            ({ id }) => String(id) === String(this.props.data?.attrCustomerId),
          ) === false
        );
      },
    });

    return [
      [
        'CHANNEL_ACME_SEARCH_RESULTS_EVENT',
        'disposeViewStream',
        matchesExcludeMe,
      ],
    ];
  }

  broadcastEvents() {
    return [['button', 'click']];
  }

  onRendered() {}
}
