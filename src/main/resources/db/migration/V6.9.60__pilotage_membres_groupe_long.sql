-- =====================================================================
-- Evolution 6, point 1 : la liste des agences d'un groupe tient, quelle
-- que soit sa longueur.
--
-- CE QUI S'EST PASSE. La colonne str_MEMBRES, creee en VARCHAR(500) par
-- la V6.9.58, porte le NOM des agences composant un groupe - un libelle
-- d'affichage, rien de plus. Chez une officine dont un groupe compte
-- beaucoup d'agences, la liste a depasse 500 caracteres : l'ecriture a
-- echoue (« Data too long for column 'str_MEMBRES' »), et comme le
-- detail s'ecrivait dans la MEME transaction que le mois, c'est le mois
-- de juillet tout entier qui a ete annule - alors que ses chiffres
-- etaient justes et deja calcules.
--
-- DEUX CORRECTIONS, dont une seule est ici. Le code isole desormais
-- l'ecriture de chaque detail dans sa propre transaction : un ornement
-- d'affichage ne peut plus faire perdre un chiffre. Et la colonne cesse
-- d'imposer une limite arbitraire.
--
-- Les deux tables sont videes pour que les mois perdus soient
-- recalcules : elles ne sont qu'un cache, refait a partir des ventes et
-- des bons par le travail planifie du demarrage, avant que l'ecran ne
-- soit ouvert.
-- =====================================================================
ALTER TABLE `pilotage_agregat_grossiste`
    MODIFY COLUMN `str_MEMBRES` TEXT NULL
        COMMENT 'agences composant le groupe, quand il en a plusieurs';

TRUNCATE TABLE `pilotage_agregat_grossiste`;
TRUNCATE TABLE `pilotage_agregat_mensuel`;
