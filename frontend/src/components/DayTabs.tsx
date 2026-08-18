'use client';

/**
 * DayTabs — the Friday/Saturday switcher at the top of the feed and map.
 *
 * A thin domain wrapper: it knows the weekend (two days, their date numbers)
 * and hands the actual look to the generic SegmentedTabs control, so the
 * day switcher automatically matches any other segmented control in the app.
 */

import SegmentedTabs from '@/components/ui/SegmentedTabs';

interface DayTabsProps {
  selectedDay: 'friday' | 'saturday';
  onDayChange: (day: 'friday' | 'saturday') => void;
  /** Day-of-month strings from the server's weekend envelope ("21", "22"). */
  fridayDate: string;
  saturdayDate: string;
}

export default function DayTabs({ selectedDay, onDayChange, fridayDate, saturdayDate }: DayTabsProps) {
  return (
    <div className="max-w-xl mx-auto px-4 pt-3 pb-3 lg:max-w-3xl lg:px-8">
      <SegmentedTabs
        items={[
          { key: 'friday', label: `FRI ${fridayDate}` },
          { key: 'saturday', label: `SAT ${saturdayDate}` },
        ]}
        activeKey={selectedDay}
        onChange={(key) => onDayChange(key as 'friday' | 'saturday')}
      />
    </div>
  );
}
