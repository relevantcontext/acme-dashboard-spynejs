import { SpyneTrait, ViewStream, SpyneAppProperties } from 'spyne';
import { HeroView } from 'components/page-items/hero-view.js';
import { CardsContainerView } from 'components/page-items/cards-container-view.js';
import { FormContactUsView } from 'components/page-items/form-contact-us-view.js';

// Acme page-item ViewStreams. A pageItem in app.model.json names its class as a
// `viewClass` string; pageItemCore$GetViewClass resolves it through the lookup
// below. Every acme module is registered here — including the nested ones
// (rows, bars, status pill, buttons, breadcrumb/nav items) so a container view
// can look them up when composing its slots. Breadcrumbs are not here — the
// app uses the native NavBreadcrumbView.
import { DashboardInvoicesLatestRowView } from 'components/page-items/acme/dashboard-invoices-latest-row-view.js';
import { DashboardInvoicesLatestView } from 'components/page-items/acme/dashboard-invoices-latest-view.js';
import { DashboardRevenueBarView } from 'components/page-items/acme/dashboard-revenue-bar-view.js';
import { DashboardRevenueYAxisView } from 'components/page-items/acme/dashboard-revenue-y-axis-view.js';
import { DashboardRevenueChartView } from 'components/page-items/acme/dashboard-revenue-chart-view.js';
import { DashboardStatCardView } from 'components/page-items/acme/dashboard-stat-card-view.js';
import { DashboardStatsContainer } from 'components/page-items/acme/dashboard-stats-container.js';
import { HomeHeroView } from 'components/page-items/acme/home-hero-view.js';
import { HomeIntroView } from 'components/page-items/acme/home-intro-view.js';
import { CustomersCardView } from 'components/page-items/acme/customers-card-view.js';
import { CustomersTableRowView } from 'components/page-items/acme/customers-table-row-view.js';
import { CustomersTableView } from 'components/page-items/acme/customers-table-view.js';
import { InvoicesCardView } from 'components/page-items/acme/invoices-card-view.js';
import { InvoicesCreateButtonView } from 'components/page-items/acme/invoices-create-button-view.js';
import { InvoicesCreateFormView } from 'components/page-items/acme/invoices-create-form-view.js';
import { InvoicesCustomerOptionView } from 'components/page-items/acme/invoices-customer-option-view.js';
import { InvoicesDeleteButtonView } from 'components/page-items/acme/invoices-delete-button-view.js';
import { InvoicesEditFormView } from 'components/page-items/acme/invoices-edit-form-view.js';
import { InvoicesPaginationArrowView } from 'components/page-items/acme/invoices-pagination-arrow-view.js';
import { InvoicesPaginationEllipsisView } from 'components/page-items/acme/invoices-pagination-ellipsis-view.js';
import { InvoicesPaginationItemsView } from 'components/page-items/acme/invoices-pagination-items-view.js';
import { InvoicesPaginationNumberView } from 'components/page-items/acme/invoices-pagination-number-view.js';
import { InvoicesPaginationContainer } from 'components/page-items/acme/invoices-pagination-container.js';
import { InvoicesStatusView } from 'components/page-items/acme/invoices-status-view.js';
import { InvoicesTableRowView } from 'components/page-items/acme/invoices-table-row-view.js';
import { InvoicesTableView } from 'components/page-items/acme/invoices-table-view.js';
import { InvoicesUpdateButtonView } from 'components/page-items/acme/invoices-update-button-view.js';
import { UIAcmeLogoView } from 'components/page-items/acme/ui-acme-logo-view.js';
import { UIButtonView } from 'components/page-items/acme/ui-button-view.js';
import { LoginFormView } from 'components/page-items/acme/login-form-view.js';
import { UINavLinkView } from 'components/page-items/acme/ui-nav-link-view.js';
import { UISearchView } from 'components/page-items/acme/ui-search-view.js';
import { UISideNavView } from 'components/page-items/acme/ui-sidenav-view.js';

export class PageItemCoreTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'pageItemCore$';
    super(context, traitPrefix);
  }

  static pageItemCore$AddStyles(element, cssString) {
    if (!element) return;
    if (typeof cssString !== 'string' || !cssString.trim()) return;

    // Check for an existing Spyne inline style
    const existing = element.querySelector(
      'style[data-spyne-inline-style="true"]',
    );
    if (existing) {
      existing.textContent = cssString;
      return;
    }

    const styleTag = document.createElement('style');
    styleTag.setAttribute('data-spyne-inline-style', 'true');
    styleTag.textContent = cssString;

    element.appendChild(styleTag);
  }

  /**
   * Resolves a named region to a selector inside the page template.
   *
   * Page templates are free to name their own regions — a page does not have to
   * provide `.page-heading` / `.page-body`. A page declares its regions in
   * app.model.json:
   *
   *   "regions": { "body": "[data-region=\"main\"]",
   *                "panels": "[data-region=\"panels\"]" }
   *
   * The two fallbacks below only exist for the scaffold pages that still use
   * page.tmpl.html (home, 404). Any acme page names its own.
   */
  static pageItemCore$GetRegion(name = 'body', data = this.props.data) {
    const regions = data?.regions || {};

    if (regions[name]) {
      return regions[name];
    }

    const legacyFallbacks = { body: '.page-body', heading: '.page-heading' };
    return legacyFallbacks[name] || legacyFallbacks.body;
  }

  static pageItemCore$CheckToAddPageTraitContainer(options = {}) {
    const {
      isEnabled = true,
      classOptions = {},
      spacing = 'default',
      selector,
      region,
    } = options;

    // A raw selector wins; otherwise a named region is resolved against the
    // page's own template. `region` is the intended form — it keeps template
    // internals out of the model.
    if (selector) {
      return selector;
    }

    if (region) {
      return this.pageItemCore$GetRegion(region);
    }

    const getContainerClass = () => {
      const classes = ['page-item'];

      // ---------------------------------------------
      // Variant (surface style)
      // ---------------------------------------------
      if (classOptions.variant) {
        classes.push(`page-item--${classOptions.variant}`);
      }

      // ---------------------------------------------
      // Flush (remove internal padding)
      // ---------------------------------------------
      if (classOptions.flush === true) {
        classes.push('page-item--flush');
      }

      // ---------------------------------------------
      // Bleed (full-width section)
      // ---------------------------------------------
      if (classOptions.bleed === true) {
        classes.push('page-item--bleed');
      }

      // ---------------------------------------------
      // Spacing (vertical rhythm)
      // ---------------------------------------------
      if (spacing === 'none') {
        classes.push('page-item--no-spacing');
      }

      if (spacing === 'tight') {
        classes.push('page-item--tight-spacing');
      }

      return classes.join(' ');
    };

    const bodyRegion = this.pageItemCore$GetRegion('body');

    if (isEnabled) {
      const props = {};
      props.class = getContainerClass();

      const vs = new ViewStream(props);
      this.appendView(vs, bodyRegion);
      return vs.props.id$;
    }

    return bodyRegion;
  }

  /**
   * Builds an Acme page's items, handing each one the current Acme data at
   * construction.
   *
   * ── Why the data arrives as a constructor prop ──────────────────────────
   *
   * A page item is then a pure function of its props: it is handed its content
   * and renders it, with no channel of its own, no listener, and no global to
   * read. That is the whole point of the SpyneJS side of this comparison — a
   * view generates its content from what it was given.
   *
   * It also removes a race. Items used to mount empty and fill in when an event
   * arrived, which is why a 40ms setTimeout was needed to let the DOM settle
   * first. Constructing them only once the data exists means there is nothing to
   * wait for.
   *
   * `acmeData` is namespaced rather than merged flat: the model already gives
   * DashboardStatsContainer a `cards` array of definitions, and the dump has its
   * own `cards` object of values. Flattening would have one silently overwrite
   * the other.
   *
   * Nothing is returned and no reference is kept. A ViewStream is encapsulated —
   * a parent never holds its children, or the declarative wiring stops being the
   * thing that describes the app.
   */
  static pageItemCore$AddDashboardPageItems(props = this.props) {
    const { acmeData, acmeStatus, data } = props;
    const elementsArr = data.pageItems;

    const addElement = (obj) => {
      const { props, container, viewClass, isPrototype } = obj;

      props.template = this.pageItemCore$GetTemplate(props, isPrototype);
      props.data = { ...props.data, acmeData, acmeStatus };

      const ViewClass = this.pageItemCore$GetViewClass(viewClass);

      const appendElSelector =
        this.pageItemCore$CheckToAddPageTraitContainer(container);

      const view = new ViewClass(props);

      this.appendView(view, appendElSelector);

      if (props?.styles) {
        PageItemCoreTraits.pageItemCore$AddStyles(view.props.el, props.styles);
      }
    };

    elementsArr.forEach(addElement);
  }

  /**
   * Composes the page's items from the Acme dump.
   *
   * The branch reads state this view already holds rather than a flag kept
   * alongside it. `props.acmeData` being set means this page was already
   * composed, so a further payload is not a duplicate to swallow — it is news,
   * and it gets its own handling.
   *
   * A boolean guard would say only "ignore this". Asking whether the data is
   * already here says what actually happened, and leaves somewhere obvious to
   * put the answer when a second arrival needs one.
   */
  static pageItemCore$OnAcmeData(e, props = this.props) {
    const { data, status } = e?.payload ?? {};

    if (props.acmeData) {
      return this.pageItemCore$OnAcmeDataAfterCompose(e, props);
    }

    props.acmeData = data ?? null;
    props.acmeStatus = status ?? null;

    this.pageItemCore$AddDashboardPageItems();
  }

  /**
   * Data arrived after this page was composed. Why it arrived decides what to do.
   *
   * The status is recorded either way, so anything reading it is current.
   *
   * A failed request keeps whatever is on screen — the payload still carries the
   * last good dump, so blanking the page would lose more than it reports.
   * Surfacing the message needs an error region the acme pages do not have yet;
   * this is where that goes.
   *
   * Otherwise it is a refreshed dump, and the page deliberately does not rebuild.
   * That matches next-learn: its dashboard has no revalidation at all, and only
   * `/dashboard/invoices` is revalidated — after a delete, which is the one
   * mutation there that does not redirect. In-place refresh belongs to that
   * table, at the row, not to every page.
   */
  static pageItemCore$OnAcmeDataAfterCompose(e, props = this.props) {
    const { status } = e?.payload ?? {};
    props.acmeStatus = status ?? null;
  }

  static pageItemCore$AddPageItems(elementsArr = this.props.data.pageItems) {
    const addElement = (obj) => {
      const { props, container, viewClass, isPrototype } = obj;
      props.template = this.pageItemCore$GetTemplate(props, isPrototype);

      const ViewClass = this.pageItemCore$GetViewClass(viewClass);

      const appendElSelector =
        this.pageItemCore$CheckToAddPageTraitContainer(container);

      const view = new ViewClass(props);

      this.appendView(view, appendElSelector);

      if (props?.styles) {
        PageItemCoreTraits.pageItemCore$AddStyles(view.props.el, props.styles);
      }
    };

    elementsArr.forEach(addElement);
  }

  static pageItemCore$onRendered(props = this.props) {
    const { hero, pageItems, content, pageType } = props.data;

    if (hero) {
      this.appendView(
        new HeroView({ data: hero, pageType }),
        this.pageItemCore$GetRegion('heading'),
      );
    }

    if (content) {
      // no cards for this experience
      /* this.appendView(
        new CardsContainerView({ data: content, pageType }),
        this.pageItemCore$GetRegion('body'),
      );*/
    }

    if (pageItems) {
      this.pageItemCore$AddPageItems();
    }
  }

  static pageItemCore$GetTemplate(
    pageItemProps = { template: '' },
    isPrototype = true,
  ) {
    const { template } = pageItemProps;

    if (isPrototype === true) {
      return template;
    }

    const templateLookup = SpyneAppProperties.getProp('pageItemTemplateLookup');
    if (isPrototype === false) {
      return templateLookup[template] || '<h1>Missing Template</h1>';
    }
    return template;
  }

  static pageItemCore$GetViewClass(viewClass = 'ViewStream') {
    const classLookup = {
      ContactUsView: FormContactUsView,

      // Acme — keyed by the exported class name, so a pageItem's
      // `viewClass: "InvoicesTableView"` resolves to the class directly.
      DashboardInvoicesLatestRowView,
      DashboardInvoicesLatestView,
      DashboardRevenueBarView,
      DashboardRevenueYAxisView,
      DashboardRevenueChartView,
      DashboardStatCardView,
      DashboardStatsContainer,
      HomeHeroView,
      HomeIntroView,
      CustomersCardView,
      CustomersTableRowView,
      CustomersTableView,
      InvoicesCardView,
      InvoicesCreateButtonView,
      InvoicesCreateFormView,
      InvoicesCustomerOptionView,
      InvoicesDeleteButtonView,
      InvoicesEditFormView,
      InvoicesPaginationArrowView,
      InvoicesPaginationEllipsisView,
      InvoicesPaginationItemsView,
      InvoicesPaginationNumberView,
      InvoicesPaginationContainer,
      InvoicesStatusView,
      InvoicesTableRowView,
      InvoicesTableView,
      InvoicesUpdateButtonView,
      LoginFormView,
      UIAcmeLogoView,
      UIButtonView,
      UINavLinkView,
      UISearchView,
      UISideNavView,
    };
    return classLookup[viewClass] || ViewStream;
  }
}
