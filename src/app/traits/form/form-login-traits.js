import { SpyneTrait } from 'spyne';

export class FormLoginTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'login$';
    super(context, traitPrefix);
  }

  /**
   * Handles CHANNEL_UI_SUBMIT_EVENT from the login form.
   *
   * The credentials go straight to CHANNEL_FETCH_ACME_AUTH rather than through
   * ChannelAcmeAuth. A ChannelFetch request has to originate from a ViewStream —
   * that is the whole reason AcmeRequester exists — and this form *is* a
   * ViewStream, so it can send directly. Routing it through the channel first
   * would mean publishing the password onto CHANNEL_ACME_AUTH just to have the
   * requester hand it back to the same fetch channel.
   *
   * `url` and `method` are deliberately not sent: CHANNEL_FETCH_ACME_AUTH is
   * registered with `/api/auth/login` and POST in acme-db-connections-traits,
   * and ChannelFetch merges the request options over the channel's own props. So
   * the endpoint stays defined in exactly one place.
   *
   * The response is not handled here. ChannelAcmeAuth subscribes to
   * CHANNEL_FETCH_ACME_AUTH and republishes it as
   * CHANNEL_ACME_AUTH_LOGIN_SUCCESS_EVENT / _LOGIN_FAILED_EVENT, so the form
   * listens for those rather than owning the outcome.
   */
  static login$OnSubmit(e) {
    const form = e?.srcElement?.el;

    if (!form) {
      console.warn('Spyne Warning: login submit event carried no form element');
      return;
    }

    const formData = new FormData(form);

    this.sendInfoToChannel(
      'CHANNEL_FETCH_ACME_AUTH',
      {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.get('email'),
          password: formData.get('password'),
        }),
      },
      'CHANNEL_FETCH_ACME_AUTH_REQUEST_EVENT',
    );
  }
}
