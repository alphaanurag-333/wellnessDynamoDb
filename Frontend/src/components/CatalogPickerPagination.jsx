export function CatalogPickerPagination({ page, pages, total, onPageChange, loading = false }) {
  if (!pages || pages <= 1) return null;

  return (
    <div className="catalog-picker-pagination">
      <span className="catalog-picker-pagination__info">
        Page {page} of {pages} · {total} items
      </span>
      <div className="catalog-picker-pagination__btns">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={loading || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={loading || page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
