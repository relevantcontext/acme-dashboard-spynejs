/**
 * Heroicons as raw inline SVG.
 *
 * The Next.js app imports these as React components from @heroicons/react.
 * That package renders through React.createElement, so it is unusable here —
 * the markup was extracted from it into src/static/imgs/svgs/heroicons and is
 * inlined by webpack's `asset/source` rule.
 *
 * Icons carry no class of their own. Size and colour come from the caller via
 * withClass(), because the same icon is used at different sizes across the UI
 * (h-12 for the logo, w-4 inside a status pill, h-5 in a nav link).
 */
import arrowLeft from 'svgs/heroicons/arrow-left.svg';
import arrowPath from 'svgs/heroicons/arrow-path.svg';
import arrowRight from 'svgs/heroicons/arrow-right.svg';
// The login button uses the 20/solid arrow (filled), not the 24/outline one.
import arrowRightSolid from 'svgs/heroicons/arrow-right-solid.svg';
import atSymbol from 'svgs/heroicons/at-symbol.svg';
import banknotes from 'svgs/heroicons/banknotes.svg';
import calendar from 'svgs/heroicons/calendar.svg';
import check from 'svgs/heroicons/check.svg';
import clock from 'svgs/heroicons/clock.svg';
import currencyDollar from 'svgs/heroicons/currency-dollar.svg';
import documentDuplicate from 'svgs/heroicons/document-duplicate.svg';
import exclamationCircle from 'svgs/heroicons/exclamation-circle.svg';
import faceFrown from 'svgs/heroicons/face-frown.svg';
import globeAlt from 'svgs/heroicons/globe-alt.svg';
import home from 'svgs/heroicons/home.svg';
import inbox from 'svgs/heroicons/inbox.svg';
import key from 'svgs/heroicons/key.svg';
import link from 'svgs/heroicons/link.svg';
import magnifyingGlass from 'svgs/heroicons/magnifying-glass.svg';
import pencil from 'svgs/heroicons/pencil.svg';
import plus from 'svgs/heroicons/plus.svg';
import power from 'svgs/heroicons/power.svg';
import trash from 'svgs/heroicons/trash.svg';
import userCircle from 'svgs/heroicons/user-circle.svg';
import userGroup from 'svgs/heroicons/user-group.svg';

export const icons = {
  arrowLeft,
  arrowPath,
  arrowRight,
  arrowRightSolid,
  atSymbol,
  banknotes,
  calendar,
  check,
  clock,
  currencyDollar,
  documentDuplicate,
  exclamationCircle,
  faceFrown,
  globeAlt,
  home,
  inbox,
  key,
  link,
  magnifyingGlass,
  pencil,
  plus,
  power,
  trash,
  userCircle,
  userGroup,
};

/**
 * Returns the icon markup with a class applied to the root <svg>.
 *
 * Done here rather than in a template because DomElementTemplate has no syntax
 * for it by design — string shaping is logic and belongs outside the template.
 */
export const withClass = (name, classStr = '') => {
  const svg = icons[name];

  if (!svg) {
    console.warn(`Spyne Warning: unknown icon "${name}"`);
    return '';
  }

  return classStr ? svg.replace('<svg ', `<svg class="${classStr}" `) : svg;
};
