import { useRef } from 'react'
import './DateFilterBar.css'

function DateFilterBar({
  city,
  setCity,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  filtered,
  clearFilters,
}) {
  const startRef = useRef(null)
  const endRef = useRef(null)

  const formatNice = (iso) => {
    if (!iso) return ''
    const d = new Date(`${iso}T00:00:00`)
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const openCalendar = (ref) => {
    try {
      ref.current?.showPicker?.()
    } catch {
      ref.current?.focus()
      ref.current?.click()
    }
  }

  return (
    <div className="date-filter-bar">
      <div className="date-left">
        <div className="input-wrap">
          <input
            id="location"
            type="text"
            placeholder="Enter city..."
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
        </div>

        <div className="input-wrap clickable" onClick={() => openCalendar(startRef)}>
          <span aria-hidden="true">📅</span>
          <input
            ref={startRef}
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            onClick={(event) => {
              event.stopPropagation()
              openCalendar(startRef)
            }}
            aria-label="Start date"
          />
          <span className="cal-label">{startDate ? formatNice(startDate) : 'Pick date'}</span>
        </div>

        <span className="to-text">to</span>

        <div className="input-wrap clickable" onClick={() => openCalendar(endRef)}>
          <span aria-hidden="true">📅</span>
          <input
            ref={endRef}
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            onClick={(event) => {
              event.stopPropagation()
              openCalendar(endRef)
            }}
            aria-label="End date"
          />
          <span className="cal-label">{endDate ? formatNice(endDate) : 'End date'}</span>
        </div>

        <div className="date-right">
          <span className="count">{filtered?.length || 0} events</span>
          <button type="button" onClick={clearFilters} className="clear-button">
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}

export default DateFilterBar
