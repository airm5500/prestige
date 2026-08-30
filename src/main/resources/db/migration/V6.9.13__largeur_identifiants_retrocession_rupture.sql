-- Suite de V6.9.12 : deux autres colonnes recoivent un identifiant de 36
-- caracteres alors qu'elles sont declarees en varchar(20). Elles echouent
-- donc de la meme facon que la vente differee, avec le meme message
-- « Data too long for column ... ».
--
-- 1) t_retrocession.lg_CLIENT_ID : on y ecrit l'identifiant du CLIENT
--    (RetrocessionManagement.createRetrocession), et les identifiants de
--    client sont des UUID de 36 caracteres. Toute retrocession rattachee a
--    un client est donc refusee.
--
-- 2) t_rupture_history.lg_RUPTURE_HISTORY_ID : la clef est generee par
--    UUID.randomUUID() (CommandeServiceImpl), soit 36 caracteres.
--
-- Le reste des colonnes etroites relevees en officine a ete verifie une par
-- une : elles referencent des identifiants a 20 caracteres (grossiste,
-- famille, utilisateur, facture...) ou des clefs generees en 20 caracteres
-- par getComplexId(). Elles ne sont pas touchees : elargir sans raison une
-- colonne indexee coute une reecriture de table pour rien.
--
-- lg_CLIENT_ID porte une CLEF ETRANGERE vers t_client. MariaDB refuse de
-- modifier une colonne engagee dans une clef etrangere (erreur 1832), et
-- desactiver FOREIGN_KEY_CHECKS n'y change rien : la contrainte est donc
-- retiree, la colonne elargie, puis la contrainte remise a l'identique. Son
-- nom est relu dans le catalogue plutot que suppose, il varie d'une base a
-- l'autre.
--
-- Chaque etape n'est executee QUE si la colonne est reellement trop etroite,
-- et elargir une colonne texte ne modifie aucune donnee existante.

-- ---------------------------------------------------------------------
-- 1) t_retrocession.lg_CLIENT_ID : aligne sur t_client.lg_CLIENT_ID (40)
-- ---------------------------------------------------------------------
SET @aElargir := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_retrocession'
      AND COLUMN_NAME = 'lg_CLIENT_ID' AND CHARACTER_MAXIMUM_LENGTH < 40);

-- nom reel de la clef etrangere sur cette colonne, vide s'il n'y en a pas
SET @nomCle := (SELECT k.CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE k
    WHERE k.TABLE_SCHEMA = DATABASE() AND k.TABLE_NAME = 't_retrocession'
      AND k.COLUMN_NAME = 'lg_CLIENT_ID' AND k.REFERENCED_TABLE_NAME IS NOT NULL LIMIT 1);

SET @requete := IF(@aElargir > 0 AND @nomCle IS NOT NULL,
    CONCAT('ALTER TABLE t_retrocession DROP FOREIGN KEY `', @nomCle, '`'), 'DO 0');
PREPARE etape FROM @requete;
EXECUTE etape;
DEALLOCATE PREPARE etape;

SET @requete := IF(@aElargir > 0,
    'ALTER TABLE t_retrocession MODIFY COLUMN lg_CLIENT_ID varchar(40) NULL', 'DO 0');
PREPARE etape FROM @requete;
EXECUTE etape;
DEALLOCATE PREPARE etape;

SET @requete := IF(@aElargir > 0 AND @nomCle IS NOT NULL,
    CONCAT('ALTER TABLE t_retrocession ADD CONSTRAINT `', @nomCle,
           '` FOREIGN KEY (lg_CLIENT_ID) REFERENCES t_client (lg_CLIENT_ID)'), 'DO 0');
PREPARE etape FROM @requete;
EXECUTE etape;
DEALLOCATE PREPARE etape;

-- ---------------------------------------------------------------------
-- 2) t_rupture_history.lg_RUPTURE_HISTORY_ID : clef UUID (36 caracteres).
--    C'est la clef primaire de la table, aucune clef etrangere ne s'y
--    appuie : l'elargissement est direct.
-- ---------------------------------------------------------------------
SET @aElargir := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_rupture_history'
      AND COLUMN_NAME = 'lg_RUPTURE_HISTORY_ID' AND CHARACTER_MAXIMUM_LENGTH < 40);
SET @requete := IF(@aElargir > 0,
    'ALTER TABLE t_rupture_history MODIFY COLUMN lg_RUPTURE_HISTORY_ID varchar(40) NOT NULL', 'DO 0');
PREPARE etape FROM @requete;
EXECUTE etape;
DEALLOCATE PREPARE etape;
