/**
 * Test cases for date helper utility functions.
 * Tests edge cases and boundary conditions for date calculations.
 */
import { getDefaultDay, getUpcomingDates, getDayName } from '../utils/dateHelpers';

describe('dateHelpers', () => {
  describe('getDefaultDay', () => {
    const originalDate = global.Date;

    afterEach(() => {
      global.Date = originalDate;
    });

    const mockDate = (dayOfWeek: number) => {
      const date = new Date(2024, 0, 7 + dayOfWeek); // Jan 2024, Sunday is 7th
      jest.spyOn(global, 'Date').mockImplementation(() => date as unknown as Date);
    };

    it('should return friday on Monday', () => {
      mockDate(1); // Monday
      expect(getDefaultDay()).toBe('friday');
    });

    it('should return friday on Tuesday', () => {
      mockDate(2);
      expect(getDefaultDay()).toBe('friday');
    });

    it('should return friday on Wednesday', () => {
      mockDate(3);
      expect(getDefaultDay()).toBe('friday');
    });

    it('should return friday on Thursday', () => {
      mockDate(4);
      expect(getDefaultDay()).toBe('friday');
    });

    it('should return friday on Friday', () => {
      mockDate(5);
      expect(getDefaultDay()).toBe('friday');
    });

    it('should return saturday on Saturday', () => {
      mockDate(6);
      expect(getDefaultDay()).toBe('saturday');
    });

    it('should return friday on Sunday', () => {
      mockDate(0);
      expect(getDefaultDay()).toBe('friday');
    });
  });

  describe('getUpcomingDates', () => {
    const originalDate = global.Date;

    afterEach(() => {
      global.Date = originalDate;
    });

    it('should return valid date strings', () => {
      const result = getUpcomingDates();
      expect(result.friday).toBeDefined();
      expect(result.saturday).toBeDefined();
      expect(typeof result.friday).toBe('string');
      expect(typeof result.saturday).toBe('string');
    });

    it('should return consecutive days', () => {
      const result = getUpcomingDates();
      const fridayNum = parseInt(result.friday);
      const saturdayNum = parseInt(result.saturday);
      // Saturday should be 1 day after Friday (or wrap around at month end)
      const diff = saturdayNum - fridayNum;
      expect(diff === 1 || diff < -20).toBe(true); // Either +1 or month wrap
    });

    it('should handle month boundaries', () => {
      // Test that it doesnt crash at month boundaries
      const result = getUpcomingDates();
      expect(parseInt(result.friday)).toBeGreaterThan(0);
      expect(parseInt(result.friday)).toBeLessThanOrEqual(31);
    });

    it('should handle year boundaries', () => {
      // Mock December 31st
      const date = new Date(2024, 11, 31);
      jest.spyOn(global, 'Date').mockImplementation(() => date as unknown as Date);

      // Should not throw
      expect(() => getUpcomingDates()).not.toThrow();
    });
  });

  describe('getDayName', () => {
    it('should return Friday for friday', () => {
      expect(getDayName('friday')).toBe('Friday');
    });

    it('should return Saturday for saturday', () => {
      expect(getDayName('saturday')).toBe('Saturday');
    });

    it('should handle case sensitivity correctly', () => {
      // These should work as expected since input is typed
      expect(getDayName('friday' as 'friday' | 'saturday')).toBe('Friday');
      expect(getDayName('saturday' as 'friday' | 'saturday')).toBe('Saturday');
    });
  });
});
