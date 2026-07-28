import { SpyneTrait, ViewStream } from 'spyne';
import { FormContactUsView } from 'components/page-items/form-contact-us-view.js';

export class PageItemCustomTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'pageItem$';
    super(context, traitPrefix);
  }

  static pageItem$HelloWorld() {
    return 'Hello World';
  }

  static pageItem$GetViewClass(viewClass = 'ViewStream') {
    const classLookup = {
      ContactUsView: FormContactUsView,
    };
    return classLookup[viewClass] || ViewStream;
  }
}
