// Whether an event has already happened, in the viewer's local time.
// A dated event is past from the next day; one with a start time is past once that time has gone.
// Events without a date ("Date TBA") are never past.
export function isPastEvent(event, now = new Date()) {
  if (!event?.date) return false
  const todayStr = now.toLocaleDateString('en-CA') // YYYY-MM-DD in local time
  if (event.date < todayStr) return true
  if (event.date > todayStr || !event.time) return false
  return new Date(`${event.date}T${event.time}`) < now
}
