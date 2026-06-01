function padDate(n) { return String(n).padStart(2, '0'); }

function formatDate(d) {
  return `${d.getFullYear()}-${padDate(d.getMonth() + 1)}-${padDate(d.getDate())}`;
}

function generateDateRange(start, end) {
  const dates = [];
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(formatDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// Window 1: Dec 10 – Jan 20 (crosses year boundary)
// Auto-rolls: if today is past Jan 20, use upcoming Dec 10 → Jan 20
function getWindow1() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();

  const jan20 = new Date(year, 0, 20);
  // If we're on or before Jan 20, the window started last Dec 10
  const startYear = today <= jan20 ? year - 1 : year;

  const start = new Date(startYear, 11, 10);
  const end = new Date(startYear + 1, 0, 20);

  return {
    id: 1,
    label: 'Dec 10 – Jan 20',
    startDate: formatDate(start),
    endDate: formatDate(end),
    dates: generateDateRange(start, end),
  };
}

// Window 2: Apr 5 – Apr 20
// Auto-rolls: if today is past Apr 20, use next year
function getWindow2() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();

  const apr20 = new Date(year, 3, 20);
  const useYear = today <= apr20 ? year : year + 1;

  const start = new Date(useYear, 3, 5);
  const end = new Date(useYear, 3, 20);

  return {
    id: 2,
    label: 'Apr 5 – Apr 20',
    startDate: formatDate(start),
    endDate: formatDate(end),
    dates: generateDateRange(start, end),
  };
}

module.exports = { getWindow1, getWindow2 };
