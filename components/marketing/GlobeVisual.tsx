// Decorative stylized globe for the homepage "worldwide" section — an actual sphere (not an icon):
// blue planet gradient, latitude/longitude graticule, simplified continent shapes, and a few accent
// dots on the continents (decorative; real data dots can replace these later). Pure presentational
// SVG: no props-driven logic, no data, no counters. ALH blue-planet palette.
export function GlobeVisual({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} role="img" aria-label="Stylized globe of the world">
      <defs>
        <radialGradient id="alh-globe" cx="38%" cy="32%" r="78%">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="40%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#075985" />
        </radialGradient>
        <radialGradient id="alh-globe-glow" cx="50%" cy="50%" r="50%">
          <stop offset="68%" stopColor="#38bdf8" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </radialGradient>
        <clipPath id="alh-globe-clip">
          <circle cx="200" cy="200" r="158" />
        </clipPath>
      </defs>

      {/* Atmospheric glow */}
      <circle cx="200" cy="200" r="196" fill="url(#alh-globe-glow)" />

      {/* Sphere */}
      <circle cx="200" cy="200" r="158" fill="url(#alh-globe)" />

      <g clipPath="url(#alh-globe-clip)">
        {/* Continents — stylized blobs (lighter blue land over the ocean sphere) */}
        <g fill="#bae6fd" opacity="0.92">
          <path d="M118 112 C108 92 142 80 166 96 C190 108 184 142 160 154 C134 166 120 144 118 112 Z" />
          <path d="M150 232 C144 214 174 206 180 234 C186 264 162 292 150 280 C138 268 152 254 150 232 Z" />
          <path d="M224 116 C252 98 312 110 304 146 C297 176 250 170 240 152 C231 137 212 134 224 116 Z" />
          <path d="M236 176 C258 170 270 204 258 232 C249 254 224 248 221 220 C219 198 222 182 236 176 Z" />
          <path d="M276 256 C292 250 304 268 292 280 C281 290 265 281 268 269 C270 263 268 260 276 256 Z" />
        </g>
        {/* Land highlights */}
        <g fill="#f0f9ff" opacity="0.45">
          <path d="M132 108 C128 98 146 96 156 104 C150 116 138 118 132 108 Z" />
          <path d="M244 126 C258 116 286 122 282 138 C268 134 252 138 244 126 Z" />
        </g>

        {/* Graticule (lat/long grid) */}
        <g stroke="#ffffff" strokeOpacity="0.28" fill="none" strokeWidth="1.2">
          <ellipse cx="200" cy="200" rx="158" ry="54" />
          <ellipse cx="200" cy="200" rx="158" ry="108" />
          <line x1="42" y1="200" x2="358" y2="200" />
          <ellipse cx="200" cy="200" rx="54" ry="158" />
          <ellipse cx="200" cy="200" rx="108" ry="158" />
          <line x1="200" y1="42" x2="200" y2="358" />
        </g>

        {/* Accent dots on continents (decorative; replaceable with live data later) */}
        <g fill="#f59e0b">
          <circle cx="150" cy="126" r="4.5" />
          <circle cx="262" cy="138" r="4.5" />
          <circle cx="243" cy="206" r="4.5" />
          <circle cx="166" cy="252" r="4.5" />
          <circle cx="285" cy="268" r="4.5" />
        </g>
      </g>

      {/* Rim */}
      <circle cx="200" cy="200" r="158" fill="none" stroke="#0c4a6e" strokeOpacity="0.35" strokeWidth="2" />
    </svg>
  )
}
