import { gsap } from 'gsap'
import { EASE, prefersReduced } from '../core/motion'

/* ═══════════════════════════════════════════════════════════════════
   CURTAIN — anchor navigation cover.

   Slats scale up from the floor, the jump happens while the screen is
   covered, then they retract through the ceiling. Pure scaleY on a
   fixed grid: no SVG filter, no layout, no paint beyond the slats.
   (The old build ran 24 SVG rects through a gooey feGaussianBlur +
   feColorMatrix filter — a full-viewport filter re-render per frame.)
   ═══════════════════════════════════════════════════════════════════ */

const TONES = ['ink', 'carolina', 'flare', 'navy']

export class Curtain {
  private el: HTMLElement
  private slats: HTMLElement[] = []
  private busy = false

  constructor(id: string, count = 12) {
    this.el = document.getElementById(id)!
    this.el.style.setProperty('--slats', String(count))
    const frag = document.createDocumentFragment()
    for (let i = 0; i < count; i++) {
      const slat = document.createElement('i')
      frag.appendChild(slat)
      this.slats.push(slat)
    }
    this.el.appendChild(frag)
  }

  /* Cover, run `mid` behind the curtain, then uncover. */
  wipe(mid: () => void) {
    if (prefersReduced()) {
      mid()
      return
    }
    if (this.busy) return
    this.busy = true

    this.el.dataset.tone = TONES[Math.floor(Math.random() * TONES.length)]
    this.el.classList.add('-active')

    const tl = gsap.timeline({
      onComplete: () => {
        this.el.classList.remove('-active')
        this.busy = false
      },
    })

    tl.set(this.slats, { transformOrigin: '50% 100%' })
      .to(this.slats, {
        scaleY: 1,
        duration: 0.44,
        ease: EASE.inOut,
        stagger: { each: 0.022, from: 'start' },
      })
      .add(mid)
      .set(this.slats, { transformOrigin: '50% 0%' })
      .to(this.slats, {
        scaleY: 0,
        duration: 0.48,
        ease: EASE.inOut,
        stagger: { each: 0.022, from: 'end' },
      }, '+=0.08')
  }
}
