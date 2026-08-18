/**
 * PartyHero — the full-bleed top of the party page: the poster on its
 * cinema stage with the back arrow and SHARE pill floating on top.
 *
 * The party page is a "pushed" route (you drilled in from a feed), so it
 * trades the tab bar for a back arrow. Back uses router.back() when there's
 * history and falls back to the home feed when the page was opened directly
 * from a shared link — otherwise back would exit the site.
 */

import { useRouter } from 'next/navigation';
import StagePoster from '@/components/ui/StagePoster';
import Pill from '@/components/ui/Pill';

interface PartyHeroProps {
  posterImage?: string;
  title: string;
  onShare: () => void;
}

export default function PartyHero({ posterImage, title, onShare }: PartyHeroProps) {
  const router = useRouter();

  const handleBack = () => {
    // window.history.length > 1 means we navigated here from inside the app.
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <StagePoster src={posterImage} title={title} heightClass="h-[320px]" priority>
      <div className="flex items-center justify-between px-4 h-14">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Go back"
          className="size-9 flex items-center justify-center rounded-full bg-black/60 text-white text-[18px] hover:bg-black/80 transition-colors"
        >
          ←
        </button>
        <Pill tone="overlay" size="sm" onClick={onShare} title="Share this party">
          SHARE
        </Pill>
      </div>
    </StagePoster>
  );
}
