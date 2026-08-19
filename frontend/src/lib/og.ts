import type { Party } from '@/lib/types';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(
  /\/$/,
  '',
);

/**
 * Public party fetch for Open Graph (no auth). Soft-gated fields stay null —
 * share cards only need title / host / time / poster.
 */
export async function fetchPublicParty(id: string): Promise<Party | null> {
  if (!id || id.includes('/') || id.length > 80) return null;
  try {
    const res = await fetch(`${API_URL}/parties/${encodeURIComponent(id)}`, {
      next: { revalidate: 60 },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
