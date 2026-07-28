import { SpyneTrait } from 'spyne';

export class NavPrimaryViewTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'nav$';

    super(context, traitPrefix);
  }

  static nav$UIHeaderNavViewUpdateSettingsBtn(type, value) {
    this.props.el$(`[data-settings-type="${type}"]`).el.dataset.settingsValue =
      value;
  }

  static nav$UIHeaderNavViewOnSettingsInit(e) {
    const { theme } = e.payload;
    this.nav$UIHeaderNavViewUpdateSettingsBtn('theme', theme);
  }

  static nav$UIHeaderNavViewOnSettingsEvent(e) {
    const { settingsType, settingsValue } = e.payload;
    this.nav$UIHeaderNavViewUpdateSettingsBtn(settingsType, settingsValue);
  }

  static nav$UIHeaderNavViewOnRouteChangeEvent(e) {
    const { pageId } = e.payload;
    const activeSel = `a.nav[data-page-id='${pageId}']`;
    this.props.el$('a.nav').setActiveItem('selected', activeSel);
  }
}
