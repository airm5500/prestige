-- Retour du 10/11/2026 : prise en charge totale d'une ligne de vente assurance.
-- 1. t_preenregistrement_detail.tp_premier_id : compte client tiers-payant qui PASSE EN PREMIER sur la ligne et prend
--    100 % de sa propre base (marque posee a la caisse apres confirmation, pour cette vente seulement). NULL partout :
--    rien ne change. Ecrite par le service de la caisse, relue par le calcul du net, la grille de vente et le ticket.
-- 2. Parametre KEY_PRISE_EN_CHARGE_TOTALE, a 0 : la question n'est jamais posee, la marque n'est jamais lue par le
--    calcul, un taux a 100 % garde son sens d'avant (l'assurance complete le reste).
-- 3. parametre_explication : explication depliable d'un parametre dans l'ecran des parametres (bouton « i »), au
--    format JSON {regle, entetes, cas, rappels}. Un parametre sans ligne ici n'a pas de bouton.
-- Rejouable (IF NOT EXISTS, insertions conditionnelles).
ALTER TABLE t_preenregistrement_detail ADD COLUMN IF NOT EXISTS tp_premier_id VARCHAR(40) NULL DEFAULT NULL;

INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)
SELECT 'KEY_PRISE_EN_CHARGE_TOTALE', '0',
       'Vente assurance : une assurance mise a 100 % sur une ligne, apres confirmation, passe en premier et paie toute la ligne',
       'CUSTOMER', 'enable', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_parameters WHERE str_KEY = 'KEY_PRISE_EN_CHARGE_TOTALE');

CREATE TABLE IF NOT EXISTS parametre_explication (
    str_KEY      VARCHAR(100) NOT NULL,
    explication  TEXT         NOT NULL,
    PRIMARY KEY (str_KEY)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

INSERT INTO parametre_explication (str_KEY, explication)
SELECT 'KEY_PRISE_EN_CHARGE_TOTALE',
       '{"regle":"A 1 : a la caisse, quand le taux d''une assurance est mis a 100 % sur une ligne, une question est posee sous la grille. Entree confirme : cette assurance passe en premier sur la ligne et paie 100 % de sa propre base (son prix de reference si elle en a un, sinon le prix de vente) ; les autres suivent dans leur ordre habituel sur ce qui reste, et le client ne paie que ce que personne n''a couvert. Echap annule la saisie. A 0 : aucune question, un taux a 100 % garde son sens habituel (l''assurance complete ce que les precedentes ont laisse).","titre":"Exemples sur une ligne a 1 000 F, RO a 80 %, RC1 a 20 %","entetes":["Cas","RO","RC1","Client"],"cas":[["Aucun taux modifie","800","200","0"],["RC1 a 100 %, non confirme (ou parametre a 0) : il complete le reste","800","200","0"],["RC1 confirme, sans prix de reference","0","1 000","0"],["RC1 confirme, avec un prix de reference de 800","200","800","0"],["RO a 100 % confirme","1 000","0","0"],["RC1 confirme mais plafonne a 600 : la difference va au client","0","600","400"]],"rappels":["Valable pour cette vente seulement : rien n''est ecrit dans les prix de reference de la fiche article.","Une seule assurance peut passer en premier sur une ligne.","Une assurance dont la part est nulle n''apparait plus sur le ticket."]}'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM parametre_explication WHERE str_KEY = 'KEY_PRISE_EN_CHARGE_TOTALE');
