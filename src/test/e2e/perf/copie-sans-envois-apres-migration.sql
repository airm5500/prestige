-- COUPURE DES ENVOIS DANS UNE COPIE DE BASE D'OFFICINE : COMPLEMENT APRES LA MIGRATION (tables creees en 6.9.x).
-- A passer UNIQUEMENT sur une copie, juste apres le premier demarrage (voir copie-sans-envois-avant-migration.sql).

UPDATE t_grossiste SET str_URL_PHARMAML = NULL, str_URL_PHARMAML_SECOURS = NULL;
UPDATE whatsapp_compte SET actif = 0, mode_test = 1, access_token = NULL, web_jeton = NULL, web_url = NULL;
UPDATE t_pharmaml_attente SET str_STATUT = 'ANNULE_TEST' WHERE str_STATUT = 'EN_ATTENTE';
UPDATE notification SET statut = 'LOCK' WHERE statut = 'NOT_SEND';
UPDATE categorie_notification SET canal = 'EMAIL_MASSE' WHERE canal IN ('EMAIL', 'SMS_EMAIL');
DELETE FROM sms_token;

-- controle : les adresses d'envoi SMS doivent rester sur 127.0.0.1:9, les cles d'envoi a 0
SELECT f.code, p.cle, p.valeur FROM sms_fournisseur f JOIN sms_fournisseur_param p ON p.fournisseur_id = f.id
 WHERE p.cle IN ('token_endpoint', 'send_url', 'admin_base_url', 'subscription_url', 'base_url');
SELECT str_KEY, str_VALUE FROM t_parameters WHERE str_KEY IN ('KEY_SMS_CLOTURE_CAISSE', 'KEY_MAIL_CLOTURE_CAISSE',
 'KEY_SMS_RAPPEL_RENOUVELLEMENT', 'KEY_RAPPEL_HABITUDE_ACTIF', 'KEY_PHARMAML_VIDAGE_AUTO', 'KEY_CAMPAGNE_AUTO_ACTIF',
 'KEY_HEURE_ENVOI_SMS_RECAP_ACTIVITE', 'SUPPORT_AUTO_TICKET_ENABLED', 'SUPPORT_NOTIFY_ENABLED', 'KEY_MONOGRAPHIE_ACTIF');
SELECT mode, actif, mode_test FROM whatsapp_compte;
