import { ImageResponse } from 'next/og';

export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 15,
          background: '#092328', // Deep green bg
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FDF4D2', // Cream text
          fontWeight: 900,
          borderRadius: '6px',
        }}
      >
        9ja
      </div>
    ),
    {
      ...size,
    }
  );
}
