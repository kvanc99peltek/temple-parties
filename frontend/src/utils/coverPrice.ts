/**
 * Cover-price display rule.
 *
 * Hosts type the cover into a free-text field ("$10 at the door", "10",
 * "free entry", "$7.50 w/ id"). Tiles must never echo that back — a stat
 * tile reads as data, not prose. So every price surface renders exactly one
 * of three things:
 *
 *   FREE   — the host wrote "free" / "$0", or left it blank on a party with
 *            no ticket link (a blank on a ticketed party is "price unknown")
 *   $N     — the first dollar amount found in the text ("$10", "$7.50")
 *   —      — a price was written but no amount could be read ("donation")
 *
 * The raw text still exists on the party for the admin queue, where seeing
 * what the host actually typed is the point.
 */

/**
 * "$10 at the door" → "$10"; "free entry" → "FREE"; "donation" → null.
 * Blank is also null — "nothing written" is the caller's call, because it
 * means FREE on a plain party but "price unknown" on a ticketed one.
 */
export function formatCoverPrice(text: string | null | undefined): string | null {
  const raw = (text ?? '').trim();
  if (!raw) return null;
  if (/\bfree\b/i.test(raw)) return 'FREE';

  // First number in the text, with up to two decimals. "$" is optional —
  // hosts write "10", "$10" and "10$" interchangeably.
  const m = /(\d+(?:[.,]\d{1,2})?)/.exec(raw);
  if (!m) return null;

  const amount = Number(m[1].replace(',', '.'));
  if (!Number.isFinite(amount)) return null;
  if (amount === 0) return 'FREE';
  // Whole dollars stay whole ("$10", never "$10.00"); cents keep two digits.
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

/**
 * What a COVER / TICKETS tile shows. `ticketed` = the party sells tickets
 * online (has a ticket link): with no readable price those say ONLINE on
 * the party page (the link knows the price) — the map sheet passes
 * `unknownTicketed: '—'` because it has no BUY TICKETS bar to back the word.
 */
export function coverTileValue(
  ticketPrice: string | null | undefined,
  ticketed: boolean,
  unknownTicketed: 'ONLINE' | '—' = 'ONLINE',
): string {
  const raw = (ticketPrice ?? '').trim();
  if (!raw) return ticketed ? unknownTicketed : 'FREE';
  const formatted = formatCoverPrice(raw);
  if (formatted) return formatted;
  return ticketed ? unknownTicketed : '—';
}
