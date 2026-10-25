-- Retour du 25/10 : dossier du service compagnon WhatsApp Web sur le serveur (appris du service, ou saisi par
-- l'administrateur dans Comptes WhatsApp) : affiche dans la banniere, et « Reconnecter » y lance demarrer.bat.
ALTER TABLE whatsapp_compte ADD COLUMN IF NOT EXISTS web_repertoire VARCHAR(300) NULL;
