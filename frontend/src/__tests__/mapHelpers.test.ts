import { pickFeaturedParty, type FeaturedPartyInput } from '../utils/mapHelpers';
import type { PartyDay } from '../lib/types';

const party = (
  id: string,
  day: PartyDay,
  goingCount: number | null,
): FeaturedPartyInput => ({ id, day, goingCount });

const top = (thursday: string | null, friday: string | null, saturday: string | null) => ({
  thursday,
  friday,
  saturday,
});

describe('pickFeaturedParty', () => {
  it('returns null when that night is empty', () => {
    expect(pickFeaturedParty([party('a', 'saturday', 10)], top(null, 'a', null), 'friday')).toBeNull();
  });

  it('prefers the headliner even when another party has more going', () => {
    const parties = [party('packed', 'friday', 40), party('headliner', 'friday', 2)];
    expect(pickFeaturedParty(parties, top(null, 'headliner', null), 'friday')?.id).toBe('headliner');
  });

  it('falls back to most-going when the headliner id is missing', () => {
    const parties = [party('a', 'friday', 3), party('b', 'friday', 12), party('c', 'friday', 8)];
    expect(pickFeaturedParty(parties, top(null, 'gone', null), 'friday')?.id).toBe('b');
  });

  it('sorts gated (null) counts last so dashes never beat a real number', () => {
    const parties = [party('gated', 'saturday', null), party('real', 'saturday', 1)];
    expect(pickFeaturedParty(parties, top(null, null, null), 'saturday')?.id).toBe('real');
  });

  it('picks the first party when every count is gated', () => {
    const parties = [party('first', 'friday', null), party('second', 'friday', null)];
    expect(pickFeaturedParty(parties, top(null, null, null), 'friday')?.id).toBe('first');
  });

  it('keeps the first party when going counts tie', () => {
    const parties = [party('first', 'saturday', 5), party('second', 'saturday', 5)];
    expect(pickFeaturedParty(parties, top(null, null, null), 'saturday')?.id).toBe('first');
  });

  it('picks the Thursday headliner the same way as Friday and Saturday', () => {
    const parties = [party('packed', 'thursday', 20), party('headliner', 'thursday', 1)];
    expect(pickFeaturedParty(parties, top('headliner', null, null), 'thursday')?.id).toBe('headliner');
  });
});
