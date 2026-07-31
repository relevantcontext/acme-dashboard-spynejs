import { SpyneTrait, SpyneAppProperties } from 'spyne';

const DATA_STATE_PROP = 'acmeData';

const EMPTY_STATE = {
  cards: null,
  revenue: [],
  latestInvoices: [],
  invoices: [],
  totalPages: 0,
  customers: [],
  customerOptions: [],
  isLoaded: false,
};

/**
 * The app's single source of truth for Acme data, the sibling of
 * AcmeAuthStateTraits.
 *
 * ChannelAcmeData writes here when /api/bootstrap returns — once on
 * authentication, and again after any mutation invalidates it. Views read it
 * with the statics below.
 *
 * ── Why a store rather than a subscription ──────────────────────────────────
 *
 * The data is static between mutations, so a view that mounts after the dump
 * has landed needs a value, not an event. Reading in `onRendered` gives every
 * container the data synchronously no matter when it mounts, which is what lets
 * a page render fully on first paint.
 *
 * Events remain for the other direction: a view already on screen when the data
 * changes listens for CHANNEL_ACME_DATA_LOADED_EVENT /
 * ..._DATA_UPDATED_EVENT and re-renders itself.
 *
 * Deliberately NOT read off the ChannelFetch's cached payload. That cache holds
 * whichever request returned last — a mutation's `{ message }` just as easily as
 * the dump — so it is not a store, and a view subscribing to it directly would
 * get whatever happened to be most recent.
 */
export class AcmeDataStateTraits extends SpyneTrait {
  constructor(context) {
    let traitPrefix = 'acmeData$';
    super(context, traitPrefix);
  }

  /**
   * Always returns a usable shape, so a view that mounts before the dump lands
   * renders empty rather than throwing.
   *
   * @returns {{cards: Object|null, revenue: Array, latestInvoices: Array,
   *            invoices: Array, totalPages: Number, customers: Array,
   *            customerOptions: Array, isLoaded: Boolean}}
   */
  static acmeData$Get() {
    return SpyneAppProperties.getProp(DATA_STATE_PROP) || { ...EMPTY_STATE };
  }

  static acmeData$IsLoaded() {
    return AcmeDataStateTraits.acmeData$Get().isLoaded === true;
  }

  /**
   * @param {String} key  one of the EMPTY_STATE keys
   */
  static acmeData$GetSlice(key) {
    return AcmeDataStateTraits.acmeData$Get()[key];
  }

  /**
   * Stores the dump and reports whether this was the first load, so the caller
   * can choose between DATA_LOADED and DATA_UPDATED without comparing twice —
   * the same shape acmeAuthState$Set uses for INIT_AUTH vs AUTH_CHANGED.
   *
   * @returns {{state: Object, wasLoaded: Boolean}}
   */
  static acmeData$Set(data = {}) {
    const previous = AcmeDataStateTraits.acmeData$Get();

    const state = {
      ...EMPTY_STATE,
      ...data,
      isLoaded: true,
    };

    SpyneAppProperties.setProp(DATA_STATE_PROP, state);

    return { state, wasLoaded: previous.isLoaded === true };
  }

  /**
   * Called when the user signs out or a 401 revokes the session. The data was
   * fetched for an identity that no longer holds it, so it does not survive the
   * change — otherwise the next user to log in would see the previous one's
   * invoices on first paint, before their own dump returned.
   */
  static acmeData$Clear() {
    SpyneAppProperties.setProp(DATA_STATE_PROP, { ...EMPTY_STATE });
  }
}
