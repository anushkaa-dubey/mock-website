export function formatDuration(hours) {
  if (hours === '' || hours === null || hours === undefined || isNaN(hours)) return '';
  const days = Math.floor(hours / 24);
  const rem  = hours % 24;
  if (days === 0) return `${hours} hours`;
  const dayLabel = `${days} day${days > 1 ? 's' : ''}`;
  return rem === 0 ? `${hours} hours (${dayLabel})` : `${hours} hours (${dayLabel} ${rem} hours)`;
}
