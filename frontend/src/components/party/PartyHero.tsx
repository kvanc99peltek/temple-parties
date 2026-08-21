/**
 * PartyHero — the full-bleed top of the party page: the poster on its
 * cinema stage with the back arrow and SHARE pill floating on top.
 *
 * SHARE is solid purple (not a ghost overlay) so it stays readable on a
 * busy flyer — the overlay pill was disappearing into dark posters.
 *
 * The party page is a "pushed" route (you drilled in from a feed), so it
 * trades the tab bar for a back arrow. That arrow always goes to the home
 * feed. router.back() is wrong here: after login or Safari restore,
 * history.length is still > 1 but the previous entry is this same party
 * URL, so back() remounts the detail page and the user is stuck.
 */

import { useRouter } from 'next/navigation';
import StagePoster from '@/components/ui/StagePoster';
import ShareIcon from '@/components/ui/ShareIcon';

interface PartyHeroProps {
  posterImage?: string;
  title: string;
  onShare: () => void;
}

export default function PartyHero({ posterImage, title, onShare }: PartyHeroProps) {
  const router = useRouter();

  return (
    <StagePoster src={posterImage} title={title} heightClass="h-[320px]" priority>
      <div className="flex items-center justify-between px-4 h-14">
        <button
          type="button"
          onClick={() => router.push('/')}
          aria-label="Go back"
          className="size-9 flex items-center justify-center rounded-full bg-black/60 text-white text-[18px] hover:bg-black/80 transition-colors"
        >
          ←
        </button>
        <button
          type="button"
          onClick={onShare}
          aria-label="Share this party"
          title="Share this party"
          className="inline-flex items-center gap-1.5 rounded-full bg-temple-purple text-white font-montserrat font-bold text-[11px] tracking-[0.8px] uppercase px-3.5 py-2 hover:opacity-90 active:scale-[0.98] transition-all duration-150"
        >
          <ShareIcon className="w-3.5 h-3.5" />
          SHARE
        </button>
      </div>
    </StagePoster>
  );
}
