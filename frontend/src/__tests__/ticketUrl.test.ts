/**
 * normalizeTicketUrl — the create form's client-side mirror of the backend's
 * https-only ticket link rule. The contract under test: blank passes through
 * as "no link", bare domains get https:// added, and everything the server
 * would 422 gets a friendly error HERE instead.
 */

import { normalizeTicketUrl } from '@/utils/ticketUrl';

describe('normalizeTicketUrl', () => {
  it('returns neither url nor error for blank input (the field is optional)', () => {
    expect(normalizeTicketUrl('')).toEqual({});
    expect(normalizeTicketUrl('   ')).toEqual({});
  });

  it('passes a clean https URL through untouched', () => {
    const result = normalizeTicketUrl('https://posh.vip/e/mansion-rave');
    expect(result.url).toBe('https://posh.vip/e/mansion-rave');
    expect(result.error).toBeUndefined();
  });

  it('trims surrounding whitespace before validating', () => {
    expect(normalizeTicketUrl('  https://dice.fm/event/rave  ').url).toBe(
      'https://dice.fm/event/rave'
    );
  });

  it('prepends https:// to a bare domain link (nobody types the scheme on a phone)', () => {
    expect(normalizeTicketUrl('posh.vip/e/mansion-rave').url).toBe(
      'https://posh.vip/e/mansion-rave'
    );
  });

  it('preserves path casing instead of re-encoding (ticket URLs can be case-sensitive)', () => {
    expect(normalizeTicketUrl('eventbrite.com/e/Mansion-RAVE').url).toBe(
      'https://eventbrite.com/e/Mansion-RAVE'
    );
  });

  it('rejects explicit http:// instead of silently rewriting it', () => {
    const result = normalizeTicketUrl('http://posh.vip/e/rave');
    expect(result.url).toBeUndefined();
    expect(result.error).toMatch(/https/);
  });

  it('rejects the script-scheme tricks the server blocks', () => {
    expect(normalizeTicketUrl('javascript:alert(1)').error).toBeDefined();
    expect(normalizeTicketUrl('data:text/html,hi').error).toBeDefined();
    expect(normalizeTicketUrl('//evil.com/x').error).toBeDefined();
  });

  it('rejects non-https schemes', () => {
    expect(normalizeTicketUrl('ftp://files.example.com/tix').error).toMatch(/https/);
  });

  it('rejects prose that is not a link at all', () => {
    expect(normalizeTicketUrl('ten dollars at the door').error).toBeDefined();
  });

  it('rejects a hostname with no dot (a typo, not a website)', () => {
    expect(normalizeTicketUrl('tickets').error).toBeDefined();
  });

  it('rejects links over the 500-character server cap', () => {
    const long = `https://posh.vip/e/${'a'.repeat(500)}`;
    expect(normalizeTicketUrl(long).error).toMatch(/500/);
  });
});
