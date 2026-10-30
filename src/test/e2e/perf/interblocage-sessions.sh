#!/usr/bin/env bash
# INTERBLOCAGE DU JOURNAL DES CONNEXIONS (rapport docs/notices/RAPPORT_CHARGE_2026-10-29.md, par. 4.6).
#
# RhServiceImpl.ouvrirSession clot d'abord les sessions restees ouvertes du meme utilisateur, puis ajoute la nouvelle :
#   UPDATE t_session_utilisateur ... WHERE lg_USER_ID = ? AND fin IS NULL AND ip = ?   puis   INSERT ...
# En lecture repetable, l'UPDATE parcourt ix_session_user et verrouille aussi l'intervalle qui suit les lignes de
# l'utilisateur. Deux connexions au meme instant prennent chacune ce verrou d'intervalle (ils ne s'excluent pas), puis
# chacune veut inserer dans l'intervalle que l'autre tient : MariaDB annule l'une des deux, et la connexion n'est pas
# journalisee.
#
# Ce script rejoue les deux ordres, a l'identique, dans deux transactions entrelacees (T1 : UPDATE ... pause ... INSERT ;
# T2 : pause ... UPDATE ... INSERT), sur une base jetable qu'il cree et supprime lui-meme :
#   - AVANT : les ordres d'avant la correction ;
#   - APRES : la correction (lecture simple des identifiants ouverts, puis UPDATE par cle primaire) : aucun.
# Quatre cas : premiere connexion d'un compte ou de deux comptes voisins (interblocage avant), session ouverte et
# sessions fermees (pas d'interblocage avant, il ne doit pas en apparaitre).
#
# A lancer sur une instance MariaDB d'essai, jamais sur une base de l'officine : la base essai_interblocage y est creee
# puis supprimee. Exemple (instance jetable sur le port 3319, root sans mot de passe) :
#   MARIADB="mariadb -h127.0.0.1 -P3319 -uroot" bash src/test/e2e/perf/interblocage-sessions.sh
# Code de sortie 1 si la version APRES s'interbloque, ou si la version AVANT ne s'interbloque plus (essai inoperant).
set -u
MARIADB=${MARIADB:?"client et options de l'instance d'essai, ex. MARIADB=\"mariadb -h127.0.0.1 -P3319 -uroot\""}
DB=essai_interblocage
PAUSE=${PAUSE:-1}
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"; $MARIADB -e "DROP DATABASE IF EXISTS $DB" >/dev/null 2>&1' EXIT

sql() { $MARIADB -N -B "$DB" -e "$1"; }

preparer() {
  $MARIADB -e "DROP DATABASE IF EXISTS $DB; CREATE DATABASE $DB" || exit 2
  # table de la migration V6.9.84__rh_socle.sql
  sql "CREATE TABLE t_session_utilisateur (
    id VARCHAR(40) NOT NULL, lg_USER_ID VARCHAR(40) NOT NULL, session_http VARCHAR(100) NULL,
    debut DATETIME NOT NULL, fin DATETIME NULL, fin_par VARCHAR(20) NULL, poste VARCHAR(100) NULL, ip VARCHAR(60) NULL,
    PRIMARY KEY (id), KEY ix_session_user (lg_USER_ID, debut), KEY ix_session_http (session_http),
    KEY ix_session_debut (debut)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3" || exit 2
  sql "$1"
}

# ordres de RhServiceImpl.ouvrirSession pour l'utilisateur $2, version $1
ordres() {
  local u=$2 nouvel="INSERT INTO t_session_utilisateur (id, lg_USER_ID, session_http, debut, poste, ip)
      VALUES (UUID(), '$2', UUID(), NOW(), 'poste', '127.0.0.1');"
  if [ "$1" = AVANT ]; then
    echo "UPDATE t_session_utilisateur SET fin = NOW(), fin_par = 'NOUVELLE_CONNEXION'
      WHERE lg_USER_ID = '$u' AND fin IS NULL AND COALESCE(ip, '') = COALESCE('127.0.0.1', '');"
  else
    # lecture simple (sans verrou), puis UPDATE par cle primaire : aucun verrou d'intervalle
    # SELECT ... INTO, lecture simple comme dans le code Java : un SET @x := (SELECT ...) poserait des verrous partages
    echo "SELECT GROUP_CONCAT(QUOTE(id)) INTO @ids FROM t_session_utilisateur
      WHERE lg_USER_ID = '$u' AND fin IS NULL AND COALESCE(ip, '') = COALESCE('127.0.0.1', '');
    SET @q := IF(@ids IS NULL, 'DO 0', CONCAT('UPDATE t_session_utilisateur SET fin = NOW(), fin_par = ''NOUVELLE_CONNEXION''',
      ' WHERE id IN (', @ids, ') AND fin IS NULL'));
    PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;"
  fi
  echo "\$PAUSE_ICI $nouvel"
}

# T1 : ordre 1, pause 2 s, ordre 2 ; T2 : pause 1 s, ordres 1 et 2. Renvoie le nombre d'interblocages.
rejouer() {
  local version=$1 u1=$2 u2=$3
  local t1 t2
  t1="SET innodb_lock_wait_timeout = 10; START TRANSACTION; $(ordres "$version" "$u1" | sed "s/\$PAUSE_ICI/DO SLEEP($((PAUSE * 2)));/") COMMIT;"
  t2="SET innodb_lock_wait_timeout = 10; DO SLEEP($PAUSE); START TRANSACTION; $(ordres "$version" "$u2" | sed 's/\$PAUSE_ICI//') COMMIT;"
  sql "$t1" >"$TMP/t1" 2>&1 & local p1=$!
  sql "$t2" >"$TMP/t2" 2>&1 & local p2=$!
  wait $p1 $p2
  cat "$TMP/t1" "$TMP/t2" | grep -c 'Deadlock'
}

echec=0
# $1 nom, $2 lignes de depart, $3 et $4 utilisateurs de T1 et T2, $5 interblocage attendu AVANT (1 ou 0),
# $6 sessions ouvertes attendues APRES
essai() {
  local nom=$1 initial=$2 u1=$3 u2=$4
  for v in AVANT APRES; do
    preparer "$initial"
    local n; n=$(rejouer "$v" "$u1" "$u2")
    local lignes; lignes=$(sql "SELECT COUNT(*) FROM t_session_utilisateur WHERE fin IS NULL")
    echo "$nom, $v : $n interblocage(s), $lignes session(s) ouverte(s)"
    if [ "$v" = AVANT ] && [ "$5" -eq 1 ] && [ "$n" -eq 0 ]; then echo "   ! la version AVANT ne s'interbloque pas : essai inoperant"; echec=1; fi
    if [ "$v" = APRES ] && [ "$n" -ne 0 ]; then echo "   ! interblocage apres correction"; echec=1; fi
    if [ "$v" = APRES ] && [ "$n" -eq 0 ] && [ "$lignes" -ne "$6" ]; then echo "   ! $lignes session(s) ouverte(s), $6 attendue(s)"; echec=1; fi
  done
}

# premiere connexion d'un compte, deux postes au meme instant : le cas de l'essai de charge
essai "meme utilisateur, aucune ligne" "DO 0" U1 U1 1 2
essai "deux utilisateurs voisins, aucune ligne" "DO 0" U1 U2 1 2
# cas sans interblocage avant la correction : ils ne doivent pas en avoir apres. Avec une session ouverte, la seconde
# connexion attendait la premiere puis la fermait ; elle ne la voit plus (lecture faite avant), les deux restent ouvertes
# jusqu'a leur deconnexion, comme deux onglets.
essai "meme utilisateur, une session ouverte" \
  "INSERT INTO t_session_utilisateur VALUES ('a', 'U1', 'h', NOW() - INTERVAL 1 HOUR, NULL, NULL, 'p', '127.0.0.1')" U1 U1 0 2
essai "deux utilisateurs voisins, sessions fermees" \
  "INSERT INTO t_session_utilisateur VALUES ('a', 'U1', 'h1', NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 20 HOUR, 'DECONNEXION', 'p', '127.0.0.1'),
          ('b', 'U2', 'h2', NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 20 HOUR, 'DECONNEXION', 'p', '127.0.0.1')" U1 U2 0 2
[ $echec -eq 0 ] && echo OK || echo ECHEC
exit $echec
