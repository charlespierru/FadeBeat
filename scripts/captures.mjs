// Captures d'écran de FadeBeat pour la notice (chantier #101).
// Rejouable : node scripts/captures.mjs
// Chaque capture = un état réel de l'appli, exercé dans Chrome headless.
// puppeteer est pris dans /mnt/data/Charles/DevPerso/tonik/node_modules/ ;
// pour un autre chemin : PUPPETEER_MODULES=/chemin/vers/node_modules node scripts/captures.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const MODULES = process.env.PUPPETEER_MODULES || '/mnt/data/Charles/DevPerso/tonik/node_modules/';
const require = createRequire(MODULES.endsWith('/') ? MODULES : MODULES + '/');
const puppeteer = require('puppeteer');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT  = path.join(ROOT, 'notice', 'figs');
const URL  = 'file://' + path.join(ROOT, 'FadeBeat.html');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1000, height: 900, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(URL, { waitUntil: 'networkidle0' });
await page.waitForFunction(() => document.getElementById('bc0') && getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)');

// Capture d'un élément avec une marge, sur fond de la page
async function shot(name, selector, pad = 14) {
  await page.mouse.move(0, 0);          // aucun survol qui colorerait un bouton
  await sleep(350);                      // laisser finir les transitions CSS
  const el = await page.$(selector);
  const vb = await el.boundingBox();     // coordonnées de la fenêtre…
  const { sx, sy } = await page.evaluate(() => ({ sx: window.scrollX, sy: window.scrollY }));
  const b = { x: vb.x + sx, y: vb.y + sy, width: vb.width, height: vb.height }; // … ramenées à la page
  await page.screenshot({
    path: path.join(OUT, name + '.png'),
    clip: { x: Math.max(0, b.x - pad), y: Math.max(0, b.y - pad), width: b.width + 2 * pad, height: b.height + 2 * pad },
  });
  console.log('capture', name);
}
async function setRange(id, v) {
  await page.evaluate((id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input')); }, id, v);
}
async function setNumber(id, v) {
  await page.evaluate((id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('change')); }, id, v);
}
const measure = () => page.evaluate(() => document.getElementById('meas-n').textContent);
async function waitMeasure(n) { await page.waitForFunction(n => document.getElementById('meas-n').textContent === String(n), { timeout: 60000 }, n); }

// 01 — écran entier, à l'arrêt, réglages par défaut
await page.screenshot({ path: path.join(OUT, '01-ecran.png'), fullPage: true }); console.log('capture 01-ecran');

// 02 — les quatre cercles, à l'arrêt
await shot('02-cercles', '#beats');

// 03 — timbres (Cloche choisie pour montrer l'état actif ailleurs que sur le premier)
await page.click('#snd-bell');
await page.evaluate(() => document.getElementById('sounds').parentElement.id = 'timbre-bloc');
await shot('03-timbres', '#timbre-bloc');
await page.click('#snd-wood');

// 04 — tempo à 120
await shot('04-tempo', '#s-bpm', 40);
// le panneau entier (parent du curseur)
await page.evaluate(() => document.getElementById('s-bpm').closest('.max-w-xl').id = 'tempo-panel');
await shot('04-tempo', '#tempo-panel');

// 05 — accélération éteinte
await shot('05-acc-eteinte', '#acc-panel');

// 06 — accélération allumée, à l'arrêt (départ 100, arrivée 130, toutes les 2, pas 10)
await setNumber('acc-from', 100); await setNumber('acc-to', 130); await setNumber('acc-m', 2); await setNumber('acc-n', 10);
await page.click('#acc-toggle');
await shot('06-acc-allumee', '#acc-panel');
await shot('06b-tempo-verrouille', '#tempo-panel');

// 07 — en lecture, premier palier en cours (mesure 1 : tempo 100, prochain palier dans 1 mesure)
await page.click('#btn-play');
await waitMeasure(1);
await shot('07-acc-palier', '#acc-panel');

// 08 — arrivée atteinte (mesure 6 → 130)
await waitMeasure(6);
await sleep(150);
await shot('08-acc-arrivee', '#acc-panel');
await shot('08b-tempo-arrivee', '#tempo-panel');
await page.click('#btn-play'); // stop
await page.click('#acc-toggle'); // mode éteint

// 09 — carte du beat 1 avec durée fade 8, début après 4
await setRange('sd0', 8); await setRange('ss0', 4);
await page.evaluate(() => document.getElementById('beat-ctrl').children[0].id = 'card0');
await shot('09-beat-carte', '#card0');
await shot('09b-attenuation', '#beat-ctrl');

// 10 — bouton Play (arrêt) puis Stop (lecture)
await page.evaluate(() => document.getElementById('btn-play').parentElement.id = 'main-btns');
await shot('10-boutons-arret', '#main-btns');
// fade rapide sur le beat 1 pour voir la barre de volume descendre : durée 2, début 0
await setRange('sd0', 2); await setRange('ss0', 0);
await page.click('#btn-play');
await waitMeasure(1);
await sleep(300);
await shot('11-boutons-lecture', '#main-btns');
await shot('12-cercles-lecture', '#beats');
await page.click('#btn-play');

// 13 — le lien Notice, en HAUT : on cadre le bloc d'en-tête entier (titre,
// sous-titre et lien), marge de 20 px, pour montrer où le lien se trouve.
await shot('13-lien-notice', '#entete', 20);

await browser.close();
console.log('erreurs console/page :', errs.length, errs);
