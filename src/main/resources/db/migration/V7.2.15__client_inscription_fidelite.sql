-- Retours du 25/10 (point 2) : case « Client fidélité » de la fiche client. Tous les clients sont inscrits par défaut
-- (existants et nouveaux) ; on retire ensuite ceux qu'on ne veut pas. Un client retiré ne gagne plus de points et ne
-- paie plus avec ; réinscrit, il gagne des points sur les ventes faites à partir de sa réinscription.
ALTER TABLE t_client
    ADD COLUMN IF NOT EXISTS bool_FIDELITE TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS dt_FIDELITE_INSCRIPTION DATETIME NULL;
