import { ViewStream } from 'spyne';
import heroDesktop from 'imgs/hero-desktop.png';
import HomeHeroTmpl from './templates/home-hero-view.tmpl.html';

/**
 * The dashboard screenshot on the landing page, from app/page.tsx.
 *
 * next/image becomes a plain <img>; there is no image optimiser here. The file
 * is imported rather than referenced by path so webpack's asset rule emits it
 * and rewrites the URL — a hardcoded /hero-desktop.png would not resolve, since
 * this app serves images from static/imgs rather than a public/ root.
 *
 * Desktop only for now, matching the decision to defer mobile views. The source
 * also renders a `block md:hidden` mobile variant; hero-mobile.png is already in
 * static/imgs for when that goes in.
 */
export class HomeHeroView extends ViewStream {
  constructor(props = {}) {
    const {
      imageAlt = 'Screenshots of the dashboard project showing desktop version',
    } = props.data || {};

    props.class = 'contents';
    props.template = HomeHeroTmpl;
    props.data = {
      ...props.data,
      attrImageSrc: heroDesktop,
      attrImageAlt: imageAlt,
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
