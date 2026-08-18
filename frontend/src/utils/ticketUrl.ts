/**
 * Ticket-link cleanup for the create-party form.
 *
 * The backend refuses anything that isn't a real https:// URL (see
 * `_validate_ticket_url` in backend/app/models/party.py — it blocks
 * javascript:/data:/scheme-relative tricks too). Rather than let a host type
 * "posh.vip/e/my-party", hit Submit, and get bounced by a server 422, we
 * clean the link up front and speak the same rules in friendlier words.
 *
 * One deliberate kindness: a bare "posh.vip/e/my-party" gets https:// glued
 * on for them — nobody types the scheme on their phone. But an EXPLICIT
 * "http://" is an error, not a silent rewrite: we never change what someone
 * clearly typed, we tell them why it won't fly.
 */

/** Result shape: exactly one of `url` (cleaned, ready to send) or `error`
 *  (human sentence for the field) — or neither when the input was blank,
 *  since the link is optional. */
export interface NormalizedTicketUrl {
  url?: string;
  error?: string;
}

export function normalizeTicketUrl(raw: string): NormalizedTicketUrl {
  const trimmed = raw.trim();
  if (!trimmed) return {}; // optional field — blank is fine

  // Explicit http:// → explain, don't rewrite. Every ticket platform is https.
  if (/^http:\/\//i.test(trimmed)) {
    return { error: 'Ticket links must start with https:// — every ticket site supports it.' };
  }

  // The same scheme tricks the server blocks (a link that would run script
  // instead of opening a page). Checked before we glue https:// on so
  // "javascript:alert(1)" can't sneak through as a "scheme-less" input.
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('//') || lower.startsWith('javascript:') || lower.startsWith('data:')) {
    return { error: 'That doesn’t look like a link to a ticket page.' };
  }

  // No scheme at all ("posh.vip/e/rave") → assume https. Any other scheme
  // (ftp://, mailto:) falls through and fails the https check below.
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { error: 'That doesn’t look like a link — paste the ticket page’s URL.' };
  }
  if (parsed.protocol !== 'https:') {
    return { error: 'Ticket links must start with https:// — every ticket site supports it.' };
  }
  // A hostname with no dot ("https://tickets") is a typo, not a website.
  if (!parsed.hostname.includes('.')) {
    return { error: 'That doesn’t look like a link — paste the ticket page’s URL.' };
  }
  // Server caps the column at 500 — match it so the error happens here.
  if (candidate.length > 500) {
    return { error: 'That link is too long (500 characters max).' };
  }

  // Return the string as typed (plus our https:// prefix if we added one) —
  // NOT parsed.toString(), which would re-encode the path and could break
  // case-sensitive ticket URLs.
  return { url: candidate };
}
