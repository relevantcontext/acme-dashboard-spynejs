import { SpyneTrait, ChannelPayloadFilter } from 'spyne';

export class AppSettingsTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'appSettings$';
    super(context, traitPrefix);
  }

  static appSettings$OnSettingEvent(e) {
    let { settingsType, settingsValue } = e.payload;

    settingsValue = settingsValue === 'light' ? 'dark' : 'light';

    const action = 'CHANNEL_APP_SETTING_EVENT';

    this.sendChannelPayload(action, { settingsType, settingsValue });
  }

  static appSettings$InitSettingEvents() {
    const settingsBtnFilter = new ChannelPayloadFilter({
      eventType: 'setting',
      action: 'CHANNEL_UI_CLICK_EVENT',
    });

    this.getChannel('CHANNEL_UI', settingsBtnFilter).subscribe(
      this.appSettings$OnSettingEvent.bind(this),
    );
  }
}
