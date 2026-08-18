/**
 * Wordmark — the "tuparties" logo text, with the "tu" in brand purple.
 *
 * One component so the mobile header and the desktop top bar can never
 * disagree about what the logo looks like. Size comes from the parent via
 * className (both surfaces happen to use 20px today).
 */

export default function Wordmark({ className = 'text-[20px]' }: { className?: string }) {
  return (
    <span className={`font-montserrat font-bold text-white leading-none ${className}`}>
      <span className="text-temple-purple">tu</span>parties
    </span>
  );
}
