# PASSATION (2026-09-12) — projet `zic-app`

Transition de l'outillage : Claude Code -> OpenAI (Codex CLI ou équivalent).
Ce fichier permet à tout agent de reprendre le travail sans autre contexte.

## Où trouver l'état
### État git (2026-09-12)
```
fe74f16 feat: Notice FR/EN dans l'appli + garde-fou git de mise à jour de la notice
293c3bc chore: fins de ligne du .gitignore
3784387 feat: Accélération — tempo de départ → arrivée par paliers de n BPM toutes les m mesures
f5c0d98 Passation multi-agents : AGENTS.md + PASSATION.md
2ec173b Licence MIT
```
Le chantier #101 (notice FR/EN + garde-fou) est **committé et poussé** (`fe74f16`).

## Chantier #102 — FadeBeat bilingue — livré sur le disque, non committé
Plan : `docs/bilingue-plan.md`. Phases 1 à 4 faites le 2026-09-12 ; reste la
phase 5 (audit indépendant, recette de Charles, porte commit/push).

- **`FadeBeat.html`** : dictionnaire `I18N = { fr, en }` dans le script, textes
  statiques marqués `data-i18n="clé"`, textes dynamiques passés par `t(clé, params)`
  (ligne d'état de l'accélération et ses six variantes, Play/Stop, timbres,
  « Mesure — », titre de la page, `aria-label` des pastilles, `<html lang>`).
  Toujours **un seul fichier**, aucun fichier de traduction à part.
- **Langue retenue** : `?lang=fr|en` (validé contre ces deux valeurs, jamais injecté)
  > `localStorage` clé `fadebeat-lang` > `navigator.language`.
- **Pastille de langue** à droite de la pastille Notice, même famille visuelle. Elle
  porte l'ORDRE : « EN » quand l'appli est en français. La bascule ne réécrit que des
  textes — ni tempo, ni compteur de mesures, ni lecture en cours ne bougent.
- **Pastille Notice** : `href` = `notice/fr.html` ou `notice/en.html` selon la langue.
- **Notices** : `notice/fr.html` et `notice/en.html`, 10 chapitres, **17 figures**
  chacune (les 16 d'origine + `14-langue`), chapitre 1 « Changer la langue de l'appli ».
  La notice EN cite désormais les libellés ANGLAIS de l'écran (plus de « Timbre »,
  « Durée fade », « Mode ÉTEINT »…) et la note « The app's labels are in French » a disparu.
- **Captures** : `notice/figs/fr/` et `notice/figs/en/`, mêmes 17 noms de fichiers.
  `node scripts/captures.mjs [fr|en]` les régénère (chargement avec `?lang=`).
  Les anciennes `notice/figs/*.png` ont été supprimées (aucun fichier ne les référençait).
- **Vérification** : `node scripts/verif-notice.mjs <dossier>` — 66 contrôles,
  finit par `TOUT PASSE`. Couvre les six premiers critères de recette du plan.
- **Garde-fou** : `.githooks/pre-commit` inchangé, épreuve `tests/epreuve-garde-notice.sh`
  rejouée à **71/71**. Activation locale obligatoire : `git config core.hooksPath .githooks`.
  Échappatoire explicite : `NOTICE_INCHANGEE=1 git commit …`.
- Plan du chantier #101 (clos) : `docs/notice-plan.md` — c'est un document daté,
  il décrit l'état d'alors (16 figures, `notice/figs/` à plat), pas l'état d'aujourd'hui.

## Règles de reprise (résumé — détail dans passation-openai/regles/)
1. Jamais deviner : lire les fichiers concernés en entier avant d'agir.
2. Toute modification : plan + accord de Charles AVANT, preuve d'exécution APRÈS.
3. Réponses courtes (Charles est malvoyant), un sujet à la fois.
4. Modif UI : vérifiée dans les conditions réelles de Charles, c'est LUI qui valide à l'écran.

- Règles de travail de Charles + skills + définitions d'agents (globales, toute la machine) :
  `/mnt/data/Charles/DevPerso/passation-openai/`
- Le README / la doc du projet reste la référence fonctionnelle.
