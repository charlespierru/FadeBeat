# FadeBeat bilingue — plan court (chantier #102, 2026-09-12)

## Cadrage (validé par Charles : « Oui, parfait »)
L'appli reste UN seul fichier `FadeBeat.html`, mais parle la langue de la
personne : détection de la langue du navigateur (français → FR, sinon EN),
bouton FR / EN pour forcer (mémorisé), et la pastille Notice ouvre la notice
de la même langue. Les notices montrent des captures de l'appli dans leur
propre langue. Pas d'anglais seul : Charles garde l'appli en français.
Dehors : autres langues, traduction du README (il reste en français),
changement de comportement du métronome.

## Choix
- Dictionnaire `I18N = { fr: {...}, en: {...} }` dans le script de l'appli ;
  éléments statiques marqués `data-i18n="cle"` ; textes dynamiques (ligne
  d'état de l'accélération, Play/Stop, libellés des timbres) passent par une
  fonction `t(cle, params)`.
- Langue = `?lang=fr|en` dans l'adresse (prioritaire, sert aux captures et au
  partage) > choix mémorisé (`localStorage`) > `navigator.language`
  commençant par `fr` → fr, sinon en. `<html lang>` et `<title>` suivent.
- Bouton FR / EN : petite pastille à côté de la pastille Notice, même famille
  visuelle ; le changement est immédiat, sans rechargement, sans arrêter la
  lecture en cours.
- Pastille Notice : `href` = `notice/fr.html` ou `notice/en.html` selon la langue.
- Captures : `scripts/captures.mjs` prend la langue en argument et écrit dans
  `notice/figs/fr/` et `notice/figs/en/` (les anciennes `notice/figs/*.png`
  disparaissent). Les notices pointent chacune sur leur dossier. La notice EN
  n'a plus besoin de citer les libellés français : elle cite les libellés
  anglais de l'écran. La notice FR reste telle quelle sur le fond.
- Traductions EN des libellés (à respecter) : Métronome → Metronome, Cloche →
  Bell, Woodblock, Hi-hat, Kick doux → Soft kick, Sinus pur → Pure sine ;
  Tempo ; « 1 mesure = … s · Mesure … » → « 1 bar = … s · Bar … » ;
  Accélération → Acceleration ; Activer/Désactiver l'accélération → Turn
  acceleration on/off ; Départ/Arrivée/Toutes les (mesures)/Pas → Start /
  Target / Every (bars) / Step ; Mode ÉTEINT/ALLUMÉ → Mode OFF/ON ;
  Atténuation par beat → Fade per beat ; Durée fade → Fade length ; Début
  après → Start after ; mesures → bars ; Play/Stop ; Reset atténuations →
  Reset fades ; Espace : play / stop → Space: play / stop ; sous-titre
  « Entraînement rythmique · Atténuation progressive » → « Rhythm training ·
  Progressive fade ».
- Le garde-fou pre-commit joue tel quel : FadeBeat.html change, les deux
  notices changent.

## Sécurité
Rien de nouveau : `localStorage` ne stocke que « fr » ou « en » ; le paramètre
`?lang=` est validé contre la liste des deux langues, jamais injecté dans le HTML.

## Phases
- [x] 1. Dictionnaire + `t()` + `data-i18n` + détection + bouton FR/EN + pastille Notice liée à la langue. — **fait 2026-09-12**
- [x] 2. Captures par langue (`figs/fr/`, `figs/en/`), notices repointées ; notice EN réécrite sur les libellés anglais ; notice FR ajustée (mention du bouton FR/EN, chapitre 1 et 2). — **fait 2026-09-12**
- [x] 3. `verif-notice.mjs` étendu : les deux langues de l'appli (via `?lang=`), `href` de la pastille conforme, `<html lang>`, aucun texte de l'autre langue visible, 34 figures chargées. — **fait 2026-09-12, 65 contrôles, TOUT PASSE**
- [x] 4. README (section « Langues »), AGENTS.md (règle : tout nouveau texte entre dans les DEUX langues du dictionnaire), PASSATION.md. — **fait 2026-09-12**
- [x] 5. Audit indépendant (auditeur, Opus) — **audit fait 2026-09-12, 7/7 ; retouches
  post-audit faites ; reste la recette Charles + le commit à venir** (porte commit/push
  inchangée : accord séparé de Charles).

## Critères de recette
1. Navigateur en français → appli en français ; navigateur en anglais (ou autre) → appli en anglais ; `?lang=en` force l'anglais même en navigateur français ; le choix par bouton survit au rechargement.
2. En anglais, aucun libellé français ne reste visible sur l'écran entier (arrêt, lecture, accélération allumée / en palier / arrivée atteinte) ; en français, aucun libellé anglais.
3. Basculer FR/EN pendant la lecture ne l'interrompt pas et ne change ni tempo ni compteur de mesures.
4. La pastille Notice ouvre `notice/en.html` en anglais et `notice/fr.html` en français.
5. Les captures de `notice/en.html` montrent l'appli en anglais, celles de `notice/fr.html` en français ; toutes chargées avec légende.
6. Espace, Play/Stop, accélération, atténuations : comportement strictement identique à avant (suite de tempos 100,100,110,110,120,120,130 mesurée).
7. `git commit` avec FadeBeat.html seul reste refusé (épreuve 71/71).

## Ce que ça peut casser
- Un texte oublié dans le dictionnaire → reste en français en mode EN : le critère 2 le mesure (balayage de tout le texte visible).
- La largeur des pastilles/boutons en anglais : vérifier à 400 px qu'il n'y a pas de débordement.
- Les anciennes captures référencées ailleurs (README ?) : balayage documentaire avant suppression.

## Portes
commit / push : OK séparé de Charles.

## Amendements en cours de chantier

**2026-09-12, réalisation des phases 1 à 4.** Écarts par rapport au plan écrit, tous
mesurés, aucun laissé implicite :

1. **17 figures par notice, pas 16 ; 34 en tout, pas 32.** Le plan (phase 3) annonçait
   « 32 figures chargées » = 16 × 2. La capture supplémentaire `14-langue` (la pastille
   de langue à côté de la pastille Notice, pour le nouveau chapitre « Changer la langue
   de l'appli ») porte chaque notice à 17 figures, donc 34 au total. Les légendes des
   deux notices ont été renumérotées : l'ancienne Fig. *n* devient Fig. *n+1* à partir
   de la 2.

2. **La pastille Notice ne dit plus « Notice · Manual ».** Elle était bilingue parce que
   l'appli ne l'était pas. Elle dit maintenant **« Notice »** en français et **« Manual »**
   en anglais, avec `title` et `aria-label` assortis. Conséquence : le texte des deux
   notices qui citait « la pastille Notice · Manual » a été réécrit, et la figure
   `13-lien-notice` montre désormais les DEUX pastilles.

3. **Traductions non listées par le plan, décidées ici** (le plan donnait les libellés
   de l'écran mais pas ceux-là) : titre de l'onglet « FadeBeat – Rhythm Training » ;
   en-tête du bloc des timbres « Timbre » → **Sound** (cohérent avec le chapitre 4 de
   la notice anglaise) ; `aria-label` de la pastille de langue « Passer l'application en
   anglais » / « Switch the app to French » — écrit dans la langue AFFICHÉE, puisque
   c'est celle que la personne lit ; sens de l'accélération « monte / descend » →
   **rising / falling**.

4. **Formulation maladroite conservée à l'identique.** Avec « toutes les mesures » = 1,
   la ligne d'état dit « toutes les 1 mesure » en français — et « every 1 bar » en
   anglais. C'est la formulation d'avant le chantier, côté français ; la changer aurait
   été une modification de texte hors périmètre. Signalé, non corrigé.

5. **`docs/notice-plan.md` n'a pas été retouché.** Il décrit le chantier #101, clos, et
   parle de « 16 figures par langue » et de `notice/figs/` à plat. C'est un document
   daté qui dit ce qui a été livré CE JOUR-LÀ, pas une description de l'état courant.
   L'état courant est dans `README.md`, `AGENTS.md` et `PASSATION.md`, tous mis à jour.

6. **Le balayage du critère 2 compare mot à mot, sensible à la casse**, après découpage
   sur tout ce qui n'est ni lettre ni chiffre. Deux pièges mesurés qui l'imposent :
   une recherche naïve de « ON » trouve « ACCÉLÉRATI**ON** », et le français garde le mot
   emprunté « fade » en minuscule dans « Durée fade » — le témoin anglais est « Fade »
   avec sa majuscule. `\b` ne convenait pas non plus : il ne reconnaît pas la frontière
   devant « ÉTEINT ».

7. **Protocole `ne-rien-casser` appliqué** aux deux épreuves qui couvraient l'existant :
   `tests/epreuve-garde-notice.sh` (71/71 avant, 71/71 après, zéro échec neuf) et
   `scripts/verif-notice.mjs` (18 lignes avant, toutes vertes ; 65 après, toutes vertes,
   zéro échec neuf — l'épreuve elle-même a été étendue, c'était la phase 3).

**2026-09-12, après audit.** Audit (Opus) : prêt, 7/7. Retouches post-audit : balayage de
langue sur `textContent` + attributs, insensible à la casse, avec preuve de sabotage ;
dossier de sortie créé ; capture `04-tempo` dédoublonnée ; apostrophes droites rétablies ;
PASSATION six variantes. Détail et mesures :

8. **Le balayage de langue ne regardait pas ce qu'il croyait regarder.** Il lisait
   `document.body.innerText` — le texte TRANSFORMÉ par CSS : avec `text-transform:
   uppercase`, un « Timbre » oublié arrivait en « TIMBRE » et aucun témoin en casse mixte
   ne pouvait le reconnaître. Et il ne lisait AUCUN attribut : un `title` ou un
   `aria-label` resté en français passait inaperçu — or c'est précisément ce que Charles
   entendrait en premier. Le balayage lit maintenant le `textContent` de chaque nœud texte
   d'élément visible, PLUS les attributs `title`, `aria-label`, `placeholder`, `alt` de
   TOUS les éléments, PLUS `document.title`, et compare mot entier à mot entier sans tenir
   compte de la casse (accents conservés : « métronome » ≠ « metronome »).
   **Mesures des deux trous, sur le même sabotage** : `aria-label="Démarrer le métronome"`
   injecté sur le bouton Play en mode EN → ancien balayage 0 intrus (il aurait dit vert),
   nouveau 1 intrus (« métronome ») ; « Timbre » replacé dans un élément `uppercase` →
   ancien 0 intrus, nouveau 1 intrus (« timbre »).
   Prix payé, assumé : « fade » ne peut plus être témoin côté français (le français garde
   le mot emprunté dans « Durée fade ») ; l'anglais « Fade length » est attrapé par son
   autre moitié, « length », et les listes de témoins ont été élargies en conséquence.
   **Un contrôle de sabotage est inscrit dans le script lui-même** (« le balayage attrape
   un attribut oublié ») : il injecte l'attribut français, exige que le balayage le trouve,
   le retire, et exige qu'il n'en reste rien. Sans lui, « aucun intrus » pourrait vouloir
   dire « le balayage ne regarde rien ».

9. **`verif-notice.mjs` crée son dossier de sortie** (`fs.mkdirSync(..., {recursive:true})`)
   au lieu de planter sur la première capture d'écran. Prouvé en passant un chemin à deux
   niveaux inexistant : le dossier est créé, les 6 captures y sont écrites.

10. **Capture `04-tempo` dédoublonnée.** `captures.mjs` prenait deux fois `04-tempo` — une
    fois cadrée sur le curseur `#s-bpm`, aussitôt écrasée par celle du panneau entier. Le
    fichier livré était donc déjà le bon, mais le compte affiché était faux (18 par langue,
    36 en tout). La première capture est supprimée : **17 par langue, 34 en tout**, compte
    affiché = nombre de fichiers sur le disque (17 + 17 vérifiés).

11. **Apostrophes droites rétablies dans `FadeBeat.html`.** `acc_plan` et `acc_reached`
    portaient l'apostrophe typographique (« jusqu’à », « tempo d’arrivée »), seuls textes
    de l'appli dans ce cas, alors que tout le reste de l'appli et la légende de la Fig. 9
    de la notice FR utilisent l'apostrophe droite. Les deux chaînes passent en guillemets
    doubles, comme les autres entrées du dictionnaire qui contiennent une apostrophe.

12. **`PASSATION.md` : « sept variantes » → « six variantes »** de la ligne d'état, pour
    coller au commentaire du code, qui les énumère (éteint ; allumé à l'arrêt avec
    départ = arrivée ; allumé à l'arrêt qui monte ; allumé à l'arrêt qui descend ; en
    palier ; arrivée atteinte).

13. **`ne-rien-casser` rejoué sur ces retouches.** `verif-notice.mjs` : **65 OK / TOUT
    PASSE avant, 66 OK / TOUT PASSE après**, zéro échec neuf ; la seule ligne nouvelle est
    le contrôle de sabotage, et les seules lignes modifiées sont les quatre lignes d'état
    françaises (apostrophe droite) et les compteurs de mots des états balayés (la mise en
    minuscules fusionne « Départ »/« départ », « Tempo »/« tempo »).
    `tests/epreuve-garde-notice.sh` : **71/71 avant, 71/71 après**, diff limité à deux
    durées de chronomètre (36→35 ms, 64→65 ms).
