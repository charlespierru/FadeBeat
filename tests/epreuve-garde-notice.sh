#!/usr/bin/env bash
# Épreuve du garde-fou git « pre-commit notice » (règle zéro : écrite sans voir le hook).
#
# But examiné : aucun commit ne modifie FadeBeat.html sans modifier aussi, dans le
# même commit, notice/fr.html ET notice/en.html. Échappatoire : NOTICE_INCHANGEE=1.
#
# Usage : tests/epreuve-garde-notice.sh [chemin du dépôt réel]
# Ne touche jamais au dépôt réel : ne fait que lire .githooks/pre-commit et le copier
# dans des dépôts jetables sous mktemp -d, nettoyés à la sortie.
# Sortie : une ligne « OK — … » / « ÉCHEC — … » par cas, un total N/N, code 0 si tout passe.

set -u
export LC_ALL=C.UTF-8
REPO="${1:-/mnt/data/Charles/DevPerso/zic-app}"
HOOK="$REPO/.githooks/pre-commit"

# Isolation : aucune config globale/système, aucune variable git héritée, pas d'échappatoire ambiante.
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
export GIT_AUTHOR_NAME=epreuve GIT_AUTHOR_EMAIL=epreuve@local
export GIT_COMMITTER_NAME=epreuve GIT_COMMITTER_EMAIL=epreuve@local
unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_EDITOR NOTICE_INCHANGEE

TOTAL=0 PASS=0
WORK=$(mktemp -d) || { echo "ÉCHEC — mktemp impossible"; exit 2; }
trap 'rm -rf "$WORK"' EXIT
OUT="$WORK/sortie"        # sortie (stdout+stderr) de la dernière tentative de commit
LAST_RC=0
LAST_MS=0

note() { # note <0|1> <description> [détail]
  TOTAL=$((TOTAL + 1))
  if [ "$1" -eq 0 ]; then PASS=$((PASS + 1)); echo "OK — $2"
  else echo "ÉCHEC — $2${3:+ [$3]}"; fi
}

# ---------------------------------------------------------------- fabrique de dépôts jetables
new_repo() { # new_repo [--vide]  → imprime le chemin. Sans --vide : commit de base (sans hook).
  local d; d=$(mktemp -d -p "$WORK") || exit 2
  git -C "$d" init -q -b main
  git -C "$d" config commit.gpgsign false
  git -C "$d" config core.hooksPath .githooks
  mkdir -p "$d/.githooks"
  [ -f "$HOOK" ] && cp -p "$HOOK" "$d/.githooks/pre-commit"   # -p : on garde le mode tel qu'il est dans le dépôt
  if [ "${1:-}" != "--vide" ]; then
    mkdir -p "$d/notice" "$d/docs"
    printf '<html>app v1</html>\n' > "$d/FadeBeat.html"
    printf 'notice fr v1\n' > "$d/notice/fr.html"
    printf 'notice en v1\n' > "$d/notice/en.html"
    printf 'readme v1\n' > "$d/README.md"
    printf 'homonyme v1\n' > "$d/docs/FadeBeat.html"
    git -C "$d" add -A
    git -C "$d" commit -q --no-verify -m base   # base posée SANS passer par le hook examiné
  fi
  echo "$d"
}
modif() { printf 'modif %s\n' "$RANDOM$RANDOM" >> "$1"; }   # modification réelle d'un fichier

# tente_commit <dossier où se placer> [args de git commit…] ; remplit $OUT, $LAST_RC, $LAST_MS
tente_commit() {
  local dir="$1"; shift
  local t0 t1
  t0=$(date +%s%N)
  ( cd "$dir" && git commit -q -m "essai" "$@" ) > "$OUT" 2>&1
  LAST_RC=$?
  t1=$(date +%s%N)
  LAST_MS=$(( (t1 - t0) / 1000000 ))
}
head_de() { git -C "$1" rev-parse -q --verify HEAD 2>/dev/null || echo "aucun"; }

# attend_refus <desc> <repo> <cwd> [args…]  : le commit doit échouer ET HEAD ne doit pas bouger
attend_refus() {
  local desc="$1" repo="$2" cwd="$3"; shift 3
  local avant apres; avant=$(head_de "$repo")
  tente_commit "$cwd" "$@"
  apres=$(head_de "$repo")
  if [ "$LAST_RC" -ne 0 ] && [ "$avant" = "$apres" ]; then note 0 "$desc"
  elif [ "$avant" != "$apres" ]; then note 1 "$desc" "commit PASSÉ (rc=$LAST_RC) — garde-fou SILENCIEUX"
  else note 1 "$desc" "rc=$LAST_RC mais HEAD inchangé ?"; fi
}
# attend_passe <desc> <repo> <cwd> [args…]  : le commit doit réussir ET HEAD doit avancer
attend_passe() {
  local desc="$1" repo="$2" cwd="$3"; shift 3
  local avant apres; avant=$(head_de "$repo")
  tente_commit "$cwd" "$@"
  apres=$(head_de "$repo")
  if [ "$LAST_RC" -eq 0 ] && [ "$avant" != "$apres" ]; then note 0 "$desc"
  else note 1 "$desc" "rc=$LAST_RC, sortie: $(tr '\n' '|' < "$OUT" | cut -c1-160)"; fi
}

# ================================================================ 0. préalables
if [ -f "$HOOK" ]; then note 0 "le hook $HOOK existe"; else note 1 "le hook $HOOK existe" "absent : tous les refus ci-dessous vont échouer, c'est attendu tant qu'il n'est pas écrit"; fi
if [ -x "$HOOK" ]; then note 0 "le hook est exécutable (sinon git l'ignore en silence)"; else note 1 "le hook est exécutable (sinon git l'ignore en silence)"; fi

# ================================================================ 1. ce qui doit ÉCHOUER
# 1.1 FadeBeat.html seul, indexé
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" add FadeBeat.html
attend_refus "refus : FadeBeat.html modifié seul (index)" "$R" "$R"

# 1.2 FadeBeat.html + fr seule
R=$(new_repo); modif "$R/FadeBeat.html"; modif "$R/notice/fr.html"; git -C "$R" add -A
attend_refus "refus : FadeBeat.html + notice/fr.html seulement" "$R" "$R"

# 1.3 FadeBeat.html + en seule
R=$(new_repo); modif "$R/FadeBeat.html"; modif "$R/notice/en.html"; git -C "$R" add -A
attend_refus "refus : FadeBeat.html + notice/en.html seulement" "$R" "$R"

# 1.4 git commit -a, notices intactes
R=$(new_repo); modif "$R/FadeBeat.html"
attend_refus "refus : git commit -a avec FadeBeat.html modifié, notices intactes" "$R" "$R" -a

# 1.5 git commit <chemin> : notices modifiées ET indexées, mais le commit n'emporte que FadeBeat.html
R=$(new_repo); modif "$R/FadeBeat.html"; modif "$R/notice/fr.html"; modif "$R/notice/en.html"; git -C "$R" add -A
attend_refus "refus : git commit FadeBeat.html (notices indexées mais exclues du commit)" "$R" "$R" -- FadeBeat.html

# 1.6 git commit <chemins> partiel : FadeBeat + fr seulement, en laissée dehors
R=$(new_repo); modif "$R/FadeBeat.html"; modif "$R/notice/fr.html"; modif "$R/notice/en.html"
attend_refus "refus : git commit FadeBeat.html notice/fr.html (en laissée dehors)" "$R" "$R" -- FadeBeat.html notice/fr.html

# 1.7 notices modifiées dans l'arbre de travail mais PAS indexées
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" add FadeBeat.html; modif "$R/notice/fr.html"; modif "$R/notice/en.html"
attend_refus "refus : notices modifiées sur disque mais non indexées (seul FadeBeat.html part)" "$R" "$R"

# 1.8 notices « touchées » (mtime, git add) mais contenu identique
R=$(new_repo); modif "$R/FadeBeat.html"; touch "$R/notice/fr.html" "$R/notice/en.html"; git -C "$R" add -A
attend_refus "refus : notices touchées (mtime + git add) mais contenu identique" "$R" "$R"

# 1.9 commit lancé depuis un sous-dossier
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" add FadeBeat.html
attend_refus "refus : commit lancé depuis le sous-dossier notice/" "$R" "$R/notice"

# 1.10 suppression de FadeBeat.html seule
R=$(new_repo); git -C "$R" rm -q FadeBeat.html
attend_refus "refus : suppression (git rm) de FadeBeat.html sans notices" "$R" "$R"

# 1.11 renommage de FadeBeat.html seul (la détection de renommage cache l'ancien nom à --name-only)
R=$(new_repo); git -C "$R" mv FadeBeat.html FadeBeat2.html
attend_refus "refus : renommage git mv FadeBeat.html → FadeBeat2.html sans notices" "$R" "$R"

# 1.12 renommage + légère modification (renommage détecté à 9x %)
R=$(new_repo); git -C "$R" mv FadeBeat.html app.html; modif "$R/app.html"; git -C "$R" add app.html
attend_refus "refus : renommage FadeBeat.html → app.html + modification, sans notices" "$R" "$R"

# 1.13 changement de mode seul
R=$(new_repo); git -C "$R" update-index --chmod=+x FadeBeat.html
attend_refus "refus : changement de mode seul (+x) sur FadeBeat.html" "$R" "$R"

# 1.14 --amend avec FadeBeat.html seul indexé
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" add FadeBeat.html
attend_refus "refus : git commit --amend avec FadeBeat.html seul" "$R" "$R" --amend --no-edit

# 1.15 premier commit d'un dépôt (pas de HEAD) : FadeBeat.html seul
R=$(new_repo --vide); printf 'v1\n' > "$R/FadeBeat.html"; git -C "$R" add FadeBeat.html
attend_refus "refus : tout premier commit (sans HEAD) contenant FadeBeat.html seul" "$R" "$R"

# 1.16 faux jumeaux de chemins : des fichiers dont le nom CONTIENT notice/fr.html ne sont pas les notices
R=$(new_repo); modif "$R/FadeBeat.html"
mkdir -p "$R/old/notice"; printf 'x\n' > "$R/old/notice/fr.html"; printf 'x\n' > "$R/old/notice/en.html"
printf 'x\n' > "$R/notice/fr.html.bak"; printf 'x\n' > "$R/notice/en.html.bak"
git -C "$R" add -A
attend_refus "refus : FadeBeat.html + old/notice/fr.html + notice/fr.html.bak (homonymes, vraies notices intactes)" "$R" "$R"

# 1.17 casse : Notice/fr.html et notice/FR.html ne sont pas les notices (Linux, sensible à la casse)
R=$(new_repo); modif "$R/FadeBeat.html"
mkdir -p "$R/Notice"; printf 'x\n' > "$R/Notice/fr.html"; printf 'x\n' > "$R/notice/EN.html"
git -C "$R" add -A
attend_refus "refus : FadeBeat.html + Notice/fr.html + notice/EN.html (casse différente)" "$R" "$R"

# 1.18 l'échappatoire ne vaut que pour NOTICE_INCHANGEE=1 : vide ou 0 ne doivent pas ouvrir la porte
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" add FadeBeat.html
NOTICE_INCHANGEE="" attend_refus "refus : NOTICE_INCHANGEE= (vide) n'est pas l'échappatoire" "$R" "$R"
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" add FadeBeat.html
NOTICE_INCHANGEE=0 attend_refus "refus : NOTICE_INCHANGEE=0 n'est pas l'échappatoire" "$R" "$R"

# 1.19 un refus doit être BAVARD : quelque chose sur la sortie
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" add FadeBeat.html
tente_commit "$R"
if [ "$LAST_RC" -ne 0 ] && grep -qi 'notice' "$OUT"; then note 0 "un refus explique en citant la notice sur sa sortie"
else note 1 "un refus explique en citant la notice sur sa sortie" "rc=$LAST_RC, sortie: $(tr '\n' '|' < "$OUT" | cut -c1-160)"; fi

# ================================================================ 2. TÉMOINS (doivent passer)
R=$(new_repo); modif "$R/README.md"; git -C "$R" add -A
attend_passe "témoin : README.md seul passe" "$R" "$R"

R=$(new_repo); modif "$R/notice/fr.html"; modif "$R/notice/en.html"; git -C "$R" add -A
attend_passe "témoin : les deux notices seules passent" "$R" "$R"

R=$(new_repo); modif "$R/notice/fr.html"; git -C "$R" add -A
attend_passe "témoin : notice/fr.html seule passe" "$R" "$R"

R=$(new_repo); modif "$R/docs/FadeBeat.html"; git -C "$R" add -A
attend_passe "témoin : docs/FadeBeat.html (homonyme ailleurs) seul passe" "$R" "$R"

R=$(new_repo); modif "$R/FadeBeat.html"; modif "$R/notice/fr.html"; modif "$R/notice/en.html"; git -C "$R" add -A
attend_passe "témoin : FadeBeat.html + fr + en passent (index)" "$R" "$R"

R=$(new_repo); modif "$R/FadeBeat.html"; modif "$R/notice/fr.html"; modif "$R/notice/en.html"
attend_passe "témoin : FadeBeat.html + fr + en passent avec git commit -a" "$R" "$R" -a

R=$(new_repo); modif "$R/FadeBeat.html"; modif "$R/notice/fr.html"; modif "$R/notice/en.html"; git -C "$R" add -A
attend_passe "témoin : FadeBeat.html + fr + en passent depuis le sous-dossier notice/" "$R" "$R/notice"

R=$(new_repo); modif "$R/FadeBeat.html"; modif "$R/notice/fr.html"; modif "$R/notice/en.html"; git -C "$R" add -A
attend_passe "témoin : FadeBeat.html + fr + en passent avec --amend" "$R" "$R" --amend --no-edit

R=$(new_repo --vide); mkdir -p "$R/notice"; printf 'v1\n' > "$R/FadeBeat.html"; printf 'fr\n' > "$R/notice/fr.html"; printf 'en\n' > "$R/notice/en.html"
git -C "$R" add -A
attend_passe "témoin : tout premier commit (sans HEAD) avec FadeBeat.html + fr + en passe" "$R" "$R"

R=$(new_repo); git -C "$R" rm -q -r notice; modif "$R/README.md"; git -C "$R" add -A
attend_passe "témoin : suppression des notices sans toucher FadeBeat.html passe" "$R" "$R"

# 2.x échappatoire officielle
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" add FadeBeat.html
NOTICE_INCHANGEE=1 attend_passe "témoin : NOTICE_INCHANGEE=1 laisse passer FadeBeat.html seul" "$R" "$R"
if grep -i 'notice' "$OUT" | grep -Eqi 'pas |non |inchang|sans '; then
  note 0 "échappatoire : le hook écrit en toutes lettres que la notice n'a pas été mise à jour"
else
  note 1 "échappatoire : le hook écrit en toutes lettres que la notice n'a pas été mise à jour" "sortie: $(tr '\n' '|' < "$OUT" | cut -c1-160)"
fi
R=$(new_repo); modif "$R/FadeBeat.html"
NOTICE_INCHANGEE=1 attend_passe "témoin : NOTICE_INCHANGEE=1 avec git commit -a passe" "$R" "$R" -a

# ================================================================ 3. innocuité et durée
empreinte() { # état complet : HEAD, arbre de l'index, statut, contenu de l'arbre de travail, stash
  ( cd "$1" && {
      head_de .
      git write-tree
      git status --porcelain=v2 --untracked-files=all
      git stash list
      find . -path ./.git -prune -o -type f -print0 | LC_ALL=C sort -z | xargs -0 sha256sum
    } ) 2>&1 | sha256sum
}
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" add FadeBeat.html; modif "$R/notice/fr.html"   # fr modifiée non indexée, en intacte
AV=$(empreinte "$R"); tente_commit "$R"; AP=$(empreinte "$R")
if [ "$LAST_RC" -ne 0 ] && [ "$AV" = "$AP" ]; then note 0 "innocuité : après un refus, index et arbre de travail sont strictement identiques"
else note 1 "innocuité : après un refus, index et arbre de travail sont strictement identiques" "rc=$LAST_RC, empreinte avant/après $([ "$AV" = "$AP" ] && echo identique || echo DIFFÉRENTE)"; fi

R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" add FadeBeat.html
tente_commit "$R"
if [ "$LAST_RC" -ne 0 ] && [ "$LAST_MS" -lt 1000 ]; then note 0 "durée : un refus prend moins d'une seconde (${LAST_MS} ms)"
else note 1 "durée : un refus prend moins d'une seconde" "rc=$LAST_RC, ${LAST_MS} ms"; fi

R=$(new_repo); modif "$R/FadeBeat.html"; modif "$R/notice/fr.html"; modif "$R/notice/en.html"
# gros fichier : un hook qui lit tout le diff ne doit pas s'écrouler
head -c 3000000 /dev/urandom | base64 >> "$R/FadeBeat.html"; git -C "$R" add -A
tente_commit "$R"
if [ "$LAST_RC" -eq 0 ] && [ "$LAST_MS" -lt 1000 ]; then note 0 "durée : un passage avec FadeBeat.html de ~4 Mo prend moins d'une seconde (${LAST_MS} ms)"
else note 1 "durée : un passage avec FadeBeat.html de ~4 Mo prend moins d'une seconde" "rc=$LAST_RC, ${LAST_MS} ms"; fi

# ================================================================ 4. notice SUPPRIMÉE ou RENOMMÉE = manquante (doit ÉCHOUER)
# Précision du 2026-09-12 : une notice effacée (git rm) ou renommée n'est PAS « modifiée »,
# elle compte comme manquante. Piège central : son ancien chemin apparaît quand même dans
# `git diff --cached --name-only` — en ligne D, ou en paire D + A quand la détection de
# renommage est désactivée. Un garde-fou qui cherche seulement la chaîne « notice/fr.html »
# dans cette liste croit la notice à jour alors qu'elle vient de disparaître : il se tait,
# et un garde-fou qui se tait laisse passer.

ajoute_au_base() { # ajoute_au_base <repo> <chemin relatif> : pose un fichier de plus dans le commit de base (hook contourné)
  local d="$1" p="$2"
  mkdir -p "$(dirname "$d/$p")"
  printf 'contenu de %s v1\n' "$p" > "$d/$p"
  git -C "$d" add -- "$p"
  git -C "$d" commit -q --no-verify -m "base: $p"
}

# 4.1 une notice supprimée, l'AUTRE réellement modifiée — le cas le plus trompeur
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" rm -q notice/fr.html; modif "$R/notice/en.html"; git -C "$R" add -A
attend_refus "refus : FadeBeat.html + notice/fr.html SUPPRIMÉE + notice/en.html modifiée" "$R" "$R"

# 4.2 le symétrique (une langue peut être traitée et pas l'autre)
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" rm -q notice/en.html; modif "$R/notice/fr.html"; git -C "$R" add -A
attend_refus "refus : FadeBeat.html + notice/en.html SUPPRIMÉE + notice/fr.html modifiée" "$R" "$R"

# 4.3 les deux notices supprimées
# (indexer FadeBeat.html EXPLICITEMENT : sans cela le commit ne contient que les suppressions
#  et le passage est légitime — c'est le témoin 5.2, pas ce refus-ci)
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" rm -q notice/fr.html notice/en.html
git -C "$R" add -- FadeBeat.html
attend_refus "refus : FadeBeat.html + les DEUX notices supprimées (git rm)" "$R" "$R"

# 4.4 dossier notice/ entier supprimé
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" rm -q -r notice; git -C "$R" add -- FadeBeat.html
attend_refus "refus : FadeBeat.html + dossier notice/ supprimé en entier (git rm -r)" "$R" "$R"

# 4.5 suppression jamais indexée à la main : emportée par git commit -a
R=$(new_repo); modif "$R/FadeBeat.html"; rm -f "$R/notice/fr.html" "$R/notice/en.html"
attend_refus "refus : FadeBeat.html + notices effacées sur disque, via git commit -a" "$R" "$R" -a

# 4.6 suppression + commit par chemins (index temporaire)
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" rm -q notice/fr.html notice/en.html
attend_refus "refus : git commit -- FadeBeat.html notice/fr.html notice/en.html, notices supprimées" "$R" "$R" -- FadeBeat.html notice/fr.html notice/en.html

# 4.7 --amend (comparaison au parent : autre chemin d'exécution)
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" rm -q notice/fr.html notice/en.html
git -C "$R" add -- FadeBeat.html
attend_refus "refus : --amend avec FadeBeat.html + notices supprimées" "$R" "$R" --amend --no-edit

# 4.8 lancé depuis un sous-dossier (résolution des chemins relatifs)
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" rm -q notice/fr.html; modif "$R/notice/en.html"; git -C "$R" add -A
attend_refus "refus : notice/fr.html supprimée, commit lancé depuis le sous-dossier docs/" "$R" "$R/docs"

# 4.9 retirée de l'index SEULEMENT : le fichier reste sur le disque (piège pour un test « [ -f notice/fr.html ] »)
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" rm -q --cached notice/fr.html
modif "$R/notice/en.html"; git -C "$R" add -- FadeBeat.html notice/en.html
attend_refus "refus : notice/fr.html sortie de l'index (git rm --cached) mais toujours sur le disque" "$R" "$R"

# 4.10 supprimée puis recréée VIDE : le chemin existe, la notice non
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" rm -q notice/fr.html
mkdir -p "$R/notice"; : > "$R/notice/fr.html"; modif "$R/notice/en.html"; git -C "$R" add -A
attend_refus "refus : notice/fr.html supprimée puis recréée VIDE + en modifiée" "$R" "$R"

# 4.11 les deux supprimées puis recréées vides
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" rm -q notice/fr.html notice/en.html
mkdir -p "$R/notice"; : > "$R/notice/fr.html"; : > "$R/notice/en.html"; git -C "$R" add -A
attend_refus "refus : les DEUX notices supprimées puis recréées VIDES" "$R" "$R"

# 4.12 renommage pur, contenu identique (git voit R100 : --name-only ne montre que la destination)
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" mv notice/fr.html notice/fr-FR.html; modif "$R/notice/en.html"; git -C "$R" add -A
attend_refus "refus : notice/fr.html RENOMMÉE en notice/fr-FR.html + en modifiée" "$R" "$R"

# 4.13 renommage puis modification (vu comme R ou comme D + A selon la similarité : refus dans les deux cas)
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" mv notice/en.html notice/en-US.html
modif "$R/notice/en-US.html"; modif "$R/notice/fr.html"; git -C "$R" add -A
attend_refus "refus : notice/en.html renommée en notice/en-US.html puis modifiée + fr modifiée" "$R" "$R"

# 4.14 le dossier entier renommé : les deux notices changent de chemin d'un coup
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" mv notice notices; git -C "$R" add -A
attend_refus "refus : dossier notice/ renommé en notices/ avec FadeBeat.html modifié" "$R" "$R"

# 4.15 le chemin notice/fr.html devient un DOSSIER : « notice/fr.html/index.html » contient la chaîne cherchée
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" rm -q notice/fr.html
mkdir -p "$R/notice/fr.html"; printf 'x\n' > "$R/notice/fr.html/index.html"; modif "$R/notice/en.html"; git -C "$R" add -A
attend_refus "refus : notice/fr.html remplacée par un dossier notice/fr.html/index.html" "$R" "$R"

# 4.16 le chemin notice/fr.html devient un lien symbolique : le fichier de notice a disparu
R=$(new_repo); modif "$R/FadeBeat.html"; rm -f "$R/notice/fr.html"; ln -s en.html "$R/notice/fr.html"
modif "$R/notice/en.html"; git -C "$R" add -A
attend_refus "refus : notice/fr.html remplacée par un lien symbolique vers en.html" "$R" "$R"

# 4.17 suppression de l'appli ET des notices (supprimer l'appli est un changement d'appli : cf. 1.10)
R=$(new_repo); git -C "$R" rm -q FadeBeat.html notice/fr.html notice/en.html
attend_refus "refus : FadeBeat.html supprimé + les deux notices supprimées" "$R" "$R"

# 4.18 premier commit (sans HEAD) : rien à supprimer, une notice simplement ABSENTE
R=$(new_repo --vide); mkdir -p "$R/notice"; printf 'v1\n' > "$R/FadeBeat.html"; printf 'fr\n' > "$R/notice/fr.html"
git -C "$R" add -A
attend_refus "refus : tout premier commit avec FadeBeat.html + notice/fr.html seule (en absente)" "$R" "$R"

# 4.19 l'échappatoire reste la seule porte, même pour une suppression
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" rm -q notice/fr.html notice/en.html
git -C "$R" add -- FadeBeat.html
NOTICE_INCHANGEE=0 attend_refus "refus : NOTICE_INCHANGEE=0 ne sauve pas un commit aux notices supprimées" "$R" "$R"

# 4.20 gravité : ce refus doit CRIER (muet = laisse passer)
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" rm -q notice/fr.html notice/en.html
git -C "$R" add -- FadeBeat.html
tente_commit "$R"
if [ "$LAST_RC" -ne 0 ] && grep -qi 'notice' "$OUT"; then note 0 "un refus pour notices supprimées cite la notice sur sa sortie"
else note 1 "un refus pour notices supprimées cite la notice sur sa sortie" "rc=$LAST_RC, sortie: $(tr '\n' '|' < "$OUT" | cut -c1-160)"; fi

# 4.21 innocuité : un refus ne restaure rien et n'indexe rien (la suppression reste telle quelle)
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" rm -q notice/fr.html; modif "$R/notice/en.html"; git -C "$R" add -A
AV=$(empreinte "$R"); tente_commit "$R"; AP=$(empreinte "$R")
if [ "$LAST_RC" -ne 0 ] && [ "$AV" = "$AP" ]; then note 0 "innocuité : un refus pour notice supprimée laisse index et arbre de travail intacts"
else note 1 "innocuité : un refus pour notice supprimée laisse index et arbre de travail intacts" "rc=$LAST_RC, empreinte avant/après $([ "$AV" = "$AP" ] && echo identique || echo DIFFÉRENTE)"; fi

# ================================================================ 5. TÉMOINS de la précision (doivent PASSER)
# Sans eux, refuser les suppressions de notice rendrait le garde-fou bavard à contretemps :
# il bloquerait du ménage légitime et la réécriture complète d'une notice.

# 5.1 ménage de la notice sans toucher l'appli
R=$(new_repo); git -C "$R" rm -q notice/fr.html
attend_passe "témoin : notice/fr.html supprimée seule, sans FadeBeat.html, passe" "$R" "$R"

# 5.2 les deux notices supprimées, appli intacte
R=$(new_repo); git -C "$R" rm -q notice/fr.html notice/en.html
attend_passe "témoin : les deux notices supprimées sans FadeBeat.html passent" "$R" "$R"

# 5.3 notice renommée sans toucher l'appli
R=$(new_repo); git -C "$R" mv notice/fr.html notice/fr-FR.html; git -C "$R" add -A
attend_passe "témoin : notice/fr.html renommée sans FadeBeat.html passe" "$R" "$R"

# 5.4 notice supprimée puis RÉÉCRITE avec du vrai contenu : c'est bien une mise à jour
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" rm -q notice/fr.html; mkdir -p "$R/notice"
printf 'notice fr v2 : reecrite entierement\nligne 2\nligne 3\n' > "$R/notice/fr.html"
modif "$R/notice/en.html"; git -C "$R" add -A
attend_passe "témoin : notice/fr.html supprimée puis RÉÉCRITE avec du contenu + en modifiée passe" "$R" "$R"

# 5.5 les deux réécrites de fond en comble
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" rm -q notice/fr.html notice/en.html; mkdir -p "$R/notice"
printf 'notice fr v2 reecrite\nligne 2\n' > "$R/notice/fr.html"
printf 'notice en v2 rewritten\nline 2\n' > "$R/notice/en.html"
git -C "$R" add -A
attend_passe "témoin : les deux notices supprimées puis RÉÉCRITES avec du contenu passent" "$R" "$R"

# 5.6 une suppression quelconque à côté d'un commit régulier ne doit pas bloquer
R=$(new_repo); modif "$R/FadeBeat.html"; modif "$R/notice/fr.html"; modif "$R/notice/en.html"
git -C "$R" rm -q README.md; git -C "$R" add -A
attend_passe "témoin : FadeBeat.html + deux notices + suppression de README.md passe" "$R" "$R"

# 5.7 suppression de voisins de nom sous notice/ (ce ne sont pas les notices)
R=$(new_repo); ajoute_au_base "$R" "notice/fr.html.bak"; ajoute_au_base "$R" "notice/figs/schema.png"
modif "$R/FadeBeat.html"; modif "$R/notice/fr.html"; modif "$R/notice/en.html"
git -C "$R" rm -q notice/fr.html.bak notice/figs/schema.png; git -C "$R" add -A
attend_passe "témoin : FadeBeat.html + deux notices + suppression de notice/fr.html.bak et notice/figs/ passe" "$R" "$R"

# 5.8 ajout d'une notice supplémentaire
R=$(new_repo); modif "$R/FadeBeat.html"; modif "$R/notice/fr.html"; modif "$R/notice/en.html"
printf 'de\n' > "$R/notice/de.html"; git -C "$R" add -A
attend_passe "témoin : FadeBeat.html + deux notices + ajout de notice/de.html passe" "$R" "$R"

# 5.9 échappatoire : suppression assumée, avec la phrase qui le dit
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" rm -q notice/fr.html notice/en.html
git -C "$R" add -- FadeBeat.html
NOTICE_INCHANGEE=1 attend_passe "témoin : NOTICE_INCHANGEE=1 laisse passer FadeBeat.html + notices supprimées" "$R" "$R"
if grep -i 'notice' "$OUT" | grep -Eqi 'pas |non |inchang|sans '; then
  note 0 "échappatoire (notices supprimées) : le hook écrit que la notice n'a pas été mise à jour"
else
  note 1 "échappatoire (notices supprimées) : le hook écrit que la notice n'a pas été mise à jour" "sortie: $(tr '\n' '|' < "$OUT" | cut -c1-160)"
fi

# 5.10 échappatoire : une supprimée, une modifiée
R=$(new_repo); modif "$R/FadeBeat.html"; git -C "$R" rm -q notice/fr.html; modif "$R/notice/en.html"; git -C "$R" add -A
NOTICE_INCHANGEE=1 attend_passe "témoin : NOTICE_INCHANGEE=1 passe avec fr supprimée et en modifiée" "$R" "$R"

# 5.11 après tout ce qui précède, le cas nominal doit toujours passer
R=$(new_repo); modif "$R/FadeBeat.html"; modif "$R/notice/fr.html"; modif "$R/notice/en.html"; git -C "$R" add -A
attend_passe "témoin : le cas nominal (FadeBeat.html + fr + en modifiées) passe encore" "$R" "$R"

# ================================================================ total
echo "$PASS/$TOTAL"
[ "$PASS" -eq "$TOTAL" ]
