import { formatPartyShareCaption, formatPartyShareText, shareContent } from '@/utils/shareHelpers';
import type { Party } from '@/lib/types';

const party = {
  id: '790c82f0-7a6b-4edb-ba41-95de642d5abc',
  title: 'Perreo Welcome Back',
  host: 'Latin Heat',
  day: 'saturday',
  doorsOpen: '10 PM',
  goingCount: 5,
} as Party;

describe('formatPartyShareCaption', () => {
  it('does not include the party URL (iMessage would unfurl it a second time)', () => {
    const caption = formatPartyShareCaption(party);
    expect(caption).toBe(
      'pulling up to Perreo Welcome Back! by Latin Heat\nSaturday @ 10 PM\n5+ going',
    );
    expect(caption).not.toMatch(/https?:\/\//);
  });

  it('omits the going line when the count is gated', () => {
    expect(formatPartyShareCaption({ ...party, goingCount: null })).toBe(
      'pulling up to Perreo Welcome Back! by Latin Heat\nSaturday @ 10 PM',
    );
  });
});

describe('formatPartyShareText', () => {
  it('appends the party link once for clipboard fallback', () => {
    const text = formatPartyShareText(party);
    expect(text).toContain('https://tuparties.com/party/790c82f0-7a6b-4edb-ba41-95de642d5abc');
    expect(text.match(/https:\/\/tuparties\.com/g)).toHaveLength(1);
  });
});

describe('shareContent', () => {
  const originalShare = navigator.share;

  afterEach(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: originalShare,
    });
  });

  it('passes caption and url separately so iOS does not paste the link twice', async () => {
    const share = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });

    await shareContent(party);

    expect(share).toHaveBeenCalledWith({
      title: 'Perreo Welcome Back',
      text: formatPartyShareCaption(party),
      url: 'https://tuparties.com/party/790c82f0-7a6b-4edb-ba41-95de642d5abc',
    });
    expect(share.mock.calls[0][0].text).not.toContain('http');
  });
});
