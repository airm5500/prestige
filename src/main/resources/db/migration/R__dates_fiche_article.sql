-- Dates de la fiche article tenues a jour dans t_famille (demande du 12/11) : derniere vente (dt_DATE_LAST_SORTIE),
-- derniere entree (dt_DATE_LAST_ENTREE), dernier inventaire cloture (dt_LAST_INVENTAIRE). La fiche les lit au lieu
-- de fouiller l'historique de l'article a chaque ouverture.
--
-- Memes regles que le calcul de la fiche qu'elles remplacent (SearchProduitServcieImpl) :
--  - derniere vente : plus grande date de cloture (t_preenregistrement.dt_UPDATED) des ventes cloturees, non
--    annulees, de montant positif, faites par un utilisateur de l'officine (emplacement '1') ;
--  - derniere entree : pour chaque ligne de BL cloture, date du mouvement « entree en stock » (hmvtproduit, type
--    '01'), a defaut date du BL ; la plus recente ;
--  - dernier inventaire : plus grande date de cloture des inventaires clotures par un utilisateur de l'officine
--    contenant l'article.
-- Les depots gardent le calcul a l'ouverture de la fiche (une seule ligne t_famille par article).
--
-- Tenue a jour par declencheurs : tous les chemins (ecrans REST, anciennes JSP, imports) passent par la base, dans la
-- transaction de l'operation. Plusieurs caisses en meme temps : la date n'est qu'avancee (WHERE date < nouvelle),
-- sous le verrou de la ligne ; la plus recente l'emporte quel que soit l'ordre. Annulation, suppression, BL ou
-- inventaire decloture : la date de l'article est recalculee.
--
-- Le declencheur t_famille_before_upd_tr marquait l'article modifie et ecrivait l'historique des prix a CHAQUE mise a
-- jour : il est recree a l'identique, sauf quand la mise a jour vient de ces procedures (@prestige_dates_fiche) et ne
-- touche pas aux colonnes qu'il historise.
-- Les identifiants sont recopies dans des variables du type exact de chaque colonne (TYPE OF) : l'index reste utilise
-- quel que soit le jeu de caracteres de la base (voir R__proc_indicateur_sugges.sql).
-- Remplissage des dates existantes : outils/scripts-manuels/dates_fiche_article.sql (a la main, hors Flyway).

DELIMITER @@

CREATE OR REPLACE TRIGGER t_famille_before_upd_tr BEFORE UPDATE ON t_famille FOR EACH ROW
BEGIN
IF @prestige_dates_fiche = 1 AND OLD.int_PRICE <=> NEW.int_PRICE AND OLD.int_PRICE_TIPS <=> NEW.int_PRICE_TIPS
   AND OLD.int_TAUX_MARQUE <=> NEW.int_TAUX_MARQUE AND OLD.int_PAF <=> NEW.int_PAF AND OLD.int_PAT <=> NEW.int_PAT
   AND OLD.lg_GROSSISTE_ID <=> NEW.lg_GROSSISTE_ID THEN
  SET NEW.dt_UPDATED = OLD.dt_UPDATED;
ELSE
  SET NEW.dt_UPDATED = NOW();
  INSERT t_famille_history(lg_FAMILLE_ID,int_PRICE,int_PRICE_TIPS,int_TAUX_MARQUE,
  int_PAF,int_PAT,lg_GROSSISTE_ID,dt_CREATED)
  VALUE (NEW.lg_FAMILLE_ID,NEW.int_PRICE,NEW.int_PRICE_TIPS,
  NEW.int_TAUX_MARQUE,NEW.int_PAF,NEW.int_PAT,NEW.lg_GROSSISTE_ID,NOW() );
END IF;
END@@

-- ------------------------------------------------------------------------------------------------ derniere vente

CREATE OR REPLACE PROCEDURE proc_fiche_sortie_recalculer(IN famille VARCHAR(40))
BEGIN
DECLARE vF TYPE OF t_famille.lg_FAMILLE_ID;
DECLARE vD TYPE OF t_preenregistrement_detail.lg_FAMILLE_ID;
DECLARE derniere DATETIME;
DECLARE plusTard DATETIME;
DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @prestige_dates_fiche = NULL; RESIGNAL; END;
SET vF = famille;
SET vD = famille;
-- meme lecture que la fiche (retour du 15/10) : la ligne la plus recente d'une vente valide, puis une vente valide
-- cloturee apres elle
SET derniere = (SELECT p.dt_UPDATED FROM t_preenregistrement_detail d
  JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID
  JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID
  WHERE d.lg_FAMILLE_ID = vD AND u.lg_EMPLACEMENT_ID = '1' AND p.b_IS_CANCEL = 0 AND p.str_STATUT = 'is_Closed'
  AND p.int_PRICE > 0 ORDER BY d.dt_CREATED DESC LIMIT 1);
IF derniere IS NOT NULL THEN
  SET plusTard = (SELECT MAX(p.dt_UPDATED) FROM t_preenregistrement p
    JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID AND d.lg_FAMILLE_ID = vD
    JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID
    WHERE u.lg_EMPLACEMENT_ID = '1' AND p.b_IS_CANCEL = 0 AND p.str_STATUT = 'is_Closed' AND p.int_PRICE > 0
    AND p.dt_UPDATED > derniere);
  IF plusTard IS NOT NULL THEN
    SET derniere = plusTard;
  END IF;
END IF;
SET @prestige_dates_fiche = 1;
UPDATE t_famille SET dt_DATE_LAST_SORTIE = derniere WHERE lg_FAMILLE_ID = vF AND NOT (dt_DATE_LAST_SORTIE <=> derniere);
SET @prestige_dates_fiche = NULL;
END@@

CREATE OR REPLACE PROCEDURE proc_fiche_sortie_avancer(IN famille VARCHAR(40), IN quand DATETIME)
BEGIN
DECLARE vF TYPE OF t_famille.lg_FAMILLE_ID;
DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @prestige_dates_fiche = NULL; RESIGNAL; END;
SET vF = famille;
SET @prestige_dates_fiche = 1;
UPDATE t_famille SET dt_DATE_LAST_SORTIE = quand
  WHERE lg_FAMILLE_ID = vF AND (dt_DATE_LAST_SORTIE IS NULL OR dt_DATE_LAST_SORTIE < quand);
SET @prestige_dates_fiche = NULL;
END@@

-- toutes les lignes d'une vente, dans l'ordre des identifiants (deux caisses verrouillent les articles dans le meme
-- ordre)
CREATE OR REPLACE PROCEDURE proc_fiche_sortie_avancer_vente(IN vente VARCHAR(40), IN quand DATETIME)
BEGIN
DECLARE vV TYPE OF t_preenregistrement_detail.lg_PREENREGISTREMENT_ID;
DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @prestige_dates_fiche = NULL; RESIGNAL; END;
SET vV = vente;
SET @prestige_dates_fiche = 1;
UPDATE t_famille SET dt_DATE_LAST_SORTIE = quand
  WHERE lg_FAMILLE_ID IN (SELECT d.lg_FAMILLE_ID FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID = vV)
  AND (dt_DATE_LAST_SORTIE IS NULL OR dt_DATE_LAST_SORTIE < quand)
  ORDER BY lg_FAMILLE_ID;
SET @prestige_dates_fiche = NULL;
END@@

CREATE OR REPLACE PROCEDURE proc_fiche_sortie_recalculer_vente(IN vente VARCHAR(40))
BEGIN
DECLARE vV TYPE OF t_preenregistrement_detail.lg_PREENREGISTREMENT_ID;
DECLARE f VARCHAR(40);
DECLARE fini INT DEFAULT 0;
DECLARE c CURSOR FOR SELECT d.lg_FAMILLE_ID FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID = vV
  ORDER BY d.lg_FAMILLE_ID;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET fini = 1;
SET vV = vente;
OPEN c;
lire: LOOP
  FETCH c INTO f;
  IF fini = 1 THEN
    LEAVE lire;
  END IF;
  CALL proc_fiche_sortie_recalculer(f);
END LOOP;
CLOSE c;
END@@

-- ------------------------------------------------------------------------------------------------ derniere entree

CREATE OR REPLACE PROCEDURE proc_fiche_entree_recalculer(IN famille VARCHAR(40))
BEGIN
DECLARE vF TYPE OF t_famille.lg_FAMILLE_ID;
DECLARE vB TYPE OF t_bon_livraison_detail.lg_FAMILLE_ID;
DECLARE derniere DATETIME;
DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @prestige_dates_fiche = NULL; RESIGNAL; END;
SET vF = famille;
SET vB = famille;
SET derniere = (SELECT MAX(x.entree) FROM (SELECT IFNULL((SELECT MAX(h.createdAt) FROM hmvtproduit h
    WHERE h.pkey = bld.lg_BON_LIVRAISON_DETAIL AND h.typeMvt = '01'), bl.dt_UPDATED) AS entree
  FROM t_bon_livraison_detail bld JOIN t_bon_livraison bl ON bl.lg_BON_LIVRAISON_ID = bld.lg_BON_LIVRAISON_ID
  WHERE bld.lg_FAMILLE_ID = vB AND bl.str_STATUT = 'is_Closed') x);
SET @prestige_dates_fiche = 1;
UPDATE t_famille SET dt_DATE_LAST_ENTREE = derniere WHERE lg_FAMILLE_ID = vF AND NOT (dt_DATE_LAST_ENTREE <=> derniere);
SET @prestige_dates_fiche = NULL;
END@@

CREATE OR REPLACE PROCEDURE proc_fiche_entree_avancer(IN famille VARCHAR(40), IN quand DATETIME)
BEGIN
DECLARE vF TYPE OF t_famille.lg_FAMILLE_ID;
DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @prestige_dates_fiche = NULL; RESIGNAL; END;
SET vF = famille;
SET @prestige_dates_fiche = 1;
UPDATE t_famille SET dt_DATE_LAST_ENTREE = quand
  WHERE lg_FAMILLE_ID = vF AND (dt_DATE_LAST_ENTREE IS NULL OR dt_DATE_LAST_ENTREE < quand);
SET @prestige_dates_fiche = NULL;
END@@

-- BL : les lignes sans mouvement « entree en stock » prennent la date du BL (meme regle que la fiche)
CREATE OR REPLACE PROCEDURE proc_fiche_entree_avancer_bl(IN bon VARCHAR(40), IN quand DATETIME)
BEGIN
DECLARE vB TYPE OF t_bon_livraison_detail.lg_BON_LIVRAISON_ID;
DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @prestige_dates_fiche = NULL; RESIGNAL; END;
SET vB = bon;
SET @prestige_dates_fiche = 1;
UPDATE t_famille SET dt_DATE_LAST_ENTREE = quand
  WHERE lg_FAMILLE_ID IN (SELECT bld.lg_FAMILLE_ID FROM t_bon_livraison_detail bld WHERE bld.lg_BON_LIVRAISON_ID = vB
    AND NOT EXISTS (SELECT 1 FROM hmvtproduit h WHERE h.pkey = bld.lg_BON_LIVRAISON_DETAIL AND h.typeMvt = '01'))
  AND (dt_DATE_LAST_ENTREE IS NULL OR dt_DATE_LAST_ENTREE < quand)
  ORDER BY lg_FAMILLE_ID;
SET @prestige_dates_fiche = NULL;
END@@

CREATE OR REPLACE PROCEDURE proc_fiche_entree_recalculer_bl(IN bon VARCHAR(40))
BEGIN
DECLARE vB TYPE OF t_bon_livraison_detail.lg_BON_LIVRAISON_ID;
DECLARE f VARCHAR(40);
DECLARE fini INT DEFAULT 0;
DECLARE c CURSOR FOR SELECT DISTINCT bld.lg_FAMILLE_ID FROM t_bon_livraison_detail bld WHERE bld.lg_BON_LIVRAISON_ID = vB
  ORDER BY bld.lg_FAMILLE_ID;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET fini = 1;
SET vB = bon;
OPEN c;
lire: LOOP
  FETCH c INTO f;
  IF fini = 1 THEN
    LEAVE lire;
  END IF;
  CALL proc_fiche_entree_recalculer(f);
END LOOP;
CLOSE c;
END@@

-- ------------------------------------------------------------------------------------------------ dernier inventaire

CREATE OR REPLACE PROCEDURE proc_fiche_inventaire_recalculer(IN famille VARCHAR(40))
BEGIN
DECLARE vF TYPE OF t_famille.lg_FAMILLE_ID;
DECLARE vL TYPE OF t_inventaire_famille.lg_FAMILLE_ID;
DECLARE derniere DATETIME;
DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @prestige_dates_fiche = NULL; RESIGNAL; END;
SET vF = famille;
SET vL = famille;
SET derniere = (SELECT MAX(i.dt_UPDATED) FROM t_inventaire_famille l
  JOIN t_inventaire i ON i.lg_INVENTAIRE_ID = l.lg_INVENTAIRE_ID JOIN t_user u ON u.lg_USER_ID = i.lg_USER_ID
  WHERE l.lg_FAMILLE_ID = vL AND i.str_STATUT = 'is_Closed' AND u.lg_EMPLACEMENT_ID = '1');
SET @prestige_dates_fiche = 1;
UPDATE t_famille SET dt_LAST_INVENTAIRE = derniere WHERE lg_FAMILLE_ID = vF AND NOT (dt_LAST_INVENTAIRE <=> derniere);
SET @prestige_dates_fiche = NULL;
END@@

CREATE OR REPLACE PROCEDURE proc_fiche_inventaire_avancer(IN famille VARCHAR(40), IN quand DATETIME)
BEGIN
DECLARE vF TYPE OF t_famille.lg_FAMILLE_ID;
DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @prestige_dates_fiche = NULL; RESIGNAL; END;
SET vF = famille;
SET @prestige_dates_fiche = 1;
UPDATE t_famille SET dt_LAST_INVENTAIRE = quand
  WHERE lg_FAMILLE_ID = vF AND (dt_LAST_INVENTAIRE IS NULL OR dt_LAST_INVENTAIRE < quand);
SET @prestige_dates_fiche = NULL;
END@@

-- tous les articles de l'inventaire (toutes les lignes, avec ou sans ecart), en une mise a jour
CREATE OR REPLACE PROCEDURE proc_fiche_inventaire_avancer_inventaire(IN inventaire VARCHAR(40), IN quand DATETIME)
BEGIN
DECLARE vI TYPE OF t_inventaire_famille.lg_INVENTAIRE_ID;
DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @prestige_dates_fiche = NULL; RESIGNAL; END;
SET vI = inventaire;
SET @prestige_dates_fiche = 1;
UPDATE t_famille SET dt_LAST_INVENTAIRE = quand
  WHERE lg_FAMILLE_ID IN (SELECT l.lg_FAMILLE_ID FROM t_inventaire_famille l WHERE l.lg_INVENTAIRE_ID = vI)
  AND (dt_LAST_INVENTAIRE IS NULL OR dt_LAST_INVENTAIRE < quand)
  ORDER BY lg_FAMILLE_ID;
SET @prestige_dates_fiche = NULL;
END@@

CREATE OR REPLACE PROCEDURE proc_fiche_inventaire_recalculer_inventaire(IN inventaire VARCHAR(40))
BEGIN
DECLARE vI TYPE OF t_inventaire_famille.lg_INVENTAIRE_ID;
DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN SET @prestige_dates_fiche = NULL; RESIGNAL; END;
SET vI = inventaire;
SET @prestige_dates_fiche = 1;
UPDATE t_famille f SET f.dt_LAST_INVENTAIRE = (SELECT MAX(i.dt_UPDATED) FROM t_inventaire_famille l
    JOIN t_inventaire i ON i.lg_INVENTAIRE_ID = l.lg_INVENTAIRE_ID JOIN t_user u ON u.lg_USER_ID = i.lg_USER_ID
    WHERE l.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND i.str_STATUT = 'is_Closed' AND u.lg_EMPLACEMENT_ID = '1')
  WHERE f.lg_FAMILLE_ID IN (SELECT l.lg_FAMILLE_ID FROM t_inventaire_famille l WHERE l.lg_INVENTAIRE_ID = vI)
  ORDER BY f.lg_FAMILLE_ID;
SET @prestige_dates_fiche = NULL;
END@@

-- ------------------------------------------------------------------------------------------------ declencheurs : ventes

CREATE OR REPLACE TRIGGER t_preenregistrement_dates_fiche_au AFTER UPDATE ON t_preenregistrement FOR EACH ROW
BEGIN
DECLARE ancienne INT DEFAULT 0;
DECLARE nouvelle INT DEFAULT 0;
-- pendant la saisie (vente en cours), rien : seul le passage par l'etat cloture compte
IF (OLD.str_STATUT = 'is_Closed' OR NEW.str_STATUT = 'is_Closed')
   AND NOT (OLD.str_STATUT <=> NEW.str_STATUT AND OLD.b_IS_CANCEL <=> NEW.b_IS_CANCEL AND OLD.int_PRICE <=> NEW.int_PRICE
            AND OLD.dt_UPDATED <=> NEW.dt_UPDATED AND OLD.lg_USER_ID <=> NEW.lg_USER_ID) THEN
  IF OLD.str_STATUT = 'is_Closed' AND OLD.b_IS_CANCEL = 0 AND OLD.int_PRICE > 0
     AND EXISTS (SELECT 1 FROM t_user u WHERE u.lg_USER_ID = OLD.lg_USER_ID AND u.lg_EMPLACEMENT_ID = '1') THEN
    SET ancienne = 1;
  END IF;
  IF NEW.str_STATUT = 'is_Closed' AND NEW.b_IS_CANCEL = 0 AND NEW.int_PRICE > 0
     AND EXISTS (SELECT 1 FROM t_user u WHERE u.lg_USER_ID = NEW.lg_USER_ID AND u.lg_EMPLACEMENT_ID = '1') THEN
    SET nouvelle = 1;
  END IF;
  IF nouvelle = 1 AND (ancienne = 0 OR NEW.dt_UPDATED >= OLD.dt_UPDATED) THEN
    CALL proc_fiche_sortie_avancer_vente(NEW.lg_PREENREGISTREMENT_ID, NEW.dt_UPDATED);
  ELSEIF ancienne = 1 THEN
    CALL proc_fiche_sortie_recalculer_vente(NEW.lg_PREENREGISTREMENT_ID);
  END IF;
END IF;
END@@

CREATE OR REPLACE TRIGGER t_preenregistrement_detail_dates_fiche_ai AFTER INSERT ON t_preenregistrement_detail FOR EACH ROW
BEGIN
DECLARE quand DATETIME;
SET quand = (SELECT p.dt_UPDATED FROM t_preenregistrement p JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID
  WHERE p.lg_PREENREGISTREMENT_ID = NEW.lg_PREENREGISTREMENT_ID AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0
  AND p.int_PRICE > 0 AND u.lg_EMPLACEMENT_ID = '1');
IF quand IS NOT NULL THEN
  CALL proc_fiche_sortie_avancer(NEW.lg_FAMILLE_ID, quand);
END IF;
END@@

CREATE OR REPLACE TRIGGER t_preenregistrement_detail_dates_fiche_ad AFTER DELETE ON t_preenregistrement_detail FOR EACH ROW
BEGIN
IF EXISTS (SELECT 1 FROM t_preenregistrement p JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID
  WHERE p.lg_PREENREGISTREMENT_ID = OLD.lg_PREENREGISTREMENT_ID AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0
  AND p.int_PRICE > 0 AND u.lg_EMPLACEMENT_ID = '1') THEN
  CALL proc_fiche_sortie_recalculer(OLD.lg_FAMILLE_ID);
END IF;
END@@

CREATE OR REPLACE TRIGGER t_preenregistrement_detail_dates_fiche_au AFTER UPDATE ON t_preenregistrement_detail FOR EACH ROW
BEGIN
IF NOT (OLD.lg_FAMILLE_ID <=> NEW.lg_FAMILLE_ID AND OLD.lg_PREENREGISTREMENT_ID <=> NEW.lg_PREENREGISTREMENT_ID) THEN
  CALL proc_fiche_sortie_recalculer(OLD.lg_FAMILLE_ID);
  CALL proc_fiche_sortie_recalculer(NEW.lg_FAMILLE_ID);
END IF;
END@@

-- ------------------------------------------------------------------------------------------------ declencheurs : entrees

CREATE OR REPLACE TRIGGER hmvtproduit_dates_fiche_ai AFTER INSERT ON hmvtproduit FOR EACH ROW
BEGIN
IF NEW.typeMvt = '01' AND NEW.createdAt IS NOT NULL THEN
  CALL proc_fiche_entree_avancer(NEW.lg_FAMILLE_ID, NEW.createdAt);
END IF;
END@@

CREATE OR REPLACE TRIGGER hmvtproduit_dates_fiche_ad AFTER DELETE ON hmvtproduit FOR EACH ROW
BEGIN
IF OLD.typeMvt = '01' THEN
  CALL proc_fiche_entree_recalculer(OLD.lg_FAMILLE_ID);
END IF;
END@@

CREATE OR REPLACE TRIGGER t_bon_livraison_dates_fiche_au AFTER UPDATE ON t_bon_livraison FOR EACH ROW
BEGIN
IF NEW.str_STATUT = 'is_Closed' AND (NOT (OLD.str_STATUT <=> 'is_Closed') OR NEW.dt_UPDATED > OLD.dt_UPDATED) THEN
  CALL proc_fiche_entree_avancer_bl(NEW.lg_BON_LIVRAISON_ID, NEW.dt_UPDATED);
ELSEIF OLD.str_STATUT = 'is_Closed' AND NOT (NEW.str_STATUT <=> OLD.str_STATUT AND NEW.dt_UPDATED <=> OLD.dt_UPDATED) THEN
  CALL proc_fiche_entree_recalculer_bl(NEW.lg_BON_LIVRAISON_ID);
END IF;
END@@

CREATE OR REPLACE TRIGGER t_bon_livraison_detail_dates_fiche_ad AFTER DELETE ON t_bon_livraison_detail FOR EACH ROW
BEGIN
IF EXISTS (SELECT 1 FROM t_bon_livraison b WHERE b.lg_BON_LIVRAISON_ID = OLD.lg_BON_LIVRAISON_ID AND b.str_STATUT = 'is_Closed') THEN
  CALL proc_fiche_entree_recalculer(OLD.lg_FAMILLE_ID);
END IF;
END@@

-- ------------------------------------------------------------------------------------------------ declencheurs : inventaires

CREATE OR REPLACE TRIGGER t_inventaire_dates_fiche_au AFTER UPDATE ON t_inventaire FOR EACH ROW
BEGIN
DECLARE ancienne INT DEFAULT 0;
DECLARE nouvelle INT DEFAULT 0;
IF (OLD.str_STATUT = 'is_Closed' OR NEW.str_STATUT = 'is_Closed')
   AND NOT (OLD.str_STATUT <=> NEW.str_STATUT AND OLD.dt_UPDATED <=> NEW.dt_UPDATED AND OLD.lg_USER_ID <=> NEW.lg_USER_ID) THEN
  IF OLD.str_STATUT = 'is_Closed' AND EXISTS (SELECT 1 FROM t_user u WHERE u.lg_USER_ID = OLD.lg_USER_ID AND u.lg_EMPLACEMENT_ID = '1') THEN
    SET ancienne = 1;
  END IF;
  IF NEW.str_STATUT = 'is_Closed' AND EXISTS (SELECT 1 FROM t_user u WHERE u.lg_USER_ID = NEW.lg_USER_ID AND u.lg_EMPLACEMENT_ID = '1') THEN
    SET nouvelle = 1;
  END IF;
  IF nouvelle = 1 AND (ancienne = 0 OR NEW.dt_UPDATED >= OLD.dt_UPDATED) THEN
    CALL proc_fiche_inventaire_avancer_inventaire(NEW.lg_INVENTAIRE_ID, NEW.dt_UPDATED);
  ELSEIF ancienne = 1 THEN
    CALL proc_fiche_inventaire_recalculer_inventaire(NEW.lg_INVENTAIRE_ID);
  END IF;
END IF;
END@@

CREATE OR REPLACE TRIGGER t_inventaire_famille_dates_fiche_ai AFTER INSERT ON t_inventaire_famille FOR EACH ROW
BEGIN
DECLARE quand DATETIME;
SET quand = (SELECT i.dt_UPDATED FROM t_inventaire i JOIN t_user u ON u.lg_USER_ID = i.lg_USER_ID
  WHERE i.lg_INVENTAIRE_ID = NEW.lg_INVENTAIRE_ID AND i.str_STATUT = 'is_Closed' AND u.lg_EMPLACEMENT_ID = '1');
IF quand IS NOT NULL THEN
  CALL proc_fiche_inventaire_avancer(NEW.lg_FAMILLE_ID, quand);
END IF;
END@@

CREATE OR REPLACE TRIGGER t_inventaire_famille_dates_fiche_ad AFTER DELETE ON t_inventaire_famille FOR EACH ROW
BEGIN
IF EXISTS (SELECT 1 FROM t_inventaire i JOIN t_user u ON u.lg_USER_ID = i.lg_USER_ID
  WHERE i.lg_INVENTAIRE_ID = OLD.lg_INVENTAIRE_ID AND i.str_STATUT = 'is_Closed' AND u.lg_EMPLACEMENT_ID = '1') THEN
  CALL proc_fiche_inventaire_recalculer(OLD.lg_FAMILLE_ID);
END IF;
END@@

DELIMITER ;
