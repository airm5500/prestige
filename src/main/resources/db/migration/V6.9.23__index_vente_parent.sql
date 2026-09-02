-- Modification d'une vente cloturee : la recherche d'une copie existante (lg_PARENT_ID) lisait toute la
-- table des ventes faute d'index (5,6 s en officine, 1,2 s sur le banc ; 90 ms avec l'index).
ALTER TABLE t_preenregistrement ADD INDEX IF NOT EXISTS idx_preenregistrement_parent (lg_PARENT_ID);
