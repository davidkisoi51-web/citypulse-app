import './CategoryChips.css'

// One-tap category filter: "All" plus a pill per category. Works alongside the category
// dropdown in the filter panel (both read and set the same value).
function CategoryChips({ categories = [], value = 'all', onChange }) {
  if (!categories.length) return null
  const options = [{ value: 'all', label: 'All' }, ...categories.map((c) => ({ value: c, label: c }))]

  return (
    <div className="category-chips" role="group" aria-label="Filter by category">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="category-chip"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default CategoryChips
