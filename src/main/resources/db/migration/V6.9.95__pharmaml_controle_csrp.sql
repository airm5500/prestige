-- PharmaML (retours du 07/10) : calcul de l'en-tete Content-PharmaML selon la specification Pharma-ML v4.8, § 4.4.3 :
-- base64(MD5(corps http + identifiant officine complete a 16 caracteres par des « 0 » + cle de 4 caracteres)).
-- Verifie sur la valeur recalculee par DPCI. Remplace le reglage provisoire HMAC_MD5 (V6.9.94) ; un autre reglage
-- choisi volontairement (MD5_CLE_FIN, MD5_CLE_DEBUT, AUCUN) est conserve.
UPDATE t_parameters SET str_VALUE = 'CSRP',
    str_DESCRIPTION = 'PharmaML : calcul de l''en-tete Content-PharmaML (CSRP = specification Pharma-ML ; HMAC_MD5, MD5_CLE_FIN, MD5_CLE_DEBUT, AUCUN)'
WHERE str_KEY = 'KEY_PHARMAML_CONTROLE' AND str_VALUE = 'HMAC_MD5';
INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT) VALUES
('KEY_PHARMAML_CONTROLE', 'CSRP', 'PharmaML : calcul de l''en-tete Content-PharmaML (CSRP = specification Pharma-ML ; HMAC_MD5, MD5_CLE_FIN, MD5_CLE_DEBUT, AUCUN)', 'SYSTEME', 'enable');
