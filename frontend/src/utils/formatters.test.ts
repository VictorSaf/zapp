import { describe, it, expect } from 'vitest';
import { formatCurrency } from './formatters';

describe('formatCurrency', () => {
  it('formats a number as USD currency', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });
});
