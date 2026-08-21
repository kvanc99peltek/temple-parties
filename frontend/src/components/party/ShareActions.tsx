/**
 * ShareActions — the loud share block on the party page.
 *
 * Share used to be a ghost pill on the poster. On a busy flyer nobody
 * saw it (2 shares / 121 headliner visitors). This row is the secondary
 * action: a full-width SHARE button on the headliner, plus Copy link and
 * Instagram Story as first-class paths so Mobile Safari and Instagram's
 * in-app browser can still send the URL without hunting through a sheet.
 */

import ShareIcon from '@/components/ui/ShareIcon';

interface ShareActionsProps {
  isHeadliner: boolean;
  onShare: () => void;
  onCopyLink: () => void;
  onInstagramStory: () => void;
}

const textActionClass =
  'font-montserrat font-bold text-[10.5px] tracking-[0.63px] uppercase text-temple-purple-light hover:text-white transition-colors';

export default function ShareActions({
  isHeadliner,
  onShare,
  onCopyLink,
  onInstagramStory,
}: ShareActionsProps) {
  const copyAndStory = (
    <>
      <button type="button" onClick={onCopyLink} className={textActionClass}>
        Copy link
      </button>
      <span className="text-white/20" aria-hidden>
        ·
      </span>
      <button type="button" onClick={onInstagramStory} className={textActionClass}>
        Instagram Story
      </button>
    </>
  );

  if (!isHeadliner) {
    return (
      <div className="flex items-center justify-center gap-3 py-1">
        <button type="button" onClick={onShare} className={textActionClass}>
          Share
        </button>
        <span className="text-white/20" aria-hidden>
          ·
        </span>
        {copyAndStory}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onShare}
        className="w-full py-3 rounded-[10px] bg-temple-purple text-white font-montserrat font-bold text-[14px] uppercase flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all duration-150"
      >
        <ShareIcon className="w-[18px] h-[18px]" />
        SHARE THIS PARTY
      </button>
      <p className="font-montserrat text-[12px] text-temple-muted text-center">
        Tonight&apos;s headliner. Send it to the groupchat
      </p>
      <div className="flex items-center justify-center gap-3">{copyAndStory}</div>
    </div>
  );
}
