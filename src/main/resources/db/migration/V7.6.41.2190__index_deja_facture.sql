-- Plan du 21/11, point 9 : « Déjà facturé ? ». Un bon se retrouve par son numéro (part tiers payant) et ses
-- factures par t_facture_detail.str_REF : ni l'un ni l'autre n'était indexé (lecture complète des tables à chaque
-- recherche). Ajout sans bloquer les tables.
ALTER TABLE t_facture_detail ADD INDEX IF NOT EXISTS idx_facture_detail_ref (str_REF),
    ALGORITHM=INPLACE, LOCK=NONE;
ALTER TABLE t_preenregistrement_compte_client_tiers_payent ADD INDEX IF NOT EXISTS idx_pcctp_ref_bon (str_REF_BON),
    ALGORITHM=INPLACE, LOCK=NONE;
