import {
  copyPartyLink,
  copyText,
  copyTextSync,
  formatPartyShareCaption,
  formatPartyShareText,
  instagramStoryCameraUrl,
  shareContent,
  sharePartyToInstagramStory,
} from '@/utils/shareHelpers';
import type { Party } from '@/lib/types';

const party = {
  id: '790c82f0-7a6b-4edb-ba41-95de642d5abc',
  title: 'Perreo Welcome Back',
  host: 'Latin Heat',
  day: 'saturday',
  doorsOpen: '10 PM',
  goingCount: 5,
} as Party;

const IG_IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 192.168.2.5.111 (iPhone17,1; iOS 18_0; en_US; en-US; scale=3.00; 1179x2556; 623367275)';

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

describe('copyTextSync', () => {
  it('copies via execCommand so Instagram WebView / Safari get a user-gesture copy', () => {
    const exec = jest.fn().mockReturnValue(true);
    document.execCommand = exec;

    expect(copyTextSync('hello')).toBe(true);
    expect(exec).toHaveBeenCalledWith('copy');
  });
});

describe('copyText', () => {
  it('falls back to clipboard.writeText when execCommand fails', async () => {
    document.execCommand = jest.fn().mockReturnValue(false);
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    await expect(copyText('hello')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
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

  it('copies the party text when Web Share is missing', async () => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    document.execCommand = jest.fn().mockReturnValue(true);

    const result = await shareContent(party);

    expect(result).toEqual({ success: true, method: 'clipboard' });
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });
});

describe('copyPartyLink', () => {
  it('copies caption plus the party URL', async () => {
    document.execCommand = jest.fn().mockReturnValue(true);
    const result = await copyPartyLink(party);
    expect(result).toEqual({ success: true, method: 'clipboard' });
  });
});

describe('instagramStoryCameraUrl', () => {
  it('uses the iOS story-camera scheme', () => {
    expect(instagramStoryCameraUrl('ios')).toBe('instagram://story-camera');
  });

  it('uses the Android intent for the story composer', () => {
    expect(instagramStoryCameraUrl('android')).toContain('com.instagram.android');
  });
});

describe('sharePartyToInstagramStory', () => {
  const originalUa = navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: originalUa });
  });

  it('copies the link and skips the scheme inside Instagram WebView', async () => {
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: IG_IOS_UA });
    document.execCommand = jest.fn().mockReturnValue(true);
    const click = jest.fn();
    const originalCreate = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreate(tag);
      if (tag === 'a') el.click = click;
      return el;
    });

    const result = await sharePartyToInstagramStory(party);

    expect(result).toEqual({ success: true, method: 'instagram_story' });
    expect(click).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('copies then opens the story camera outside Instagram', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    });
    document.execCommand = jest.fn().mockReturnValue(true);
    const click = jest.fn();
    const originalCreate = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreate(tag);
      if (tag === 'a') {
        el.click = click;
      }
      return el;
    });

    const result = await sharePartyToInstagramStory(party);

    expect(result).toEqual({ success: true, method: 'instagram_story' });
    expect(click).toHaveBeenCalled();
    jest.restoreAllMocks();
  });
});
