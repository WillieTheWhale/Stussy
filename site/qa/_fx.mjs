import { chromium } from 'playwright'
import fs from 'node:fs'
const OUT = './qa/out/fx'
fs.mkdirSync(OUT, { recursive: true })
const b = await chromium.launch({ channel: 'chrome' })
const p = await b.newPage({ viewport: { width: 1512, height: 900 } })
const errs = []
p.on('pageerror', e => errs.push(String(e)))
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
await p.goto('http://localhost:5173/Stussy/', { waitUntil: 'load' })
await p.waitForTimeout(4500)

// 1. sheen travelling through the wordmark
for (let i = 0; i < 4; i++) {
  await p.screenshot({ path: `${OUT}/sheen-${i}.png`, clip: { x: 60, y: 190, width: 780, height: 480 } })
  await p.waitForTimeout(1100)
}

// 2. tribe ellipse hover
await p.evaluate(() => document.getElementById('tribe').scrollIntoView())
await p.waitForTimeout(1300)
const card = await p.$('.tribe-card:nth-child(2)')
const cb = await card.boundingBox()
await p.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2)
await p.waitForTimeout(160)
await p.screenshot({ path: `${OUT}/ellipse-mid.png` })
await p.waitForTimeout(700)
await p.screenshot({ path: `${OUT}/ellipse-full.png` })

// 3. band urgent state under hard scroll
await p.evaluate(() => window.scrollTo(0, 0))
await p.waitForTimeout(900)
for (let i = 0; i < 14; i++) { await p.mouse.wheel(0, 340); await p.waitForTimeout(16) }
const urgent = await p.evaluate(() => document.querySelectorAll('.band.-urgent').length)
await p.screenshot({ path: `${OUT}/urgent.png` })
console.log('urgent bands during fast scroll:', urgent)
console.log('errors', JSON.stringify(errs.slice(0, 4)))
await b.close()
