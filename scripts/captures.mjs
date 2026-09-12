// Captures d'écran de FadeBeat pour la notice (chantiers #101 et #102).
// Rejouable :
//   node scripts/captures.mjs fr   → notice/figs/fr/
//   node scripts/captures.mjs en   → notice/figs/en/
//   node scripts/captures.mjs      → les deux langues
// L'appli est chargée avec ?lang=<langue> : c'est le paramètre prioritaire, donc
// la capture ne dépend ni de la langue du navigateur ni d'un choix mémorisé.
// Chaque capture = un état réel de l'appli, exercé dans Chrome headless.
// Les 17 noms de fichiers sont IDENTIQUES dans les deux dossiers : les deux
// notices pointent sur le même jeu de noms, chacune dans son dossier.
// puppeteer est pris dans /mnt/data/Charles/DevPerso/tonik/node_modules/ ;
// pour un autre chemin : PUPPETEER_MODULES=/chemin/vers/node_modules node scripts/captures.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const MODULES = process.env.PUPPETEER_MODULES || '/mnt/data/Charles/DevPerso/tonik/node_modules/';
const require = createRequire(MODULES.endsWith('/') ? MODULES : MODULES + '/');
const puppeteer = require('puppeteer');

const LANGS = ['fr', 'en'];
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP  = 'file://' + path.join(ROOT, 'FadeBeat.html');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const asked = process.argv.slice(2);
for (const a of asked) {
  if (!LANGS.includes(a)) { console.error(`langue inconnue : « ${a} » (attendu : ${LANGS.join(' ou ')})`); process.exit(2); }
}
const langs = asked.length ? asked : LANGS;

const browser = await puppeteer.launch({
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'],
});

let total = 0;
const errs = [];

for (const lang of langs) {
  const OUT = path.join(ROOT, 'notice', 'figs', lang);
  fs.mkdirSync(OUT, { recursive: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 900, deviceScaleFactor: 2 });
  page.on('pageerror', e => errs.push(`[${lang}] ${e}`));
  page.on('console', m => { if (m.type() === 'error') errs.push(`[${lang}] ${m.text()}`); });
  await page.goto(APP + '?lang=' + lang, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.getElementById('bc0') && getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)');
  // Garde-fou : la langue demandée est bien celle qui s'affiche
  const got = await page.evaluate(() => document.documentElement.lang);
  if (got !== lang) { console.error(`langue affichée « ${got} » au lieu de « ${lang} » — capture abandonnée`); process.exit(1); }

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
    total++;
    console.log(`capture ${lang}/${name}`);
  }
  async function setRange(id, v) {
    await page.evaluate((id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input')); }, id, v);
  }
  async function setNumber(id, v) {
    await page.evaluate((id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('change')); }, id, v);
  }
  async function waitMeasure(n) { await page.waitForFunction(n => document.getElementById('meas-n').textContent === String(n), { timeout: 60000 }, n); }

  // 01 — écran entier, à l'arrêt, réglages par défaut
  await page.screenshot({ path: path.join(OUT, '01-ecran.png'), fullPage: true }); total++; console.log(`capture ${lang}/01-ecran`);

  // 02 — les quatre cercles, à l'arrêt
  await shot('02-cercles', '#beats');

  // 03 — timbres (le 2e son choisi pour montrer l'état actif ailleurs que sur le premier)
  await page.click('#snd-bell');
  await page.evaluate(() => document.getElementById('sounds').parentElement.id = 'timbre-bloc');
  await shot('03-timbres', '#timbre-bloc');
  await page.click('#snd-wood');

  // 04 — tempo à 120 : le panneau ENTIER (parent du curseur), pas le seul curseur.
  // Une première capture cadrée sur `#s-bpm` existait ici ; elle écrivait le même
  // fichier, aussitôt écrasé par celle-ci, et faussait le compte (2026-09-12).
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

  // 13 — les pastilles, en HAUT : on cadre le bloc d'en-tête entier (titre,
  // sous-titre et pastilles), marge de 20 px, pour montrer où elles se trouvent.
  await shot('13-lien-notice', '#entete', 20);

  // 14 — la pastille de langue À CÔTÉ de la pastille Notice, cadrée serré
  // (chantier #102) : c'est la figure du chapitre « Changer la langue de l'appli ».
  // Marge 10 px : au-delà, le cadre mord sur le bas du sous-titre (mt-3 = 12 px).
  await shot('14-langue', '#pastilles', 10);

  await page.close();
}

await browser.close();
console.log(`${total} captures écrites pour ${langs.join(' + ')}`);
console.log('erreurs console/page :', errs.length, errs);
process.exit(errs.length ? 1 : 0);
