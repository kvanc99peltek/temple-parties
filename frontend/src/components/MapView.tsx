'use client';

import dynamic from 'next/dynamic';

interface Party {
  id: string;
  title: string;
  host: string;
  category: string;
  day: 'friday' | 'saturday';
  doorsOpen: string;
  address: string;
  latitude: number;
  longitude: number;
  goingCount: number;
}

interface MapViewProps {
  parties: Party[];
  topPartyIds: { friday: string | null; saturday: string | null };
  userGoingParties: string[];
  onGoingClick: (partyId: string) => void;
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
