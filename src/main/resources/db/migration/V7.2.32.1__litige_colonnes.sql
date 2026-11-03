-- Litiges tiers payant (audit 05) : le nom du client (prenom et nom) et le libelle depassaient les colonnes d'origine
-- (20 et 40 caracteres) : la creation du litige echouait (erreur 500, « Data too long »). Colonnes elargies a 100.
ALTER TABLE t_litige MODIFY str_CLIENT_NAME VARCHAR(100) NOT NULL;
ALTER TABLE t_litige MODIFY str_LIBELLE_LITIGE VARCHAR(100) NOT NULL;
