import { useRef } from "react";
import "./DateFilterBar.css";
function DateFilterBar({ city, setCity, cities = [], startDate, setStartDate, endDate, setEndDate, filtered, clearFilters, onClear }) {
    const startRef = useRef(null)
    const endRef = useRef(null)
    
    const formatNice = (iso) => {
        if (!iso) return ""
        const d = new Date(iso)
        return d.toLocaleDateString('en-GB', {day: '2-digit', month:'short', year:'numeric'})
    }
    const openCalendar = (ref) => {
        try{
            ref.current?.showPicker()
        } catch {
            ref.current?.focus()
            ref.current?.click()
        }
    }
    
    const calendarIcon = (
        <svg className="input-icon" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
    )

    return (
        <div className="date-filter-bar">
            <div className="date-left">
                <div className="input-wrap">
                    <svg className="input-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
                        <circle cx="12" cy="10" r="2.5" />
                    </svg>
                    <label htmlFor="location" className="visually-hidden">City</label>
                    <select id="location" value={city} onChange={(e) => setCity(e.target.value)}>
                        <option value="">All cities</option>
                        {cities.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="date-range">
                    <div className="input-wrap clickable" onClick={() => openCalendar(startRef)}>
                        {calendarIcon}
                        <input
                            ref={startRef}
                            type="date"
                            aria-label="Start date"
                            value={startDate} onChange={(e) => setStartDate(e.target.value)}
                            onClick={(e) => {e.stopPropagation(); openCalendar(startRef); }}
                        />
                        <span className={`cal-label${startDate ? '' : ' cal-label--empty'}`}>
                            {startDate ? formatNice(startDate) : "Start date"}
                        </span>
                    </div>
                    <span className="to-text" aria-hidden="true">–</span>
                    <div className="input-wrap clickable" onClick={() => openCalendar(endRef)}>
                        {calendarIcon}
                        <input ref={endRef} type="date" value={endDate}
                            aria-label="End date"
                            onChange={(e) => setEndDate(e.target.value)}
                            onClick={(e) => {e.stopPropagation(); openCalendar(endRef); }}
                        />
                        <span className={`cal-label${endDate ? '' : ' cal-label--empty'}`}>
                            {endDate ? formatNice(endDate) : "End date"}
                        </span>
                    </div>
                </div>
            </div>
            <div className="date-right">
                <span className="count" aria-live="polite">
                    {filtered?.length || 0} {filtered?.length === 1 ? 'event' : 'events'}
                </span>
                <button type="button" onClick={clearFilters || onClear} className="clear-button">
                    Clear filters
                </button>
            </div>
        </div>
    );
}

export default DateFilterBar;
