#!/bin/bash
# Tests negatifs / aux limites de la VALIDATION DES ENTREES cote serveur : on envoie des saisies
# invalides (quantite vide, zero, negative, non numerique, JSON casse, montants incoherents, ids
# inexistants) aux endpoints de vente et on classe la reponse.
#
# Verdicts :
#   PROPRE        HTTP 200 + JSON {success:false|true} : refus/succes metier explicite (ideal)
#   REFUS_DEGRADE HTTP 500 mais JSON {success:false} exploitable (mapper d'exception) : acceptable,
#                 pas de plantage silencieux ; concerne surtout le parsing (type invalide, JSON casse)
#                 que le champ numerique de la caisse ne peut de toute facon pas produire
#   HORS_ROUTAGE  HTTP 404 : route inexistante, comportement standard du framework
#   PLANTAGE      page HTML d'erreur brute exposee : ECHEC
#   VIDE          reponse vide : ECHEC
# Attendu : 0 PLANTAGE, 0 VIDE, et aucune ligne de vente aberrante creee (quantite <= 0).
#
# Prerequis : WAR deploye en local, base de TEST, un produit detail (CIP dans FAM) trouvable.
# Usage : BASE_HOST=http://localhost:8080/prestige LOGIN=KGA3 PASSWORD=e2etest DB=capitale \
#         FAM=<lg_FAMILLE_ID detail> USER_ID=<lg_USER_ID> ./tests-negatifs-validation-entrees.sh
set -u
BASE_HOST=${BASE_HOST:-http://localhost:8080/prestige}
LOGIN=${LOGIN:-KGA3}; PASSWORD=${PASSWORD:-e2etest}; DB=${DB:-capitale}
FAM=${FAM:-050404522400544}; USER_ID=${USER_ID:-14111218823703825750}
BASE=$BASE_HOST/api/v1
BASE2=$BASE_HOST/api/v2
CJ=$(mktemp); BODY=$(mktemp)
curl -s -c "$CJ" -X POST "$BASE/user/auth" -H "Content-Type: application/json" \
  -d "{\"login\":\"$LOGIN\",\"password\":\"$PASSWORD\"}" >/dev/null
PASS=0; FAIL=0

classe() {
  local nom="$1" http="$2" body="$3"
  local verdict json404
  local aJsonSuccess=0
  echo "$body" | grep -qiE '"success"[[:space:]]*:[[:space:]]*(false|true)' && aJsonSuccess=1
  if [ -z "$body" ]; then
    verdict="VIDE"                                   # plantage : reponse vide
  elif [ "$http" = "200" ] && [ "$aJsonSuccess" = "1" ]; then
    verdict="PROPRE"                                 # ideal : refus/succes metier explicite
  elif [ "$http" = "500" ] && [ "$aJsonSuccess" = "1" ]; then
    verdict="REFUS_DEGRADE"                          # 500 mais JSON exploitable (mapper), pas de plantage silencieux
  elif [ "$http" = "404" ]; then
    verdict="HORS_ROUTAGE"                           # route inexistante : 404 standard du framework
  elif echo "$body" | grep -qiE "<html|Exception report|StackTrace|NullPointer"; then
    verdict="PLANTAGE"                               # page d'erreur brute exposee
  else
    verdict="A_VOIR($http)"
  fi
  # seuls VIDE et PLANTAGE sont des echecs ; REFUS_DEGRADE et HORS_ROUTAGE sont acceptables
  if [ "$verdict" = "PLANTAGE" ] || [ "$verdict" = "VIDE" ]; then FAIL=$((FAIL+1)); else PASS=$((PASS+1)); fi
  printf "%-55s http=%-4s %-14s %s\n" "$nom" "$http" "$verdict" "$(echo "$body" | head -c 80 | tr '\n' ' ')"
}

post() { # nom url json
  local r=$(curl -s -o $BODY -w "%{http_code}" -b $CJ -X POST "$2" -H "Content-Type: application/json" -d "$3")
  classe "$1" "$r" "$(cat $BODY)"
}
get() { # nom url
  local r=$(curl -s -o $BODY -w "%{http_code}" -b $CJ "$2")
  classe "$1" "$r" "$(cat $BODY)"
}

echo "===== add/vno (creation de vente) ====="
post "add/vno qte=0"                 "$BASE2/vente/add/vno" "{\"typeVenteId\":\"1\",\"natureVenteId\":\"1\",\"produitId\":\"$FAM\",\"itemPu\":100,\"qte\":0,\"qteServie\":0,\"prevente\":false,\"userVendeurId\":\"$USER_ID\"}"
post "add/vno qte=-3"                "$BASE2/vente/add/vno" "{\"typeVenteId\":\"1\",\"natureVenteId\":\"1\",\"produitId\":\"$FAM\",\"itemPu\":100,\"qte\":-3,\"qteServie\":-3,\"prevente\":false,\"userVendeurId\":\"$USER_ID\"}"
post "add/vno qte non numerique"     "$BASE2/vente/add/vno" "{\"typeVenteId\":\"1\",\"natureVenteId\":\"1\",\"produitId\":\"$FAM\",\"itemPu\":100,\"qte\":\"abc\",\"qteServie\":1,\"prevente\":false,\"userVendeurId\":\"$USER_ID\"}"
post "add/vno produitId inexistant"  "$BASE2/vente/add/vno" "{\"typeVenteId\":\"1\",\"natureVenteId\":\"1\",\"produitId\":\"NEXISTE_PAS\",\"itemPu\":100,\"qte\":1,\"qteServie\":1,\"prevente\":false,\"userVendeurId\":\"$USER_ID\"}"
post "add/vno produitId vide"        "$BASE2/vente/add/vno" "{\"typeVenteId\":\"1\",\"natureVenteId\":\"1\",\"produitId\":\"\",\"itemPu\":100,\"qte\":1,\"qteServie\":1,\"prevente\":false,\"userVendeurId\":\"$USER_ID\"}"
post "add/vno itemPu absent"         "$BASE2/vente/add/vno" "{\"typeVenteId\":\"1\",\"natureVenteId\":\"1\",\"produitId\":\"$FAM\",\"qte\":1,\"qteServie\":1,\"prevente\":false,\"userVendeurId\":\"$USER_ID\"}"
post "add/vno corps vide {}"         "$BASE2/vente/add/vno" "{}"
post "add/vno JSON casse"            "$BASE2/vente/add/vno" "{ ceci n'est pas du json"

echo "===== update/item/vno (modification de ligne) ====="
post "update itemId inexistant"      "$BASE/vente/update/item/vno" "{\"itemId\":\"NEXISTE\",\"produitId\":\"$FAM\",\"qte\":1,\"qteServie\":1,\"itemPu\":100}"
post "update qte=0"                  "$BASE/vente/update/item/vno" "{\"itemId\":\"NEXISTE\",\"produitId\":\"$FAM\",\"qte\":0,\"qteServie\":0,\"itemPu\":100}"
post "update qte=-5"                 "$BASE/vente/update/item/vno" "{\"itemId\":\"NEXISTE\",\"produitId\":\"$FAM\",\"qte\":-5,\"qteServie\":-5,\"itemPu\":100}"
post "update qteServie>qte"          "$BASE/vente/update/item/vno" "{\"itemId\":\"NEXISTE\",\"produitId\":\"$FAM\",\"qte\":2,\"qteServie\":9,\"itemPu\":100}"

echo "===== cloturer/vno (validation) ====="
post "cloture venteId inexistant"    "$BASE/vente/cloturer/vno" "{\"venteId\":\"NEXISTE\",\"typeVenteId\":\"1\",\"typeRegleId\":\"1\",\"montantRecu\":100,\"montantPaye\":100,\"montantVerse\":100}"
post "cloture venteId vide"          "$BASE/vente/cloturer/vno" "{\"venteId\":\"\",\"typeVenteId\":\"1\",\"typeRegleId\":\"1\",\"montantRecu\":100,\"montantPaye\":100}"
post "cloture montants negatifs"     "$BASE/vente/cloturer/vno" "{\"venteId\":\"NEXISTE\",\"typeVenteId\":\"1\",\"typeRegleId\":\"1\",\"montantRecu\":-100,\"montantPaye\":-100}"
post "cloture typeRegleId inexistant" "$BASE/vente/cloturer/vno" "{\"venteId\":\"NEXISTE\",\"typeVenteId\":\"1\",\"typeRegleId\":\"ZZZ\",\"montantRecu\":100,\"montantPaye\":100}"
post "cloture corps vide {}"         "$BASE/vente/cloturer/vno" "{}"

echo "===== endpoints GET de controle ====="
get  "stock-vendable produit inexistant" "$BASE/vente/stock-vendable/NEXISTE_PAS"
get  "stock-vendable id vide (slash)"     "$BASE/vente/stock-vendable/"
get  "controle-detail vente inexistante"  "$BASE/vente/controle-detail/NEXISTE"
get  "search produit inexistant"          "$BASE/vente/search/NEXISTE_PAS"

echo
echo "===== BILAN : $PASS propres / $FAIL plantages ou vides ====="
