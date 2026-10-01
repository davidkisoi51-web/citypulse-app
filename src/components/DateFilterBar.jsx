import { useRef } from "react";
import "./DateFilterBar.css";
function DateFilterBar({ city, setCity, startDate, setStartDate, endDate, setEndDate, filtered, clearFilters, onClear }) {
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
    
    return (
        <div className="date-filter-bar">
            <div className="date-left">
                <div className="input-wrap">
                    <input id="location" 
                    type="text" 
                    placeholder="Enter city..." 
                    value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="input-wrap clickable" onClick={() => openCalendar(startRef)}>
                    <span> 📅 </span>
                    <input 
                        ref={startRef}
                        type="date" 
                        value={startDate} onChange={(e) => setStartDate(e.target.value)}
                        onClick={(e) => {e.stopPropagation(); openCalendar(startRef); }}
                    />
                    <span className="cal-label"> {startDate ? formatNice(startDate) : "pick date"} </span>
                </div>
                <span className="to-text">to</span>

                <div className="input-wrap clickable" onClick={() => openCalendar(endRef)}>
                    <span> 📅 </span>
                    <input ref={endRef} type="date" value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)} 
                        onClick={(e) => {e.stopPropagation(); openCalendar(endRef); }}
                    />
                    <span className="cal-label"> {endDate ? formatNice(endDate) : "End date"} </span>
                </div>
                <div className="date-right">
                    <span className="count">{filtered?.length || 0} events </span>
                    <button onClick={clearFilters || onClear} className="clear-button">Clear</button>
                </div>
            </div>
            </div>
    );
}

export default DateFilterBar;
