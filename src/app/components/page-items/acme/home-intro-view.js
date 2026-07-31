import { ViewStream } from 'spyne';
import { withClass } from 'traits/utils/svg-icons.js';
import HomeIntroTmpl from './templates/home-intro-view.tmpl.html';

/**
 * Converted from the copy panel in app/page.tsx.
 *
 * The sentence keeps the source's shape — a bold lead, body copy with an inline
 * link, and a login CTA — but every string is a prop so the model owns the
 * wording. The link is split into before/after fragments because
 * DomElementTemplate has no way to interpolate markup into the middle of a
 * string, which is how the source embeds its anchor mid-sentence.
 *
 * The CTA carries the ROUTE data attributes so it navigates in-app rather than
 * reloading, which is what next/link does on the other side.
 *
 * @param {Object} props  all optional; defaults describe this app
 */
export class HomeIntroView extends ViewStream {
  constructor(props = {}) {
    const {
      leadText = 'Welcome to SpyneJS Acme Comparison app.',
      bodyTextBefore = 'This is an example to introduce Next.js users to the ',
      linkText = 'SpyneJS platform',
      linkHref = 'https://spynejs.com',
      bodyTextAfter = '.',
      ctaText = 'Log in',
      loginHref = '/login',
    } = props.data || {};

    props.class = 'contents';
    props.template = HomeIntroTmpl;
    props.data = {
      ...props.data,
      leadText,
      bodyTextBefore,
      linkText,
      attrLinkHref: linkHref,
      bodyTextAfter,
      ctaText,
      attrLoginHref: loginHref,
      svgArrowRight: withClass('arrowRight', 'w-5 md:w-6'),
    };

    super(props);
  }

  addActionListeners() {
    return [];
  }

  broadcastEvents() {
    return [['a', 'click']];
  }

  onRendered() {}
}
