
INSERT INTO vente_reglement(id,flag_id,flaged_amount,montant,montant_attentu,vente_id, type_regelement,ug_amount,ug_amount_net,amount_non_ca,mvtDate) 
SELECT LEFT(UUID(), 40) AS id, v.flag_id,(-1)*v.flaged_amount,(-1)*v.montant,(-1)*v.montant_attentu,p.lg_PREENREGISTREMENT_ID, v.type_regelement,(-1)*v.ug_amount,(-1)*v.ug_amount_net,(-1)*v.amount_non_ca,p.dt_UPDATED FROM  vente_reglement
 v join t_preenregistrement p ON v.vente_id=p.lg_PREENGISTREMENT_ANNULE_ID WHERE p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.vente_id FROM  vente_reglement v);