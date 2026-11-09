-- =====================================================================
-- Extranets grossistes (demande du 09/11) : lien entre un grossiste de Prestige (t_grossiste) et l'extranet qui le
-- sert. Plusieurs grossistes peuvent etre servis par le meme extranet (Ubipharm : LABOREX-CI YOP, BOUAKE, GAGNOA...).
-- Une ligne par grossiste lie ; aucune ligne : grossiste sans extranet. Lu par l'ecran des extranets (onglet «
-- Grossistes liés ») et par le traitement des suggestions (unites gratuites, stock et commandes du grossiste).
-- Rejouable.
-- =====================================================================
CREATE TABLE IF NOT EXISTS extranet_grossiste (
    lg_GROSSISTE_ID VARCHAR(40) NOT NULL,
    source VARCHAR(20) NOT NULL,
    modifie_le DATETIME NULL,
    modifie_par VARCHAR(100) NULL,
    PRIMARY KEY (lg_GROSSISTE_ID),
    KEY idx_extranet_grossiste_source (source)
);

-- Parametre « afficher le stock du grossiste » dans le traitement des suggestions : 0 (defaut) = colonne masquee.
INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)
SELECT 'KEY_AFFICHER_STOCK_GROSSISTE', '0',
       'Suggestions : afficher le stock du grossiste lu sur son extranet (1) ; 0 = colonne masquee',
       'CUSTOMER', 'enable', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_parameters WHERE str_KEY = 'KEY_AFFICHER_STOCK_GROSSISTE');
