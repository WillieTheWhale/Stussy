import { gsap } from 'gsap'
import { EASE, prefersReduced } from '../core/motion'

/* ═══════════════════════════════════════════════════════════════════
   SECTION DECO — background life inside the opaque sections.

   The atmosphere layer sits behind the page, which means the three
   sections that own a solid colour field — lookbook (navy), tribe
   (carolina), store (ink) — were completely flat behind their content.
   Half the page had a world behind it and half had nothing.

   These are big, low-contrast marks scattered inside the section
   itself, parallaxing against the scroll so they sit *in* the field
   rather than on it. Scale and placement are deliberately uneven; a
   mark landing dead-centre or at a tidy interval reads as a pattern.
   ═══════════════════════════════════════════════════════════════════ */

const SVG_NS = 'http://www.w3.org/2000/svg'

/* Per-section casts. Each section gets marks that belong to it rather
   than a shared random draw, so the sections stay distinguishable. */
const CASTS: Record<string, string[]> = {
  lookbook: ['sun', 'sparkle', 'wave', 'star4', 'flame'],
  tribe: ['crown', 'chain', 'spade', 'sparkle', 'skull'],
  store: ['eightball', 'dice', 'ball', 'crown', 'star4'],
}

/* x/y in %, size in vw, rotation in deg — hand-placed so nothing lands
   on the display type or the reading column */
const SPOTS: Array<[number, number, number, number]> = [
  [76, 12, 13, -14],
  [8, 62, 17, 11],
  [58, 74, 10, -8],
  [90, 46, 9, 19],
  [33, 20, 8, -21],
]

const rand = (a: number, b: number) => a + Math.random() * (b - a)

export const initDeco = () => {
  if (prefersReduced()) return

  for (const [id, cast] of Object.entries(CASTS)) {
    const sec = document.getElementById(id)
    if (!sec) continue

    const layer = document.createElement('div')
    layer.className = 'sec__deco'
    layer.setAttribute('aria-hidden', 'true')

    cast.forEach((name, i) => {
      const [x, y, w, rot] = SPOTS[i % SPOTS.length]
      const el = document.createElement('div')
      el.className = 'sec__deco-mark'
      el.style.setProperty('--x', `${x + rand(-4, 4)}%`)
      el.style.setProperty('--y', `${y + rand(-5, 5)}%`)
      el.style.setProperty('--w', `${(w * rand(0.85, 1.2)).toFixed(1)}vw`)
      el.style.setProperty('--rot', `${rot + rand(-8, 8)}deg`)

      const svg = document.createElementNS(SVG_NS, 'svg')
      svg.setAttribute('viewBox', '0 0 100 100')
      const use = document.createElementNS(SVG_NS, 'use')
      use.setAttribute('href', `#mk-${name}`)
      svg.appendChild(use)
      el.appendChild(svg)
      layer.appendChild(el)
    })

    /* prepend so the marks sit behind the section's own content */
    sec.insertBefore(layer, sec.firstChild)

    /* Alternating parallax rates pull the field apart as it passes —
       one transform per mark, no layout, no paint. */
    gsap.utils.toArray<HTMLElement>(layer.children).forEach((mark, i) => {
      gsap.fromTo(mark,
        { yPercent: (i % 2 ? 1 : -1) * rand(14, 30) },
        {
          yPercent: (i % 2 ? -1 : 1) * rand(14, 30),
          ease: EASE.linear,
          scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: 1.15 },
        })
    })
  }
}
