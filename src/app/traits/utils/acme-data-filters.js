import { ChannelPayloadFilter } from 'spyne';

/**
 * The one definition of "this emission swaps the governed content".
 *
 * Both sides of the swap read it: PageAcmeView admits a payload to rebuild its
 * page items, and each page item admits the same payload to dispose itself. One
 * definition rather than two, because a disagreement between them is either
 * duplicated content or an empty page.
 *
 * ── Why a payload-tier predicate ────────────────────────────────────────────
 *
 * The flag lives at `payload.status.isContentSwap`. A ChannelPayloadFilter's
 * bare keys match the merge barrel — payload spread last — so a bare key only
 * reaches payload ROOT properties, not nested ones. The sanctioned form for a
 * nested condition is a filter method on a tier key, which receives that tier's
 * object. [admit-by-payload-filter]
 *
 * It also fails closed on CHANNEL_ACME_DATA_REQUEST_EVENT, which carries fetch
 * config and no `status` at all — so the plumbing action can never be mistaken
 * for state. That is otherwise an easy trap: a `CHANNEL_ACME_DATA_.*_EVENT`
 * pattern matches the request action too.
 */
export const contentSwapFilter = () =>
  new ChannelPayloadFilter({
    payload: (payload) => payload?.status?.isContentSwap === true,
  });
