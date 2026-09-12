# FadeBeat — Notice FR/EN + garde-fou de mise à jour : plan court (chantier #101, 2026-09-12)

## Rappel du cadrage (validé « parfait, go », 2026-09-12)
- Un lien « Notice » dans FadeBeat, qui ouvre la notice dans un nouvel onglet.
- Notice au look de l'appli (fond noir, violet, Tailwind), sommaire à gauche,
  chapitres à droite, captures d'écran réelles.
- Deux langues : FR et EN, bascule de l'une à l'autre.
- Mécanisme « auto » : un garde-fou git dans le dépôt refuse tout commit qui
  touche `FadeBeat.html` sans toucher aussi les deux notices ; règle dans
  AGENTS.md : chaque fonctionnalité finit par la mise à jour des notices.
- Dehors : PDF, changement de comportement du métronome.

## Choix retenus
- Fichiers : `notice/fr.html`, `notice/en.html`, captures dans `notice/figs/`.
  Deux fichiers, un par langue, pour que le garde-fou puisse exiger les deux.
  Vercel et chalou.link servent les fichiers statiques du dépôt tels quels.
- Style : Tailwind CDN comme l'appli, mêmes couleurs ; sommaire fixe à gauche
  avec surlignage du chapitre courant ; sur écran étroit, sommaire en haut.
- Captures : Chrome headless via puppeteer (déjà présent dans tonik/node_modules),
  script `scripts/captures.mjs` rejouable, un état par capture.
- Garde-fou : `.githooks/pre-commit` (bash, sans dépendance) + `core.hooksPath`
  local. Règle : si `FadeBeat.html` est dans l'index, `notice/fr.html` ET
  `notice/en.html` doivent y être aussi, sinon refus avec message clair.
  Échappatoire explicite et visible : `NOTICE_INCHANGEE=1 git commit …`,
  réservée aux commits sans effet visible (le hook le rappelle).
- Lien dans l'appli : lien « Notice » **en haut** de `FadeBeat.html`, dans le bloc
  d'en-tête sous le sous-titre, `target="_blank" rel="noopener"`.
  (Le plan disait d'abord « ligne en bas » ; Charles a tranché « je veux le lien en
  haut » le 2026-09-12 — voir l'amendement du même jour.)

## Sécurité
Pages statiques sans réseau ni donnée : rien de nouveau. Le hook ne lit que
l'index git, n'écrit rien, n'appelle rien d'externe.

## Phases
- [x] 1. Garde-fou `.githooks/pre-commit` + activation locale ; épreuve écrite
      par l'épreuvier (règle zéro), vue échouer sur un dépôt sans hook.
- [x] 2. `notice/fr.html` puis `notice/en.html` (sommaire, 10 chapitres, figures).
- [x] 3. Captures headless → `notice/figs/` (tous les états : écran entier,
      lecture, timbres, tempo, accélération éteinte / allumée / en palier /
      arrivée atteinte, carte beat, Play, Stop).
- [x] 4. Lien « Notice » dans `FadeBeat.html`.
- [x] 5. AGENTS.md (règle de mise à jour), README (section Notice + hook).
- [x] 6. Vérification headless de la notice : les deux langues, chaque ancre du
      sommaire, images toutes chargées, largeur 400 px, zéro erreur console.
- [x] 7. Audit indépendant (auditeur) : conformité du texte à l'appli qui tourne.
      **Fait le 2026-09-12** (verdict 01:45 : 6 critères sur 7 tenus, « pas prêt »).
      Écarts corrigés dans la foulée — voir l'amendement du 2026-09-12 ci-dessous.
      **Re-audit à venir** sur le lot corrigé.

## Critères de recette
1. Dans FadeBeat, le lien « Notice » ouvre `notice/fr.html` dans un nouvel onglet.
2. Chaque entrée du sommaire mène au chapitre visé (FR et EN) ; le chapitre
   courant est surligné au défilement.
3. Chaque figure a une image qui se charge (naturalWidth > 0) et une légende.
4. La bascule FR/EN mène à la même position (même chapitre) dans l'autre langue.
5. Un commit qui modifie `FadeBeat.html` seul est refusé ; avec les deux
   notices, il passe ; avec une seule, il est refusé ; sans FadeBeat.html, il
   passe ; `NOTICE_INCHANGEE=1` passe en le disant.
6. Aucune affirmation de la notice ne contredit le comportement de l'appli
   (bornes, libellés, effets des boutons) — vérifié par l'auditeur.
7. À 400 px de large, pas de défilement horizontal.

## Ce que chaque remède peut casser ou ouvrir
- Le hook n'est actif que là où `core.hooksPath` est réglé : un clone neuf ne
  l'a pas → documenté dans README/AGENTS.md, et l'épreuve le mesure.
- L'échappatoire `NOTICE_INCHANGEE=1` peut devenir un réflexe → le hook affiche
  chaque usage en toutes lettres.
- Tailwind CDN : la notice dépend du réseau pour sa mise en forme, comme
  l'appli elle-même (déjà le cas).

## Coût
Hook : quelques millisecondes par commit.

## Portes
commit / push (Vercel et chalou.link déploient depuis master) : OK séparé de Charles.

## Amendements en cours de chantier
- 2026-09-12 — Phases 1 à 6 faites. Épreuve de l'épreuvier `tests/epreuve-garde-notice.sh` : 38/38 (vue échouer par lui contre hook absent 13/38 et hook naïf 32/38). Vérification headless `scripts/verif-notice.mjs` : 14/14. Captures reprises deux fois : décalage du découpage (défilement) puis étiquette « Timbre » coupée.

- 2026-09-12 — **Lot de corrections post-audit** (décision de Charles « je veux le
  lien en haut » + les écarts relevés par l'auditeur à 01:45). Une ligne par point :
  1. **Lien « Notice » en haut.** Retiré du bas de page, placé dans le bloc d'en-tête
     (`#entete`), sous le sous-titre, id `lnk-notice` et attributs inchangés. Mesuré :
     à 400 px, bas du lien à 148 px, sans défilement. Le choix « ligne en bas »
     de la section « Choix retenus » ci-dessus est **périmé** depuis ce jour.
  2. **Bord des cercles** (défaut d'appli trouvé par l'audit) : `flash()` et
     `resetCircles()` remettaient `borderColor = ''`, ce qui effaçait la couleur
     inline `${bdr}44` posée à la construction et laissait un bord gris clair
     `rgb(229,231,235)`. Remis à `bdr + '44'` aux deux endroits. Mesuré avant/après
     en headless : avant, gris clair en lecture ET après Stop ; après, couleur
     d'origine partout.
  3. **Textes des deux notices.** Ch. 4 : le temps 1 n'est accentué qu'avec
     Métronome, Cloche, Kick doux et Sinus pur — Woodblock et Hi-hat (`playWblk`,
     `playHhat`, sans paramètre d'accent) jouent les quatre temps à l'identique ;
     même correction dans `README.md`. Fig. du palier : « première mesure » →
     « mesure 1 (la deuxième, le compteur part de 0) ». Ch. 5 : le curseur suit le
     champ, une valeur hors bornes est ignorée et le champ revient au tempo courant.
     Ch. 8 : phrase d'Espace coupée en deux (sur un bouton, il fait ce que le bouton
     annonce ; dans un champ, il ne fait rien). Ch. 1 : « vérifiée dans Chrome,
     conçue pour marcher aussi dans Firefox, Edge et Safari ». EN ch. 2 :
     « **Reset atténuations** (reset fades) ». Ch. 1 : nouvelle figure
     `figs/13-lien-notice.png` → **16 figures par langue**, toutes renumérotées
     (+1), attendu mis à jour dans `verif-notice.mjs`. Ch. 2 : le lien est désormais
     en tête de la liste de l'écran. En-tête des notices `sticky` → `lg:sticky` :
     sur écran étroit il faisait 3 lignes et recouvrait le début des sections.
  4. **Hook `.githooks/pre-commit`** : une notice **supprimée** (statut `D`) était
     comptée comme « touchée » et laissait passer ; elle compte maintenant comme
     MANQUANTE. Lecture par `--name-status` au lieu de `--name-only`. Messages et
     échappatoire inchangés. Épreuve rejouée : **38/38** avant et après (seules les
     durées en ms ont bougé). Cas maison ajoutés sur dépôts jetables : `git rm`
     d'une notice → refus ; les deux supprimées → refus citant les deux ;
     `NOTICE_INCHANGEE=1` → passage bavard ; témoin appli + deux notices → passe.
  5. **Doc** : README et AGENTS.md disent que le hook ne s'exécute que sur
     `git commit` (`merge`, `rebase`, `cherry-pick`, `--no-verify` le contournent :
     convention à respecter à la main) et que les deux scripts prennent puppeteer
     dans `tonik/node_modules/`, avec repli `PUPPETEER_MODULES` (ajouté aux scripts).
  6. **Captures** : `13-lien-notice` vise maintenant le bloc d'en-tête entier
     (marge 20 px). Les 16 captures refaites, 0 erreur console.
  7. **Vérification** : `verif-notice.mjs` → **TOUT PASSE** (17 contrôles, 0 erreur
     console). Deux contrôles neufs : le lien `#lnk-notice` visible sans défiler à
     400 px (`bottom` ≤ 800) et, à 400 px, un clic sur le sommaire amène le titre du
     chapitre visé dans l'écran sans qu'il soit recouvert par l'en-tête.
  8. **Re-audit à venir** sur ce lot : il n'a pas encore été examiné par l'auditeur.

- 2026-09-12 — Re-audit (Opus) : prêt, 14/14 ; restes traités : puce Espace du ch. 10
  alignée sur le ch. 8, PASSATION.md rafraîchi, épreuve complétée sur la suppression
  d'une notice (épreuvier).

- 2026-09-12 — Épreuve complétée par l'épreuvier (71 cas) : trou trouvé (notice
  recréée vide ou remplacée par un lien symbolique passait en silence), hook
  rebouché (blob vide ou mode non ordinaire = manquante), 71/71 sans régression.
