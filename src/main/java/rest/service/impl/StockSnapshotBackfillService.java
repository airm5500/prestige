package rest.service.impl;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Asynchronous;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.SupportEventService;
import util.Constant;

/**
 * Reprise de l'historique de valorisation vers stock_snapshot_day.
 *
 * <p>
 * Deux sources, dans cet ordre de confiance :
 * </p>
 *
 * <ol>
 * <li><b>t_stock_snapshot</b>, l'archive relationnelle. Chaque ligne porte la quantite, le prix d'achat, le prix de
 * vente, le PMP et le taux de TVA figes a la date reelle du releve. Elle n'a pas de colonne de reserve, donc aucune
 * reserve inventee ne peut s'y glisser. C'est la source de reference.</li>
 * <li><b>stock_snapshot.stock_journalier</b>, l'archive JSON, uniquement pour les journees que la premiere ne couvre
 * pas. Elle a perdu le PMP (recopie du prix d'achat), n'a jamais porte le taux de TVA, et peut contenir une reserve
 * fabriquee ; on ne s'en sert donc que faute de mieux.</li>
 * </ol>
 *
 * <p>
 * La reprise procede journee par journee pour la premiere source et par pages de documents pour la seconde, memorise sa
 * progression, et peut etre interrompue puis reprise. L'ecriture est idempotente : relancer la reprise corrige les
 * lignes deja ecrites au lieu d'en creer de nouvelles.
 * </p>
 *
 * @author koben
 */
@Stateless
public class StockSnapshotBackfillService {

    private static final Logger LOG = Logger.getLogger(StockSnapshotBackfillService.class.getName());

    /** Fenetre glissante conservee au jour le jour, en plus des clotures de mois. */
    public static final int RETENTION_JOURS = 90;

    /** Nombre de documents JSON lus par page. Chaque document pese plusieurs Ko : on garde des pages courtes. */
    private static final int TAILLE_PAGE = 100;

    /**
     * Nombre de documents parmi les plus volumineux servant a completer le calendrier avec les journees que seul le
     * JSON connait. Un produit suivi depuis l'origine les porte toutes ; en prendre plusieurs protege du cas ou l'un
     * d'eux serait tronque.
     */
    private static final int DOCUMENTS_CALENDRIER = 5;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private StockSnapshotBackfillService self;

    @EJB
    private StockSnapshotDayService stockSnapshotDayService;

    @EJB
    private ReserveHistoriqueService reserveHistoriqueService;

    @EJB
    private SupportEventService supportEventService;

    /**
     * Lance ou poursuit la reprise. Sans effet une fois terminee : le traitement peut etre planifie chaque nuit et
     * declenche a la main sans precaution particuliere.
     */
    @Asynchronous
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public void executerAsync() {
        try {
            Map<String, Object> etat = lireEtat();
            if (etat == null) {
                LOG.warning("Reprise historique : table stock_snapshot_backfill absente, reprise ignoree.");
                return;
            }
            if (estTerminee(etat)) {
                return;
            }

            Set<Integer> journees = journeesRetenues(etat);
            if (journees.isEmpty()) {
                LOG.warning("Reprise historique : aucune journee a reprendre, reprise close.");
                self.cloturer();
                return;
            }

            // La borne de reserve est resolue une fois : elle decide, journee par journee, si la reserve deja
            // enregistree doit etre remise a zero ou laissee telle quelle.
            int borneReserve = borneReserve();

            Set<Integer> journeesTransit = journeesTransit();
            LOG.log(Level.INFO,
                    "Reprise historique : {0} journees retenues, dont {1} depuis l''archive relationnelle. "
                            + "Reserve consideree comme non suivie avant le {2}.",
                    new Object[] { journees.size(), compterCommunes(journees, journeesTransit), borneReserve });

            reprendreDepuisTransit(etat, journees, journeesTransit, borneReserve);
            reprendreDepuisJson(lireEtat(), journees, journeesTransit, borneReserve);

            self.cloturer();
            Map<String, Object> bilan = lireEtat();
            LOG.log(Level.INFO,
                    "Reprise historique terminee : {0} journees reprises de l''archive relationnelle, "
                            + "{1} documents JSON lus ({2} invalides), {3} lignes ecrites.",
                    new Object[] { bilan.get("journees_reprises"), bilan.get("documents_lus"),
                            bilan.get("documents_invalides"), bilan.get("lignes_importees") });
            supportEventService.recordJobRun("REPRISE_SNAPSHOT_DAY");

        } catch (Exception e) {
            // La progression est enregistree : le prochain declenchement repartira ou celui-ci s'est arrete.
            LOG.log(Level.SEVERE, "Reprise historique interrompue", e);
        }
    }

    // ------------------------------------------------------------------ etape 1 : archive relationnelle

    /**
     * Reprend, journee par journee, les journees presentes dans l'archive relationnelle.
     *
     * <p>
     * Une journee est traitee par un seul ordre SQL : la lecture et l'ecriture restent dans la base, sans transiter par
     * le serveur d'application. La transaction ne dure donc que le temps d'une journee de releve.
     * </p>
     */
    private void reprendreDepuisTransit(Map<String, Object> etat, Set<Integer> journees, Set<Integer> journeesTransit,
            int borneReserve) {
        Object derniere = etat.get("derniere_journee");
        int reprise = derniere == null ? 0 : ((Number) derniere).intValue();

        for (Integer journee : journees) {
            if (journee <= reprise || !journeesTransit.contains(journee)) {
                continue;
            }
            int lignes = self.reprendreJourneeTransit(journee, journee < borneReserve);
            self.enregistrerJourneeReprise(journee, lignes);
        }
    }

    /**
     * Copie une journee de l'archive relationnelle vers le releve.
     *
     * @param journee
     *            journee au format yyyyMMdd
     * @param reserveNonSuivie
     *            {@code true} si la journee precede l'activation de la reserve : la reserve est alors remise a zero,
     *            seule valeur exacte. Sinon la valeur deja enregistree est conservee, l'archive relationnelle ne
     *            portant aucune information de reserve et n'ayant donc rien de mieux a proposer.
     *
     * @return nombre de lignes ecrites
     */
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public int reprendreJourneeTransit(int journee, boolean reserveNonSuivie) {
        String reserve = reserveNonSuivie ? "0" : "stock_snapshot_day.qty_reserve";
        return em.createNativeQuery("INSERT INTO stock_snapshot_day (stock_of_day, magasin_id, produit_id, qty, "
                + "qty_reserve, prix_paf, prix_uni, prix_moyen_pondere, valeur_tva) "
                + "SELECT YEAR(t.id)*10000 + MONTH(t.id)*100 + DAY(t.id), t.magasin, t.familleId, "
                + "COALESCE(t.qty,0), 0, COALESCE(t.prixPaf,0), COALESCE(t.prixUni,0), "
                + "COALESCE(t.prix_moyent_pondere,0), COALESCE(t.valeurTva,0) " + "FROM t_stock_snapshot t "
                + "WHERE YEAR(t.id)*10000 + MONTH(t.id)*100 + DAY(t.id) = ?1 "
                + "ON DUPLICATE KEY UPDATE qty = VALUES(qty), qty_reserve = " + reserve + ", "
                + "prix_paf = VALUES(prix_paf), prix_uni = VALUES(prix_uni), "
                + "prix_moyen_pondere = VALUES(prix_moyen_pondere), valeur_tva = VALUES(valeur_tva), "
                + "updated_at = CURRENT_TIMESTAMP").setParameter(1, journee).executeUpdate();
    }

    // ------------------------------------------------------------------ etape 2 : archive JSON

    /** Reprend depuis le JSON les seules journees que l'archive relationnelle ne couvre pas. */
    private void reprendreDepuisJson(Map<String, Object> etat, Set<Integer> journees, Set<Integer> journeesTransit,
            int borneReserve) {
        Set<Integer> manquantes = new TreeSet<>(journees);
        manquantes.removeAll(journeesTransit);
        if (manquantes.isEmpty()) {
            return;
        }
        LOG.log(Level.INFO,
                "Reprise historique : {0} journees absentes de l''archive relationnelle, " + "reprises depuis le JSON.",
                manquantes.size());

        String dernierId = (String) etat.get("dernier_produit_id");
        String suite;
        do {
            suite = self.traiterPageJson(dernierId, manquantes, borneReserve);
            if (suite != null) {
                dernierId = suite;
            }
        } while (suite != null);
    }

    /**
     * Traite une page de documents JSON dans une transaction courte dediee.
     *
     * @return l'identifiant du dernier document de la page, ou {@code null} s'il n'y avait plus rien a traiter
     */
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    @SuppressWarnings("unchecked")
    public String traiterPageJson(String dernierId, Set<Integer> journees, int borneReserve) {

        List<Object[]> page = em
                .createNativeQuery("SELECT ss.id, ss.produit_id, ss.stock_journalier FROM stock_snapshot ss "
                        + "WHERE ss.id > ?1 ORDER BY ss.id LIMIT " + TAILLE_PAGE)
                .setParameter(1, dernierId == null ? "" : dernierId).getResultList();

        if (page.isEmpty()) {
            return null;
        }

        List<StockSnapshotDayService.Ligne> lignes = new ArrayList<>();
        int invalides = 0;
        String fin = null;

        for (Object[] ligne : page) {
            fin = ligne[0] == null ? fin : ligne[0].toString();
            String produitId = ligne[1] == null ? null : ligne[1].toString();
            String json = enChaine(ligne[2]);
            if (produitId == null || json == null || json.isEmpty()) {
                invalides++;
                continue;
            }
            try {
                lignes.addAll(convertir(produitId, json, journees, borneReserve));
            } catch (Exception e) {
                invalides++;
                LOG.log(Level.WARNING, "Reprise historique : document illisible pour le produit " + produitId, e);
            }
        }

        int importees = stockSnapshotDayService.upsert(lignes);
        enregistrerProgressionJson(fin, page.size(), invalides, importees);
        return fin;
    }

    /**
     * Convertit un document JSON en lignes de releve, en ne retenant que les journees demandees.
     *
     * <p>
     * La reserve n'est reprise que pour les journees posterieures a l'activation de son suivi : sur celles-la, le
     * document a ete ecrit par le releve quotidien et la valeur est reelle. Avant l'activation, la valeur du document
     * est celle que l'ancien vidage a fabriquee — la reserve du jour de la migration appliquee a une date ancienne — et
     * elle est remplacee par zero, seule valeur exacte. Sans cette borne, la phase JSON reintroduirait la fausse
     * reserve que l'assainissement vient de retirer.
     * </p>
     */
    private List<StockSnapshotDayService.Ligne> convertir(String produitId, String json, Set<Integer> journees,
            int borneReserve) {
        List<StockSnapshotDayService.Ligne> lignes = new ArrayList<>();
        JSONArray tableau = new JSONArray(json);
        for (int i = 0; i < tableau.length(); i++) {
            JSONObject jour = tableau.optJSONObject(i);
            if (jour == null) {
                continue;
            }
            int stockOfDay = jour.optInt("stockOfDay", 0);
            if (!journees.contains(stockOfDay)) {
                continue;
            }
            lignes.add(new StockSnapshotDayService.Ligne(stockOfDay, Constant.OFFICINE, produitId,
                    jour.optInt("qty", 0), reserveReprise(stockOfDay, borneReserve, jour.optInt("qtyReserve", 0)),
                    jour.optInt("prixPaf", 0), jour.optInt("prixUni", 0), jour.optInt("prixMoyentpondere", 0),
                    // Le document JSON ne porte pas le taux de TVA ; l'archive relationnelle, elle, le porte.
                    0));
        }
        return lignes;
    }

    /**
     * Reserve a inscrire pour une journee reprise du JSON : la valeur du document si la journee est posterieure a
     * l'activation du suivi, zero sinon.
     */
    static int reserveReprise(int stockOfDay, int borneReserve, int valeurDocument) {
        return stockOfDay < borneReserve ? 0 : valeurDocument;
    }

    // ------------------------------------------------------------------ calendrier et retention

    /**
     * Journees a reprendre : la fenetre glissante des {@value #RETENTION_JOURS} derniers jours, plus, pour chaque mois,
     * la premiere et la derniere journee effectivement relevee.
     */
    private Set<Integer> journeesRetenues(Map<String, Object> etat) {
        String memorisees = (String) etat.get("journees_retenues");
        if (memorisees != null && !memorisees.trim().isEmpty()) {
            Set<Integer> jours = new TreeSet<>();
            for (String valeur : memorisees.split(",")) {
                try {
                    jours.add(Integer.parseInt(valeur.trim()));
                } catch (NumberFormatException e) {
                    // valeur parasite : ignoree, le calendrier reste exploitable
                }
            }
            if (!jours.isEmpty()) {
                return jours;
            }
        }

        Set<Integer> calendrier = new TreeSet<>(journeesTransit());
        calendrier.addAll(journeesJson());
        int limite = Integer
                .parseInt(LocalDate.now().minusDays(RETENTION_JOURS).format(DateTimeFormatter.ofPattern("yyyyMMdd")));
        Set<Integer> retenues = journeesConservees(calendrier, limite);
        self.memoriserJournees(retenues);
        return retenues;
    }

    /**
     * Regle de retention, isolee de toute base pour rester verifiable : une journee est conservee si elle tombe dans la
     * fenetre glissante, ou si c'est la premiere ou la derniere journee relevee de son mois.
     *
     * <p>
     * {@code jour / 100} donne le mois d'une journee au format yyyyMMdd. Aucun numero de jour n'est ecrit en dur :
     * fevrier, les mois de 30 ou 31 jours et les periodes de fermeture se traitent d'eux-memes, puisque la regle porte
     * sur les journees effectivement relevees et non sur le calendrier theorique.
     * </p>
     *
     * @param calendrier
     *            journees effectivement relevees, au format yyyyMMdd
     * @param limite
     *            premiere journee de la fenetre glissante, au format yyyyMMdd
     *
     * @return journees a conserver, triees
     */
    static Set<Integer> journeesConservees(Set<Integer> calendrier, int limite) {
        Map<Integer, Integer> premiereDuMois = new HashMap<>();
        Map<Integer, Integer> derniereDuMois = new HashMap<>();
        for (Integer jour : calendrier) {
            int mois = jour / 100;
            premiereDuMois.merge(mois, jour, Math::min);
            derniereDuMois.merge(mois, jour, Math::max);
        }

        Set<Integer> retenues = new TreeSet<>();
        for (Integer jour : calendrier) {
            int mois = jour / 100;
            // intValue() : comparer deux Integer par == teste les references, ce qui ne tient pas au-dela du cache
            // des petites valeurs. Une journee vaut plus de 20 000 000.
            if (jour >= limite || jour.intValue() == premiereDuMois.get(mois).intValue()
                    || jour.intValue() == derniereDuMois.get(mois).intValue()) {
                retenues.add(jour);
            }
        }
        return retenues;
    }

    /** Journees presentes dans l'archive relationnelle. */
    @SuppressWarnings("unchecked")
    private Set<Integer> journeesTransit() {
        Set<Integer> jours = new TreeSet<>();
        try {
            List<Object> lignes = em
                    .createNativeQuery("SELECT DISTINCT YEAR(id)*10000 + MONTH(id)*100 + DAY(id) FROM t_stock_snapshot")
                    .getResultList();
            for (Object l : lignes) {
                if (l != null) {
                    jours.add(((Number) l).intValue());
                }
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Lecture du calendrier de l'archive relationnelle", e);
        }
        return jours;
    }

    /**
     * Journees que seul le JSON connait, reconstituees a partir des documents les plus volumineux : un produit suivi
     * depuis l'origine porte une entree par journee ou le releve a tourne.
     */
    @SuppressWarnings("unchecked")
    private Set<Integer> journeesJson() {
        Set<Integer> jours = new TreeSet<>();
        try {
            List<Object> documents = em.createNativeQuery("SELECT ss.stock_journalier FROM stock_snapshot ss "
                    + "WHERE ss.stock_journalier IS NOT NULL ORDER BY LENGTH(ss.stock_journalier) DESC LIMIT "
                    + DOCUMENTS_CALENDRIER).getResultList();
            for (Object document : documents) {
                String json = enChaine(document);
                if (json == null || json.isEmpty()) {
                    continue;
                }
                JSONArray tableau = new JSONArray(json);
                for (int i = 0; i < tableau.length(); i++) {
                    JSONObject jour = tableau.optJSONObject(i);
                    if (jour != null && jour.optInt("stockOfDay", 0) > 0) {
                        jours.add(jour.optInt("stockOfDay"));
                    }
                }
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Lecture du calendrier de l'archive JSON", e);
        }
        return jours;
    }

    private int compterCommunes(Set<Integer> a, Set<Integer> b) {
        int n = 0;
        for (Integer v : a) {
            if (b.contains(v)) {
                n++;
            }
        }
        return n;
    }

    /**
     * Journee a partir de laquelle la reserve est consideree comme suivie. Les journees anterieures voient leur reserve
     * remise a zero, seule valeur exacte avant l'activation de la fonctionnalite.
     */
    private int borneReserve() {
        String depuis = reserveHistoriqueService.reserveDepuis();
        if (ReserveHistoriqueService.JAMAIS_ACTIVEE.equals(depuis)) {
            return 99999999;
        }
        if (ReserveHistoriqueService.INDETERMINEE.equals(depuis)) {
            // Non datable : on ne touche a aucune reserve deja enregistree.
            return 0;
        }
        try {
            return Integer.parseInt(depuis);
        } catch (NumberFormatException e) {
            LOG.log(Level.WARNING, "Date d''activation de la reserve illisible : {0}", depuis);
            return 0;
        }
    }

    // ------------------------------------------------------------------ etat

    @SuppressWarnings("unchecked")
    private Map<String, Object> lireEtat() {
        try {
            List<Object[]> lignes = em.createNativeQuery(
                    "SELECT dernier_produit_id, documents_lus, documents_invalides, lignes_importees, "
                            + "journees_retenues, termine, derniere_journee, journees_reprises "
                            + "FROM stock_snapshot_backfill WHERE id = 1")
                    .getResultList();
            if (lignes.isEmpty()) {
                return null;
            }
            Object[] l = lignes.get(0);
            Map<String, Object> etat = new HashMap<>();
            etat.put("dernier_produit_id", l[0] == null ? null : l[0].toString());
            etat.put("documents_lus", l[1]);
            etat.put("documents_invalides", l[2]);
            etat.put("lignes_importees", l[3]);
            etat.put("journees_retenues", l[4] == null ? null : l[4].toString());
            etat.put("termine", l[5]);
            etat.put("derniere_journee", l[6]);
            etat.put("journees_reprises", l[7]);
            return etat;
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Reprise historique : etat illisible", e);
            return null;
        }
    }

    private boolean estTerminee(Map<String, Object> etat) {
        Object termine = etat.get("termine");
        return termine instanceof Number && ((Number) termine).intValue() == 1;
    }

    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void cloturer() {
        em.createNativeQuery("UPDATE stock_snapshot_backfill SET termine = 1, etape = 'TERMINE' WHERE id = 1")
                .executeUpdate();
    }

    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void enregistrerJourneeReprise(int journee, int lignes) {
        em.createNativeQuery("UPDATE stock_snapshot_backfill SET derniere_journee = ?1, "
                + "journees_reprises = journees_reprises + 1, lignes_importees = lignes_importees + ?2, "
                + "started_at = COALESCE(started_at, CURRENT_TIMESTAMP) WHERE id = 1").setParameter(1, journee)
                .setParameter(2, lignes).executeUpdate();
    }

    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public void enregistrerProgressionJson(String dernierId, int lus, int invalides, int importees) {
        em.createNativeQuery("UPDATE stock_snapshot_backfill SET dernier_produit_id = ?1, etape = 'JSON', "
                + "documents_lus = documents_lus + ?2, documents_invalides = documents_invalides + ?3, "
                + "lignes_importees = lignes_importees + ?4, "
                + "started_at = COALESCE(started_at, CURRENT_TIMESTAMP) WHERE id = 1").setParameter(1, dernierId)
                .setParameter(2, lus).setParameter(3, invalides).setParameter(4, importees).executeUpdate();
    }

    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void memoriserJournees(Set<Integer> journees) {
        StringBuilder liste = new StringBuilder();
        for (Integer jour : journees) {
            if (liste.length() > 0) {
                liste.append(",");
            }
            liste.append(jour);
        }
        em.createNativeQuery("UPDATE stock_snapshot_backfill SET journees_retenues = ?1 WHERE id = 1")
                .setParameter(1, liste.toString()).executeUpdate();
    }

    /** La colonne stock_journalier remonte en String ou en byte[] selon le pilote : on normalise. */
    private String enChaine(Object valeur) {
        if (valeur instanceof Object[]) {
            Object[] tableau = (Object[]) valeur;
            valeur = tableau.length > 0 ? tableau[0] : null;
        }
        if (valeur == null) {
            return null;
        }
        if (valeur instanceof String) {
            return (String) valeur;
        }
        if (valeur instanceof byte[]) {
            return new String((byte[]) valeur, StandardCharsets.UTF_8);
        }
        return valeur.toString();
    }
}
