-- =====================================================================
-- Extranets grossistes (demande du 09/11, point 4) : fichiers des documents proposes par l'extranet (BL en CSV, Excel,
-- TXT ; factures en CSV, XLS) telecharges depuis Prestige pour l'import. Une ligne de liste garde les references du
-- document que l'extranet attend pour le rendre (ex. {"fcnum":"...","etcoda":"..."} chez Ubipharm,
-- {"IDFACTURECLIENT":"..."} chez TEDIS) : objet JSON de textes courts, jamais de cookie ni de jeton. NULL : ligne sans
-- fichier. Lu par le telechargement (FichiersExtranet) et par l'ecran (formats proposes). Rejouable.
-- =====================================================================
ALTER TABLE extranet_liste_ligne ADD COLUMN IF NOT EXISTS document VARCHAR(400) NULL;
