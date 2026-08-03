import { ViewStream } from 'spyne';
import { withClass } from 'utils/svg-icons.js';
import { FormLoginTraits } from 'traits/ui/form-login-traits.js';
import LoginFormTmpl from './templates/login-form-view.tmpl.html';

const ICON_CLASS =
  'pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900';

/**
 * Converted from app/ui/login-form.tsx.
 *
 * The source is a Next.js client component driven by useActionState against the
 * `authenticate` server action. None of that is markup: the submit and the
 * error display are wired later.
 *
 * The submit button is inlined rather than slotted — it is intrinsic to the
 * form and always present, so it renders in the static phase. It already
 * carries `data-btn-type="login"` for the wiring step.
 *
 * [data-slot="error"] holds the ExclamationCircle + message shown on a failed
 * login. Kept empty here — it renders nothing until there is an error, matching
 * the source's `&&`.
 *
 * @param {Object} props
 * @param {Object} [props.data]
 * @param {String} [props.data.heading]
 * @param {String} [props.data.emailLabel]
 * @param {String} [props.data.emailPlaceholder]
 * @param {String} [props.data.passwordLabel]
 * @param {String} [props.data.passwordPlaceholder]
 * @param {String} [props.data.loginLabel]
 * @param {String} [props.data.callbackUrl]  hidden redirectTo, defaults to /dashboard
 */
export class LoginFormView extends ViewStream {
  constructor(props = {}) {
    const {
      heading = 'Please log in to continue.',
      emailLabel = 'Email',
      emailPlaceholder = 'Enter your email address',
      passwordLabel = 'Password',
      passwordPlaceholder = 'Enter password',
      loginLabel = 'Log in',
      callbackUrl = '/dashboard',
    } = props.data || {};

    props.tagName = 'form';
    props.class = 'space-y-3';
    props.channels = ['CHANNEL_UI'];
    props.traits = [FormLoginTraits];

    // Stops the browser from navigating on submit, which would reload the page
    // before the fetch could complete. Spyne reads this off the element that
    // raised the event.
    props.dataset = { eventPreventDefault: 'true' };

    props.template = LoginFormTmpl;
    props.data = {
      ...props.data,
      heading,
      emailLabel,
      emailPlaceholder,
      passwordLabel,
      passwordPlaceholder,
      attrRedirectTo: callbackUrl,
      loginLabel,
      svgAtSymbol: withClass('atSymbol', ICON_CLASS),
      svgKey: withClass('key', ICON_CLASS),
      // 20/solid arrow, matching the source's <ArrowRightIcon> from that set.
      svgArrowRight: withClass('arrowRightSolid', 'ml-auto h-5 w-5 text-gray-50'),
    };

    super(props);
  }

  addActionListeners() {
    return [['CHANNEL_UI_SUBMIT_EVENT', 'login$OnSubmit']];
  }

  broadcastEvents() {
    // The root element IS the form. Spyne falls back to matching the view's own
    // element when the selector finds nothing inside it, so this binds the root.
    return [['form', 'submit']];
  }

  onRendered() {}
}
