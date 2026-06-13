-- Indexes pour la visualisation et la liste de caisse (api/v1/caisse/listecaisse).
-- Les requetes filtrent MvtTransaction par magasin + periode (createdAt quand les
-- heures sont fournies, mvtdate sinon).

ALTER TABLE MvtTransaction
    ADD INDEX IF NOT EXISTS indexMvtEmplCreatedAt (lg_EMPLACEMENT_ID, createdAt) USING BTREE;

ALTER TABLE MvtTransaction
    ADD INDEX IF NOT EXISTS indexMvtEmplMvtdate (lg_EMPLACEMENT_ID, mvtdate) USING BTREE;
