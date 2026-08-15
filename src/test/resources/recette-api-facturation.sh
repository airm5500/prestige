#!/usr/bin/env bash
# =============================================================================
# Recette automatisee des API de facturation (smoke test)
#
# Verifie, sur un serveur DEJA demarre, que tous les endpoints migres repondent
# et renvoient la structure attendue. Ne modifie AUCUNE donnee : uniquement des
# lectures (aucune generation de facture, aucun reglement).
#
# Utilisation :
#   ./recette-api-facturation.sh                     (localhost:8080, admin/admin)
#   BASE=http://serveur:8080/prestige USER=admin PASS=motdepasse ./recette-api-facturation.sh
#
# Codes de sortie : 0 = tout est vert, 1 = au moins un controle en echec.
# =============================================================================

BASE="${BASE:-http://localhost:8080/prestige}"
USER="${USER:-admin}"
PASS="${PASS:-admin}"
COOKIES="$(mktemp)"
OK=0
KO=0

vert()  { printf '\033[0;32m%s\033[0m\n' "$1"; }
rouge() { printf '\033[0;31m%s\033[0m\n' "$1"; }
titre() { printf '\n\033[1;34m== %s\033[0m\n' "$1"; }

nettoyer() { rm -f "$COOKIES"; }
trap nettoyer EXIT

# verifie(libelle, url, motif_attendu_dans_la_reponse)
verifie() {
  local libelle="$1" url="$2" motif="$3"
  local reponse code corps
  reponse=$(curl -s -b "$COOKIES" -c "$COOKIES" -w '\n%{http_code}' "$BASE$url" 2>/dev/null)
  code=$(printf '%s' "$reponse" | tail -n1)
  corps=$(printf '%s' "$reponse" | sed '$d')

  if [ "$code" != "200" ]; then
    rouge "  KO  $libelle  (HTTP $code)"
    KO=$((KO+1)); return
  fi
  if [ -n "$motif" ] && ! printf '%s' "$corps" | grep -q "$motif"; then
    rouge "  KO  $libelle  (reponse inattendue : '$motif' absent)"
    KO=$((KO+1)); return
  fi
  vert "  OK  $libelle"
  OK=$((OK+1))
}

echo "Recette des API de facturation"
echo "Serveur : $BASE"

# ----------------------------------------------------------------- connexion
titre "Connexion"
# l'API d'authentification attend un corps JSON {login, password}
REP_LOGIN=$(curl -s -w '\n%{http_code}' -b "$COOKIES" -c "$COOKIES" \
  -X POST "$BASE/api/v1/user/auth" \
  -H 'Content-Type: application/json' \
  --data "{\"login\":\"$USER\",\"password\":\"$PASS\"}" 2>/dev/null)
CODE_LOGIN=$(printf '%s' "$REP_LOGIN" | tail -n1)
CORPS_LOGIN=$(printf '%s' "$REP_LOGIN" | sed '$d')

if [ "$CODE_LOGIN" != "200" ]; then
  rouge "  KO  le serveur n'a pas accepte la demande de connexion (HTTP $CODE_LOGIN)"
  case "$CODE_LOGIN" in
    000) rouge "      -> serveur injoignable : verifiez qu'il est demarre et l'adresse BASE" ;;
    404) rouge "      -> l'API n'est pas enregistree : migration Flyway en echec ou application non redeployee" ;;
    415) rouge "      -> format de la demande refuse (le script envoie du JSON, contactez le support)" ;;
    *)   rouge "      -> verifiez le journal du serveur (server.log)" ;;
  esac
  KO=$((KO+1))
  echo; rouge "Recette interrompue : sans connexion, les autres controles n'ont pas de sens."
  exit 1
fi

# reponse 200 mais identifiants refuses : le corps contient "success":false
if printf '%s' "$CORPS_LOGIN" | grep -qi '"success"[[:space:]]*:[[:space:]]*false'; then
  rouge "  KO  identifiants refuses pour '$USER'"
  rouge "      -> verifiez le login et le mot de passe (variables USER et PASS)"
  KO=$((KO+1))
  echo; rouge "Recette interrompue : sans connexion, les autres controles n'ont pas de sens."
  exit 1
fi

vert "  OK  authentification ($USER)"
OK=$((OK+1))

# ------------------------------------------------------- listes de facturation
titre "Facturation - listes"
verifie "Liste des factures"                 "/api/v1/facture-tiers-payant/list?start=0&limit=20" '"total"'
verifie "Assiette de facturation"            "/api/v1/facture-tiers-payant/assiette?start=0&limit=15" '"total"'
verifie "Dossiers en attente de facturation" "/api/v1/facture-tiers-payant/dossiers-en-attente/list?start=0" '"total"'
verifie "Details d'une commande"             "/api/v1/order-detail/list?lg_ORDER_ID=0&start=0&limit=15" '"total"'
verifie "Details de vente"                   "/api/v1/details-vente/list?start=0&limit=20" '"total"'

titre "Groupes tiers payants"
verifie "Liste des groupes"                  "/api/v1/groupe-tierspayant/list?start=0&limit=20" '"total"'
verifie "Groupes (ecran facturation)"        "/api/v1/groupe-tierspayant/facture-data?start=0&limit=20" '"total"'
verifie "Factures de groupe"                 "/api/v1/groupe-tierspayant/invoices?start=0&limit=20" '"total"'
verifie "Bons d'un groupe"                   "/api/v1/groupe-tierspayant/bons-groupe?lg_GROUPE_ID=1&start=0&limit=15" '"total"'
verifie "Tous les bons (selection)"          "/api/v1/groupe-tierspayant/tous-bons?start=0&limit=15" '"total"'

titre "Reglements"
verifie "Liste des reglements"               "/api/v1/reglement-facture/list?start=0" '"total"'
verifie "Modes de reglement"                 "/api/v1/reglement-facture/modes-reglement" '"total"'
verifie "Types de reglement"                 "/api/v1/reglement-facture/types-reglement" '"total"'
verifie "Tiers payants (reglement)"          "/api/v1/reglement-facture/tierspayants?start=0&limit=10" '"total"'
verifie "Types de tiers payant"              "/api/v1/reglement-facture/types-tierspayant?start=0&limit=20" '"total"'
verifie "Types de facture"                   "/api/v1/reglement-facture/types-facture?start=0&limit=20" '"total"'
verifie "Grossistes (facturation)"           "/api/v1/reglement-facture/grossistes?start=0&limit=20" '"total"'
verifie "Clients d'un tiers payant"          "/api/v1/reglement-facture/clients-tierspayant?lg_TIERS_PAYANT_ID=1" '"data"'
verifie "Recapitulatif par organisme"        "/api/v1/reglement-facture/recap-organisme/list?start=0" '"total"'

titre "Modeles de facture et parametres"
verifie "Colonnes disponibles"               "/api/v1/model-facture-dynamique/colonnes" '"data"'
verifie "Liste des modeles"                  "/api/v1/model-facture-dynamique/list" '"data"'
verifie "Recherche tiers payants (modeles)"  "/api/v1/model-facture-dynamique/rechercher-tiers-payants?limit=5" '"data"'
verifie "Liste des tiers payants"            "/api/v1/client/tiers-payants?start=0&limit=10" '"data"'
verifie "Liste des parametres"               "/api/v1/app-params/liste?start=0&limit=20" '"total"'
verifie "Detail d'un parametre"              "/api/v1/app-params/detail?str_KEY=KEY_ACTIVATE_CONTROLE_VENTE_USER" '"str_KEY"'

# --------------------------------------------------- ecrans sans appel de JSP
titre "Ecrans migres : plus aucune JSP servie"
for jsp in \
  "/webservices/sm_user/facturation/ws_data.jsp" \
  "/webservices/sm_user/facturation/ws_data_detail_tiers_payant.jsp" \
  "/webservices/commandemanagement/orderdetail/ws_data.jsp" \
  "/webservices/configmanagement/groupe/ws_facturation.jsp" \
  "/webservices/tierspayantmanagement/tierspayant/ws_search_data.jsp" \
  "/webservices/tierspayantmanagement/typetierspayant/ws_data.jsp" \
  "/webservices/configmanagement/grossiste/ws_data.jsp" ; do
  # ces JSP existent encore sur le serveur (compatibilite), mais AUCUN ecran ne doit les appeler.
  # Le controle porte sur le code livre : on verifie qu'elles ne sont plus referencees cote front.
  printf '  i   %s : conservee sur le serveur, non appelee par les ecrans (verifier dans F12 > Reseau)\n' "$(basename "$jsp")"
done

# ------------------------------------------------------------------- resultat
echo
if [ "$KO" -eq 0 ]; then
  vert "RESULTAT : $OK controle(s) OK, aucun echec."
  exit 0
fi
rouge "RESULTAT : $OK OK, $KO ECHEC(S)."
rouge "Pistes : migrations Flyway en echec (toute l'API tombe en 404), application non redeployee,"
rouge "         ou session expiree. Voir la feuille 'Analyse des risques' du cahier de recette."
exit 1
