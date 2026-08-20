-- =====================================================================
-- Fermeture par defaut de l'acces de depannage
-- ---------------------------------------------------------------------
-- CONSTAT
-- Le login "kobys" ouvrait le compte systeme '00' SANS mot de passe, sur
-- toute installation, en permanence. Le controle sortait avant meme la
-- verification du mot de passe : connaitre le mot suffisait, depuis
-- n'importe quel poste de l'officine, sans aucun outil.
--
-- Deux consequences aggravantes :
--   * le journal d'authentification enregistre le compte '00' et non la
--     personne reelle : l'usage etait indiscernable ;
--   * SupportMaintenanceRessource.isAdmin reconnait '00' comme
--     administrateur d'office, ce qui donnait acces aux vidages de tables
--     du Centre de Support sans etre administrateur.
--
-- CHOIX RETENU
-- L'acces est conserve - il sert au depannage a distance - mais il est
-- desormais FERME par defaut et ne s'ouvre que le temps d'une
-- intervention, en passant ce parametre a '1'.
--
-- La regle cote code est volontairement stricte : seule la valeur '1'
-- autorise l'acces. Un parametre absent, vide, mal saisi ou supprime le
-- ferme. C'est la difference entre un oubli sans consequence et une
-- officine exposee.
--
-- Chaque utilisation reussie est tracee en WARNING dans le server.log, et
-- chaque tentative refusee egalement : l'usage cesse d'etre invisible.
--
-- Type SYSTEME : le parametre n'apparait pas dans l'ecran Parametres des
-- profils non administrateurs.
-- =====================================================================
INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)
SELECT 'ACCES_DEPANNAGE_ACTIF', '0',
       'Acces de depannage a distance (login sans mot de passe vers le compte systeme). 0 = ferme (defaut), 1 = ouvert. A remettre a 0 apres chaque intervention.',
       'SYSTEME', 'enable', NOW()
WHERE NOT EXISTS (SELECT 1 FROM (SELECT str_KEY FROM t_parameters WHERE str_KEY = 'ACCES_DEPANNAGE_ACTIF') AS deja);
