/** Format stored 24-hour clock values as a consistent 12-hour time for display. */
export function formatTime12Hour(value?: string | null): string {
  if (!value) return "—";
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return value;

  let hour = Number(match[1]);
  const minute = match[2];
  let meridiem = match[3]?.toUpperCase();
  if (!meridiem) {
    meridiem = hour >= 12 ? "PM" : "AM";
    hour %= 12;
  } else {
    hour %= 12;
  }

  return `${hour || 12}:${minute} ${meridiem}`;
}

export function addMinutesToClock(value: string, minutes: number): string {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return value;
  let hour = Number(match[1]);
  if (match[3]) {
    hour %= 12;
    if (match[3].toUpperCase() === "PM") hour += 12;
  }
  const date = new Date(2000, 0, 1, hour, Number(match[2]) + minutes);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function formatTimeRange(start?: string | null, end?: string | null) {
  if (!start) return "Time to be confirmed";
  return `${formatTime12Hour(start)}${end ? `–${formatTime12Hour(end)}` : ""}`;
}
