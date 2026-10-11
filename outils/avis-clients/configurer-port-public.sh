#!/bin/sh
# Avis clients : port public dedie sur Payara (a lancer une fois sur le serveur de la pharmacie).
#   - un serveur virtuel « avis » au dossier racine vide : http://IP:PORT/ ne montre rien du serveur ;
#   - une ecoute HTTP sur le port public (8090 par defaut), rattachee a ce serveur virtuel ;
#   - Prestige y est deploye comme sur le port habituel, mais son filtre n'y laisse passer QUE la page d'avis.
# Ensuite : sur la box / le routeur, rediriger le port public vers CE port du serveur (jamais vers 8080),
# puis saisir l'adresse IP publique et le port dans Prestige (AVIS CLIENTS > Réglages et affiche).
# Usage : configurer-port-public.sh [port] [chemin asadmin] [dossier du domaine]
PORT=${1:-8090}
ASADMIN=${2:-/opt/payara5/bin/asadmin}
DOMAINE=${3:-/opt/payara5/glassfish/domains/domain1}
VIDE="$DOMAINE/docroot-avis-vide"
mkdir -p "$VIDE" || exit 1
set -e
$ASADMIN create-virtual-server --hosts '${com.sun.aas.hostName}' --property "docroot=$VIDE" avis
$ASADMIN create-http-listener --listeneraddress 0.0.0.0 --listenerport "$PORT" --defaultvs avis avis-public
$ASADMIN set configs.config.server-config.http-service.virtual-server.avis.network-listeners=avis-public
# pas de page d'erreur du serveur (elle donnerait sa version) ; toute adresse passe par le filtre de Prestige
$ASADMIN set 'configs.config.server-config.http-service.virtual-server.avis.property.errorReportValve='
$ASADMIN set configs.config.server-config.http-service.virtual-server.avis.default-web-module=prestige
$ASADMIN set servers.server.server.application-ref.prestige.virtual-servers=server,avis
echo "Port public $PORT pret : seule la page d'avis y repond (http://IP:$PORT/prestige/avis/?t=...)."
