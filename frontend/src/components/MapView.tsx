'use client';

import dynamic from 'next/dynamic';

import { Party } from '@/lib/types';

interface MapViewProps {
  parties: Party[];
  topPartyIds: { friday: string | null; saturday: string | null };
  userGoingParties: string[];
  onGoingClick: (partyId: string) => void;
  onNavigateClick: (partyId: string) => void;
  fridayDate: string;
  saturdayDate: string;
}

// Loading placeholder
function MapLoading() {
  return (
    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
      <div className="text-gray-400">Loading map...</div>
    </div>
  );
}

// Dynamically import the map content with SSR disabled
const MapContent = dynamic(() => import('./MapContent'), {
  ssr: false,
  loading: () => <MapLoading />,
});

export default function MapView(props: MapViewProps) {
  return <MapContent {...props} />;
}
