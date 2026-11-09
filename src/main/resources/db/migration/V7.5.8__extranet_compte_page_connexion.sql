-- =====================================================================
-- Extranets grossistes (08/11) : la page de connexion et le nom du champ identifiant se règlent dans l'écran
-- (onglet Sessions), avec l'identifiant, et non dans un fichier du poste. Vides : page « / » et détection
-- automatique du champ. Rejouable.
-- =====================================================================
ALTER TABLE extranet_compte ADD COLUMN IF NOT EXISTS page_connexion VARCHAR(300) NULL DEFAULT NULL;
ALTER TABLE extranet_compte ADD COLUMN IF NOT EXISTS champ_identifiant VARCHAR(100) NULL DEFAULT NULL;
