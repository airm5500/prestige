-- Retours du 10/10 (section 13) : le rappel garde le canal d'envoi (SMS, WHATSAPP, SMS_WHATSAPP) et le modele de
-- message choisi, pour l'onglet Analyse des rappels (envoyes par canal). Les envois anterieurs restent sans canal.
ALTER TABLE t_rappel_habitude
    ADD COLUMN IF NOT EXISTS str_CANAL VARCHAR(15) NULL,
    ADD COLUMN IF NOT EXISTS lg_MODELE VARCHAR(40) NULL;
