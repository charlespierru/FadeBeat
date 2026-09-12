# PASSATION (2026-09-12) — projet `zic-app`

Transition de l'outillage : Claude Code -> OpenAI (Codex CLI ou équivalent).
Ce fichier permet à tout agent de reprendre le travail sans autre contexte.

## Où trouver l'état
### État git (2026-09-12)
```
293c3bc chore: fins de ligne du .gitignore
3784387 feat: Accélération — tempo de départ → arrivée par paliers de n BPM toutes les m mesures
f5c0d98 Passation multi-agents : AGENTS.md + PASSATION.md
2ec173b Licence MIT
a22a761 docs: add inspiration source link in README
```
Fichiers non committés : 3 modifiés (`AGENTS.md`, `FadeBeat.html`, `README.md`)
et 25 nouveaux fichiers non suivis (notice, captures, scripts, épreuve, plan,
hook, `.claude/settings.json`, `logo/`).

## Chantier #101 en cours, non committé
Notice d'utilisation FR/EN + garde-fou de mise à jour. Tout est livré sur le
disque, **rien n'est committé** :
- Notice : `notice/fr.html` et `notice/en.html` (10 chapitres, sommaire, 16 figures par langue).
- Captures d'écran réelles : `notice/figs/` (rejouables).
- Scripts : `scripts/captures.mjs` (refait les captures) et
  `scripts/verif-notice.mjs` (vérification headless des deux notices).
  Les deux prennent puppeteer dans `tonik/node_modules/` (repli `PUPPETEER_MODULES`).
- Garde-fou : `.githooks/pre-commit` — refuse un commit qui touche `FadeBeat.html`
  sans toucher aussi les deux notices. Activation locale obligatoire :
  `git config core.hooksPath .githooks`. Échappatoire explicite :
  `NOTICE_INCHANGEE=1 git commit …`.
- Épreuve indépendante du garde-fou : `tests/epreuve-garde-notice.sh`.
- Plan du chantier : `docs/notice-plan.md` (phases, critères de recette, amendements).
- Lien « Notice » **en haut** de `FadeBeat.html` (bloc d'en-tête, `id="lnk-notice"`,
  nouvel onglet).

## Règles de reprise (résumé — détail dans passation-openai/regles/)
1. Jamais deviner : lire les fichiers concernés en entier avant d'agir.
2. Toute modification : plan + accord de Charles AVANT, preuve d'exécution APRÈS.
3. Réponses courtes (Charles est malvoyant), un sujet à la fois.
4. Modif UI : vérifiée dans les conditions réelles de Charles, c'est LUI qui valide à l'écran.

- Règles de travail de Charles + skills + définitions d'agents (globales, toute la machine) :
  `/mnt/data/Charles/DevPerso/passation-openai/`
- Le README / la doc du projet reste la référence fonctionnelle.
