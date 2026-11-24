-- =====================================================================
-- Evolution 5, point 3 : numero de telephone du client standard
-- ---------------------------------------------------------------------
-- t_client n'avait aucune colonne de telephone. Pour les clients
-- standards, le numero etait range dans str_ADRESSE - un champ de 50
-- caracteres intitule « Adresse » dans l'ecran, partage avec les
-- adresses reelles des clients assurance et carnet. Rien ne garantissait
-- donc qu'un numero soit un numero, ni qu'il ne serve qu'une fois.
--
-- str_TELEPHONE porte desormais le numero, normalise au format local a
-- dix chiffres par util.TelephoneCi avant enregistrement.
--
-- UNICITE : elle ne vaut QUE pour les clients standards. Une colonne
-- generee ne prend le numero que pour le type client 6, et l'index
-- unique porte sur elle : deux clients assurance d'une meme famille
-- peuvent donc continuer de partager un numero, ce qui est legitime,
-- tandis que deux clients standards ne peuvent pas. Les colonnes vides
-- restent NULL, et un index unique accepte autant de NULL qu'on veut.
--
-- REPRISE DE L'EXISTANT : pour les clients standards, str_ADRESSE est
-- recopie dans str_TELEPHONE quand il s'agit bien d'un numero ivoirien
-- (dix chiffres commencant par 01, 05 ou 07, l'indicatif et les
-- separateurs retires). Un numero deja porte par un autre client
-- standard n'est repris que pour le PLUS ANCIEN : les suivants restent
-- vides plutot que de faire echouer la reprise, et l'officine les
-- completera a la premiere occasion. str_ADRESSE n'est pas vide : les
-- ecrans qui le lisent encore continuent de fonctionner.
-- =====================================================================

ALTER TABLE `t_client`
    ADD COLUMN IF NOT EXISTS `str_TELEPHONE` VARCHAR(30) NULL
        COMMENT 'Numero de telephone normalise (format local 10 chiffres)';

-- Candidats : les clients standards dont str_ADRESSE est un numero ivoirien exploitable.
DROP TEMPORARY TABLE IF EXISTS tmp_telephone_client;
CREATE TEMPORARY TABLE tmp_telephone_client (
    lg_CLIENT_ID VARCHAR(40) NOT NULL PRIMARY KEY,
    numero VARCHAR(30) NOT NULL,
    dt_CREATED DATETIME NULL,
    INDEX idx_tmp_numero (numero)
) ENGINE=InnoDB;

INSERT INTO tmp_telephone_client (lg_CLIENT_ID, numero, dt_CREATED)
SELECT c.lg_CLIENT_ID, x.numero, c.dt_CREATED
  FROM t_client c
  JOIN (
        SELECT t.lg_CLIENT_ID,
               -- indicatif retire apres nettoyage des separateurs
               CASE
                   WHEN n.brut LIKE '00225%' THEN SUBSTRING(n.brut, 6)
                   WHEN n.brut LIKE '225%' AND CHAR_LENGTH(n.brut) = 13 THEN SUBSTRING(n.brut, 4)
                   ELSE n.brut
               END AS numero
          FROM t_client t
          JOIN (SELECT c2.lg_CLIENT_ID,
                       REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                           TRIM(COALESCE(c2.str_ADRESSE, '')), ' ', ''), '.', ''), '-', ''),
                           '(', ''), ')', ''), '+', '') AS brut
                  FROM t_client c2
                 WHERE c2.lg_TYPE_CLIENT_ID = '6') n ON n.lg_CLIENT_ID = t.lg_CLIENT_ID
       ) x ON x.lg_CLIENT_ID = c.lg_CLIENT_ID
 WHERE x.numero REGEXP '^0[157][0-9]{8}$';

-- Un numero deja pris n'est repris que pour le client standard le plus ancien.
UPDATE t_client c
  JOIN tmp_telephone_client t ON t.lg_CLIENT_ID = c.lg_CLIENT_ID
  JOIN (SELECT numero, MIN(CONCAT(COALESCE(DATE_FORMAT(dt_CREATED, '%Y%m%d%H%i%s'), '00000000000000'),
                                  '|', lg_CLIENT_ID)) AS garde
          FROM tmp_telephone_client
         GROUP BY numero) g
    ON g.numero = t.numero
   AND SUBSTRING_INDEX(g.garde, '|', -1) = t.lg_CLIENT_ID
   SET c.str_TELEPHONE = t.numero
 WHERE c.str_TELEPHONE IS NULL;

DROP TEMPORARY TABLE IF EXISTS tmp_telephone_client;

-- Colonne generee : le numero n'y figure que pour les clients standards, l'index unique ne contraint donc
-- que ceux-la. Elle n'est jamais ecrite par l'application, elle suit str_TELEPHONE.
ALTER TABLE `t_client`
    ADD COLUMN IF NOT EXISTS `telephone_standard` VARCHAR(30)
        AS (IF(`lg_TYPE_CLIENT_ID` = '6' AND `str_TELEPHONE` IS NOT NULL AND `str_TELEPHONE` <> '',
               `str_TELEPHONE`, NULL)) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS `uk_client_telephone_standard` ON `t_client` (`telephone_standard`);

-- Recherche par numero, tous types confondus (l'ecran des clients cherche aussi sur le telephone).
CREATE INDEX IF NOT EXISTS `idx_client_telephone` ON `t_client` (`str_TELEPHONE`);
