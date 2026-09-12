// Vérification headless de FadeBeat et de sa notice, dans les DEUX langues.
//   node scripts/verif-notice.mjs [dossier de sortie des captures]
// Couvre les critères de recette du chantier #102 (`docs/bilingue-plan.md`) :
//   1. détection de la langue (navigateur, ?lang=, choix mémorisé) ;
//   2. aucun texte de l'autre langue, écran entier, dans 5 états — texte visible
//      ET attributs (title, aria-label, placeholder, alt) ET titre de l'onglet,
//      avec une preuve de sabotage qui montre que le balayage sait échouer ;
//   3. basculer FR/EN en lecture n'interrompt rien ;
//   4. la pastille Notice ouvre la notice de la même langue ;
//   5. les 17 figures de chaque notice sont chargées avec légende ;
//   6. suite de tempos de l'accélération inchangée (100,100,110,110,120,120,130).
// Plus les vérifications de la notice du chantier #101 : ancres, scroll-spy,
// sommaire à gauche, 400 px sans débordement, bascule de langue de la notice.
// puppeteer est pris dans /mnt/data/Charles/DevPerso/tonik/node_modules/ ;
// pour un autre chemin : PUPPETEER_MODULES=/chemin/vers/node_modules node scripts/verif-notice.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const MODULES = process.env.PUPPETEER_MODULES || '/mnt/data/Charles/DevPerso/tonik/node_modules/';
const require = createRequire(MODULES.endsWith('/') ? MODULES : MODULES + '/');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] || '/tmp';
// Le dossier de sortie est CRÉÉ s'il n'existe pas : une vérification ne doit pas
// planter sur une capture d'écran faute de dossier (mesuré le 2026-09-12).
fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.join(ROOT, 'FadeBeat.html');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK    ' : 'ÉCHEC ') + m); if (!c) fails++; };

// ── Mots-témoins ──────────────────────────────────────────────────────────────
// Un texte oublié dans le dictionnaire reste en français en mode EN : personne ne
// le voit avant l'utilisateur. On balaie donc TOUT le texte de l'appli — nœuds
// texte des éléments visibles, attributs porteurs de texte (title, aria-label,
// placeholder, alt) et titre de l'onglet — et on refuse le moindre mot de l'autre
// langue. TEMOINS[lang] = les mots INTERDITS quand l'appli affiche `lang`.
//
// Comparaison mot à mot, INSENSIBLE à la casse (2026-09-12), après découpage sur
// tout ce qui n'est ni lettre ni chiffre. Les accents sont conservés : ils
// distinguent « Métronome » de « Metronome ». Pourquoi mot à mot et non `\b` ni
// une recherche de sous-chaîne, deux pièges mesurés :
//   - une recherche naïve de « ON » trouve « ACCÉLÉRATI**ON** » ;
//   - `\b` ne reconnaît pas la frontière devant « ÉTEINT ».
// Pourquoi insensible à la casse : l'écran applique `text-transform: uppercase`
// à plusieurs libellés ; un témoin en casse mixte ne pouvait pas les attraper,
// et une comparaison de casse n'est pas une preuve de langue.
// Prix à payer, assumé : « fade » ne peut PAS être témoin côté français, car le
// français garde le mot emprunté dans « Durée fade ». Le anglais « Fade length »
// est attrapé par son autre moitié, « length ».
const TEMOINS = {
  // Mots FRANÇAIS interdits quand l'appli parle anglais
  en: ['mesure','mesures','atténuation','atténuations','durée','début','activer',
       'désactiver','éteint','allumé','cloche','métronome','départ','arrivée',
       'espace','timbre','accélération','palier','paliers','toutes','doux','sinus',
       'notice','utilisation','onglet','passer','anglais','entraînement','rythmique',
       'réglé','maintient','atteint'],
  // Mots ANGLAIS interdits quand l'appli parle français
  fr: ['bar','bars','start','turn','off','on','bell','target','every','step','sound',
       'manual','space','acceleration','metronome','length','rising','falling',
       'holding','until','training','rhythm','switch','french','hand','user','tab',
       'new','soft','pure','sine'],
};
// Découpage en mots, tout en minuscules (accents conservés).
const mots = txt => new Set(String(txt).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').split(' ').filter(Boolean));
const intrus = (txt, lang) => { const s = mots(txt); return TEMOINS[lang].filter(w => s.has(w)); };

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const errs = [];
const brancher = p => { p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); }); };

// Page dont on force la langue du navigateur, avant le moindre script de la page.
// Deux leviers : l'en-tête Accept-Language (pour une page servie en HTTP) et la
// redéfinition de navigator.language (seule qui porte sur une adresse file://).
async function pageNavigateur(langueNav) {
  const p = await browser.newPage();
  brancher(p);
  await p.setExtraHTTPHeaders({ 'Accept-Language': langueNav });
  await p.evaluateOnNewDocument(l => {
    Object.defineProperty(navigator, 'language',  { get: () => l });
    Object.defineProperty(navigator, 'languages', { get: () => [l] });
  }, langueNav);
  await p.setViewport({ width: 1000, height: 900 });
  return p;
}
const oublierChoix = p => p.evaluate(() => { try { localStorage.removeItem('fadebeat-lang'); } catch (e) {} });
const etatLangue = p => p.evaluate(() => ({
  html: document.documentElement.lang,
  titre: document.title,
  notice: document.getElementById('lnk-notice').getAttribute('href'),
  pastille: document.getElementById('btn-lang-lbl').textContent,
  memo: (() => { try { return localStorage.getItem('fadebeat-lang'); } catch (e) { return 'refusé'; } })(),
}));

// ══ CRITÈRE 1 — détection de la langue ════════════════════════════════════════
console.log('\n— Critère 1 : détection de la langue —');
{
  // Navigateur en anglais, aucune adresse ?lang=, aucun choix mémorisé
  const p = await pageNavigateur('en-US');
  await p.goto(APP, { waitUntil: 'domcontentloaded' }); await oublierChoix(p);
  await p.goto(APP, { waitUntil: 'networkidle0' });
  const e = await etatLangue(p);
  ok(e.html === 'en' && e.notice === 'notice/en.html' && e.titre.includes('Rhythm'),
     `navigateur en-US, sans ?lang= → appli en ${e.html} (titre « ${e.titre} », notice ${e.notice}, pastille « ${e.pastille} »)`);

  // Navigateur en français
  const f = await pageNavigateur('fr-FR');
  await f.goto(APP, { waitUntil: 'domcontentloaded' }); await oublierChoix(f);
  await f.goto(APP, { waitUntil: 'networkidle0' });
  const ef = await etatLangue(f);
  ok(ef.html === 'fr' && ef.notice === 'notice/fr.html' && ef.titre.includes('Entraînement'),
     `navigateur fr-FR, sans ?lang= → appli en ${ef.html} (titre « ${ef.titre} », notice ${ef.notice}, pastille « ${ef.pastille} »)`);

  // ?lang=en force l'anglais MÊME en navigateur français
  await f.goto(APP + '?lang=en', { waitUntil: 'networkidle0' });
  const ef2 = await etatLangue(f);
  ok(ef2.html === 'en' && ef2.notice === 'notice/en.html',
     `navigateur fr-FR + ?lang=en → appli en ${ef2.html} (l'adresse est prioritaire)`);

  // ?lang= inconnu ou malveillant : ignoré, jamais injecté dans la page
  await oublierChoix(f);
  await f.goto(APP + '?lang=de%22%3E%3Cscript%3Ealert(1)%3C/script%3E', { waitUntil: 'networkidle0' });
  const ef3 = await etatLangue(f);
  const injecte = await f.evaluate(() => document.body.innerHTML.includes('alert(1)'));
  ok(ef3.html === 'fr' && !injecte,
     `?lang= inconnu (et porteur de balises) → repli sur le navigateur (${ef3.html}), rien d'injecté dans la page (${injecte})`);

  // Le choix par bouton survit au rechargement
  await oublierChoix(f);
  await f.goto(APP, { waitUntil: 'networkidle0' });
  await f.click('#btn-lang');
  const apresClic = await etatLangue(f);
  await f.goto(APP, { waitUntil: 'networkidle0' });   // rechargement SANS ?lang=
  const apresRech = await etatLangue(f);
  ok(apresClic.html === 'en' && apresRech.html === 'en' && apresRech.memo === 'en',
     `clic sur la pastille (fr→${apresClic.html}) puis rechargement sans ?lang= → toujours ${apresRech.html} (mémorisé « ${apresRech.memo} » sous fadebeat-lang)`);
  await f.close(); await p.close();
}

// ══ CRITÈRE 2 — aucun texte de l'autre langue, écran entier, 5 états ══════════
// ══ CRITÈRE 6 — suite de tempos de l'accélération, inchangée ═════════════════
console.log('\n— Critères 2, 4, 5 (appli) et 6 : textes, pastille, tempos —');
const suites = {};
for (const lang of ['fr', 'en']) {
  const p = await browser.newPage();
  brancher(p);
  await p.setViewport({ width: 1000, height: 900 });
  await p.goto(APP + '?lang=' + lang, { waitUntil: 'networkidle0' });

  // Critère 4 : la pastille Notice ouvre la notice de la MÊME langue
  const lnk = await p.$eval('#lnk-notice', a => ({ href: a.getAttribute('href'), target: a.target, rel: a.rel, txt: a.textContent.trim(), aria: a.getAttribute('aria-label') }));
  ok(lnk.href === `notice/${lang}.html` && lnk.target === '_blank' && lnk.rel.includes('noopener'),
     `${lang} : pastille Notice → ${lnk.href}, nouvel onglet (${lnk.target}), texte « ${lnk.txt} », aria-label « ${lnk.aria} »`);

  // La pastille de langue porte l'ORDRE : la langue vers laquelle on bascule
  const pl = await p.$eval('#btn-lang', b => ({ lbl: b.textContent.trim(), aria: b.getAttribute('aria-label') }));
  ok(pl.lbl === (lang === 'fr' ? 'EN' : 'FR'),
     `${lang} : la pastille de langue porte l'ordre « ${pl.lbl} » (aria-label « ${pl.aria} »)`);

  // Les 5 états du critère 2
  const etats = [];
  // Tout le texte de la page, tel qu'il est ÉCRIT (et non tel qu'il est dessiné) :
  //   1. `textContent` de chaque nœud texte dont tous les parents sont visibles —
  //      jamais `innerText`, qui renvoie le texte TRANSFORMÉ par CSS : avec
  //      `text-transform: uppercase`, « Timbre » arrivait en « TIMBRE » et aucun
  //      témoin en casse mixte ne pouvait le reconnaître (mesuré le 2026-09-12) ;
  //   2. les attributs porteurs de texte de TOUS les éléments (title, aria-label,
  //      placeholder, alt) : un `aria-label` oublié ne se voit pas à l'écran mais
  //      se lit à la synthèse vocale — Charles est malvoyant, c'est lui qui
  //      l'entendrait en premier ;
  //   3. le titre de l'onglet.
  const texte = async () => p.evaluate(() => {
    const HORS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);
    const visible = el => {
      for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
        if (HORS.has(e.tagName)) return false;
        const s = getComputedStyle(e);
        if (s.display === 'none' || s.visibility === 'hidden') return false;
      }
      return true;
    };
    const out = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode())
      if (n.textContent.trim() && visible(n.parentElement)) out.push(n.textContent);
    for (const el of document.querySelectorAll('*'))
      for (const a of ['title', 'aria-label', 'placeholder', 'alt']) {
        const v = el.getAttribute(a);
        if (v) out.push(v);
      }
    out.push(document.title);
    return out.join('\n');
  });
  const attendMesure = n => p.waitForFunction(n => document.getElementById('meas-n').textContent === String(n), { timeout: 60000 }, n);
  const nombre = (id, v) => p.evaluate((id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('change')); }, id, v);

  etats.push(['arrêt', await texte()]);                                    // 1
  await p.click('#btn-play'); await attendMesure(1);
  etats.push(['lecture', await texte()]);                                  // 2
  await p.click('#btn-play');                                              // stop
  await nombre('acc-from', 100); await nombre('acc-to', 130); await nombre('acc-m', 2); await nombre('acc-n', 10);
  await p.click('#acc-toggle');
  etats.push(['accélération allumée, à l\'arrêt', await texte()]);         // 3

  // Enregistreur de la suite de tempos : on relit CE QUE L'ÉCRAN AFFICHE, mesure
  // par mesure, pendant une vraie lecture (pas un calcul).
  await p.evaluate(() => {
    window.__rec = [];
    window.__recId = setInterval(() => {
      const m = document.getElementById('meas-n').textContent;
      const t = document.getElementById('n-bpm').value;
      const d = window.__rec[window.__rec.length - 1];
      if (!d || d.m !== m || d.t !== t) window.__rec.push({ m, t });
    }, 15);
  });
  await p.click('#btn-play');
  await attendMesure(1);
  etats.push(['accélération en palier', await texte()]);                   // 4
  await attendMesure(6); await sleep(200);
  etats.push(['accélération, arrivée atteinte', await texte()]);           // 5
  const rec = await p.evaluate(() => { clearInterval(window.__recId); return window.__rec; });
  await p.click('#btn-play');   // stop

  // Critère 6 : une entrée par mesure 0..6, dernière valeur vue pour la mesure
  const parMesure = new Map();
  for (const r of rec) if (/^\d+$/.test(r.m)) parMesure.set(Number(r.m), Number(r.t));
  const suite = [0,1,2,3,4,5,6].map(m => parMesure.get(m));
  suites[lang] = suite;
  ok(String(suite) === String([100,100,110,110,120,120,130]),
     `${lang} : suite de tempos mesurée à l'écran, mesures 0 à 6 → ${suite.join(',')} (attendu 100,100,110,110,120,120,130)`);

  // Critère 2 : balayage
  for (const [nom, txt] of etats) {
    const bad = intrus(txt, lang);
    ok(bad.length === 0, `${lang} / ${nom} : ${mots(txt).size} mots balayés, mots de l'autre langue : ${bad.length ? bad.join(', ') : 'aucun'}`);
  }

  // PREUVE que le balayage sait ÉCHOUER. « Aucun intrus » ne vaut rien si le
  // balayage ne regarde rien : jusqu'au 2026-09-12 il ne lisait aucun attribut,
  // et il l'annonçait quand même vert. On sabote donc la page pour de vrai — un
  // `aria-label` français oublié sur le bouton Play, INVISIBLE à l'écran — on
  // exige que le balayage le trouve, puis on le retire et on exige qu'il n'en
  // reste rien. Sabotage temporaire, jamais committé dans l'appli.
  if (lang === 'en') {
    await p.evaluate(() => document.getElementById('btn-play').setAttribute('aria-label', 'Démarrer le métronome'));
    const sabote = intrus(await texte(), lang);
    await p.evaluate(() => document.getElementById('btn-play').removeAttribute('aria-label'));
    const repare = intrus(await texte(), lang);
    ok(sabote.length > 0 && repare.length === 0,
       `${lang} : le balayage attrape un attribut oublié — aria-label français injecté → intrus ${sabote.length ? sabote.join(', ') : 'AUCUN (le balayage ne lit pas les attributs)'} ; attribut retiré → ${repare.length} intrus`);
  }

  // Toutes les variantes de la ligne d'état de l'accélération, pluriel compris
  const variantes = await p.evaluate(() => {
    const info = document.getElementById('acc-info');
    const lire = () => info.textContent;
    const out = {};
    const poser = (from, to, m, n) => { ACC.from = from; ACC.to = to; ACC.m = m; ACC.n = n; };
    ACC.on = false; accInfo(null);            out['éteint'] = lire();
    ACC.on = true;
    poser(100, 130, 2, 10); accInfo(null);    out['à l\'arrêt, monte, pluriel'] = lire();
    poser(100, 130, 1, 10); accInfo(null);    out['à l\'arrêt, monte, singulier'] = lire();
    poser(140, 100, 4, 5);  accInfo(null);    out['à l\'arrêt, descend'] = lire();
    poser(120, 120, 4, 5);  accInfo(null);    out['départ = arrivée'] = lire();
    poser(100, 130, 2, 10); accInfo(1);       out['en palier, singulier'] = lire();
    poser(100, 130, 4, 10); accInfo(1);       out['en palier, pluriel'] = lire();
    poser(100, 130, 2, 10); accInfo(6);       out['arrivée atteinte'] = lire();
    ACC.on = false; accInfo(null);
    return out;
  });
  for (const [nom, txt] of Object.entries(variantes)) {
    const bad = intrus(txt, lang);
    ok(bad.length === 0 && txt.length > 10, `${lang} / ligne d'état « ${nom} » : « ${txt} »${bad.length ? ' — INTRUS : ' + bad.join(', ') : ''}`);
  }
  // Le pluriel des mesures suit vraiment le nombre
  const un = variantes['à l\'arrêt, monte, singulier'], plur = variantes['à l\'arrêt, monte, pluriel'];
  const attenduUn = lang === 'fr' ? '1 mesure ' : '1 bar ', attenduPl = lang === 'fr' ? '2 mesures ' : '2 bars ';
  ok(un.includes(attenduUn) && plur.includes(attenduPl),
     `${lang} : pluriel des mesures — « ${attenduUn.trim()} » au singulier, « ${attenduPl.trim()} » au pluriel`);

  // Largeur 400 px : l'appli ne déborde pas et les deux pastilles restent visibles sans défiler
  await p.setViewport({ width: 400, height: 800 });
  await p.goto(APP + '?lang=' + lang, { waitUntil: 'networkidle0' }); await sleep(250);
  const geo = await p.evaluate(() => {
    const r = document.getElementById('lnk-notice').getBoundingClientRect();
    const b = document.getElementById('btn-lang').getBoundingClientRect();
    return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
             nBas: r.bottom, nL: r.width, bBas: b.bottom, bL: b.width, scroll: window.scrollY };
  });
  ok(geo.sw <= geo.cw && geo.nBas <= 800 && geo.bBas <= 800 && geo.nL > 0 && geo.bL > 0 && geo.scroll === 0,
     `${lang} : appli à 400 px — largeur ${geo.sw} ≤ ${geo.cw}, pastilles visibles sans défiler (Notice bas ${Math.round(geo.nBas)} larg. ${Math.round(geo.nL)} ; langue bas ${Math.round(geo.bBas)} larg. ${Math.round(geo.bL)})`);
  await p.screenshot({ path: `${OUT}/appli-${lang}-400.png` });
  await p.close();
}

// ══ CRITÈRE 3 — basculer la langue en pleine lecture ══════════════════════════
console.log('\n— Critère 3 : bascule FR/EN pendant la lecture —');
{
  const p = await browser.newPage();
  brancher(p);
  await p.setViewport({ width: 1000, height: 900 });
  await p.goto(APP + '?lang=fr', { waitUntil: 'networkidle0' });
  const nombre = (id, v) => p.evaluate((id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('change')); }, id, v);
  await nombre('acc-from', 100); await nombre('acc-to', 130); await nombre('acc-m', 2); await nombre('acc-n', 10);
  await p.click('#acc-toggle');
  await p.click('#btn-play');
  await p.waitForFunction(() => document.getElementById('meas-n').textContent === '2', { timeout: 60000 });
  const avant = await p.evaluate(() => ({
    tempo, meas, playing, accOn: ACC.on,
    bpm: document.getElementById('n-bpm').value,
    measN: document.getElementById('meas-n').textContent,
    play: document.getElementById('play-lbl').textContent,
    lang: document.documentElement.lang,
  }));
  await p.click('#btn-lang');
  const apres = await p.evaluate(() => ({
    tempo, meas, playing, accOn: ACC.on,
    bpm: document.getElementById('n-bpm').value,
    measN: document.getElementById('meas-n').textContent,
    play: document.getElementById('play-lbl').textContent,
    lang: document.documentElement.lang,
  }));
  ok(apres.lang === 'en' && avant.lang === 'fr', `la langue a bien basculé en lecture : ${avant.lang} → ${apres.lang}`);
  ok(apres.tempo === avant.tempo && apres.bpm === avant.bpm,
     `tempo inchangé par la bascule : ${avant.tempo} → ${apres.tempo} (champ ${avant.bpm} → ${apres.bpm})`);
  ok(apres.measN === avant.measN && apres.meas === avant.meas,
     `compteur de mesures inchangé : meas-n ${avant.measN} → ${apres.measN} (compteur interne ${avant.meas} → ${apres.meas})`);
  ok(apres.playing === true && avant.playing === true && apres.accOn === true,
     `la lecture n'est pas interrompue (playing ${avant.playing} → ${apres.playing}, accélération ${apres.accOn})`);
  // …et elle continue vraiment : les mesures avancent, le bouton dit toujours Stop
  await p.waitForFunction(n => Number(document.getElementById('meas-n').textContent) > n, { timeout: 60000 }, Number(avant.measN));
  const suite = await p.evaluate(() => ({ measN: document.getElementById('meas-n').textContent, play: document.getElementById('play-lbl').textContent, lang: document.documentElement.lang }));
  ok(Number(suite.measN) > Number(avant.measN) && suite.play === 'Stop',
     `après la bascule le métronome continue : mesure ${avant.measN} → ${suite.measN}, bouton « ${suite.play} » (langue ${suite.lang})`);
  await p.click('#btn-play');
  await p.close();
}

// ══ NOTICES (FR et EN) ════════════════════════════════════════════════════════
console.log('\n— Notices : ancres, 17 figures, sommaire, 400 px —');
{
  const page = await browser.newPage();
  brancher(page);
  for (const lang of ['fr', 'en']) {
    const url = 'file://' + path.join(ROOT, 'notice', lang + '.html');
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)');
    const htmlLang = await page.evaluate(() => document.documentElement.lang);
    ok(htmlLang === lang, `${lang} : la notice se déclare lang="${htmlLang}"`);
    // Ancres du sommaire
    const toc = await page.$$eval('.toc a', as => as.map(a => a.getAttribute('href')));
    const missing = await page.evaluate(hs => hs.filter(h => !document.querySelector(h)), toc);
    ok(toc.length === 10 && missing.length === 0, `${lang} : ${toc.length} entrées de sommaire, cibles manquantes : ${missing.length}`);
    // Images : 17 figures, toutes chargées, toutes avec légende, toutes dans figs/<langue>/
    const imgs = await page.$$eval('figure img', is => is.map(i => ({ src: i.getAttribute('src'), w: i.naturalWidth, cap: (i.closest('figure').querySelector('figcaption')?.textContent || '').trim() })));
    const bad = imgs.filter(i => i.w === 0 || !i.cap);
    const horsDossier = imgs.filter(i => !i.src.startsWith(`figs/${lang}/`));
    ok(imgs.length === 17 && bad.length === 0 && horsDossier.length === 0,
       `${lang} : ${imgs.length} figures chargées avec légende, défaillantes : ${bad.length} ${JSON.stringify(bad)}, hors figs/${lang}/ : ${horsDossier.length}`);
    // Légendes numérotées 1..17, dans l'ordre
    const caps = imgs.map(i => (i.cap.match(/Fig\. (\d+)/) || [])[1]).map(Number);
    ok(String(caps) === String([...Array(17)].map((_, k) => k + 1)), `${lang} : légendes numérotées ${caps.join(',')}`);
    // Scroll-spy : aller au chapitre 6, vérifier le surlignage
    await page.evaluate(() => document.querySelector('#ch-6').scrollIntoView());
    await sleep(1500); // défilement doux
    const active = await page.$eval('.toc a.active', a => a.getAttribute('href'));
    ok(active === '#ch-6', `${lang} : chapitre surligné après défilement vers 6 → ${active}`);
    // Sidebar à gauche du contenu (écran large)
    const geo = await page.evaluate(() => { const a = document.querySelector('aside').getBoundingClientRect(), m = document.querySelector('main').getBoundingClientRect(); return { aR: a.right, mL: m.left, aW: a.width }; });
    ok(geo.aR <= geo.mL && geo.aW > 200, `${lang} : sommaire à gauche (droite ${Math.round(geo.aR)} ≤ gauche contenu ${Math.round(geo.mL)}), largeur ${Math.round(geo.aW)}`);
    // Bascule de langue garde l'ancre
    {
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
    ok(sw.sw <= sw.cw, `${lang} : notice à 400 px, largeur de page ${sw.sw} ≤ fenêtre ${sw.cw}`);
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
  await page.close();
}

await browser.close();
ok(errs.length === 0, `erreurs console/page : ${errs.length} ${JSON.stringify(errs)}`);
console.log(`\nsuite de tempos mesurée — fr : ${suites.fr.join(',')} · en : ${suites.en.join(',')}`);
console.log(fails ? `ÉCHECS : ${fails}` : 'TOUT PASSE');
process.exit(fails ? 1 : 0);
