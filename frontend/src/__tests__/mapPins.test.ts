import { ringPinHtml, discPinHtml, discPinSize, discPinCellSize, discBadgeCenter, escapeHtml, hexToRgba, pinLabelFor, pinCountBadgeText } from '../utils/mapPins';
import { DEFAULT_HOST_BRAND } from '../utils/mapHelpers';

const ring = (over: Partial<Parameters<typeof ringPinHtml>[0]> = {}) =>
  ringPinHtml({ initials: 'HALO', count: 17, brand: DEFAULT_HOST_BRAND, ...over });

describe('escapeHtml / hexToRgba / pinLabelFor', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<b>"Sig" & 'Ep'</b>`)).toBe('&lt;b&gt;&quot;Sig&quot; &amp; &#39;Ep&#39;&lt;/b&gt;');
  });

  it('turns a hex colour into rgba and leaves anything else alone', () => {
    expect(hexToRgba('#b24bf3', 0.35)).toBe('rgba(178, 75, 243, 0.35)');
    expect(hexToRgba('rebeccapurple', 0.5)).toBe('rebeccapurple');
  });

  it('prefers the pin_label, otherwise initials of the host name (max 3)', () => {
    expect(pinLabelFor('halo', 'Halo Philly')).toBe('HALO');
    expect(pinLabelFor('', 'Sigma Phi Epsilon Frat')).toBe('SPE');
  });
});

describe('ringPinHtml', () => {
  it('shows the initials on the plate and the count on the badge', () => {
    const html = ring();
    expect(html).toContain('ring-pin__plate');
    expect(html).toContain('>HALO<');
    expect(html).toContain('<span class="ring-pin__badge pin-count-badge">17</span>');
  });

  it('escapes host-entered text in the initials and the chip', () => {
    const html = ring({ initials: '<b>', chip: '<img> · 11 PM' });
    expect(html).not.toContain('<b>');
    expect(html).not.toContain('<img>');
    expect(html).toContain('&lt;B&gt;');
    expect(html).toContain('&lt;img&gt; · 11 PM');
  });

  it('puts a ✓ on the badge when you are going', () => {
    expect(ring({ isGoing: true })).toContain('>✓ 17<');
    expect(ring({ isGoing: true, count: null })).toContain('>✓<');
  });

  it('drops the badge entirely for a gated (null) count — never a fake zero', () => {
    const html = ring({ count: null });
    expect(html).not.toContain('ring-pin__badge');
    expect(html).not.toContain('>0<');
  });

  it('adds the halo + ★ for the headliner, the pulse while live, the focus ring when selected', () => {
    expect(ring({ isHyped: true })).toContain('ring-pin__halo');
    expect(ring({ isHyped: true })).toContain('ring-pin__star');
    expect(ring()).not.toContain('ring-pin__star');
    expect(ring({ isLive: true })).toContain('ring-pin__pulse');
    expect(ring()).not.toContain('ring-pin__pulse');
    expect(ring({ isSelected: true })).toContain('ring-pin__focus');
    expect(ring({ isSelected: true })).toContain('is-selected');
  });

  it('only renders the host chip when given one', () => {
    expect(ring({ chip: 'HALO · 11 PM' })).toContain('<span class="ring-pin__chip">HALO · 11 PM</span>');
    expect(ring()).not.toContain('ring-pin__chip');
  });

  it('hands the brand to CSS as variables', () => {
    const html = ring({ brand: { primary: '#3b6cff', secondary: '#ffffff', accent: '#f03b4c', accentInk: '#ffffff' } });
    expect(html).toContain('--pin-primary:#3b6cff');
    expect(html).toContain('--pin-accent:#f03b4c');
    expect(html).toContain('--pin-glow:rgba(59, 108, 255, 0.35)');
  });

  it('shrinks the type as the initials get longer, and caps them at 4', () => {
    expect(ring({ initials: 'H' })).toContain('font-size:16px');
    expect(ring({ initials: 'SIGEP' })).toContain('>SIGE<');
    expect(ring({ initials: 'SIGEP' })).toContain('font-size:9px');
  });
});

describe('discPinHtml / discPinSize', () => {
  it('scales from 44px (no share of the night) to 64px (the busiest party)', () => {
    expect(discPinSize(0, 40)).toBe(44);
    expect(discPinSize(40, 40)).toBe(64);
    expect(discPinSize(20, 40)).toBe(54);
    expect(discPinSize(5, 0)).toBe(64); // maxCount guarded to 1
  });

  it('leaves the count line out for a gated count', () => {
    const html = discPinHtml({ label: 'ASP', count: null, size: 44 });
    expect(html).toContain('>ASP<');
    expect(html).not.toContain('pin-count-badge');
    expect(html).not.toContain('>0<');
  });

  it('escapes the label and layers the state classes', () => {
    const html = discPinHtml({ label: '<x>', count: 3, size: 50, isHyped: true, isGoing: true, isSelected: true, isDimmed: true, isMuted: true });
    expect(html).toContain('&lt;X&gt;');
    expect(html).toContain('disc-pin__badge pin-count-badge');
    expect(html).toContain('>✓ 3<');
    for (const c of ['avatar-marker-pulse', 'avatar-marker-going', 'avatar-marker-selected', 'is-dimmed', 'is-muted']) {
      expect(html).toContain(c);
    }
  });

  it('puts the going count on a hanging badge, not inside the disc', () => {
    const html = discPinHtml({ label: '15TH', count: 54, size: 54 });
    expect(html).toContain('disc-pin__label');
    expect(html).toContain('>15TH<');
    // Badge is tucked onto the rim at the ring pin's spot: centre at 1.65 R (R = 27 → 44.6px).
    expect(html).toContain('<span class="disc-pin__badge pin-count-badge" style="left:44.6px;top:44.6px">54</span>');
    expect(html).not.toContain('flex-direction:column');
  });

  it('grows the Leaflet cell so the hanging badge is not clipped', () => {
    expect(discPinCellSize(44)).toBe(58);
    expect(discPinCellSize(64)).toBe(78);
  });

  it('puts the badge centre at 1.65 R — the same rim spot the ring badge uses, scaled to the disc', () => {
    expect(discBadgeCenter(44)).toBe(36.3);
    expect(discBadgeCenter(64)).toBe(52.8);
  });
});

describe('pinCountBadgeText', () => {
  it('renders the number, a going check, and nothing for a gated count', () => {
    expect(pinCountBadgeText(54)).toBe('54');
    expect(pinCountBadgeText(0)).toBe('0');
    expect(pinCountBadgeText(54, true)).toBe('✓ 54');
    expect(pinCountBadgeText(null)).toBe('');
    expect(pinCountBadgeText(null, true)).toBe('✓');
  });
});
