import {useState, useEffect} from 'react';

export function useEventFilters (events = []) {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [dateFilter, setDateFilter] = useState('All');
    const [customDate, setCustomDate] = useState({start: '', end: ''});
    const [location, setLocation] = useState('All');

    const allCities = useMemo(() => {
        return ['All', ...new Set(events.map(event => event.city).fillter(Boolean))];
    }, [events]);

    const filtered = useMemo(() => {
        return events.filter(event => {
            const q = search.toLowerCase().trim();
            const matchSearch = !q ||
                event.name?.toLowerCase().includes(q) ||
                event.venue?.toLowerCase().includes(q)||
                event.city?.toLowerCase().includes(q)

            const matchesCategory = category === 'All' || event.category === category;
            const matchesLocation = location === 'All' || event.city === location;

            let matchDate = true;
            if (dateFilter !== 'All' && event.date) {
                if (dateFilter === 'custom' && customDate) {
                    matchDate = event.date === customDate;
                } else {
                    const eventDate = new Date(event.date); eventDate.setHours(0, 0, 0, 0);
                    const today = new Date(); today.setHours(0, 0, 0, 0);
                    if (dateFilter === 'Today') matchDate = eventDate.getTime() === today.getTime();
                    else if (dateFilter === 'This Week') {
                        const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - today.getDay());
                        const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6);
                        matchDate = eventDate >= startOfWeek && eventDate <= endOfWeek;
                    } else if (dateFilter === 'This Month') {
                        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                        matchDate = eventDate >= startOfMonth && eventDate <= endOfMonth;             
                    }
                }
            }

            return matchSearch && matchesCategory && matchesLocation;
        })
}, [events, search, category, dateFilter, customDate, location]);
const resetFilters = () => {
    setSearch('');
    setCategory('All');
    setDateFilter('All');
    setCustomDate({start: '', end: ''});
    setLocation('All');
}
return {
    search, setSearch,
    category, setCategory,
    dateFilter, setDateFilter,
    customDate, setCustomDate,
    location, setLocation,
    allCities,
    filtered,
    resetFilters
}
}