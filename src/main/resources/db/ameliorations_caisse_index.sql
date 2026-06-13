-- Index pour accelerer la visualisation et la liste de caisse
-- (requetes sur MvtTransaction filtrees par magasin + periode).
--
-- A executer manuellement sur les bases existantes (hibernate.hbm2ddl.auto est desactive).
-- Verifier d'abord qu'ils n'existent pas deja :
--   SHOW INDEX FROM MvtTransaction;
--   SHOW INDEX FROM vente_reglement;

CREATE INDEX indexMvtEmplCreatedAt ON MvtTransaction (lg_EMPLACEMENT_ID, createdAt);

CREATE INDEX indexMvtEmplMvtdate ON MvtTransaction (lg_EMPLACEMENT_ID, mvtdate);

-- Jointure du resume par mode de reglement et filtre "type de reglement"
-- (inutile si la cle etrangere vente_id a deja cree un index automatiquement) :
-- CREATE INDEX indexVenteReglementVenteId ON vente_reglement (vente_id);
