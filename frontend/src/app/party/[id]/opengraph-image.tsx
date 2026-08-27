import { ImageResponse } from 'next/og';
import { displayDoorTime, getPartyDateLabel } from '@/utils/dateHelpers';
import { fetchPublicParty } from '@/lib/og';

export const alt = 'Party on Temple Parties';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 60;

type Props = { params: { id: string } };

export default async function Image({ params }: Props) {
  const party = await fetchPublicParty(params.id);
  if (!party) {
    const fallback = await fetch(new URL('../../opengraph-image.png', import.meta.url));
    return new Response(await fallback.arrayBuffer(), {
      headers: { 'Content-Type': 'image/png' },
    });
  }

  const poster = party.posterImage ?? null;
  if (poster) {
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            background: '#000',
          }}
        >
          {/* ImageResponse/Satori only supports a raw <img>, not next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={poster}
            alt=""
            width={1200}
            height={630}
            style={{ objectFit: 'cover', width: 1200, height: 630 }}
          />
        </div>
      ),
      { ...size },
    );
  }

  const [bold, semi] = await Promise.all([
    fetch(new URL('../../fonts/Montserrat-Bold.otf', import.meta.url)).then((r) =>
      r.arrayBuffer(),
    ),
    fetch(new URL('../../fonts/Montserrat-SemiBold.otf', import.meta.url)).then((r) =>
      r.arrayBuffer(),
    ),
  ]);

  const dateLine = `${getPartyDateLabel(party.date)}  ·  ${displayDoorTime(party.doorsOpen)}`;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: '#000',
          color: '#fff',
          fontFamily: 'Montserrat',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 16,
            height: '100%',
            background: '#b24bf3',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flex: 1,
            padding: '56px 72px',
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
              {party.isHeadliner ? (
                <div
                  style={{
                    display: 'flex',
                    background: '#FFD60A',
                    color: '#0a0a0f',
                    fontSize: 20,
                    fontWeight: 700,
                    letterSpacing: 1.2,
                    padding: '8px 12px',
                    borderRadius: 4,
                  }}
                >
                  HEADLINER
                </div>
              ) : null}
              <div
                style={{
                  display: 'flex',
                  background: '#b24bf3',
                  color: '#fff',
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: 1.2,
                  padding: '8px 12px',
                  borderRadius: 4,
                }}
              >
                {party.category.toUpperCase()}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                fontSize: 64,
                fontWeight: 700,
                lineHeight: 1.05,
                letterSpacing: -1,
                maxHeight: 140,
                overflow: 'hidden',
              }}
            >
              {party.title.toUpperCase()}
            </div>

            <div
              style={{
                display: 'flex',
                marginTop: 20,
                fontSize: 28,
                fontWeight: 600,
                color: '#e0d4ff',
              }}
            >
              {party.host}
            </div>

            <div
              style={{
                display: 'flex',
                marginTop: 12,
                fontSize: 26,
                fontWeight: 600,
                color: '#9a9a9a',
              }}
            >
              {dateLine}
            </div>
          </div>

          <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, letterSpacing: -0.4 }}>
            <span style={{ color: '#b24bf3' }}>tu</span>
            <span>parties</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Montserrat', data: bold, weight: 700, style: 'normal' },
        { name: 'Montserrat', data: semi, weight: 600, style: 'normal' },
      ],
    },
  );
}
