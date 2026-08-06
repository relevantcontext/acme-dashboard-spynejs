import { ViewStream } from 'spyne';

/**
 * The app's global hotkey tap: one ViewStream ADOPTING document.body (the
 * props.el adoption mode) whose only job is to declare `keydown` on the body
 * as a broadcast. It renders nothing, owns nothing, and never disposes.
 *
 * ── Why not the WINDOW channel ──────────────────────────────────────────────
 *
 * CHANNEL_WINDOW already carries keydown, but it binds every window event with
 * `{passive: true}` — preventDefault from that path is silently ignored. The
 * quick-search shortcut NEEDS preventDefault: Cmd/Ctrl-K is Chrome's omnibox
 * search, so an unprevented press opens the overlay and then hands the
 * browser's own search bar the focus; ArrowUp/ArrowDown likewise need their
 * caret default suppressed while the overlay input is focused. The
 * broadcastEvents path binds with rxjs fromEvent — NOT passive — so the
 * consuming channel can cancel the default.
 *
 * Every keydown in the document bubbles to body (a bare body-focused press
 * TARGETS body), so this one binding hears the shortcut from any page and the
 * navigation keys from inside the overlay input alike. The payload carries no
 * eventType — body has no authored dataset — so the quick-search channel
 * narrows on the action, CHANNEL_UI_KEYDOWN_EVENT, which no other view
 * broadcasts.
 *
 * Same family as AcmeRequesterNullView / AcmeQueryParamsNullView: a ViewStream
 * that exists to hold one boundary the channels cannot hold themselves.
 */
export class AppHotkeysView extends ViewStream {
  constructor(props = {}) {
    // Adoption mode: the element already exists and is in the document, so
    // the view attaches to it (postRender runs immediately) instead of
    // rendering one.
    props.el = document.body;

    super(props);
  }

  broadcastEvents() {
    // Selector resolution for an adopted el: 'body' is not a DESCENDANT of
    // body, so the broadcaster's parent-element fallback is what matches the
    // adopted element itself — this is the documented path for binding a
    // view's own root.
    return [['body', 'keydown']];
  }
}
