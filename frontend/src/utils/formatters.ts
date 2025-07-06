import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

export const formatCurrency = (value: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

export const formatPercent = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

export const formatNumber = (value: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

export const formatDate = (date: Date | string, formatStr: string = 'MMM dd, yyyy'): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return '';
  
  return format(dateObj, formatStr);
};

export const formatDateTime = (date: Date | string): string => {
  return formatDate(date, 'MMM dd, yyyy HH:mm');
};

export const formatTimeAgo = (date: Date | string): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return '';
  
  return formatDistanceToNow(dateObj, { addSuffix: true });
};

export const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

export const formatPips = (value: number, instrument: string): string => {
  const isJPY = instrument.includes('JPY');
  const multiplier = isJPY ? 100 : 10000;
  const pips = value * multiplier;
  return `${pips >= 0 ? '+' : ''}${pips.toFixed(1)} pips`;
};

export const formatVolume = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}K`;
  }
  return value.toString();
};

export const formatRatio = (value: number): string => {
  if (!isFinite(value)) return 'N/A';
  return value.toFixed(2);
};

export const formatWinRate = (wins: number, total: number): string => {
  if (total === 0) return '0%';
  return formatPercent((wins / total) * 100);
};

export const getColorForValue = (value: number, type: 'pnl' | 'percent' | 'ratio' = 'pnl'): string => {
  switch (type) {
    case 'pnl':
    case 'percent':
      return value >= 0 ? 'text-green-400' : 'text-red-400';
    case 'ratio':
      if (value >= 2) return 'text-green-400';
      if (value >= 1) return 'text-yellow-400';
      return 'text-red-400';
    default:
      return 'text-white';
  }
};

export const getBackgroundColorForValue = (value: number, type: 'pnl' | 'percent' | 'ratio' = 'pnl'): string => {
  switch (type) {
    case 'pnl':
    case 'percent':
      return value >= 0 ? 'bg-green-900/20' : 'bg-red-900/20';
    case 'ratio':
      if (value >= 2) return 'bg-green-900/20';
      if (value >= 1) return 'bg-yellow-900/20';
      return 'bg-red-900/20';
    default:
      return 'bg-gray-900/20';
  }
};

export const abbreviateNumber = (value: number): string => {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1e9) {
    return `${sign}${(absValue / 1e9).toFixed(1)}B`;
  } else if (absValue >= 1e6) {
    return `${sign}${(absValue / 1e6).toFixed(1)}M`;
  } else if (absValue >= 1e3) {
    return `${sign}${(absValue / 1e3).toFixed(1)}K`;
  }
  
  return `${sign}${absValue.toFixed(0)}`;
};