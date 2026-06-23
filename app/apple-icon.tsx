import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        background: 'linear-gradient(135deg, #F496A5 0%, #81BFD4 100%)',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 40,
      }}
    >
      <span
        style={{
          color: 'white',
          fontSize: 72,
          fontWeight: 700,
          letterSpacing: -2,
          fontFamily: 'sans-serif',
        }}
      >
        UGC
      </span>
    </div>,
    { ...size }
  )
}
