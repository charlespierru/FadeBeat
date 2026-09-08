# FadeBeat

**Outil d'entraînement rythmique avec atténuation progressive par beat.**

FadeBeat est un métronome avancé conçu pour travailler l'**intériorisation du rythme**, inspiré par [la vidéo de Jamie Anderson "The Free Rhythm Tool That'll Transform Your Groove!"](https://www.youtube.com/watch?v=WVDtPucGMt8). Il permet de faire disparaître progressivement un ou plusieurs beats, forçant le musicien à maintenir la pulsation intérieurement sans s'appuyer sur le son externe.

> Application en **un seul fichier HTML** — aucune installation, aucun serveur, aucun fichier audio externe.

---

## Lancer l'application

Télécharge `FadeBeat.html` et ouvre-le dans n'importe quel navigateur moderne (Chrome, Firefox, Edge, Safari).

```
double-clic sur FadeBeat.html
```

C'est tout.

---

## Interface

### Indicateurs de beat

Quatre cercles colorés représentent les 4 temps de la mesure (4/4) :

| Cercle | Beat | Couleur |
|--------|------|---------|
| 1 | Temps fort (accent) | Violet |
| 2 | Temps 2 | Ambre |
| 3 | Temps 3 | Cyan |
| 4 | Temps 4 | Vert |

Chaque cercle **pulse et s'illumine** au moment exact de son beat. La barre verticale sous chaque cercle indique le **volume actuel** de ce beat (elle descend au fur et à mesure du fade).

---

### Timbre

Choisissez parmi 6 sons générés entièrement par Web Audio API :

| Bouton | Son | Description |
|--------|-----|-------------|
| **Métronome** | Bruit blanc bandpass + click | Clic bois classique, accent sur le 1 |
| **Cloche** | Triangle 2200 / 1760 Hz | Sonnerie douce avec longue résonance |
| **Woodblock** | Bruit blanc bandpass serré | Frappe sèche et percussive |
| **Hi-hat** | Bruit blanc high-pass | Charleston fermé, très court |
| **Kick doux** | Sinus avec pitch-drop | Grosse caisse légère, grave |
| **Sinus pur** | Sinus 880 / 440 Hz | Bip électronique neutre |

> Le beat 1 joue toujours une version accentuée (plus haute, plus forte) pour marquer le temps fort.

---

### Tempo

- **Slider** : 40 → 300 BPM
- **Champ numérique** : éditable directement, synchronisé avec le slider
- La durée d'une mesure en secondes est affichée en temps réel

---

### Accélération

Panneau sous le tempo. Le bouton dit ce qu'il va faire : **Activer l'accélération** quand le mode est éteint, **Désactiver l'accélération** quand il est allumé ; la ligne d'état sous les champs dit toujours « Mode ÉTEINT » ou « Mode ALLUMÉ ». Mode allumé, le tempo n'est plus réglé à la main : il est piloté par quatre valeurs.

| Champ | Plage | Rôle |
|-------|-------|------|
| **Départ** | 40 → 300 BPM | Tempo au lancement |
| **Arrivée** | 40 → 300 BPM | Tempo final, où le métronome se stabilise |
| **Toutes les** | 1 → 32 mesures | Longueur d'un palier |
| **Pas** | 1 → 60 BPM | De combien le tempo change à chaque palier |

Déroulement : le métronome démarre au tempo de départ ; toutes les *m* mesures il change de *n* BPM, au premier temps de la mesure ; le dernier palier est écrêté sur le tempo d'arrivée, puis le tempo reste fixe tant qu'on joue. Si l'arrivée est plus basse que le départ, c'est un ralentissement. La ligne d'état sous les champs indique le tempo courant et le nombre de mesures avant le prochain palier. Stop remet le tempo de départ.

*Exemple : départ 100, arrivée 130, toutes les 2 mesures, pas 10 → les deux premières mesures à 100 (affichées « Mesure 0 » et « Mesure 1 »), les deux suivantes à 110, puis 120, puis 130.*

Quand le mode est actif, le curseur et le champ Tempo sont verrouillés et ne font qu'afficher le tempo courant. Basculer le mode pendant la lecture redémarre le métronome à la mesure 0.

Les atténuations par beat continuent de compter en mesures, quel que soit le tempo courant.

---

### Atténuation par beat

C'est le cœur de l'application. Chaque beat dispose de **deux paramètres indépendants** :

#### Durée fade (0 → 16 mesures) — slider ambre
Combien de mesures dure la transition du volume plein vers le silence.
- `0` = pas d'atténuation, le beat joue toujours à plein volume
- `4` = le volume décroît linéairement sur 4 mesures
- `16` = disparition très progressive sur 16 mesures entières

#### Début après (0 → 16 mesures) — slider bleu
Combien de mesures s'écoulent à plein volume avant que l'atténuation ne commence.
- `0` = l'atténuation démarre immédiatement
- `8` = le beat joue 8 mesures à plein volume, puis le fade commence
- `16` = longue période de son plein avant que le volume commence à baisser

#### Formule de calcul

```
volume = max(0,  1 - (mesure_courante - début_après) / durée_fade)
```

La durée réelle en secondes d'un fade :
```
durée_secondes = durée_fade × (240 / BPM)
```

*Exemple à 120 BPM : durée_fade = 4 mesures → 4 × 2s = 8 secondes de transition*

---

### Boutons principaux

| Bouton | Action |
|--------|--------|
| **▶ Play** | Démarre le métronome (violet) |
| **■ Stop** | Arrête le métronome (rouge) |
| **↺ Reset atténuations** | Remet tous les sliders d'atténuation et de délai à 0, sans toucher le tempo ni le son |

**Raccourci clavier :** `Espace` pour basculer Play / Stop.

---

## Exemples d'exercices

### 1. Disparition progressive du 1
> Travail : maintenir le temps fort mentalement sans le son.

- Durée fade beat 1 : `8`
- Début après beat 1 : `4`
- Autres beats : `0`

Le beat 1 joue 4 mesures à plein volume, puis s'efface sur 8 mesures. Vous devez continuer à ressentir le 1.

---

### 2. Squelette rythmique
> Travail : intérioriser les temps faibles.

- Beats 2 et 4 : Durée fade `6`, Début après `0`
- Beats 1 et 3 : inchangés

Le hi-hat ou le backbeat disparaît progressivement.

---

### 3. Silence total
> Travail : jouer seul pendant une longue séquence sans référence sonore.

- Même réglage sur les 4 beats, Durée fade `16`, Début après `8`

Tous les beats s'estompent lentement sur 16 mesures après 8 mesures de plein volume. Le musicien doit maintenir le tempo intérieurement.

---

## Technique

| Aspect | Détail |
|--------|--------|
| Timing | `performance.now()` + lookahead 100ms, `setInterval` 25ms |
| Visuels | `requestAnimationFrame` + file d'événements datés |
| Audio | Web Audio API — `OscillatorNode`, `GainNode`, `BiquadFilterNode`, buffers de bruit blanc |
| Dépendances | Tailwind CSS via CDN (mise en forme uniquement) |
| Compatibilité | Chrome, Firefox, Edge, Safari (tout navigateur supportant Web Audio API) |

---

## Fichiers

```
FadeBeat.html   ← application complète (HTML + CSS + JS)
```

---

## Licence

**Licence MIT** — voir le fichier [`LICENSE`](LICENSE).

Libre d'utilisation, de modification et de redistribution, y compris à titre
commercial, à condition de conserver la mention d'auteur. Fourni sans garantie.
