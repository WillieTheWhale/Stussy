import { gsap } from 'gsap'
import { prefersReduced } from '../core/motion'
import { onScroll } from '../core/scroll'

/* ═══════════════════════════════════════════════════════════════════
   ATMOSPHERE — the underprint behind the page.

   WHAT CHANGED AND WHY
   The previous build drew this on a 2D canvas: ~1500 text instances,
   each measured and re-filled with ctx.fillText every single frame, on
   the main thread. Profiled at 6× CPU throttle that was 80ms frames —
   12fps, 100% janked, 17s of long tasks over one scroll pass.

   Here each lane is ONE element holding two copies of its phrase set,
   moved by a CSS keyframe that translates it exactly -50%. Chrome runs
   transform keyframes on the compositor, so the streaming costs zero
   main-thread time: no rAF loop, no ticker, no per-frame JS at all.
   Scroll response is a single quickTo on the container.

   Density is art direction, not maximisation. Lanes are sparse and
   faint; paper sections lay a translucent wash over the top so copy
   sits on a surface. The old layer was so dense it was illegible.
   ═══════════════════════════════════════════════════════════════════ */

const PHRASES = [
  'Chapel Hill', 'Franklin St', 'Southern Part of Heaven', 'Tar Heels',
  '8-Ball Never Lies', 'GDTBATH', 'Chapel Thrill', 'Est. 2026',
  'Carolina Blue', 'Chapter No. 26', '178 E Franklin', 'Go Heels',
  'チャペルヒル店', 'Sold Out Forever', 'International Tribe',
]

const DOODLES = ['8ball', 'crown', 'dice', 'ram']

/* Vite rewrites absolute asset paths in HTML and CSS for `base`, but NOT
   strings built at runtime — a bare "/assets/…" here resolves to the
   domain root and 404s on the /Stussy/ Pages deploy. */
const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`.replace(/\/{2,}/g, '/')

/* Lane tiers. Big lanes are rare and faint; small lanes carry the
   density. Tints are budgeted — most of the page is ink. */
interface Tier { fs: [number, number]; op: [number, number]; weight: number; dur: [number, number] }
const TIERS: Tier[] = [
  { fs: [84, 124], op: [0.028, 0.040], weight: 800, dur: [150, 210] }, // headline ghosts
  { fs: [38, 54],  op: [0.032, 0.046], weight: 800, dur: [110, 160] }, // mid
  { fs: [18, 25],  op: [0.045, 0.062], weight: 500, dur: [80,  120] }, // fine print
]

/* Tint budget. Ink carries the field; the brand colours are seasoning.
   Saturated hues read heavier than ink at the same alpha, so their
   share is deliberately small. */
const TINTS: Array<[string, number]> = [
  ['16, 15, 13', 0.62],    // ink — the majority
  ['75, 156, 211', 0.22],  // carolina
  ['255, 74, 23', 0.09],   // flare
  ['240, 180, 41', 0.07],  // gold
]

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)]

const pickTint = () => {
  let r = Math.random()
  for (const [rgb, w] of TINTS) {
    if (r < w) return rgb
    r -= w
  }
  return TINTS[0][0]
}

export interface Atmosphere {
  start: () => void
  stop: () => void
}

export const initAtmosphere = (): Atmosphere | null => {
  const root = document.getElementById('atmos')
  if (!root || prefersReduced()) return null

  const LANES = window.innerWidth < 900 ? 10 : 16
  const vw = window.innerWidth

  /* The tier sizes are tuned against a ~1440px stage. Left absolute, a
     120px headline ghost is a third of a phone screen wide and stops
     being atmosphere — it becomes the content. */
  const scale = Math.min(1, Math.max(0.42, vw / 1440))

  const frag = document.createDocumentFragment()

  for (let i = 0; i < LANES; i++) {
    /* one big lane in every four, so the rhythm reads as designed
       rather than as uniform stripes */
    const tier = TIERS[i % 4 === 1 ? 0 : i % 2 === 0 ? 2 : 1]
    const fs = rand(tier.fs[0], tier.fs[1]) * scale
    const lane = document.createElement('div')
    lane.className = 'atmos__lane'

    const y = (i / LANES) * 108 - 4 + rand(-1.6, 1.6)
    lane.style.setProperty('--y', `${y}vh`)
    lane.style.setProperty('--fs', `${fs.toFixed(1)}px`)
    lane.style.setProperty('--fw', String(tier.weight))
    lane.style.setProperty('--c', `rgba(${pickTint()}, ${rand(tier.op[0], tier.op[1]).toFixed(3)})`)
    lane.style.setProperty('--dur', `${rand(tier.dur[0], tier.dur[1]).toFixed(0)}s`)
    if (i % 3 === 2) lane.dataset.dir = 'r'

    /* Estimated advance width for condensed uppercase display type. The
       loop translates exactly one unit, so over-provisioning is free —
       we only need the unit to be at least a viewport wide, and this
       avoids a forced layout per lane at boot. */
    const perChar = fs * 0.4
    const unit = document.createElement('span')
    let width = 0
    let guard = 0
    while (width < vw * 1.25 && guard++ < 60) {
      const txt = pick(PHRASES)
      const b = document.createElement('b')
      b.textContent = `${txt} ★`
      unit.appendChild(b)
      width += (txt.length + 2) * perChar + fs * 0.6
    }
    lane.appendChild(unit)
    lane.appendChild(unit.cloneNode(true))
    frag.appendChild(lane)
  }

  /* drifting doodles — punctuation, not wallpaper */
  const charas: HTMLElement[] = DOODLES.map((name) => {
    const el = document.createElement('div')
    el.className = 'atmos__chara'
    const img = document.createElement('img')
    img.src = asset(`assets/doodles/${name}.png`)
    img.alt = ''
    img.loading = 'lazy'
    img.width = 520
    img.height = 520
    el.appendChild(img)
    frag.appendChild(el)
    return el
  })

  root.appendChild(frag)

  /* ── scroll response ───────────────────────────────────────────
     One transform on the container: the whole field leans into the
     scroll and eases back. Two composited properties, no layout. */
  const drift = { x: 0 }
  const driftTo = gsap.quickTo(root, 'x', { duration: 0.55, ease: 'power3.out' })
  let settle: gsap.core.Tween | null = null

  onScroll(({ velocity }) => {
    if (!running) return
    drift.x = gsap.utils.clamp(-70, 70, -velocity * 2.4)
    driftTo(drift.x)
    settle?.kill()
    settle = gsap.delayedCall(0.25, () => driftTo(0))
  })

  /* ── chara scheduler ───────────────────────────────────────────── */
  let charaCall: gsap.core.Tween | null = null
  let cursor = 0
  const scheduleChara = (first = false) => {
    charaCall = gsap.delayedCall(first ? 5 : rand(7, 13), () => {
      const el = charas[cursor++ % charas.length]
      el.classList.remove('-run')
      void el.offsetWidth /* restart the keyframe */
      el.style.setProperty('--y', `${rand(8, 78)}vh`)
      el.style.setProperty('--w', `${rand(9, 17).toFixed(1)}vw`)
      el.style.setProperty('--dur', `${rand(11, 18).toFixed(1)}s`)
      el.classList.add('-run')
      scheduleChara()
    })
  }

  let running = false

  return {
    start: () => {
      running = true
      root.classList.add('-ready')
      scheduleChara(true)
    },
    stop: () => {
      running = false
      charaCall?.kill()
      root.style.setProperty('--atmos-play', 'paused')
    },
  }
}
