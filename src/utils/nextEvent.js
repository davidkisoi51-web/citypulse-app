// Returns the soonest event that hasn't passed yet, or null if none are upcoming.
export function getNextEvent(events, now = new Date()) {
  const todayStr = now.toLocaleDateString('en-CA') // YYYY-MM-DD in local time
  return (
    events
      .filter((e) => e.date && e.date >= todayStr)
      .sort((a, b) =>
        `${a.date}T${a.time || '00:00:00'}`.localeCompare(`${b.date}T${b.time || '00:00:00'}`),
      )[0] ?? null
  )
}
