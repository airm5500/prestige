-- =====================================================================
-- Campagnes WhatsApp (retour du 24/10, repris du CRM UBIPHARM) : une piece jointe facultative, image JPEG/PNG ou
-- document PDF, envoyee par WhatsApp Web avec le message en legende. 5 Mo au plus (controle dans PieceJointe).
-- Rejouable.
-- =====================================================================
ALTER TABLE t_campagne ADD COLUMN IF NOT EXISTS piece_jointe LONGBLOB NULL;
ALTER TABLE t_campagne ADD COLUMN IF NOT EXISTS piece_jointe_type VARCHAR(10) NULL;
ALTER TABLE t_campagne ADD COLUMN IF NOT EXISTS piece_jointe_mime VARCHAR(40) NULL;
ALTER TABLE t_campagne ADD COLUMN IF NOT EXISTS piece_jointe_nom VARCHAR(120) NULL;
