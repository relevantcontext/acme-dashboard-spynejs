import { Channel } from 'spyne';
import { ChannelMenuDrawerTraits } from 'traits/channel/channel-menu-drawer-traits.js';

export class ChannelMenuDrawer extends Channel {
  constructor(name, props = {}) {
    name = 'CHANNEL_MENU_DRAWER';
    props.sendCachedPayload = true;
    props.traits = [ChannelMenuDrawerTraits];
    super(name, props);
    this.props.showMenu = false;
  }

  onRegistered() {
    this.channelMenuDrawer$OnRegistered();
  }

  addRegisteredActions() {
    return [
      'CHANNEL_MENU_DRAWER_INIT_EVENT',
      'CHANNEL_MENU_DRAWER__SHOW_EVENT',
      'CHANNEL_MENU_DRAWER__HIDE_EVENT',
    ];
  }
}
