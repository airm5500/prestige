-- =====================================================================
-- Cas 4, lot 4.B (onglet « Sécurité » du Centre de support) :
--  - KEY_SECURITE_DERNIERE_ROTATION : date de la dernière rotation du mot de passe de la base (vide : jamais) ;
--    l'onglet rappelle la rotation quand elle a plus de 6 mois (Q4.6) ;
--  - t_securite_journal : qui, quand, quelle action, quel résultat. Jamais une valeur de mot de passe.
-- Tout reste inactif tant que KEY_SECURITE_BASE vaut 0. Rejouable.
-- =====================================================================

INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED, dt_UPDATED)
SELECT 'KEY_SECURITE_DERNIERE_ROTATION', '',
       'Sécurité de la base : date de la dernière rotation du mot de passe (posée par l''onglet Sécurité ; vide = jamais)',
       'SYSTEME', 'enable', NOW(), NOW()
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_parameters p WHERE p.str_KEY = 'KEY_SECURITE_DERNIERE_ROTATION');

CREATE TABLE IF NOT EXISTS t_securite_journal (
    id           BIGINT        NOT NULL AUTO_INCREMENT,
    dt_DATE      DATETIME      NOT NULL,
    str_LOGIN    VARCHAR(100)  NOT NULL,
    str_ACTION   VARCHAR(40)   NOT NULL COMMENT 'ROTATION, ALIAS, PURGE_COPIES, REFUS',
    str_RESULTAT VARCHAR(20)   NOT NULL COMMENT 'OK, ECHEC, RETOUR_ARRIERE, REFUSE',
    str_DETAIL   VARCHAR(1000) NULL COMMENT 'étapes et messages, sans aucune valeur de mot de passe',
    PRIMARY KEY (id),
    KEY idx_securite_journal_date (dt_DATE)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
