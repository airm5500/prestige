-- Vente differee : « Data too long for column 'lg_COMPTE_CLIENT_ID' ».
--
-- A la cloture d'une vente differee, l'application insere une ligne dans
-- t_preenregistrement_compte_client. Elle y ecrit l'identifiant du compte
-- client, qui est un UUID de 36 caracteres pour tout compte cree par
-- l'application (les comptes les plus anciens, eux, ont un identifiant de
-- 20 caracteres). Sur les bases ou cette colonne est restee en varchar(30),
-- l'ecriture est refusee par MySQL et la vente ne peut pas etre validee.
--
-- Les entites Java declarent 40 caracteres pour ces identifiants : la base
-- est simplement realignee dessus. Les quatre colonnes d'identifiant de la
-- table sont traitees d'un coup, pour ne pas buter sur la suivante des que
-- la premiere est corrigee (MySQL ne signale que la premiere en defaut).
--
-- Elargir une colonne texte ne touche a aucune donnee existante. Et chaque
-- ALTER n'est execute QUE si la colonne est reellement trop etroite : sur
-- une base deja en 40, cette migration ne fait rien.

-- lg_COMPTE_CLIENT_ID (la colonne signalee en officine)
SET @aElargir := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_preenregistrement_compte_client'
      AND COLUMN_NAME = 'lg_COMPTE_CLIENT_ID' AND CHARACTER_MAXIMUM_LENGTH < 40);
SET @requete := IF(@aElargir > 0,
    'ALTER TABLE t_preenregistrement_compte_client MODIFY COLUMN lg_COMPTE_CLIENT_ID varchar(40) NULL',
    'DO 0');
PREPARE elargir FROM @requete;
EXECUTE elargir;
DEALLOCATE PREPARE elargir;

-- lg_PREENREGISTREMENT_ID
SET @aElargir := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_preenregistrement_compte_client'
      AND COLUMN_NAME = 'lg_PREENREGISTREMENT_ID' AND CHARACTER_MAXIMUM_LENGTH < 40);
SET @requete := IF(@aElargir > 0,
    'ALTER TABLE t_preenregistrement_compte_client MODIFY COLUMN lg_PREENREGISTREMENT_ID varchar(40) NULL',
    'DO 0');
PREPARE elargir FROM @requete;
EXECUTE elargir;
DEALLOCATE PREPARE elargir;

-- lg_USER_ID
SET @aElargir := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_preenregistrement_compte_client'
      AND COLUMN_NAME = 'lg_USER_ID' AND CHARACTER_MAXIMUM_LENGTH < 40);
SET @requete := IF(@aElargir > 0,
    'ALTER TABLE t_preenregistrement_compte_client MODIFY COLUMN lg_USER_ID varchar(40) NULL',
    'DO 0');
PREPARE elargir FROM @requete;
EXECUTE elargir;
DEALLOCATE PREPARE elargir;

-- clef primaire de la table (NOT NULL, a preserver)
SET @aElargir := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_preenregistrement_compte_client'
      AND COLUMN_NAME = 'lg_PREENREGISTREMENT_COMPTE_CLIENT_ID' AND CHARACTER_MAXIMUM_LENGTH < 40);
SET @requete := IF(@aElargir > 0,
    'ALTER TABLE t_preenregistrement_compte_client MODIFY COLUMN lg_PREENREGISTREMENT_COMPTE_CLIENT_ID varchar(40) NOT NULL',
    'DO 0');
PREPARE elargir FROM @requete;
EXECUTE elargir;
DEALLOCATE PREPARE elargir;
