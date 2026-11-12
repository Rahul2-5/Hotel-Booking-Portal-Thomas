export function getTodayDateString() {
  return localDateString(new Date());
}

function localDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Used only for the input's minimum, never for money or API date conversion.
export function nextDate(value) {
  if (!value) return getTodayDateString();
  const [year, month, day] = value.split('-').map(Number);
  return localDateString(new Date(year, month - 1, day + 1));
}
