-- =====================================================================
-- Anomalies par employe (retour du 24/10) : refus affiches a l'employe et erreurs du logiciel, gardes A CHAQUE
-- occurrence avec l'employe, le poste, l'ecran et le fil de ses dernieres actions (ecrans, boutons, codes scannes ;
-- jamais le texte tape). Les operations a risque (annulations, modifications, remises, ventes longues) restent lues
-- dans leurs tables. Ecriture seulement quand une anomalie survient ; purge au-dela de 180 jours. Rejouable.
-- =====================================================================
CREATE TABLE IF NOT EXISTS t_anomalie_employe (
    id BIGINT NOT NULL AUTO_INCREMENT,
    created_at DATETIME NOT NULL,
    lg_USER_ID VARCHAR(40) NOT NULL,
    famille VARCHAR(12) NOT NULL,
    code VARCHAR(80) NULL,
    message VARCHAR(300) NULL,
    ecran VARCHAR(120) NULL,
    poste VARCHAR(160) NULL,
    fil TEXT NULL,
    PRIMARY KEY (id),
    KEY idx_anomalie_employe_date (lg_USER_ID, created_at),
    KEY idx_anomalie_date (created_at)
);
