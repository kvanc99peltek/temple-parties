import { formatCoverPrice, coverTileValue } from '../utils/coverPrice';

describe('formatCoverPrice', () => {
  it('reads the dollar amount out of whatever the host typed', () => {
    expect(formatCoverPrice('$10 at the door')).toBe('$10');
    expect(formatCoverPrice('10')).toBe('$10');
    expect(formatCoverPrice('10$ cash only')).toBe('$10');
    expect(formatCoverPrice('  $5  ')).toBe('$5');
  });

  it('keeps cents only when there are cents', () => {
    expect(formatCoverPrice('$7.50 w/ id')).toBe('$7.50');
    expect(formatCoverPrice('7,5')).toBe('$7.50');
    expect(formatCoverPrice('$10.00')).toBe('$10');
  });

  it('is FREE for "free" or zero', () => {
    expect(formatCoverPrice('Free entry')).toBe('FREE');
    expect(formatCoverPrice('$0')).toBe('FREE');
  });

  it('leaves a blank to the caller (null) — FREE on a plain party, unknown on a ticketed one', () => {
    expect(formatCoverPrice('')).toBeNull();
    expect(formatCoverPrice(null)).toBeNull();
    expect(formatCoverPrice(undefined)).toBeNull();
  });

  it('gives up (null) when a price was written but no amount is in it', () => {
    expect(formatCoverPrice('donation')).toBeNull();
    expect(formatCoverPrice('ask at the door')).toBeNull();
  });
});

describe('coverTileValue', () => {
  it('shows the amount whenever one can be read', () => {
    expect(coverTileValue('$10 at the door', false)).toBe('$10');
    expect(coverTileValue('$15+', true)).toBe('$15');
  });

  it('falls back to ONLINE for ticketed parties on the party page, a dash on the map sheet', () => {
    expect(coverTileValue('', true)).toBe('ONLINE');
    expect(coverTileValue('', true, '—')).toBe('—');
    expect(coverTileValue('see link', true)).toBe('ONLINE');
  });

  it('is a dash, never prose, for an unreadable price on a plain party', () => {
    expect(coverTileValue('donation', false)).toBe('—');
    expect(coverTileValue('', false)).toBe('FREE');
  });
});
