-- Retours du 08/10 : tous les libelles de module en MAJUSCULES. Les deux modules ajoutes ensuite (Avis clients,
-- V6.9.133 ; Campagnes SMS / WhatsApp) avaient garde leur description en minuscules. Rejouable.
UPDATE t_menu SET str_DESCRIPTION = UPPER(str_DESCRIPTION)
 WHERE BINARY str_DESCRIPTION <> BINARY UPPER(str_DESCRIPTION);
UPDATE t_menu SET str_VALUE = UPPER(str_VALUE)
 WHERE BINARY str_VALUE <> BINARY UPPER(str_VALUE);
