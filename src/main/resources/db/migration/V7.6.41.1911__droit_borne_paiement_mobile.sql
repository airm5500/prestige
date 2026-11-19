-- =====================================================================
-- Demande 62 (applications mobiles, 15/11), point 3a : droit P_BORNE_PAIEMENT_MOBILE, « Clôturer une vente payée par
-- mobile money ». Accepté par POST v1/paiements-mobile pour cloturer:true, en plus du droit « Terminer une vente » :
-- le compte de la borne (profil pré-vente) clôture la vente payée sans recevoir la caisse ni les autres clôtures.
-- Donné à aucun rôle : le pharmacien l'attribue au rôle de la borne (Gestion des rôles).
-- Rejouable ; aucune donnée existante modifiée.
-- =====================================================================

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`,
                         `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_BORNE_PAIEMENT_MOBILE', 'CUSTOMER', 'BORNE - Clôturer une vente payée par mobile money',
       NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_BORNE_PAIEMENT_MOBILE');
