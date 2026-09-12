# AGENTS.md — zic-app (FadeBeat)

Instructions pour tout agent IA sur ce dépôt. Règles globales déjà chargées
(Codex : `~/.codex/AGENTS.md` ; Claude Code : CLAUDE.md + hooks).

## Le projet
**FadeBeat** : métronome d'entraînement rythmique avec atténuation progressive par beat
(intériorisation de la pulsation — inspiré de la vidéo de Jamie Anderson). Application
**en un seul fichier HTML** : aucune installation, aucun serveur, aucun audio externe.

## Avant d'agir
1. `PASSATION.md` — état et reprise.
2. `README.md` — le concept et les réglages.

## Spécificités impératives
- Respecter le principe « un seul fichier HTML » : pas de dépendance, pas de build,
  pas de fichier annexe — sauf décision contraire explicite de Charles.
- Toute modification s'écoute et se teste EN VRAI (timing audio) : le métronome doit
  rester exact ; validation finale par Charles à l'oreille et à l'écran.
- **Notice = partie de la fonctionnalité.** Toute fonctionnalité nouvelle ou modifiée
  dans `FadeBeat.html` se termine par la mise à jour des DEUX notices, `notice/fr.html`
  et `notice/en.html` (texte + captures, `node scripts/captures.mjs` les régénère).
  Le hook `.githooks/pre-commit` refuse un commit qui touche `FadeBeat.html` sans les
  deux notices ; activer une fois par clone : `git config core.hooksPath .githooks`.
  Une notice **supprimée** compte comme manquante, pas comme mise à jour.
  Échappatoire pour un commit sans effet visible : `NOTICE_INCHANGEE=1 git commit …`
  (assumé, jamais par réflexe). Épreuve du hook : `tests/epreuve-garde-notice.sh`.
- **Le hook ne s'exécute que sur `git commit`.** `git merge`, `git rebase`,
  `git cherry-pick` et `git commit --no-verify` le contournent sans rien dire : la
  mise à jour des deux notices est alors une convention à respecter à la main.
- `scripts/captures.mjs` (captures) et `scripts/verif-notice.mjs` (vérification
  headless) prennent puppeteer dans `/mnt/data/Charles/DevPerso/tonik/node_modules/` ;
  pour un autre chemin : `PUPPETEER_MODULES=/chemin/vers/node_modules node scripts/…`.
- Exception au principe « un seul fichier » décidée par Charles le 2026-09-12 : le
  dossier `notice/` (deux pages + captures) vit à côté de l'appli.
