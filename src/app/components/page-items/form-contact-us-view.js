import { ViewStream } from 'spyne';
import { FormContactUsTraits } from 'traits/form/form-contact-us-traits.js';

export class FormContactUsView extends ViewStream {
  constructor(props = {}) {
    props.traits = [FormContactUsTraits];
    props.channels = ['CHANNEL_UI'];
    props.mode = 'api';
    props.apiUrl = 'http://localhost:8223/mock/contact';

    super(props);
  }

  addActionListeners() {
    return [['CHANNEL_UI_SUBMIT_EVENT', 'contactUs$SendFormData']];
  }

  broadcastEvents() {
    return [['form', 'submit']];
  }

  onRendered() {}
}
