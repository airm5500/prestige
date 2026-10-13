-- Besoins du 11/10 (lot 4) : SET VALORISATION, valorisation SIMULEE (stock de l'officine ou fichier importe, quantites
-- ajustees pour atteindre une valeur cible). Rien n'est ecrit dans le stock ; chaque edition porte la mention
-- « SIMULATION ». Droit dedie P_SET_VALORISATION, donne a AUCUN role : il s'accorde depuis la gestion des roles.
-- Journal des usages (qui, quand, quelle cible) sans aucune ligne de produit. Aucune donnee existante modifiee. Rejouable.
CREATE TABLE IF NOT EXISTS t_set_valorisation_journal (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    created_at     DATETIME     NOT NULL,
    lg_USER_ID     VARCHAR(40)  NULL,
    action         VARCHAR(10)  NOT NULL,
    source         VARCHAR(10)  NOT NULL,
    base           CHAR(2)      NOT NULL,
    cible          BIGINT       NOT NULL,
    valeur_depart  BIGINT       NOT NULL,
    valeur_obtenue BIGINT       NOT NULL,
    nb_lignes      INT          NOT NULL,
    PRIMARY KEY (id),
    KEY idx_set_valo_date (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), x.nom, 'CUSTOMER', x.description, NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM (SELECT 'P_SET_VALORISATION' nom, 'SET VALORISATION - Simulation de valorisation (rien n''est ecrit dans le stock)' description) x
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = x.nom);

INSERT INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`,
                         `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT LEFT(UUID(), 40), 'Simulation de valorisation (rien n''est écrit dans le stock)', NULL,
       'Set valorisation', 'setvalorisation', '55111546114940284023', 99, NULL, 'enable', 'P_SET_VALORISATION', NOW(), NOW(), ''
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_sous_menu s WHERE s.str_COMPOSANT = 'setvalorisation')
   AND EXISTS (SELECT 1 FROM t_menu m WHERE m.lg_MENU_ID = '55111546114940284023');
