import { SpyneTrait } from 'spyne';

const DEFAULT_CONFIG = Object.freeze({
  itemsPerPage: 6,
  maxPageNumbers: 7,
  siblingCount: 1,
  boundaryCount: 1,
});

const toNonNegativeInteger = (value, fallback) => {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback;
};

const range = (start, end) => {
  if (end < start) return [];

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

/**
 * Presentation-neutral pagination state.
 *
 * The trait owns no channel vocabulary and renders no DOM. A composing view
 * supplies an ordered collection and selects a page; every transition replaces
 * `props.paginationState` with a complete state snapshot.
 * [author-in-correct-register] [compose-trait-for-capability]
 */
export class PaginationTraits extends SpyneTrait {
  constructor(context) {
    super(context, 'pagination$');
  }

  static pagination$NormalizeConfig(config = {}) {
    const itemsPerPage = Math.max(
      1,
      toNonNegativeInteger(config.itemsPerPage, DEFAULT_CONFIG.itemsPerPage),
    );
    const siblingCount = toNonNegativeInteger(
      config.siblingCount,
      DEFAULT_CONFIG.siblingCount,
    );
    const boundaryCount = toNonNegativeInteger(
      config.boundaryCount,
      DEFAULT_CONFIG.boundaryCount,
    );

    // Enough numeric slots to honor both configured boundary ranges and the
    // current-page sibling block. Smaller values cannot satisfy the config, so
    // the structural minimum wins.
    const structuralMinimum = boundaryCount * 2 + siblingCount * 2 + 1;
    const maxPageNumbers = Math.max(
      structuralMinimum,
      toNonNegativeInteger(
        config.maxPageNumbers,
        DEFAULT_CONFIG.maxPageNumbers,
      ),
    );

    return { itemsPerPage, maxPageNumbers, siblingCount, boundaryCount };
  }

  static pagination$GetPageNumbers(
    currentPageNumber,
    totalPages,
    config = DEFAULT_CONFIG,
  ) {
    if (totalPages <= 0) return [];
    if (totalPages <= config.maxPageNumbers) return range(1, totalPages);

    const pages = new Set();

    range(1, Math.min(config.boundaryCount, totalPages)).forEach((page) =>
      pages.add(page),
    );
    range(
      Math.max(1, currentPageNumber - config.siblingCount),
      Math.min(totalPages, currentPageNumber + config.siblingCount),
    ).forEach((page) => pages.add(page));
    range(
      Math.max(1, totalPages - config.boundaryCount + 1),
      totalPages,
    ).forEach((page) => pages.add(page));

    return [...pages].sort((a, b) => a - b);
  }

  static pagination$GetControlItems(
    currentPageNumber,
    totalPages,
    config = DEFAULT_CONFIG,
  ) {
    const pageNumbers = PaginationTraits.pagination$GetPageNumbers(
      currentPageNumber,
      totalPages,
      config,
    );
    const numberedItems = [];

    pageNumbers.forEach((pageNumber, index) => {
      const previousPageNumber = pageNumbers[index - 1];

      if (
        previousPageNumber !== undefined &&
        pageNumber - previousPageNumber > 1
      ) {
        numberedItems.push({
          type: 'ellipsis',
          side: pageNumber < currentPageNumber ? 'previous' : 'next',
        });
      }

      numberedItems.push({
        type: 'page',
        pageIndex: pageNumber - 1,
        pageNumber,
        isCurrent: pageNumber === currentPageNumber,
        position:
          totalPages === 1
            ? 'single'
            : pageNumber === 1
              ? 'first'
              : pageNumber === totalPages
                ? 'last'
                : 'middle',
      });
    });

    return [
      {
        type: 'previous',
        pageIndex: currentPageNumber > 1 ? currentPageNumber - 2 : null,
        pageNumber: currentPageNumber > 1 ? currentPageNumber - 1 : null,
        isDisabled: currentPageNumber <= 1,
      },
      ...numberedItems,
      {
        type: 'next',
        pageIndex: currentPageNumber < totalPages ? currentPageNumber : null,
        pageNumber:
          currentPageNumber < totalPages ? currentPageNumber + 1 : null,
        isDisabled: currentPageNumber >= totalPages,
      },
    ];
  }

  static pagination$CreateState({
    items = [],
    currentPageIndex = 0,
    config = {},
  } = {}) {
    const paginationConfig =
      PaginationTraits.pagination$NormalizeConfig(config);
    const collection = Array.isArray(items) ? [...items] : [];
    const totalItems = collection.length;
    const totalPages = Math.ceil(totalItems / paginationConfig.itemsPerPage);
    const requestedIndex = toNonNegativeInteger(currentPageIndex, 0);
    const normalizedPageIndex =
      totalPages === 0 ? 0 : Math.min(requestedIndex, totalPages - 1);
    const currentPageNumber = totalPages === 0 ? 0 : normalizedPageIndex + 1;
    const firstItemIndex = normalizedPageIndex * paginationConfig.itemsPerPage;
    const lastItemIndexExclusive = Math.min(
      firstItemIndex + paginationConfig.itemsPerPage,
      totalItems,
    );

    return {
      config: paginationConfig,
      currentPageIndex: normalizedPageIndex,
      currentPageNumber,
      totalItems,
      totalPages,
      hidePagination: totalPages <= 1,
      firstItemIndex,
      lastItemIndexExclusive,
      visibleIds: collection.slice(firstItemIndex, lastItemIndexExclusive),
      hasPreviousPage: currentPageNumber > 1,
      hasNextPage: currentPageNumber > 0 && currentPageNumber < totalPages,
      previousPageIndex: currentPageNumber > 1 ? normalizedPageIndex - 1 : null,
      nextPageIndex:
        currentPageNumber > 0 && currentPageNumber < totalPages
          ? normalizedPageIndex + 1
          : null,
      items:
        totalPages === 0
          ? []
          : PaginationTraits.pagination$GetControlItems(
              currentPageNumber,
              totalPages,
              paginationConfig,
            ),
    };
  }

  static pagination$CreateInitialState(config = {}) {
    return PaginationTraits.pagination$CreateState({
      config,
    });
  }

  static pagination$SetItems(items = [], props = this.props) {
    props.paginationItems = Array.isArray(items) ? [...items] : [];
    props.paginationState = PaginationTraits.pagination$CreateState({
      items: props.paginationItems,
      currentPageIndex: 0,
      config: props.paginationConfig,
    });

    return props.paginationState;
  }

  static pagination$SetCurrentPageNumber(pageNumber, props = this.props) {
    const requestedPageNumber = Number(pageNumber);

    if (!Number.isFinite(requestedPageNumber)) return props.paginationState;

    props.paginationState = PaginationTraits.pagination$CreateState({
      items: props.paginationItems,
      currentPageIndex: Math.max(0, Math.floor(requestedPageNumber) - 1),
      config: props.paginationConfig,
    });

    return props.paginationState;
  }

  static pagination$GetState(props = this.props) {
    return props.paginationState;
  }
}
