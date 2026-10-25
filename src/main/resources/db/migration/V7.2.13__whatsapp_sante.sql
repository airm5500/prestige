-- Demande du 25/10 (repris du CRM UBIPHARM) : sante de la reception WhatsApp Web, rapportee par le service compagnon
-- (OK ou DEGRADE quand les messages recus deviennent illisibles), pour la banniere « session a reconnecter ».
-- La raison est un texte fixe du service (jamais le contenu d'un message). Rejouable.
ALTER TABLE whatsapp_compte ADD COLUMN IF NOT EXISTS sante VARCHAR(10) NULL;
ALTER TABLE whatsapp_compte ADD COLUMN IF NOT EXISTS sante_raison VARCHAR(255) NULL;
ALTER TABLE whatsapp_compte ADD COLUMN IF NOT EXISTS sante_maj DATETIME NULL;
