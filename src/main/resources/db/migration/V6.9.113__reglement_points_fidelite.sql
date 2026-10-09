-- Retours du 09/10 (6) : mode de reglement « Points fidelite » a la caisse (le client paie tout ou partie de sa vente
-- avec ses points). Actif seulement quand la fidelite est activee (synchronise par l'ecran Fidelite clients).
INSERT INTO t_type_reglement (lg_TYPE_REGLEMENT_ID, str_NAME, str_DESCRIPTION, str_FLAG, str_STATUT, dt_CREATED,
                              dt_UPDATED, str_CATEGORIE, bool_CLIENT_REQUIS)
SELECT '20', 'Points fidélité', 'Points fidelite', '0',
       IF((SELECT bool_ACTIF FROM t_fidelite_parametre WHERE lg_PARAMETRE_ID = 'FIDELITE') = 1, 'enable', 'disable'),
       NOW(), NOW(), 'FIDELITE', 1
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_type_reglement WHERE lg_TYPE_REGLEMENT_ID = '20');

INSERT INTO t_mode_reglement (lg_MODE_REGLEMENT_ID, str_NAME, str_DESCRIPTION, lg_TYPE_REGLEMENT_ID, dt_CREATED,
                              dt_UPDATED, str_STATUT)
SELECT '20', 'Points fidélité', 'Points fidelite', '20', NOW(), NOW(),
       (SELECT str_STATUT FROM t_type_reglement WHERE lg_TYPE_REGLEMENT_ID = '20')
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_mode_reglement WHERE lg_MODE_REGLEMENT_ID = '20');

