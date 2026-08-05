import { SpyneTrait } from 'spyne';

/**
 * Logic for UISearchView: keep the input's value true to the channel's query.
 *
 * The input seeds itself from the URL at construction, which covers a deep
 * link — but the query can move AFTER construction without a keystroke in
 * this box: the quick-search overlay's customer selection writes it, and
 * back/forward steps between two searches replay it. Every such move ends in
 * the domain channel's LIST emission, whose payload carries the resolved
 * query, so mirroring that one payload keeps the input honest by the same
 * path that moves the table. [live-mirror-via-el$]
 *
 * Never while focused: the user's in-progress value IS the source the channel
 * is following at that moment, and rewriting it under the caret would fight
 * the typing loop it feeds.
 */
export class UISearchTraits extends SpyneTrait {
  constructor(context) {
    super(context, 'uiSearch$');
  }

  static uiSearch$OnList(e, props = this.props) {
    const input = props.el$('input').el;

    if (input == null) return;
    if (document.activeElement === input) return;

    const query = e?.payload?.query ?? '';

    if (input.value !== query) input.value = query;
  }
}
