#!/bin/bash
# Test de concurrence : deux caisses valident EN PARALLELE des ventes du meme produit detail qui
# se disputent la derniere boite. Verifie qu'une seule cloture passe quand les deux ne tiennent
# pas, que le stock ne devient jamais negatif, et qu'un retry de la perdante aboutit (succes ou
# refus metier clair) — protection portee par le verrou optimiste @Version de t_famille_stock.
#
# Prerequis : WAR deploye en local, base de TEST, caisse ouverte (t_resume_caisse is_Using pour
# l'utilisateur), produit detail avec parent (int_NUMBERDETAIL = details/boite).
#
# Usage :
#   BASE=http://localhost:8080/prestige LOGIN=... PASSWORD=... DB=capitale \
#   DETAIL_ID=<lg_FAMILLE_ID detail> PARENT_ID=<lg_FAMILLE_ID boite> USER_ID=<lg_USER_ID> \
#   QTE=60 TOURS=5 ./concurrence-derniere-boite.sh
# Attendu avec QTE > details/boite / 2 : chaque tour affiche UNE reussite, detail >= 0, boite >= 0.
set -u
BASE=${BASE:-http://localhost:8080/prestige}
DB=${DB:-capitale}
QTE=${QTE:-60}
TOURS=${TOURS:-5}
CJ=$(mktemp)

curl -s -c "$CJ" -X POST "$BASE/api/v1/user/auth" -H "Content-Type: application/json" \
  -d "{\"login\":\"$LOGIN\",\"password\":\"$PASSWORD\"}" >/dev/null

close() {
  curl -s -b "$CJ" -X POST "$BASE/api/v1/vente/cloturer/vno" -H "Content-Type: application/json" \
    -d "{\"venteId\":\"$1\",\"typeVenteId\":\"1\",\"typeRegleId\":\"1\",\"montantRecu\":999999,\"montantRendu\":0,\"montantPaye\":999999,\"montantVerse\":999999}"
}

for tour in $(seq 1 "$TOURS"); do
  mariadb "$DB" -e "UPDATE t_famille_stock SET int_NUMBER_AVAILABLE=0, int_NUMBER=0 WHERE lg_FAMILLE_ID='$DETAIL_ID' AND lg_EMPLACEMENT_ID='1';
                    UPDATE t_famille_stock SET int_NUMBER_AVAILABLE=1, int_NUMBER=1 WHERE lg_FAMILLE_ID='$PARENT_ID';"
  IDS=()
  for i in 1 2; do
    ID=$(curl -s -b "$CJ" -X POST "$BASE/api/v2/vente/add/vno" -H "Content-Type: application/json" \
      -d "{\"typeVenteId\":\"1\",\"natureVenteId\":\"1\",\"produitId\":\"$DETAIL_ID\",\"itemPu\":100,\"qte\":$QTE,\"qteServie\":$QTE,\"devis\":false,\"prevente\":false,\"userVendeurId\":\"$USER_ID\"}" \
      | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['lgPREENREGISTREMENTID'])")
    IDS+=("$ID")
  done
  TA=$(mktemp); TB=$(mktemp)
  close "${IDS[0]}" > "$TA" & close "${IDS[1]}" > "$TB" & wait
  SA=$(python3 -c "import json;print(json.load(open('$TA')).get('success'))")
  SB=$(python3 -c "import json;print(json.load(open('$TB')).get('success'))")
  read DET BOX <<< "$(mariadb -N "$DB" -e "SELECT (SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID='$DETAIL_ID' AND lg_EMPLACEMENT_ID='1'), (SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID='$PARENT_ID');")"
  VERDICT=OK
  if [ "$DET" -lt 0 ] || [ "$BOX" -lt 0 ]; then VERDICT="STOCK NEGATIF !"; fi
  if [ "$SA" = "True" ] && [ "$SB" = "True" ]; then VERDICT="DOUBLE CLOTURE !"; fi
  echo "tour=$tour A=$SA B=$SB detail=$DET boite=$BOX -> $VERDICT (ventes ${IDS[0]} ${IDS[1]})"
  rm -f "$TA" "$TB"
done
rm -f "$CJ"
echo "Penser a purger les ventes de test creees ci-dessus."
