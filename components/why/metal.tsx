/**
 * Metal primitives for the /why object.
 *
 * The /why page is presented as a single slab of etched meteoric iron — a physical,
 * engineered object rather than a web layout. These pieces build that surface and its
 * machined fittings from real material cues (brushed striations, raking sheen, incised
 * grooves, recessed fasteners), never from decorative graphics or colour. Monochrome
 * graphite / brushed steel only. All server-renderable, deterministic, non-interactive.
 */

/** Incised-engraving text shadow — light top edge, dark inner — for stamped headers. */
export const ENGRAVE = {
  textShadow: '0 1px 0 rgba(255,255,255,0.05), 0 -1px 0 rgba(0,0,0,0.6)',
} as const

/** Raised-bevel surface for machined plates (pipeline nodes, compartment cells). */
export const PLATE = {
  background: 'linear-gradient(180deg,#16191d 0%,#0d0f12 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.5)',
} as const

/** Machined control face for buttons — brushed steel with a top highlight bevel. */
export const CONTROL = {
  background: 'linear-gradient(180deg,#23262b 0%,#15171b 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 2px rgba(0,0,0,0.6)',
} as const

/**
 * The slab surface. Rendered once, fixed behind the page, so the content reads as
 * compartments cut into one continuous piece of metal while it scrolls past.
 */
export function MetalField() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      {/* Iron body — graphite, darkening downward into mass. */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(176deg,#141619 0%,#0c0e11 52%,#070809 100%)' }} />
      {/* Brushed grain — fine machined striations, one direction (titanium / brushed steel). */}
      <div
        className="absolute inset-0"
        style={{ backgroundImage: 'repeating-linear-gradient(104deg, rgba(255,255,255,0.022) 0px, rgba(255,255,255,0.022) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 3px)' }}
      />
      {/* Faint cross-machining for surface depth. */}
      <div
        className="absolute inset-0"
        style={{ backgroundImage: 'repeating-linear-gradient(168deg, rgba(0,0,0,0.16) 0px, rgba(0,0,0,0.16) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 6px)' }}
      />
      {/* Raking sheen — a single light source crossing the surface from upper-left. */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 85% at 26% -5%, rgba(255,255,255,0.07), rgba(255,255,255,0) 55%)' }} />
      {/* Deep vignette — the slab falling into shadow at its edges. */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(135% 105% at 50% 36%, rgba(0,0,0,0) 48%, rgba(0,0,0,0.86) 100%)' }} />
    </div>
  )
}

/** Incised separator between compartments — a groove that catches light on its lower lip. */
export function EngravedRule({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`h-[2px] w-full ${className}`}
      style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0px, rgba(0,0,0,0.7) 1px, rgba(255,255,255,0.07) 1px, rgba(255,255,255,0.07) 2px)' }}
    />
  )
}

/** A recessed panel fastener — small, dark, structural. Not decorative. */
export function Fastener({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block h-2.5 w-2.5 rounded-full ${className}`}
      style={{
        background: 'radial-gradient(circle at 36% 30%, #31353a 0%, #181a1e 45%, #0a0b0d 100%)',
        boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.85), 0 1px 0 rgba(255,255,255,0.05)',
      }}
    />
  )
}
