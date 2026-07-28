import { ChannelFetchUtil, SpyneTrait } from 'spyne';

export class FormContactUsTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'contactUs$';
    super(context, traitPrefix);
  }

  static contactUs$SendFormData(e, props = this.props) {
    const { srcElement } = e;

    const { mode, apiUrl } = props;

    const form = srcElement.el;
    const formData = new FormData(form);

    const formDataObj = {
      name: formData.get('name'),
      email: formData.get('email'),
      message: formData.get('message'),
    };

    if (mode === 'api') {
      this.contactUs$SendFormViaApi(formDataObj, apiUrl);
    } else {
      this.contactUs$SendFormViaEmail(formDataObj);
    }
  }

  static contactUs$SendFormViaEmail({ name, email, message }) {
    const subject = encodeURIComponent(`Contact from ${name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\n${message}`,
    );

    window.location.href = `mailto:test@test.com?subject=${subject}&body=${body}`;
  }

  static contactUs$SendFormViaApi(body, apiUrl) {
    new ChannelFetchUtil(
      {
        url: apiUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      },
      this.contactUs$OnSuccess.bind(this),
    );
  }

  contactUs$OnSuccess() {}

  static contactUs$HelloWorld() {
    return 'Hello World';
  }
}
