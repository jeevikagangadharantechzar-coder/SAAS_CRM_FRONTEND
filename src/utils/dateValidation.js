// Shared Start Date / End Date validation for target management forms.
// isCreate=true also blocks a past Start Date (only enforced when a target is first created).
export function validateTargetDates(startDate, endDate, { isCreate = true } = {}) {
  if (!startDate || !endDate) {
    return "Start Date and End Date are required.";
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    return "Please enter valid dates.";
  }

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return "Please enter valid dates.";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isCreate && start < today) {
    return "Start Date cannot be a past date.";
  }

  if (end <= today) {
    return "End Date must be a future date — today or a past date is not allowed.";
  }

  if (end <= start) {
    return "End Date must be after Start Date.";
  }

  return null;
}

// Build a YYYY-MM-DD string from a date's LOCAL calendar day — never use
// .toISOString() for this, it converts to UTC and shifts the day backward
// in positive-UTC-offset timezones (e.g. IST) whenever the local time is
// before the UTC offset (or, for setHours(0,0,0,0), always).
export const toLocalDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const todayISO = () => toLocalDateString(new Date());

export const tomorrowISO = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toLocalDateString(d);
};
