-- Retours du 10/10 : recherche de la fiche article par DCI.
-- La requete teste « l'article est lie a cette DCI » (EXISTS) : index couvrant (DCI, article).
ALTER TABLE t_famille_dci
    ADD INDEX IF NOT EXISTS idx_famille_dci_dci_famille (lg_DCI_ID, lg_FAMILLE_ID) USING BTREE;
