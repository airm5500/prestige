-- Generateur de code CIP interne (fiche article et fiche simplifiee a la commande).
--
-- Un code interne fait sept chiffres comme un CIP : un PREFIXE fixe, puis des chiffres tires au
-- hasard et verifies contre tous les articles, actifs ou desactives. Le prefixe distingue les codes
-- internes des vrais CIP fournisseurs et evite qu'un code tire au hasard n'en percute un plus tard.
--
-- Avec un prefixe de trois chiffres il reste quatre chiffres libres, soit 10 000 codes. Si une
-- officine en vient a les epuiser, il suffit de changer ce parametre (par exemple 998).
INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
    VALUES ('KEY_PREFIXE_CIP_INTERNE', '999', 'Prefixe des codes CIP internes generes depuis la fiche article', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL);
