export function formatBDT(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '৳0.00';
  }
  const num = Number(amount);
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);

  return `৳${formatted}`;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatAccountType(type: string | null | undefined): string {
  if (!type) return 'Unknown';
  switch (type.toUpperCase()) {
    case 'CASH':
      return 'Cash in Hand';
    case 'BANK':
      return 'Bank Account';
    case 'BKASH':
      return 'bKash Wallet';
    case 'NAGAD':
      return 'Nagad Wallet';
    case 'ROCKET':
      return 'Rocket Wallet';
    case 'OTHER':
      return 'Other Account';
    default:
      return type;
  }
}
