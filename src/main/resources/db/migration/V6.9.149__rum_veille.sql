-- Retour du 14/10 : EXPERIENCE UTILISATEUR (RUM) et VEILLE EXTERNE.
-- t_rum : mesures des navigateurs regroupees par minute, poste, utilisateur, type (ECRAN, API, ERREUR, PAGE) et cle
-- normalisee (ecran, ou methode + chemin sans parametres ni identifiants) ; jamais de contenu. Gardees 14 jours.
-- SUPPORT_RUM_ACTIF : 1 = les navigateurs envoient leurs mesures.
-- SUPPORT_VEILLE_JETON : jeton partage avec l'outil Prestige Veille (vide = point de veille ferme).
CREATE TABLE IF NOT EXISTS t_rum (
    minute       DATETIME     NOT NULL,
    poste        VARCHAR(80)  NOT NULL,
    utilisateur  VARCHAR(40)  NOT NULL,
    type         VARCHAR(8)   NOT NULL,
    cle          VARCHAR(160) NOT NULL,
    nombre       INT          NOT NULL,
    total_ms     BIGINT       NOT NULL,
    max_ms       BIGINT       NOT NULL,
    echecs       INT          NOT NULL,
    PRIMARY KEY (minute, poste, utilisateur, type, cle),
    KEY idx_rum_type (type, minute)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT) VALUES
 ('SUPPORT_RUM_ACTIF', '1', 'Expérience utilisateur : les navigateurs envoient leurs temps d''écran et d''appel (1 = oui)', 'SYSTEME', 'enable'),
 ('SUPPORT_VEILLE_JETON', '', 'Jeton partagé avec l''outil Prestige Veille (vide = point de veille fermé)', 'SYSTEME', 'enable');
