'use client'

// Ensimmäinen kortti feedissä — CTA tilata UGC Suomi Pro

export default function PromoCard() {
  return (
    <div
      className="video-snap-card flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #F496A5 0%, #c96b7e 40%, #81BFD4 100%)',
      }}
    >
      {/* Taustakuvio — abstraktit ympyrät */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute rounded-full opacity-20"
          style={{ width: 500, height: 500, background: '#fff', top: -120, right: -160 }} />
        <div className="absolute rounded-full opacity-10"
          style={{ width: 350, height: 350, background: '#fff', bottom: 80, left: -100 }} />
      </div>

      {/* Sisältö */}
      <div className="relative z-10 flex flex-col items-center px-8 text-center gap-6">
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="UGC Suomi"
          style={{ height: 44, filter: 'brightness(0) invert(1) drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}
        />

        {/* Teksti */}
        <div className="flex flex-col gap-3">
          <h2
            className="text-white font-bold leading-tight"
            style={{ fontSize: 'clamp(22px, 5.5vw, 30px)', textShadow: '0 2px 12px rgba(0,0,0,0.25)' }}
          >
            Tilaa UGC Suomi Pro ja lataa esittelyvideosi UGC Scrolliin.
          </h2>
          <p className="text-white/80 text-sm leading-relaxed">
            Tavoita yritykset ja brändit yhdellä videolla — tule osaksi Suomen suurinta UGC-yhteisöä.
          </p>
        </div>

        {/* CTA-nappi */}
        <a
          href="https://ugcsuomi.fi/oma-tili"
          target="_blank"
          rel="noopener noreferrer"
          className="px-8 py-3.5 rounded-full font-bold text-base transition-transform active:scale-95"
          style={{
            background: '#fff',
            color: '#D25A6C',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          }}
        >
          Tilaa nyt →
        </a>
      </div>

      {/* Scrollaa alas -animaatio */}
      <div
        className="absolute bottom-20 left-0 right-0 flex flex-col items-center gap-3 pointer-events-none"
        aria-hidden
      >
        <span className="text-white/70 text-xs font-medium tracking-widest uppercase">
          Selaa profiileja
        </span>

        {/* Hiiri / scroll-indikaattori */}
        <div
          className="relative flex justify-center"
          style={{
            width: 28,
            height: 44,
            borderRadius: 14,
            border: '2px solid rgba(255,255,255,0.7)',
          }}
        >
          {/* Liikkuva pallo sisällä */}
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: '#fff',
              position: 'absolute',
              top: 6,
              animation: 'scroll-dot 1.6s ease-in-out infinite',
            }}
          />
        </div>

        {/* Iso pomppiva nuoli */}
        <svg
          className="w-7 h-7 text-white"
          style={{ animation: 'bounce-down 1.4s ease-in-out infinite', opacity: 0.85 }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  )
}
