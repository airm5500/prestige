-- PharmaML (retours du 07/10) : DPCI repond « Elément de contrôle (Content-PharmaML) absent » (statut 11).
-- L'en-tete HTTP Content-PharmaML porte une empreinte du message calculee avec la cle de l'officine chez le grossiste
-- (t_grossiste.str_CLE_RECEPTEUR), encodee en base64. Mode de calcul reglable tant que la specification du
-- repartiteur n'est pas confirmee : HMAC_MD5 (defaut), MD5_CLE_FIN, MD5_CLE_DEBUT, AUCUN (aucun en-tete).
-- Sans cle sur la fiche grossiste, aucun en-tete n'est envoye (comportement d'avant).
INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT) VALUES
('KEY_PHARMAML_CONTROLE', 'HMAC_MD5', 'PharmaML : calcul de l''en-tete Content-PharmaML avec la cle du grossiste (HMAC_MD5, MD5_CLE_FIN, MD5_CLE_DEBUT, AUCUN)', 'SYSTEME', 'enable');
