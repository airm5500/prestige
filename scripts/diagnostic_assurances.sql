-- ============================================================================
-- DIAGNOSTIC : CLIENTS MELANGES ENTRE ASSURANCES (tiers-payant)
-- ============================================================================
-- A executer dans HeidiSQL sur la base tenena. LECTURE SEULE.
-- Pour chaque requete : exécuter, puis clic droit sur la grille de résultats
-- -> "Exporter les lignes de la grille" (format CSV ou SQL) -> m'envoyer.
--
-- Modele :
--   t_client (cl)                          = le client
--   t_compte_client (ccl)                  = son compte  (lg_CLIENT_ID)
--   t_compte_client_tiers_payant (cctp)    = lien client<->assurance
--                                            (lg_COMPTE_CLIENT_ID, lg_TIERS_PAYANT_ID)
--   t_tiers_payant (tp)                    = l'assurance (str_NAME)
--   t_preenregistrement (p)                = la vente (lg_CLIENT_ID = client de la vente)
--   t_preenregistrement_compte_client_tiers_payent (pcctp)
--                                          = attribution vente<->lien assurance
-- ============================================================================


-- ============================================================================
-- Q1 — ATTRIBUTION CROISEE (le suspect n°1)
-- ----------------------------------------------------------------------------
-- Ventes assurance dont le client de la VENTE differe du client du LIEN
-- assurance utilise. => la vente du client A a ete portee sur l'assurance
-- rattachee au client B. C'est le "client d'une assurance sur une autre".
-- ============================================================================
SELECT p.str_REF                                              AS vente,
       p.dt_CREATED                                           AS le,
       tp.str_NAME                                            AS assurance,
       p.lg_CLIENT_ID                                         AS client_de_la_vente,
       CONCAT(clv.str_FIRST_NAME,' ',clv.str_LAST_NAME)       AS nom_client_vente,
       ccl.lg_CLIENT_ID                                       AS client_du_lien_assurance,
       CONCAT(cll.str_FIRST_NAME,' ',cll.str_LAST_NAME)       AS nom_client_lien,
       pcctp.int_PRICE                                        AS montant,
       pcctp.str_STATUT                                       AS statut_ligne
FROM t_preenregistrement_compte_client_tiers_payent pcctp
JOIN t_preenregistrement p            ON p.lg_PREENREGISTREMENT_ID = pcctp.lg_PREENREGISTREMENT_ID
JOIN t_compte_client_tiers_payant cctp ON cctp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = pcctp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID
JOIN t_compte_client ccl              ON ccl.lg_COMPTE_CLIENT_ID = cctp.lg_COMPTE_CLIENT_ID
JOIN t_client cll                     ON cll.lg_CLIENT_ID = ccl.lg_CLIENT_ID
JOIN t_tiers_payant tp                ON tp.lg_TIERS_PAYANT_ID = cctp.lg_TIERS_PAYANT_ID
LEFT JOIN t_client clv                ON clv.lg_CLIENT_ID = p.lg_CLIENT_ID
WHERE p.lg_CLIENT_ID IS NOT NULL
  AND ccl.lg_CLIENT_ID <> p.lg_CLIENT_ID
ORDER BY p.dt_CREATED DESC;


-- ============================================================================
-- Q2 — LIENS EN DOUBLE (meme client, meme assurance, plusieurs liens actifs)
-- ----------------------------------------------------------------------------
-- Peut provoquer des confusions d'attribution / d'affichage.
-- ============================================================================
SELECT ccl.lg_CLIENT_ID                                       AS client_id,
       CONCAT(cl.str_FIRST_NAME,' ',cl.str_LAST_NAME)         AS client,
       tp.str_NAME                                            AS assurance,
       COUNT(*)                                               AS nb_liens_actifs,
       GROUP_CONCAT(cctp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID)    AS liens
FROM t_compte_client_tiers_payant cctp
JOIN t_compte_client ccl ON ccl.lg_COMPTE_CLIENT_ID = cctp.lg_COMPTE_CLIENT_ID
JOIN t_client cl         ON cl.lg_CLIENT_ID = ccl.lg_CLIENT_ID
JOIN t_tiers_payant tp   ON tp.lg_TIERS_PAYANT_ID = cctp.lg_TIERS_PAYANT_ID
WHERE cctp.str_STATUT = 'enable'
GROUP BY ccl.lg_CLIENT_ID, client, tp.str_NAME
HAVING COUNT(*) > 1
ORDER BY nb_liens_actifs DESC;


-- ============================================================================
-- Q3 — UN COMPTE CLIENT PARTAGE PAR PLUSIEURS CLIENTS (corruption du lien)
-- ----------------------------------------------------------------------------
-- Normalement un compte = un client. Si un meme lg_COMPTE_CLIENT_ID est
-- reference par des ventes de clients differents, tout ce qui est rattache a
-- ce compte (dont les assurances) se "melange" entre ces clients.
-- ============================================================================
SELECT cctp.lg_COMPTE_CLIENT_ID                               AS compte_client,
       COUNT(DISTINCT ccl.lg_CLIENT_ID)                       AS nb_clients_distincts,
       GROUP_CONCAT(DISTINCT ccl.lg_CLIENT_ID)                AS clients
FROM t_compte_client_tiers_payant cctp
JOIN t_compte_client ccl ON ccl.lg_COMPTE_CLIENT_ID = cctp.lg_COMPTE_CLIENT_ID
GROUP BY cctp.lg_COMPTE_CLIENT_ID
HAVING COUNT(DISTINCT ccl.lg_CLIENT_ID) > 1;


-- ============================================================================
-- Q4 — VUE D'ENSEMBLE : nb de clients distincts par assurance
-- ----------------------------------------------------------------------------
-- Pour reperer une assurance qui aurait un nombre de clients anormal.
-- (informatif, pas une anomalie en soi)
-- ============================================================================
SELECT tp.lg_TIERS_PAYANT_ID                                  AS assurance_id,
       tp.str_NAME                                            AS assurance,
       COUNT(DISTINCT ccl.lg_CLIENT_ID)                       AS nb_clients,
       COUNT(*)                                               AS nb_liens
FROM t_compte_client_tiers_payant cctp
JOIN t_compte_client ccl ON ccl.lg_COMPTE_CLIENT_ID = cctp.lg_COMPTE_CLIENT_ID
JOIN t_tiers_payant tp   ON tp.lg_TIERS_PAYANT_ID = cctp.lg_TIERS_PAYANT_ID
WHERE cctp.str_STATUT = 'enable'
GROUP BY tp.lg_TIERS_PAYANT_ID, tp.str_NAME
ORDER BY nb_clients DESC;


-- ============================================================================
-- Q5 — INSPECTION D'UN CAS CONCRET (remplacer le nom)
-- ----------------------------------------------------------------------------
-- Toutes les assurances rattachees a un client precis + ses ventes assurance.
-- Remplacer 'NOM DU CLIENT' par le client concerne.
-- ============================================================================
SELECT cl.lg_CLIENT_ID                                        AS client_id,
       CONCAT(cl.str_FIRST_NAME,' ',cl.str_LAST_NAME)         AS client,
       tp.str_NAME                                            AS assurance,
       cctp.str_STATUT                                        AS statut_lien,
       cctp.int_PRIORITY                                      AS priorite,
       cctp.b_IS_RO AS ro, cctp.b_IS_RC1 AS rc1, cctp.b_IS_RC2 AS rc2,
       cctp.dt_CREATED, cctp.dt_UPDATED
FROM t_client cl
JOIN t_compte_client ccl              ON ccl.lg_CLIENT_ID = cl.lg_CLIENT_ID
JOIN t_compte_client_tiers_payant cctp ON cctp.lg_COMPTE_CLIENT_ID = ccl.lg_COMPTE_CLIENT_ID
JOIN t_tiers_payant tp                ON tp.lg_TIERS_PAYANT_ID = cctp.lg_TIERS_PAYANT_ID
WHERE CONCAT(cl.str_FIRST_NAME,' ',cl.str_LAST_NAME) LIKE '%NOM DU CLIENT%'
ORDER BY cl.lg_CLIENT_ID, cctp.int_PRIORITY;


-- ============================================================================
-- REGLE METIER (confirmee) : un client a UN SEUL RO (regime obligatoire) actif
-- a la fois, et peut avoir autant de complementaires (RC) actives que voulu.
-- => Un compte avec plusieurs assurances DISTINCTES n'est PAS forcement une
--    anomalie (1 RO + N complementaires est legitime).
-- => La vraie anomalie = PLUSIEURS RO actifs sur le meme compte (Q7).
-- ============================================================================


-- ============================================================================
-- Q6 — INFORMATIF : comptes rattaches a PLUSIEURS assurances DISTINCTES
-- ----------------------------------------------------------------------------
-- ATTENTION : sur-compte au regard de la regle metier. Un compte peut avoir
-- 1 RO + plusieurs complementaires en toute legitimite. Utiliser la colonne
-- nb_ro pour reperer les vrais cas problematiques (nb_ro > 1). Q7 isole
-- directement ces cas.
-- ============================================================================
SELECT ccl.lg_COMPTE_CLIENT_ID                                   AS compte,
       CONCAT(cl.str_FIRST_NAME,' ',cl.str_LAST_NAME)            AS client,
       COUNT(DISTINCT cctp.lg_TIERS_PAYANT_ID)                   AS nb_assurances_distinctes,
       SUM(CASE WHEN cctp.b_IS_RO = 1 THEN 1 ELSE 0 END)         AS nb_ro,
       GROUP_CONCAT(DISTINCT tp.str_NAME ORDER BY tp.str_NAME SEPARATOR ' | ') AS assurances
FROM t_compte_client_tiers_payant cctp
JOIN t_compte_client ccl ON ccl.lg_COMPTE_CLIENT_ID = cctp.lg_COMPTE_CLIENT_ID
JOIN t_client cl         ON cl.lg_CLIENT_ID = ccl.lg_CLIENT_ID
JOIN t_tiers_payant tp   ON tp.lg_TIERS_PAYANT_ID = cctp.lg_TIERS_PAYANT_ID
WHERE cctp.str_STATUT = 'enable'
GROUP BY ccl.lg_COMPTE_CLIENT_ID, client
HAVING COUNT(DISTINCT cctp.lg_TIERS_PAYANT_ID) > 1
ORDER BY nb_assurances_distinctes DESC;

-- Q6bis — comptage global (une seule ligne : ampleur du phenomene)
SELECT COUNT(*) AS nb_comptes_multi_assurances FROM (
  SELECT cctp.lg_COMPTE_CLIENT_ID
  FROM t_compte_client_tiers_payant cctp
  WHERE cctp.str_STATUT = 'enable'
  GROUP BY cctp.lg_COMPTE_CLIENT_ID
  HAVING COUNT(DISTINCT cctp.lg_TIERS_PAYANT_ID) > 1
) x;


-- ============================================================================
-- Q7 — LA VRAIE ANOMALIE : comptes avec PLUSIEURS RO actifs (viole la regle)
-- ----------------------------------------------------------------------------
-- C'est le cœur du melange : le flux de vente (updateOrCreateClientAssurance /
-- updateOrCreateClientCarnet) cree un nouveau lien RO sans desactiver l'ancien.
-- Le client apparait alors comme client RO de DEUX assurances a la fois.
-- Un compte ne devrait JAMAIS avoir nb_ro_actifs > 1.
-- ============================================================================
SELECT ccl.lg_COMPTE_CLIENT_ID                                   AS compte,
       CONCAT(cl.str_FIRST_NAME,' ',cl.str_LAST_NAME)            AS client,
       COUNT(*)                                                  AS nb_ro_actifs,
       GROUP_CONCAT(tp.str_NAME ORDER BY cctp.dt_CREATED SEPARATOR ' | ') AS assurances_ro,
       GROUP_CONCAT(cctp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID ORDER BY cctp.dt_CREATED SEPARATOR ' | ') AS liens_ro
FROM t_compte_client_tiers_payant cctp
JOIN t_compte_client ccl ON ccl.lg_COMPTE_CLIENT_ID = cctp.lg_COMPTE_CLIENT_ID
JOIN t_client cl         ON cl.lg_CLIENT_ID = ccl.lg_CLIENT_ID
JOIN t_tiers_payant tp   ON tp.lg_TIERS_PAYANT_ID = cctp.lg_TIERS_PAYANT_ID
WHERE cctp.str_STATUT = 'enable'
  AND cctp.b_IS_RO = 1
GROUP BY ccl.lg_COMPTE_CLIENT_ID, client
HAVING COUNT(*) > 1
ORDER BY nb_ro_actifs DESC;

-- Q7bis — comptage global des comptes en infraction (ampleur reelle)
SELECT COUNT(*) AS nb_comptes_multi_ro FROM (
  SELECT cctp.lg_COMPTE_CLIENT_ID
  FROM t_compte_client_tiers_payant cctp
  WHERE cctp.str_STATUT = 'enable' AND cctp.b_IS_RO = 1
  GROUP BY cctp.lg_COMPTE_CLIENT_ID
  HAVING COUNT(*) > 1
) x;
