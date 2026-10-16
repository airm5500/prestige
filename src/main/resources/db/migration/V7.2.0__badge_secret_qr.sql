-- =====================================================================
-- RH, badges (demande du 16/10) : QR code sur le badge imprime. Le QR porte le numero du badge, le login de
-- l'employe et un SECRET propre au badge (jamais le mot de passe) ; seule son empreinte SHA-256 est gardee ici.
-- Chaque impression en QR tire un nouveau secret : l'exemplaire precedent n'est plus valable. Rejouable.
-- =====================================================================
ALTER TABLE t_rh_badge ADD COLUMN IF NOT EXISTS secret_hash CHAR(64) NULL;
ALTER TABLE t_rh_badge ADD COLUMN IF NOT EXISTS dt_secret DATETIME NULL;
