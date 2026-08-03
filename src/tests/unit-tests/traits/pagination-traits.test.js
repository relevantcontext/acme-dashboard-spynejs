import { expect } from 'chai';
import { PaginationTraits } from '/src/app/traits/ui/pagination-traits.js';

const ids = (count) =>
  Array.from({ length: count }, (_, index) => `invoice-${index + 1}`);

describe('PaginationTraits', () => {
  it('returns a complete initial state from an independently normalized config', () => {
    const config = PaginationTraits.pagination$NormalizeConfig({
      itemsPerPage: 12,
      siblingCount: 2,
      boundaryCount: 2,
    });
    const state = PaginationTraits.pagination$CreateInitialState(config);

    expect(config.itemsPerPage).to.equal(12);
    expect(state.config).to.deep.equal(config);
    expect(state.visibleIds).to.deep.equal([]);
    expect(state.hidePagination).to.equal(true);
  });

  it('calculates a visible ID slice from a zero-based page index', () => {
    const state = PaginationTraits.pagination$CreateState({
      items: ids(14),
      currentPageIndex: 1,
      config: { itemsPerPage: 6 },
    });

    expect(state.currentPageIndex).to.equal(1);
    expect(state.currentPageNumber).to.equal(2);
    expect(state.totalPages).to.equal(3);
    expect(state.visibleIds).to.deep.equal(ids(14).slice(6, 12));
    expect(state.hasPreviousPage).to.equal(true);
    expect(state.hasNextPage).to.equal(true);
    expect(state.hidePagination).to.equal(false);
  });

  it('resets to the first page whenever the governed collection changes', () => {
    const props = {
      paginationConfig: PaginationTraits.pagination$NormalizeConfig({
        itemsPerPage: 2,
      }),
      paginationItems: ids(8),
      paginationState: PaginationTraits.pagination$CreateState({
        items: ids(8),
        currentPageIndex: 3,
        config: { itemsPerPage: 2 },
      }),
    };

    const state = PaginationTraits.pagination$SetItems(ids(3), props);

    expect(state.currentPageIndex).to.equal(0);
    expect(state.currentPageNumber).to.equal(1);
    expect(state.visibleIds).to.deep.equal(['invoice-1', 'invoice-2']);
  });

  it('clamps a returned page request to the available range', () => {
    const props = {
      paginationConfig: PaginationTraits.pagination$NormalizeConfig({
        itemsPerPage: 2,
      }),
      paginationItems: ids(5),
    };

    const state = PaginationTraits.pagination$SetCurrentPageNumber(99, props);

    expect(state.currentPageNumber).to.equal(3);
    expect(state.visibleIds).to.deep.equal(['invoice-5']);
    expect(state.hasNextPage).to.equal(false);
  });

  it('uses sibling and boundary ranges to place semantic ellipses', () => {
    const state = PaginationTraits.pagination$CreateState({
      items: ids(20),
      currentPageIndex: 9,
      config: {
        itemsPerPage: 1,
        maxPageNumbers: 7,
        siblingCount: 2,
        boundaryCount: 2,
      },
    });
    const pageNumbers = state.items
      .filter(({ type }) => type === 'page')
      .map(({ pageNumber }) => pageNumber);
    const ellipsisSides = state.items
      .filter(({ type }) => type === 'ellipsis')
      .map(({ side }) => side);

    expect(pageNumbers).to.deep.equal([1, 2, 8, 9, 10, 11, 12, 19, 20]);
    expect(ellipsisSides).to.deep.equal(['previous', 'next']);
  });

  it('shows all pages without separators below the configured threshold', () => {
    const state = PaginationTraits.pagination$CreateState({
      items: ids(7),
      config: { itemsPerPage: 1, maxPageNumbers: 7 },
    });

    expect(state.items.some(({ type }) => type === 'ellipsis')).to.equal(false);
    expect(
      state.items
        .filter(({ type }) => type === 'page')
        .map(({ pageNumber }) => pageNumber),
    ).to.deep.equal([1, 2, 3, 4, 5, 6, 7]);
  });

  it('returns an empty, non-navigable state for an empty collection', () => {
    const state = PaginationTraits.pagination$CreateState();

    expect(state.currentPageNumber).to.equal(0);
    expect(state.totalPages).to.equal(0);
    expect(state.visibleIds).to.deep.equal([]);
    expect(state.items).to.deep.equal([]);
    expect(state.hasPreviousPage).to.equal(false);
    expect(state.hasNextPage).to.equal(false);
    expect(state.hidePagination).to.equal(true);
  });

  it('hides pagination when the collection fits on one page', () => {
    const state = PaginationTraits.pagination$CreateState({
      items: ids(6),
      config: { itemsPerPage: 6 },
    });

    expect(state.totalPages).to.equal(1);
    expect(state.hidePagination).to.equal(true);
  });

  it('shows pagination when the collection spans multiple pages', () => {
    const state = PaginationTraits.pagination$CreateState({
      items: ids(7),
      config: { itemsPerPage: 6 },
    });

    expect(state.totalPages).to.equal(2);
    expect(state.hidePagination).to.equal(false);
  });
});
