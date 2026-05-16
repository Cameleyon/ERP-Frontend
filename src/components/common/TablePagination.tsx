type TablePaginationProps = {
  currentPage: number
  pageCount: number
  paginationLabel: string
  firstPageLabel: string
  previousPageLabel: string
  nextPageLabel: string
  lastPageLabel: string
  onPageChange: (page: number) => void
}

const MAX_VISIBLE_PAGES = 5

export default function TablePagination({
  currentPage,
  pageCount,
  paginationLabel,
  firstPageLabel,
  previousPageLabel,
  nextPageLabel,
  lastPageLabel,
  onPageChange,
}: TablePaginationProps) {
  if (pageCount <= 1) {
    return null
  }

  const visiblePages = getVisiblePages(currentPage, pageCount)

  return (
    <nav className="table-pagination" aria-label={paginationLabel}>
      <button
        type="button"
        className="secondary-button compact-action-button table-page-chevron"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        aria-label={firstPageLabel}
      >
        {"<<"}
      </button>
      <button
        type="button"
        className="secondary-button compact-action-button table-page-chevron"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        aria-label={previousPageLabel}
      >
        {"<"}
      </button>
      <div className="table-page-list">
        {visiblePages.map((page) => (
          <button
            key={page}
            type="button"
            className={`table-page-button${page === currentPage ? " active" : ""}`}
            onClick={() => onPageChange(page)}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="secondary-button compact-action-button table-page-chevron"
        onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
        disabled={currentPage === pageCount}
        aria-label={nextPageLabel}
      >
        {">"}
      </button>
      <button
        type="button"
        className="secondary-button compact-action-button table-page-chevron"
        onClick={() => onPageChange(pageCount)}
        disabled={currentPage === pageCount}
        aria-label={lastPageLabel}
      >
        {">>"}
      </button>
    </nav>
  )
}

function getVisiblePages(currentPage: number, pageCount: number) {
  const visibleCount = Math.min(MAX_VISIBLE_PAGES, pageCount)
  const halfWindow = Math.floor(visibleCount / 2)
  let startPage = Math.max(1, currentPage - halfWindow)
  let endPage = startPage + visibleCount - 1

  if (endPage > pageCount) {
    endPage = pageCount
    startPage = Math.max(1, endPage - visibleCount + 1)
  }

  return Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index)
}
