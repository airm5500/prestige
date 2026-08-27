-- =====================================================================
-- Ventes ratées : registre des produits demandés mais non vendus.
-- ---------------------------------------------------------------------
-- Chaque demande est une ligne indépendante (pas de panier, pas de
-- fusion physique) : elle garde son client, son téléphone, sa quantité,
-- son motif, son commentaire, son heure et son utilisateur. Un produit
-- inconnu de la base est conservé en saisie libre (désignation + CIP
-- libres) et peut être rattaché plus tard à un produit existant ou créé.
--
-- Le CIP et la désignation sont TOUJOURS copiés au moment de la saisie,
-- même quand le produit est connu : l'historique reste compréhensible
-- si la fiche produit change ensuite.
--
-- Les motifs sont configurables dans t_motif_vente_ratee (liste initiale
-- de la spécification), modifiables sans toucher au code.
-- =====================================================================

CREATE TABLE IF NOT EXISTS t_motif_vente_ratee (
    lg_MOTIF_ID   varchar(40)  NOT NULL,
    str_LIBELLE   varchar(100) NOT NULL,
    int_PRIORITY  int(11)      NOT NULL DEFAULT 0,
    str_STATUT    varchar(20)  NOT NULL DEFAULT 'enable',
    dt_CREATED    datetime     DEFAULT NULL,
    dt_UPDATED    datetime     DEFAULT NULL,
    PRIMARY KEY (lg_MOTIF_ID)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

INSERT IGNORE INTO t_motif_vente_ratee (lg_MOTIF_ID, str_LIBELLE, int_PRIORITY, str_STATUT, dt_CREATED, dt_UPDATED) VALUES
  ('MVR_RUPTURE',      'Rupture de stock',                    1, 'enable', NOW(), NOW()),
  ('MVR_NON_REF',      'Produit non référencé',               2, 'enable', NOW(), NOW()),
  ('MVR_FOURNISSEUR',  'Indisponibilité chez le fournisseur', 3, 'enable', NOW(), NOW()),
  ('MVR_DELAI',        'Délai trop long',                     4, 'enable', NOW(), NOW()),
  ('MVR_PRIX',         'Prix refusé par le client',           5, 'enable', NOW(), NOW()),
  ('MVR_ARRETE',       'Produit arrêté',                      6, 'enable', NOW(), NOW()),
  ('MVR_ORDONNANCE',   'Ordonnance ou demande incomplète',    7, 'enable', NOW(), NOW()),
  ('MVR_NON_COMMANDE', 'Produit non commandé',                8, 'enable', NOW(), NOW()),
  ('MVR_AUTRE',        'Autre',                               9, 'enable', NOW(), NOW());

CREATE TABLE IF NOT EXISTS t_vente_ratee (
    lg_VENTE_RATEE_ID     varchar(40)  NOT NULL,
    -- produit de la base, facultatif (NULL = saisie libre non rattachée)
    lg_FAMILLE_ID         varchar(40)  DEFAULT NULL,
    -- copies au moment de la saisie (toujours renseignées, même produit connu)
    str_CIP               varchar(40)  DEFAULT NULL,
    str_DESIGNATION       varchar(150) NOT NULL,
    -- désignation normalisée (minuscules, espaces réduits) pour regrouper les
    -- saisies libres malgré la casse et l'espacement
    str_DESIGNATION_NORM  varchar(150) NOT NULL,
    int_QUANTITE          int(11)      NOT NULL DEFAULT 1,
    -- client standard facultatif + téléphone porté par la ligne
    lg_CLIENT_ID          varchar(40)  DEFAULT NULL,
    str_NOM_CLIENT        varchar(120) DEFAULT NULL,
    str_TELEPHONE         varchar(30)  DEFAULT NULL,
    lg_MOTIF_ID           varchar(40)  DEFAULT NULL,
    str_MOTIF             varchar(100) DEFAULT NULL,
    str_COMMENTAIRE       varchar(255) DEFAULT NULL,
    -- suivi de commande : simple indicateur, pas de workflow
    bool_COMMANDE         tinyint(1)   NOT NULL DEFAULT 0,
    dt_COMMANDE           datetime     DEFAULT NULL,
    lg_USER_COMMANDE_ID   varchar(40)  DEFAULT NULL,
    -- rattachement ultérieur d'une saisie libre
    dt_RATTACHEMENT       datetime     DEFAULT NULL,
    lg_USER_RATTACHE_ID   varchar(40)  DEFAULT NULL,
    -- traçabilité de la saisie
    dt_CREATED            datetime     NOT NULL,
    dt_UPDATED            datetime     DEFAULT NULL,
    lg_USER_ID            varchar(40)  DEFAULT NULL,
    str_STATUT            varchar(20)  NOT NULL DEFAULT 'enable',
    PRIMARY KEY (lg_VENTE_RATEE_ID),
    KEY idx_vr_jour (dt_CREATED),
    KEY idx_vr_produit (lg_FAMILLE_ID),
    KEY idx_vr_designation (str_DESIGNATION_NORM),
    KEY idx_vr_commande (bool_COMMANDE)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- ---------------------------------------------------------------------
-- Menu « Ventes ratées » sous SERVICE CLIENT (lg_MENU_ID = '9'), même
-- montage rejouable que V6.9.0/V6.9.6, privilège accordé au compte '00'.
-- ---------------------------------------------------------------------

INSERT INTO t_privilege (lg_PRIVELEGE_ID, str_NAME, str_TYPE, str_DESCRIPTION, str_STATUT, dt_CREATED)
SELECT 'MENU_VENTES_RATEES_20260827', 'P_SM_VENTES_RATEES', 'CUSTOMER',
       'SERVICE CLIENT - Ventes ratees (produits demandes non vendus)', 'enable', NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.lg_PRIVELEGE_ID = 'MENU_VENTES_RATEES_20260827');

INSERT INTO t_sous_menu (lg_SOUS_MENU_ID, str_VALUE, str_DESCRIPTION, str_COMPOSANT, lg_MENU_ID, int_PRIORITY,
                         str_Status, P_KEY, dt_CREATED)
SELECT 'MENU_VENTES_RATEES_20260827', 'Ventes ratées', 'Registre des produits demandes mais non vendus',
       'ventesrateesmanager', '9', 8, 'enable', 'P_SM_VENTES_RATEES', NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_sous_menu s WHERE s.lg_SOUS_MENU_ID = 'MENU_VENTES_RATEES_20260827');

INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED)
SELECT 'MENU_VENTES_RATEES_20260827_R00', '00', 'MENU_VENTES_RATEES_20260827', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege r
                  WHERE r.lg_ROLE_ID = '00' AND r.lg_PRIVILEGE_ID = 'MENU_VENTES_RATEES_20260827');
