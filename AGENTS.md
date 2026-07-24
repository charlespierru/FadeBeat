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
