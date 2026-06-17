export function getStatusColorClasses(status) {
  const s = (status || '').toLowerCase();
  if (s === 'present') {
    return { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', accent: 'accent-emerald-600' };
  }
  if (s === 'absent') {
    return { bg: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100', accent: 'accent-rose-600' };
  }
  if (s === 'late') {
    return { bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', accent: 'accent-amber-500' };
  }
  if (s.includes('leave') || s === 'medical leave' || s === 'casual leave' || s === 'ml' || s === 'cl') {
    return { bg: 'bg-yellow-500', light: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-100', accent: 'accent-yellow-500' };
  }
  if (s.includes('duty') || s === 'od' || s === 'on-duty' || s === 'on duty') {
    return { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', accent: 'accent-blue-600' };
  }
  return { bg: 'bg-slate-500', light: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-100', accent: 'accent-slate-500' };
}

export function getStatusBadgeClasses(status) {
  const c = getStatusColorClasses(status);
  return `${c.light} ${c.text} ${c.border} border`;
}
