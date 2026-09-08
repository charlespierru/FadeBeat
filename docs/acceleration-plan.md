# FadeBeat — Accélération : plan court (chantier #96, 2026-09-08)

## Cadrage (reformulation)
Un nouveau panneau « Accélération » dans FadeBeat : on choisit un tempo de
départ, un tempo d'arrivée, un nombre de mesures m et un pas n. Quand le mode
est activé et qu'on lance le métronome, il démarre au tempo de départ, puis
toutes les m mesures le tempo monte de n BPM, jusqu'à atteindre le tempo
d'arrivée où il se stabilise et continue.
- Si arrivée < départ, c'est un ralentissement : le tempo baisse de n à chaque palier.
- Le dernier palier est écrêté sur le tempo d'arrivée (on ne le dépasse jamais).
- Les atténuations par beat continuent de fonctionner (elles comptent en mesures).
- Ce que ça ne fait PAS : pas de boucle départ→arrivée→départ, pas d'arrêt
  automatique à l'arrivée, pas de tempo intermédiaire non entier.

## Choix
- Tout dans `FadeBeat.html` (principe « un seul fichier »).
- Le changement de tempo se décide dans le scheduler audio, au premier temps
  de la mesure concernée (exactitude du timing), et remonte à l'écran par la
  file d'événements datés déjà existante.
- Quand le mode est actif, le curseur/champ Tempo affichent le tempo courant
  et sont verrouillés (le tempo est piloté par le panneau).
- Au Stop, le tempo revient au tempo de départ.

## Sécurité
Page statique sans réseau ni donnée : aucun risque nouveau. Les champs
numériques sont bornés (40–300 BPM, m 1–32, n 1–60).

## Phases
- [x] 1. Panneau Accélération (interrupteur, 4 champs, affichage palier). — 2026-09-08
- [x] 2. Logique : tempo de départ au Play, palier toutes les m mesures, écrêtage, retour au départ au Stop. — 2026-09-08
- [x] 3. Vérification navigateur headless (états : mode off / on, en lecture, arrivé, ralentissement) — puppeteer + Chrome 152, 7 captures lues, suite 100,100,110,110,120,120,130… mesurée, intervalles 60/tempo exacts au 1/10 000 s. — 2026-09-08
- [x] 4. README à jour. — 2026-09-08

## Critères de recette
1. Mode off : comportement strictement identique à avant (tempo manuel).
2. Mode on, départ 100 / arrivée 130 / m 2 / n 10 : tempo 100 aux mesures 0-1,
   110 aux mesures 2-3, 120 aux 4-5, 130 à partir de la 6, et reste à 130.
3. Départ 100 / arrivée 125 / n 10 : 100, 110, 120, 125 (écrêtage), reste 125.
4. Départ 130 / arrivée 100 / n 10 : 130, 120, 110, 100 (ralentissement).
5. La durée entre deux beats mesurée dans le scheduler vaut 60/tempo courant.
6. Stop remet le tempo de départ dans le curseur et le champ.
7. Champs hors bornes refusés (valeur ramenée dans la borne).

## Ce que ça peut casser
- Le curseur Tempo verrouillé en mode on : si l'interrupteur est oublié allumé,
  Charles ne comprend pas pourquoi le tempo ne bouge pas → le panneau affiche
  clairement « mode actif, tempo piloté ».
- `meas-s` (durée d'une mesure) doit suivre le tempo courant.

## Portes
commit / push (Vercel déploie depuis master) : OK séparé de Charles.

## Audit indépendant (2026-09-08)
Agent `auditeur`, contexte vierge, ancienne et nouvelle version comparées en
headless : **7 critères sur 7 tenus**, 8 captures lues. Un écart moyen : la
bascule Off pendant la lecture pouvait laisser l'écran sur l'ancien palier alors
que le son jouait déjà le nouveau (fenêtre ≈ 100 ms par mesure). Écarts faibles :
exemple du README numéroté à partir de 1 alors que l'écran compte de 0 ; ligne
d'état trompeuse quand départ = arrivée ; commentaire de code obsolète.

## Amendements
- 2026-09-08 — Corrections post-audit : à la coupure du mode, l'écran est
  resynchronisé sur le tempo réel du scheduler ; texte dédié quand départ =
  arrivée ; README (exemple compté de 0, verrouillage du curseur et redémarrage
  à la bascule documentés) ; commentaire de la file d'événements mis à jour.
  Rejoué le scénario de course de l'auditeur : tempo, curseur et champ
  concordent (120/120/120).
- 2026-09-08 — Recette de Charles : le bouton « Désactivée » (état) a été lu
  comme l'ordre « Désactiver », il a cru le mode allumé et l'exercice a tourné
  au tempo manuel 120. Corrigé (go Charles « Oui ») : le bouton porte l'ordre
  (« Activer / Désactiver l'accélération »), la ligne d'état dit « Mode ÉTEINT /
  ALLUMÉ », Espace n'agit plus sur Play quand le focus est sur un bouton ou un
  champ, le tempo affiché est rafraîchi à chaque beat. Rejoué en headless :
  Espace sur le bouton allume le mode (tempo 100, pas de lecture), suite de
  tempos inchangée, zéro erreur console.
- Non traités, notés : recalcul du palier depuis zéro si on change m ou le
  départ pendant la lecture (comportement non spécifié) ; Espace avec le focus
  sur un bouton lance Play (pré-existant sur tous les boutons).
