import { ViewStream } from 'spyne';
import { withClass } from 'traits/utils/svg-icons.js';
import UIAcmeLogoTmpl from './templates/ui-acme-logo-view.tmpl.html';

/**
 * Converted from app/ui/acme-logo.tsx.
 *
 * The root element and its attributes are declared here; the markup lives in
 * templates/acme-logo.tmpl.html.
 *
 * `font-lusitana` replaces the Next.js `lusitana.className`. next/font generates
 * a class per family at build time; the SpyneJS side declares the families in
 * tailwind.config.js instead, so the utility is the equivalent.
 */
export class UIAcmeLogoView extends ViewStream {
  constructor(props = {}) {
    const { logoText = 'Acme' } = props.data || {};

    props.tagName = 'div';
    props.class =
      'font-lusitana flex flex-row items-center leading-none text-white';
    props.template = UIAcmeLogoTmpl;
    props.data = {
      ...props.data,
      // shrink-0 added to the source's classes: the logo is a flex item and the
      // login page's w-36 wrapper is narrower than icon + word, so without it
      // the icon gets squeezed below 48px.
      svgGlobeAlt: withClass('globeAlt', 'h-12 w-12 shrink-0 rotate-[15deg]'),
      logoText,
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
