// Returns the soonest event that has not passed yet without mutating the input array.
export function getNextEvent(events = [], now = new Date()) {
  const todayStr = now.toLocaleDateString('en-CA')

  return (
    events
      .filter((event) => event.date && event.date >= todayStr)
      .slice()
      .sort((a, b) =>
        `${a.date}T${a.time || '00:00:00'}`.localeCompare(
          `${b.date}T${b.time || '00:00:00'}`,
        ),
      )[0] ?? null
  )
}
