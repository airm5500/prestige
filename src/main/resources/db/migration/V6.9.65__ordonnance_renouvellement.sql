-- =====================================================================
-- Ordonnances clients, retour du 30/09 : RENOUVELLEMENTS.
--
-- Sur l'ordonnance d'ORIGINE : combien de fois elle peut etre
-- renouvelee (int_RENOUVELLEMENTS, 0 = non renouvelable) et tous les
-- combien de jours (int_PERIODICITE_JOURS).
--
-- Chaque renouvellement est une NOUVELLE ordonnance, liee a l'origine
-- (lg_ORDONNANCE_ORIGINE_ID) avec son rang (1, 2...) : chaque delivrance
-- garde son propre historique, son service et ses preventes.
--
-- Rappel SMS : int_RANG_RAPPELE retient le dernier renouvellement pour
-- lequel le client a ete prevenu (un rappel par renouvellement, jamais
-- deux), dt_DERNIER_RAPPEL sa date.
--
-- Colonnes ajoutees, valeurs par defaut neutres : les ordonnances deja
-- saisies restent non renouvelables. Rejouable.
-- =====================================================================
ALTER TABLE t_ordonnance_client
    ADD COLUMN IF NOT EXISTS int_RENOUVELLEMENTS INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS int_PERIODICITE_JOURS INT NULL,
    ADD COLUMN IF NOT EXISTS lg_ORDONNANCE_ORIGINE_ID VARCHAR(40) NULL,
    ADD COLUMN IF NOT EXISTS int_RANG_RENOUVELLEMENT INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS int_RANG_RAPPELE INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS dt_DERNIER_RAPPEL DATETIME NULL;

CREATE INDEX IF NOT EXISTS t_ordonnance_client_ix_origine ON t_ordonnance_client (lg_ORDONNANCE_ORIGINE_ID);

-- Rappel SMS : categorie de notification propre, sur le canal SMS. Elle
-- n'est ni envoyee par courriel ni marquee envoyee par la tache courriel
-- (qui ne prend que les canaux EMAIL et SMS_EMAIL).
INSERT IGNORE INTO categorie_notification (id, canal, libelle, name)
VALUES (23, 'SMS', 'Rappel de renouvellement d''ordonnance', 'RAPPEL_RENOUVELLEMENT');

-- Parametres du rappel automatique : actif, et combien de jours avant
-- l'echeance. Modifiables comme les autres parametres ; absents, les
-- valeurs par defaut du code s'appliquent (actif, 2 jours).
INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT)
VALUES ('KEY_SMS_RAPPEL_RENOUVELLEMENT', '1', 'Rappel SMS automatique des renouvellements d''ordonnance (1 = actif)', 'SYSTEME', 'enable');
INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT)
VALUES ('KEY_RAPPEL_RENOUVELLEMENT_JOURS', '2', 'Nombre de jours avant l''echeance ou part le rappel de renouvellement', 'SYSTEME', 'enable');
