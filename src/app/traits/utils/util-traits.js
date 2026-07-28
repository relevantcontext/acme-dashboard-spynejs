import { SpyneApp, SpyneTrait } from 'spyne';
import { isNil, isEmpty, either, clone, flatten } from 'ramda';
export class UtilTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'util$';
    super(context, traitPrefix);
  }
  static util$ToKebabCase(str) {
    return (
      str &&
      str
        .match(
          /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g,
        )
        .map((x) => x.toLowerCase())
        .join('-')
    );
  }

  static util$KebabToCamelCase(str) {
    if (str.indexOf('-') < 0) {
      return str;
    }

    return str.toLowerCase().replace(/-(.)/g, function (match, group1) {
      return group1.toUpperCase();
    });
  }

  static util$GetRandInt(max, min = 0) {
    let maxNum = max - min + 1;
    return Math.floor(Math.random() * maxNum) + min;
  }

  static util$SelectRandFromArr(arrSrc, amt = 1) {
    const arr = clone(arrSrc);
    let iter = 0;
    let len, n;
    let splicedArr = [];
    while (iter < amt) {
      len = arr.length - 1;
      // select start splice
      n = Math.floor(Math.random() * len + 1);
      //push slice item into new arr -- cant be duped
      splicedArr.push(arr.splice(n, 1));
      iter++;
    }

    return flatten(splicedArr);
  }

  static util$ScrollLock(el, bool = true) {
    const fn = bool
      ? SpyneApp.pluginsFn.enableScrollLock
      : SpyneApp.pluginsFn.disableScrollLock;
    fn(el, bool);
  }

  static util$checkForDeeplink(routeData) {
    const expandCard = (page, card) => {
      const { pageId, topicId } = this.props.data;
      return page === pageId && card === topicId;
    };
    const { pageId, topicId } = routeData;
    return expandCard(pageId, topicId);
  }

  static util$GetOffsetTop() {
    const pageContentEl = document.querySelector('.app-page .page-body');
    const pageContentTop = pageContentEl.offsetTop;
    return this.props.el.offsetTop + pageContentTop + 16 * 8;
  }

  static util$GetTemplate(name, filesArr) {
    const cache = {};
    const importAll = (r) => r.keys().forEach((key) => (cache[key] = r(key)));
    importAll(filesArr);
    let file = cache[`./${name}.page.tmpl.html`];
    return file !== undefined ? file : cache[`./page.tmpl.html`];
  }

  static util$Exists(item) {
    return !either(isNil, isEmpty)(item);
  }

  static util$Boolean(booleanStr) {
    return String(booleanStr).toLowerCase() === 'true';
  }

  static util$Negate(booleanStr) {
    return !UtilTraits.util$Boolean(booleanStr);
  }
}
