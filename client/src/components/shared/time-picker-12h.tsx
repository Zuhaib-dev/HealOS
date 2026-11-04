"use client";

type TimePicker12HourProps = {
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  invalid?: boolean;
  className?: string;
};

export function TimePicker12Hour({
  id,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  value,
  onChange,
  required,
  invalid,
  className,
}: TimePicker12HourProps) {
  const [rawHour = "09", rawMinute = "00"] = value.split(":");
  const hour24 = Number(rawHour) || 0;
  const hour12 = hour24 % 12 || 12;
  const period = hour24 >= 12 ? "PM" : "AM";

  const update = (hour: number, minute: number, meridiem: string) => {
    const normalizedHour = (hour % 12) + (meridiem === "PM" ? 12 : 0);
    onChange(
      `${String(normalizedHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    );
  };

  const selectClass =
    "min-w-0 rounded-md border border-border bg-background px-2 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

  return (
    <div
      id={id}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      className={`flex items-center gap-1.5 ${className || ""}`}
      aria-invalid={invalid}
    >
      <select
        aria-label="Hour"
        required={required}
        value={hour12}
        onChange={(event) =>
          update(Number(event.target.value), Number(rawMinute), period)
        }
        className={`${selectClass} flex-1`}
      >
        {Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => (
          <option key={hour} value={hour}>
            {hour}
          </option>
        ))}
      </select>
      <span aria-hidden="true">:</span>
      <select
        aria-label="Minute"
        required={required}
        value={Number(rawMinute)}
        onChange={(event) => update(hour12, Number(event.target.value), period)}
        className={`${selectClass} flex-1`}
      >
        {Array.from({ length: 60 }, (_, minute) => minute).map((minute) => (
          <option key={minute} value={minute}>
            {String(minute).padStart(2, "0")}
          </option>
        ))}
      </select>
      <select
        aria-label="AM or PM"
        required={required}
        value={period}
        onChange={(event) =>
          update(hour12, Number(rawMinute), event.target.value)
        }
        className={selectClass}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}
