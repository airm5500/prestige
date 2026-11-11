-- Plan du 09/11, point 13 : chaque envoi WhatsApp porte son origine (ticket Z, campagne, rappel, discussion, avis,
-- essai, lien wa.me) et l'utilisateur qui l'a declenche. Jamais le texte du message.
-- Numero 7.6.40 : hors de la suite 7.6.x des autres branches (outOfOrder est permis).
ALTER TABLE whatsapp_message
    ADD COLUMN IF NOT EXISTS origine        VARCHAR(20) NULL,
    ADD COLUMN IF NOT EXISTS utilisateur_id VARCHAR(50) NULL;

CREATE INDEX IF NOT EXISTS ix_whatsapp_message_origine ON whatsapp_message (origine);

-- Envois anterieurs : seule l'origine sure est reprise (notification de campagne = campagne, autre notification =
-- rappel) ; les autres restent sans origine (« non precisee » a l'ecran).
UPDATE whatsapp_message w
SET w.origine = CASE WHEN EXISTS (SELECT 1 FROM t_campagne_ligne l WHERE l.lg_NOTIFICATION_ID = w.notification_id)
                     THEN 'CAMPAGNE' ELSE 'RAPPEL' END
WHERE w.origine IS NULL AND w.notification_id IS NOT NULL;
