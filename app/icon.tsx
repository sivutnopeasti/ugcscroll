import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        background: 'linear-gradient(135deg, #F496A5 0%, #81BFD4 100%)',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 7,
      }}
    >
      <span
        style={{
          color: 'white',
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: -0.5,
          fontFamily: 'sans-serif',
        }}
      >
        UGC
      </span>
    </div>,
    { ...size }
  )
}
