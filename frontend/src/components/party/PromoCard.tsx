/**
 * PromoCard — the dashed "coupon" on the party page showing a host's promo
 * code (e.g. TUPARTY25 · $2 OFF COVER) with a one-tap COPY button.
 *
 * This is tuparties' attribution mechanism: when the code gets used at the
 * door (or at an external ticket checkout), the host sees that tuparties
 * sent those people. The hint line under the code explains exactly that to
 * the partygoer.
 *
 * Soft-gate: the code itself is sign-in-only. The server strips it for
 * anonymous callers (code arrives null — same null-stays-null rule as the
 * address and counts), so this card shows the label and hint as the carrot
 * but masks the code and swaps COPY for a SIGN IN pill. Hiding it client-
 * side alone would leak the code in the API response.
 *
 * Clipboard: navigator.clipboard only works in secure contexts (https or
 * localhost). The hidden-textarea + execCommand('copy') fallback covers
 * plain-http dev origins and older browsers, so COPY never silently fails.
 */

import DashedCard from '@/components/ui/DashedCard';

interface PromoCardProps {
  /** The actual code — null/absent for logged-out viewers (server-stripped). */
  code?: string | null;
  /** What the code gets you — "$2 OFF COVER", "$2 OFF TICKETS". */
  label: string;
  /** Where to use it — "Show at the door…", "Use at checkout…". */
  hint?: string | null;
  /** Fired after a successful copy so the page can toast + track it. */
  onCopied: (code: string) => void;
  /** Fired when a logged-out viewer taps SIGN IN on the gated card. */
  onSignIn: () => void;
}

/** Copy text to the clipboard, falling back to the legacy API when needed. */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback: put the text in an invisible textarea, select it, and use the
    // old document.execCommand('copy') — works without a secure context.
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }
}

// One pill style for both actions (COPY / SIGN IN) so the gated and open
// cards keep the exact same silhouette.
const pillClass =
  'shrink-0 bg-temple-purple-light text-[#0b0b0b] font-montserrat font-bold text-[10.5px] tracking-[0.63px] uppercase px-3.5 py-2 rounded-full hover:opacity-90 active:scale-[0.98] transition-all duration-150';

export default function PromoCard({ code, label, hint, onCopied, onSignIn }: PromoCardProps) {
  const handleCopy = async () => {
    if (code && (await copyToClipboard(code))) onCopied(code);
  };

  return (
    <DashedCard className="flex flex-col gap-2 px-3.5 py-3">
      <p className="font-montserrat font-bold text-[9.5px] tracking-[0.95px] uppercase text-temple-muted">
        PROMO · {label}
      </p>
      <div className="flex items-center justify-between gap-3">
        {code ? (
          <>
            <p className="font-montserrat font-bold text-[22px] tracking-[1.32px] text-white truncate">
              {code}
            </p>
            <button type="button" onClick={handleCopy} className={pillClass}>
              COPY
            </button>
          </>
        ) : (
          <>
            {/* Masked stand-in keeps the coupon's shape without faking a code. */}
            <p
              aria-label="Sign in to see the promo code"
              className="font-montserrat font-bold text-[22px] tracking-[1.32px] text-temple-muted select-none"
            >
              ••••••
            </p>
            <button type="button" onClick={onSignIn} className={pillClass}>
              SIGN IN
            </button>
          </>
        )}
      </div>
      {hint && <p className="font-montserrat text-[10.5px] text-temple-muted">{hint}</p>}
    </DashedCard>
  );
}
