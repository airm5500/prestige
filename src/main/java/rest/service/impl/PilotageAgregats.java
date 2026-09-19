package rest.service.impl;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Asynchronous;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.Tuple;

/**
 * Agregats mensuels du menu de pilotage : chaque mois est calcule UNE FOIS, puis relu.
 *
 * <p>
 * <b>Le probleme resolu.</b> Retour de l'officine du 19/09 : l'ecran mettait 17 a 71 secondes par onglet et rendait
 * parfois une erreur 500. Chaque ouverture relisait douze a vingt-quatre mois de DETAIL de ventes pour en refaire la
 * somme. Or un mois clos ne change plus jamais : le recalculer a chaque clic est un gaspillage qui GRANDIT avec
 * l'historique, c'est-a-dire un ecran qui devient plus lent chaque mois.
 *
 * <p>
 * <b>La regle.</b> Un mois clos est calcule une fois et conserve. Le mois en cours est rafraichi au plus une fois
 * toutes les dix minutes. Les chiffres sont ceux des memes requetes qu'avant (voir {@link PilotageSql}) : l'ecran ne
 * change pas de chiffres, il change de vitesse.
 *
 * <p>
 * <b>Le premier affichage.</b> Sur une base qui n'a encore aucun agregat, tout calculer d'un coup prendrait une minute
 * et l'ecran semblerait bloque. On calcule donc les mois les plus RECENTS en priorite, dans un budget de temps borne,
 * et le reste part en tache de fond : l'operateur voit tout de suite les mois qui l'interessent, et l'historique se
 * complete pendant qu'il travaille.
 *
 * <p>
 * <b>Les transactions.</b> Les lectures n'en ouvrent aucune ({@code NOT_SUPPORTED}) : une requete qui echoue dans une
 * transaction la condamne, et l'appel suivant recoit alors « Client's transaction aborted » - c'est exactement l'erreur
 * 500 remontee par l'officine. Les ecritures, elles, prennent leur propre transaction, une par mois : un mois qui
 * echoue n'emporte pas les autres.
 */
@Stateless
@TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
public class PilotageAgregats {

    private static final Logger LOG = Logger.getLogger(PilotageAgregats.class.getName());

    /** Budget de calcul d'une demande : au-dela, le reste part en tache de fond. */
    private static final long BUDGET_MS = 12_000L;

    /** Au-dela de ce delai, le mois en cours est recalcule (les mois clos, jamais). */
    private static final long FRAICHEUR_MOIS_COURANT_MS = 10L * 60L * 1000L;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private PilotageAgregats moiMeme;

    /** Les grandeurs d'un mois, telles que les onglets les consomment. */
    public static final class Agregat {

        public final String mois;
        public double caTTC;
        public int nbVentes;
        public double remises;
        public double partTiersPayant;
        public double caHT;
        public double coutAchat;
        public double achatTTC;
        public int nbBons;
        public double encaisse;
        public int nbAnnulees;
        public double montantAnnule;
        public double entreesStock;
        public double sortiesStock;

        public Agregat(String mois) {
            this.mois = mois;
        }

        public double marge() {
            return caHT - coutAchat;
        }
    }

    /**
     * Les agregats des mois demandes, calculant ceux qui manquent dans la limite du budget.
     *
     * @param mois
     *            liste de mois au format AAAA-MM, du plus ancien au plus recent
     */
    public Map<String, Agregat> agregats(List<String> mois) {
        Map<String, Agregat> connus = lire(mois);
        List<String> aCalculer = new ArrayList<>();
        String moisCourant = YearMonth.now().toString();
        for (String m : mois) {
            Agregat a = connus.get(m);
            if (a == null) {
                aCalculer.add(m);
            } else if (m.equals(moisCourant) && perime(m)) {
                aCalculer.add(m);
            }
        }
        if (aCalculer.isEmpty()) {
            return connus;
        }
        /*
         * Du plus RECENT au plus ancien : ce sont les mois que l'operateur regarde en premier, et ce sont eux qui
         * doivent apparaitre dans le budget de la premiere demande.
         */
        java.util.Collections.sort(aCalculer, java.util.Collections.reverseOrder());
        long debut = System.currentTimeMillis();
        List<String> restants = new ArrayList<>();
        for (String m : aCalculer) {
            if (System.currentTimeMillis() - debut > BUDGET_MS) {
                restants.add(m);
                continue;
            }
            Agregat calcule = moiMeme.calculerEtEnregistrer(m);
            if (calcule != null) {
                connus.put(m, calcule);
            }
        }
        if (!restants.isEmpty()) {
            /*
             * Le reste part en tache de fond : la demande en cours rend ce qu'elle a, et l'historique se complete
             * pendant que l'operateur travaille. Un ecran qui affiche neuf mois tout de suite vaut mieux qu'un ecran
             * qui affiche douze mois au bout d'une minute.
             */
            moiMeme.completerEnFond(restants);
        }
        return connus;
    }

    /** Les mois deja calcules, parmi ceux demandes. */
    @SuppressWarnings("unchecked")
    public Map<String, Agregat> lire(List<String> mois) {
        Map<String, Agregat> out = new LinkedHashMap<>();
        if (mois == null || mois.isEmpty()) {
            return out;
        }
        try {
            Query q = em.createNativeQuery("SELECT a.str_MOIS AS mois, a.int_CA_TTC AS caTTC,"
                    + " a.int_NB_VENTES AS nbVentes, a.int_REMISES AS remises, a.int_PART_TP AS partTp,"
                    + " a.int_CA_HT AS caHT, a.int_COUT_ACHAT AS coutAchat, a.int_ACHAT_TTC AS achatTTC,"
                    + " a.int_NB_BONS AS nbBons, a.int_ENCAISSE AS encaisse, a.int_NB_ANNULEES AS nbAnnulees,"
                    + " a.int_MONTANT_ANNULE AS montantAnnule, a.int_ENTREES_STOCK AS entrees,"
                    + " a.int_SORTIES_STOCK AS sorties"
                    + " FROM pilotage_agregat_mensuel a WHERE a.lg_EMPLACEMENT_ID = ?1"
                    + " AND a.str_MOIS >= ?2 AND a.str_MOIS <= ?3", Tuple.class);
            q.setParameter(1, PilotageSql.EMPLACEMENT_OFFICINE);
            q.setParameter(2, mois.get(0));
            q.setParameter(3, mois.get(mois.size() - 1));
            for (Tuple t : (List<Tuple>) q.getResultList()) {
                Agregat a = new Agregat(t.get("mois", String.class));
                a.caTTC = nombre(t.get("caTTC"));
                a.nbVentes = entier(t.get("nbVentes"));
                a.remises = nombre(t.get("remises"));
                a.partTiersPayant = nombre(t.get("partTp"));
                a.caHT = nombre(t.get("caHT"));
                a.coutAchat = nombre(t.get("coutAchat"));
                a.achatTTC = nombre(t.get("achatTTC"));
                a.nbBons = entier(t.get("nbBons"));
                a.encaisse = nombre(t.get("encaisse"));
                a.nbAnnulees = entier(t.get("nbAnnulees"));
                a.montantAnnule = nombre(t.get("montantAnnule"));
                a.entreesStock = nombre(t.get("entrees"));
                a.sortiesStock = nombre(t.get("sorties"));
                out.put(a.mois, a);
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "pilotage : lecture des agregats", e);
        }
        return out;
    }

    private boolean perime(String mois) {
        try {
            Object calcul = em
                    .createNativeQuery("SELECT a.dt_CALCUL FROM pilotage_agregat_mensuel a"
                            + " WHERE a.str_MOIS = ?1 AND a.lg_EMPLACEMENT_ID = ?2")
                    .setParameter(1, mois).setParameter(2, PilotageSql.EMPLACEMENT_OFFICINE).getSingleResult();
            if (calcul instanceof java.sql.Timestamp) {
                return System.currentTimeMillis() - ((java.sql.Timestamp) calcul).getTime() > FRAICHEUR_MOIS_COURANT_MS;
            }
        } catch (Exception e) {
            LOG.log(Level.FINE, "fraicheur d'un agregat", e);
        }
        return true;
    }

    /**
     * Calcule un mois et l'enregistre, dans SA PROPRE transaction.
     *
     * <p>
     * Une transaction par mois : un mois qui echoue - donnee aberrante, verrou - n'emporte pas les autres, et la
     * demande en cours continue avec ce qu'elle a.
     */
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public Agregat calculerEtEnregistrer(String mois) {
        try {
            LocalDate debut = LocalDate.parse(mois + "-01");
            LocalDate fin = debut.plusMonths(1);
            Agregat a = new Agregat(mois);
            lireUneLigne(PilotageSql.totauxVentes(), debut, fin, t -> {
                a.caTTC = nombre(t.get("caTTC"));
                a.nbVentes = entier(t.get("nbVentes"));
                a.remises = nombre(t.get("remises"));
                a.partTiersPayant = nombre(t.get("partTiersPayant"));
            });
            lireUneLigne(PilotageSql.totauxMarge(), debut, fin, t -> {
                a.caHT = nombre(t.get("caHT"));
                a.coutAchat = nombre(t.get("coutAchat"));
            });
            lireUneLigne(PilotageSql.totauxAchats(), debut, fin, t -> {
                a.achatTTC = nombre(t.get("achatTTC"));
                a.nbBons = entier(t.get("nbBons"));
            });
            lireUneLigne(PilotageSql.totalEncaisse(), debut, fin, t -> a.encaisse = nombre(t.get("encaisse")));
            lireUneLigne(PilotageSql.totalAnnulations(), debut, fin, t -> {
                a.nbAnnulees = entier(t.get("nbAnnulees"));
                a.montantAnnule = nombre(t.get("montantAnnule"));
            });
            lireUneLigne(PilotageSql.entreesStockParMois(), debut, fin, t -> a.entreesStock = nombre(t.get("montant")));
            lireUneLigne(PilotageSql.sortiesStockParMois(), debut, fin, t -> a.sortiesStock = nombre(t.get("montant")));
            boolean clos = fin.isBefore(LocalDate.now().withDayOfMonth(1).plusDays(1))
                    && !mois.equals(YearMonth.now().toString());
            enregistrer(a, clos);
            return a;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "pilotage : calcul de l'agregat " + mois, e);
            return null;
        }
    }

    /** Complete l'historique en tache de fond, un mois a la fois. */
    @Asynchronous
    public void completerEnFond(List<String> mois) {
        for (String m : mois) {
            try {
                moiMeme.calculerEtEnregistrer(m);
            } catch (Exception e) {
                LOG.log(Level.WARNING, "pilotage : agregat de fond " + m, e);
            }
        }
        LOG.log(Level.INFO, "Pilotage : {0} mois d''agregats completes en tache de fond", mois.size());
    }

    @SuppressWarnings("unchecked")
    private void lireUneLigne(String sql, LocalDate debut, LocalDate fin, java.util.function.Consumer<Tuple> pose) {
        try {
            Query q = em.createNativeQuery(sql, Tuple.class);
            q.setParameter("debut", java.sql.Timestamp.valueOf(debut.atStartOfDay()));
            q.setParameter("fin", java.sql.Timestamp.valueOf(fin.atStartOfDay()));
            if (sql.contains(":typeExclu")) {
                q.setParameter("typeExclu", PilotageSql.TYPE_VENTE_EXCLU);
            }
            for (Tuple t : (List<Tuple>) q.getResultList()) {
                pose.accept(t);
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "pilotage : une grandeur du mois n'a pas pu etre calculee", e);
        }
    }

    /**
     * Ecriture d'un agregat.
     *
     * <p>
     * Un seul ordre, qui remplace la ligne si elle existe : deux operateurs qui ouvrent l'ecran en meme temps calculent
     * le meme mois, et un « effacer puis inserer » les ferait entrer en collision sur la cle.
     */
    private void enregistrer(Agregat a, boolean clos) {
        em.createNativeQuery("INSERT INTO pilotage_agregat_mensuel (str_MOIS, lg_EMPLACEMENT_ID, int_CA_TTC,"
                + " int_NB_VENTES, int_REMISES, int_PART_TP, int_CA_HT, int_COUT_ACHAT, int_ACHAT_TTC,"
                + " int_NB_BONS, int_ENCAISSE, int_NB_ANNULEES, int_MONTANT_ANNULE, int_ENTREES_STOCK,"
                + " int_SORTIES_STOCK, b_CLOS, dt_CALCUL)"
                + " VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, NOW())"
                + " ON DUPLICATE KEY UPDATE int_CA_TTC = VALUES(int_CA_TTC), int_NB_VENTES = VALUES(int_NB_VENTES),"
                + " int_REMISES = VALUES(int_REMISES), int_PART_TP = VALUES(int_PART_TP),"
                + " int_CA_HT = VALUES(int_CA_HT), int_COUT_ACHAT = VALUES(int_COUT_ACHAT),"
                + " int_ACHAT_TTC = VALUES(int_ACHAT_TTC), int_NB_BONS = VALUES(int_NB_BONS),"
                + " int_ENCAISSE = VALUES(int_ENCAISSE), int_NB_ANNULEES = VALUES(int_NB_ANNULEES),"
                + " int_MONTANT_ANNULE = VALUES(int_MONTANT_ANNULE), int_ENTREES_STOCK = VALUES(int_ENTREES_STOCK),"
                + " int_SORTIES_STOCK = VALUES(int_SORTIES_STOCK), b_CLOS = VALUES(b_CLOS), dt_CALCUL = NOW()")
                .setParameter(1, a.mois).setParameter(2, PilotageSql.EMPLACEMENT_OFFICINE)
                .setParameter(3, Math.round(a.caTTC)).setParameter(4, a.nbVentes).setParameter(5, Math.round(a.remises))
                .setParameter(6, Math.round(a.partTiersPayant)).setParameter(7, Math.round(a.caHT))
                .setParameter(8, Math.round(a.coutAchat)).setParameter(9, Math.round(a.achatTTC))
                .setParameter(10, a.nbBons).setParameter(11, Math.round(a.encaisse)).setParameter(12, a.nbAnnulees)
                .setParameter(13, Math.round(a.montantAnnule)).setParameter(14, Math.round(a.entreesStock))
                .setParameter(15, Math.round(a.sortiesStock)).setParameter(16, clos ? 1 : 0).executeUpdate();
    }

    private static double nombre(Object valeur) {
        return valeur instanceof Number ? ((Number) valeur).doubleValue() : 0d;
    }

    private static int entier(Object valeur) {
        return valeur instanceof Number ? ((Number) valeur).intValue() : 0;
    }
}
