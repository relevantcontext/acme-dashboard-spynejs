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

  static pageItemCore$AddDashboardPageItems(elementsArr = this.props.data.pageItems,) {
    const addElement = (obj) => {
      const { props, container, viewClass, isPrototype } = obj;

      /**
       *
       * TODO: add the ACME Data to the page item's props.data
       *
       * */

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
