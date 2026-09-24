
function DateFilterBar({ filters }) {
    const { location, setLocation, dateFilter, setDateFilter, customDate, setCustomDate, allCities, filtered, resetFilters } = filters;

    return (
        <div className="date-filter-bar">
            <div className="date-left">
                <select id="location" value={location} onChange={(e) => setLocation(e.target.value)}>
                    {allCities.map(city => (
                        <option key={city} value={city}>{city === 'All' ? 'All Locations' : city}</option>

                    ))}
                </select>
                <select id="dateFilter" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                    <option value="All">All Dates</option>
                    <option value="Today">Today</option>
                    <option value="This Week">This Week</option>
                    <option value="This Month">This Month</option>
                    <option value="custom">Custom Range</option>
                </select>
                {dateFilter === 'custom' && (
                    <div className="custom-date-range">
                        <input type="date" value={customDate.start} onChange={(e) => setCustomDate({ ...customDate, start: e.target.value })} />
                        <span>to</span>
                        <input type="date" value={customDate.end} onChange={(e) => setCustomDate({ ...customDate, end: e.target.value })} />
                    </div>
                )}
                <div className="date-right">
                    <span className="count">{filtered.length} events </span>
                    <button onClick={resetFilters} className="clear-btn">Clear</button>
                </div>
            </div>
            </div>
    );
}

export default DateFilterBar;