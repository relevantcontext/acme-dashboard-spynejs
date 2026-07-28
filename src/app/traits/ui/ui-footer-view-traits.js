import { SpyneTrait, ViewStream } from 'spyne';

export class UIFooterViewTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'uiFooter$';
    super(context, traitPrefix);
  }

  static uiFooter$OnAppDataEvent(e) {
    this.appendView(
      new ViewStream({
        data: e.payload,
        class: 'footer-content',
        template: '<p>{{initData.footer}}</p>',
      }),
    );
  }
}
