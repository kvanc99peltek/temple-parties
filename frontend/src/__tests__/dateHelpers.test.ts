/**
 * Test cases for date helper utility functions.
 * Tests edge cases and boundary conditions for date calculations.
 */
import {
  getDefaultDay,
  getUpcomingDates,
  getDayName,
  getAlsoTonightLabel,
  getPartyDateLabel,
  pickSmartDefaultDay,
  displayDoorTime,
  parseDoorTimeParts,
  formatDoorTimeParts,
} from '../utils/dateHelpers';

describe('dateHelpers', () => {
  describe('getDefaultDay', () => {
    const originalDate = global.Date;

    afterEach(() => {
      global.Date = originalDate;
    });

    // Use noon so the 6 AM "previous day" rule does not shift the weekday.
    const mockDate = (dayOfWeek: number, hour = 12) => {
      const date = new Date(2024, 0, 7 + dayOfWeek, hour, 0, 0); // Jan 2024, Sunday is 7th
      jest.spyOn(global, 'Date').mockImplementation(() => date as unknown as Date);
    };

    it('should return thursday on Monday', () => {
      mockDate(1);
      expect(getDefaultDay()).toBe('thursday');
    });

    it('should return thursday on Tuesday', () => {
      mockDate(2);
      expect(getDefaultDay()).toBe('thursday');
    });

    it('should return thursday on Wednesday', () => {
      mockDate(3);
      expect(getDefaultDay()).toBe('thursday');
    });

    it('should return thursday on Thursday', () => {
      mockDate(4);
      expect(getDefaultDay()).toBe('thursday');
    });

    it('should return friday on Friday', () => {
      mockDate(5);
      expect(getDefaultDay()).toBe('friday');
    });

    it('should return saturday on Saturday', () => {
      mockDate(6);
      expect(getDefaultDay()).toBe('saturday');
    });

    it('should return thursday on Sunday', () => {
      mockDate(0);
      expect(getDefaultDay()).toBe('thursday');
    });

    it('should treat Friday before 6 AM as Thursday', () => {
      mockDate(5, 3);
      expect(getDefaultDay()).toBe('thursday');
    });

    it('should treat Saturday before 6 AM as Friday', () => {
      mockDate(6, 3);
      expect(getDefaultDay()).toBe('friday');
    });

    it('should treat Sunday before 6 AM as Saturday', () => {
      mockDate(0, 3);
      expect(getDefaultDay()).toBe('saturday');
    });
  });

  describe('getAlsoTonightLabel', () => {
    const originalDate = global.Date;

    afterEach(() => {
      global.Date = originalDate;
    });

    const mockDate = (dayOfWeek: number, hour = 12) => {
      const date = new Date(2024, 0, 7 + dayOfWeek, hour, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => date as unknown as Date);
    };

    it('says TONIGHT when the selected day is today', () => {
      mockDate(5);
      expect(getAlsoTonightLabel('friday', 5)).toBe('ALSO TONIGHT · 5');
    });

    it('says THURSDAY when browsing Thursday on a weekday', () => {
      mockDate(3);
      expect(getAlsoTonightLabel('thursday', 3)).toBe('ALSO THURSDAY · 3');
    });

    it('says TONIGHT for Thursday on Thursday', () => {
      mockDate(4);
      expect(getAlsoTonightLabel('thursday', 2)).toBe('ALSO TONIGHT · 2');
    });

    it('says FRIDAY when browsing Friday on a weekday', () => {
      mockDate(3);
      expect(getAlsoTonightLabel('friday', 3)).toBe('ALSO FRIDAY · 3');
    });

    it('says SATURDAY when browsing Saturday before the weekend', () => {
      mockDate(4);
      expect(getAlsoTonightLabel('saturday', 2)).toBe('ALSO SATURDAY · 2');
    });

    it('treats Saturday before 6 AM as Friday night', () => {
      mockDate(6, 3);
      expect(getAlsoTonightLabel('friday', 4)).toBe('ALSO TONIGHT · 4');
    });
  });

  describe('pickSmartDefaultDay', () => {
    it('keeps the default night when it has parties', () => {
      expect(pickSmartDefaultDay('thursday', { thursday: 2, friday: 1, saturday: 0 })).toBe('thursday');
    });

    it('falls forward to the first night that has parties', () => {
      expect(pickSmartDefaultDay('thursday', { thursday: 0, friday: 3, saturday: 1 })).toBe('friday');
      expect(pickSmartDefaultDay('friday', { thursday: 2, friday: 0, saturday: 1 })).toBe('thursday');
    });

    it('stays on the default when every night is empty', () => {
      expect(pickSmartDefaultDay('saturday', { thursday: 0, friday: 0, saturday: 0 })).toBe('saturday');
    });
  });

  describe('getPartyDateLabel', () => {
    it('formats an ISO date as the party-page date line', () => {
      expect(getPartyDateLabel('2026-10-15')).toBe('THU OCT 15');
      expect(getPartyDateLabel('2026-10-16')).toBe('FRI OCT 16');
      expect(getPartyDateLabel('2026-10-17')).toBe('SAT OCT 17');
    });

    it('parses as a local date (no UTC off-by-one)', () => {
      // new Date('2026-01-02') would be UTC midnight → Jan 1 in US timezones.
      expect(getPartyDateLabel('2026-01-02')).toBe('FRI JAN 2');
    });
  });

  describe('getUpcomingDates', () => {
    const originalDate = global.Date;

    afterEach(() => {
      global.Date = originalDate;
    });

    it('should return valid date strings', () => {
      const result = getUpcomingDates();
      expect(result.thursday).toBeDefined();
      expect(result.friday).toBeDefined();
      expect(result.saturday).toBeDefined();
      expect(typeof result.friday).toBe('string');
      expect(typeof result.saturday).toBe('string');
    });

    it('should return consecutive days', () => {
      const result = getUpcomingDates();
      const thursdayNum = parseInt(result.thursday);
      const fridayNum = parseInt(result.friday);
      const saturdayNum = parseInt(result.saturday);
      const friDiff = fridayNum - thursdayNum;
      const satDiff = saturdayNum - fridayNum;
      expect(friDiff === 1 || friDiff < -20).toBe(true);
      expect(satDiff === 1 || satDiff < -20).toBe(true);
    });

    it('should handle month boundaries', () => {
      const result = getUpcomingDates();
      expect(parseInt(result.friday)).toBeGreaterThan(0);
      expect(parseInt(result.friday)).toBeLessThanOrEqual(31);
    });

    it('should handle year boundaries', () => {
      const date = new Date(2024, 11, 31);
      jest.spyOn(global, 'Date').mockImplementation(() => date as unknown as Date);

      expect(() => getUpcomingDates()).not.toThrow();
    });
  });

  describe('getDayName', () => {
    it('should return Thursday for thursday', () => {
      expect(getDayName('thursday')).toBe('Thursday');
    });

    it('should return Friday for friday', () => {
      expect(getDayName('friday')).toBe('Friday');
    });

    it('should return Saturday for saturday', () => {
      expect(getDayName('saturday')).toBe('Saturday');
    });
  });

  describe('displayDoorTime', () => {
    it('drops :00 and keeps AM/PM', () => {
      expect(displayDoorTime('10:00 PM')).toBe('10 PM');
      expect(displayDoorTime('11:00 PM')).toBe('11 PM');
      expect(displayDoorTime('2:00 AM')).toBe('2 AM');
      expect(displayDoorTime('12:00 AM')).toBe('12 AM');
    });

    it('keeps minutes when they are not :00', () => {
      expect(displayDoorTime('10:30 PM')).toBe('10:30 PM');
      expect(displayDoorTime('9:15 PM')).toBe('9:15 PM');
    });

    it('leaves already-canonical times alone', () => {
      expect(displayDoorTime('10 PM')).toBe('10 PM');
      expect(displayDoorTime('11 PM')).toBe('11 PM');
    });
  });

  describe('parseDoorTimeParts / formatDoorTimeParts', () => {
    it('parses hour-only and with minutes', () => {
      expect(parseDoorTimeParts('10 PM')).toEqual({ hour: 10, minute: 0, period: 'PM' });
      expect(parseDoorTimeParts('9:30 AM')).toEqual({ hour: 9, minute: 30, period: 'AM' });
      expect(parseDoorTimeParts('12:05 AM')).toEqual({ hour: 12, minute: 5, period: 'AM' });
    });

    it('returns null for garbage', () => {
      expect(parseDoorTimeParts('')).toBeNull();
      expect(parseDoorTimeParts('whenever')).toBeNull();
      expect(parseDoorTimeParts('25 PM')).toBeNull();
    });

    it('round-trips through the canonical display format', () => {
      expect(formatDoorTimeParts({ hour: 10, minute: 0, period: 'PM' })).toBe('10 PM');
      expect(formatDoorTimeParts({ hour: 8, minute: 15, period: 'PM' })).toBe('8:15 PM');
      expect(formatDoorTimeParts({ hour: 12, minute: 0, period: 'AM' })).toBe('12 AM');
    });
  });
});
