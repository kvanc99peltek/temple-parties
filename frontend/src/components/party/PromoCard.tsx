/**
 * PromoCard — the dashed "coupon" on the party page showing a host's promo
 * code (e.g. TUPARTY25 · $2 OFF COVER) with a one-tap COPY button.
 *
 * This is tuparties' attribution mechanism: when the code gets used at the
 * door (or at an external ticket checkout), the host sees that tuparties
 * sent those people. The hint line under the code explains exactly that to
 * the partygoer.
 *
 * Clipboard: navigator.clipboard only works in secure contexts (https or
 * localhost). The hidden-textarea + execCommand('copy') fallback covers
 * plain-http dev origins and older browsers, so COPY never silently fails.
 */

import DashedCard from '@/components/ui/DashedCard';

interface PromoCardProps {
  code: string;
  /** What the code gets you — "$2 OFF COVER", "$2 OFF TICKETS". */
  label: string;
  /** Where to use it — "Show at the door…", "Use at checkout…". */
  hint?: string | null;
  /** Fired after a successful copy so the page can toast + track it. */
  onCopied: (code: string) => void;
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

export default function PromoCard({ code, label, hint, onCopied }: PromoCardProps) {
  const handleCopy = async () => {
    if (await copyToClipboard(code)) onCopied(code);
  };

  return (
    <DashedCard className="flex flex-col gap-2 px-3.5 py-3">
      <p className="font-montserrat font-bold text-[9.5px] tracking-[0.95px] uppercase text-temple-muted">
        PROMO · {label}
      </p>
      <div className="flex items-center justify-between gap-3">
        <p className="font-montserrat font-bold text-[22px] tracking-[1.32px] text-white truncate">
          {code}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 bg-temple-purple-light text-[#0b0b0b] font-montserrat font-bold text-[10.5px] tracking-[0.63px] uppercase px-3.5 py-2 rounded-full hover:opacity-90 active:scale-[0.98] transition-all duration-150"
        >
          COPY
        </button>
      </div>
      {hint && <p className="font-montserrat text-[10.5px] text-temple-muted">{hint}</p>}
    </DashedCard>
  );
}
