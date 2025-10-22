INSERT INTO vente_exclu  SELECT UUID(), v.created_at,v.modified_at,v.`status`,v.montant_client*(-1),v.montantPaye*(-1) ,v.montantRegle*(-1),
v.montantRemise*(-1),v.montantTiersPayant*(-1),v.montantVente*(-1),v.mvtDate,m.`uuid`,v.type_tiers_payant,v.client_id,p.lg_PREENREGISTREMENT_ID,v.tiersPayant_id,v.type_reglement_id
FROM vente_exclu v JOIN t_preenregistrement p ON v.preenregistrement_id=p.lg_PREENGISTREMENT_ANNULE_ID
JOIN mvttransaction m ON m.vente_id=p.lg_PREENREGISTREMENT_ID
 WHERE v.`status`='DELETE';