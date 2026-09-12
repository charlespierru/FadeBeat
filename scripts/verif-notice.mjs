// Vérification headless de la notice (FR et EN) : ancres, images, scroll-spy,
// largeur 400 px, bascule de langue, lien depuis l'appli. node scripts/verif-notice.mjs
// puppeteer est pris dans /mnt/data/Charles/DevPerso/tonik/node_modules/ ;
// pour un autre chemin : PUPPETEER_MODULES=/chemin/vers/node_modules node scripts/verif-notice.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const MODULES = process.env.PUPPETEER_MODULES || '/mnt/data/Charles/DevPerso/tonik/node_modules/';
const require = createRequire(MODULES.endsWith('/') ? MODULES : MODULES + '/');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] || '/tmp';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK    ' : 'ÉCHEC ') + m); if (!c) fails++; };

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type()==='error') errs.push(m.text()); });

// Lien depuis l'appli
await page.setViewport({ width: 1000, height: 900 });
await page.goto('file://' + path.join(ROOT, 'FadeBeat.html'), { waitUntil: 'networkidle0' });
const lnk = await page.$eval('#lnk-notice', a => ({ href: a.getAttribute('href'), target: a.target, rel: a.rel, text: a.textContent.trim() }));
ok(lnk.href === 'notice/fr.html' && lnk.target === '_blank' && lnk.rel.includes('noopener'), `lien appli → ${lnk.href}, nouvel onglet (${lnk.target}), texte « ${lnk.text} »`);

// Le lien est en HAUT (décision de Charles, 2026-09-12) : à 400 px de large il
// doit être visible SANS DÉFILER, donc entièrement dans les 800 px de hauteur.
await page.setViewport({ width: 400, height: 800 });
await page.goto('file://' + path.join(ROOT, 'FadeBeat.html'), { waitUntil: 'networkidle0' });
await sleep(250);
const lb = await page.$eval('#lnk-notice', a => { const r = a.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, w: r.width }; });
const lnkScroll = await page.evaluate(() => window.scrollY);
ok(lb.bottom <= 800 && lb.w > 0 && lnkScroll === 0, `lien appli à 400 px : visible sans défiler (haut ${Math.round(lb.top)}, bas ${Math.round(lb.bottom)} ≤ 800, largeur ${Math.round(lb.w)}, défilement ${lnkScroll})`);
await page.screenshot({ path: `${OUT}/appli-400-lien.png` });

for (const lang of ['fr', 'en']) {
  const url = 'file://' + path.join(ROOT, 'notice', lang + '.html');
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)');
  // Ancres du sommaire
  const toc = await page.$$eval('.toc a', as => as.map(a => a.getAttribute('href')));
  const missing = await page.evaluate(hs => hs.filter(h => !document.querySelector(h)), toc);
  ok(toc.length === 10 && missing.length === 0, `${lang} : ${toc.length} entrées de sommaire, cibles manquantes : ${missing.length}`);
  // Images
  const imgs = await page.$$eval('figure img', is => is.map(i => ({ src: i.getAttribute('src'), w: i.naturalWidth, cap: !!i.closest('figure').querySelector('figcaption')?.textContent.trim() })));
  const bad = imgs.filter(i => i.w === 0 || !i.cap);
  ok(imgs.length === 16 && bad.length === 0, `${lang} : ${imgs.length} figures chargées avec légende, défaillantes : ${bad.length} ${JSON.stringify(bad)}`);
  // Scroll-spy : aller au chapitre 6, vérifier le surlignage
  await page.evaluate(() => document.querySelector('#ch-6').scrollIntoView());
  await sleep(1500); // défilement doux
  const active = await page.$eval('.toc a.active', a => a.getAttribute('href'));
  ok(active === '#ch-6', `${lang} : chapitre surligné après défilement vers 6 → ${active}`);
  // Sidebar à gauche du contenu (écran large)
  const geo = await page.evaluate(() => { const a = document.querySelector('aside').getBoundingClientRect(), m = document.querySelector('main').getBoundingClientRect(); return { aR: a.right, mL: m.left, aW: a.width }; });
  ok(geo.aR <= geo.mL && geo.aW > 200, `${lang} : sommaire à gauche (droite ${Math.round(geo.aR)} ≤ gauche contenu ${Math.round(geo.mL)}), largeur ${Math.round(geo.aW)}`);
  // Bascule de langue garde l'ancre
  location: {
    await page.evaluate(() => { location.hash = '#ch-6'; });
    const other = lang === 'fr' ? 'en' : 'fr';
    await page.click('#lang');
    await page.waitForFunction(o => location.pathname.endsWith(o + '.html'), {}, other);
    await sleep(1500);
    const h = await page.evaluate(() => location.hash);
    const top = await page.evaluate(() => Math.abs(document.querySelector('#ch-6').getBoundingClientRect().top) < 120);
    ok(h === '#ch-6' && top, `${lang}→${other} : bascule garde l'ancre (${h}) et le chapitre est en haut (${top})`);
    await page.goto(url, { waitUntil: 'networkidle0' });
  }
  // Captures pour lecture : haut de page et chapitre 6, écran large
  await page.screenshot({ path: `${OUT}/notice-${lang}-haut.png` });
  await page.evaluate(() => document.querySelector('#ch-6').scrollIntoView()); await sleep(1500);
  await page.screenshot({ path: `${OUT}/notice-${lang}-ch6.png` });
  // 400 px : pas de défilement horizontal
  await page.setViewport({ width: 400, height: 800 });
  await page.goto(url, { waitUntil: 'networkidle0' }); await sleep(300);
  const sw = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  ok(sw.sw <= sw.cw, `${lang} : à 400 px, largeur de page ${sw.sw} ≤ fenêtre ${sw.cw}`);
  await page.screenshot({ path: `${OUT}/notice-${lang}-400.png` });
  // 400 px : un clic sur le sommaire doit amener le TITRE du chapitre visé dans l'écran,
  // et non sous l'en-tête. L'en-tête n'est `sticky` qu'à partir de lg (2026-09-12) :
  // sur écran étroit il faisait 3 lignes et recouvrait le début des sections.
  await page.click('.toc a[href="#ch-6"]');
  await sleep(1800); // défilement doux
  const vu = await page.evaluate(() => {
    const h = document.querySelector('#ch-6 h2').getBoundingClientRect();
    const hd = document.querySelector('header').getBoundingClientRect();
    return { top: h.top, bottom: h.bottom, hdB: hd.bottom, vh: window.innerHeight };
  });
  ok(vu.top >= 0 && vu.bottom <= vu.vh && vu.top >= vu.hdB,
     `${lang} : à 400 px, clic sommaire → titre du ch. 6 visible (haut ${Math.round(vu.top)}, bas ${Math.round(vu.bottom)}, fenêtre ${vu.vh}) et non recouvert par l'en-tête (bas en-tête ${Math.round(vu.hdB)})`);
  await page.screenshot({ path: `${OUT}/notice-${lang}-400-ch6.png` });
}
await browser.close();
ok(errs.length === 0, `erreurs console/page : ${errs.length} ${JSON.stringify(errs)}`);
console.log(fails ? `ÉCHECS : ${fails}` : 'TOUT PASSE');
process.exit(fails ? 1 : 0);
