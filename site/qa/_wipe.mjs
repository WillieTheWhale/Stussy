import { chromium } from 'playwright'
import fs from 'node:fs'
const OUT = './qa/out/wipe'
fs.mkdirSync(OUT, { recursive: true })
const b = await chromium.launch({ channel: 'chrome' })
const p = await b.newPage({ viewport: { width: 1512, height: 900 } })
const errs = []
p.on('pageerror', e => errs.push(String(e)))
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
await p.goto('http://localhost:5173/Stussy/', { waitUntil: 'load' })
await p.waitForTimeout(4200)
await p.click('a[href="#lookbook"]', { force: true })
for (const t of [180, 340, 500, 660, 820, 980, 1150, 1350]) {
  await p.waitForTimeout(t === 180 ? 180 : 160)
  await p.screenshot({ path: `${OUT}/t${String(t).padStart(4,'0')}.png` })
}
await p.waitForTimeout(1500)
await p.screenshot({ path: `${OUT}/settled.png` })
console.log('errors', JSON.stringify(errs.slice(0,4)))
await b.close()
