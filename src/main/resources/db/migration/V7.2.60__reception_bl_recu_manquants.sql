-- =====================================================================
-- Demande 59 (plan du 08/11) : RECEPTION BL, ENTRER SEULEMENT LE RECU ; RETOUR DES MANQUANTS SANS SORTIE DE STOCK.
-- Idempotente : peut etre rejouee sans rien changer.
-- =====================================================================

-- BL entre au reçu (PUT v1/commande/validerbl/{id}?mode=RECU) : total des boites manquantes a la cloture.
-- NULL = BL clos par les modes actuels (tout entre). Lu par GET v1/reception/{blId}/ecarts, l'etat de controle des
-- achats et POST v1/reception/{blId}/retour-manquants.
ALTER TABLE t_bon_livraison
    ADD COLUMN IF NOT EXISTS int_MANQUANT_RECEPTION INT NULL;

-- Retour fournisseur des manquants : reclamation SANS mouvement de stock (les boites ne sont jamais entrees).
-- 0 = retour classique (sa validation sort du stock, inchange).
ALTER TABLE t_retour_fournisseur
    ADD COLUMN IF NOT EXISTS bool_SANS_SORTIE_STOCK TINYINT(1) NOT NULL DEFAULT 0;

-- Motif « Manquant » des lignes d'un retour des manquants.
INSERT INTO t_motif_retour (lg_MOTIF_RETOUR, str_CODE, str_LIBELLE, str_STATUT, dt_CREATED, dt_UPDATED)
SELECT 'MANQUANT', 'MQ', 'Manquant', 'enable', NOW(), NOW()
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_motif_retour m WHERE m.lg_MOTIF_RETOUR = 'MANQUANT');
