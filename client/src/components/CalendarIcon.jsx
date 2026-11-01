import './CalendarIcon.css'

// Calendar-with-plus icon for the "add to calendar" actions, in the logo's blue.
function CalendarIcon() {
  return (
    <svg className="calendar-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4M12 13.2v4.6M9.7 15.5h4.6" />
    </svg>
  )
}

export default CalendarIcon
