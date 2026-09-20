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

    /** Au-dela de ce delai, le mois en cours est recalcule. */
    private static final long FRAICHEUR_MOIS_COURANT_MS = 10L * 60L * 1000L;

    /**
     * Au-dela de ce delai, un mois RECEMMENT CLOS est recalcule une fois par jour, en tache de fond.
     *
     * <p>
     * Un mois clos ne change plus... sauf quand on regularise : une vente annulee apres coup, un bon de livraison saisi
     * en retard, une correction de caisse. Ces gestes portent presque toujours sur le mois qui vient de finir. Les deux
     * derniers mois clos sont donc revus une fois par jour ; au-dela, seul un recalcul demande a la main reprend
     * l'historique - c'est le bouton « Recalculer » de l'ecran.
     */
    private static final long FRAICHEUR_MOIS_CLOS_MS = 24L * 60L * 60L * 1000L;

    /** Nombre de mois clos recents qui restent sous surveillance quotidienne. */
    private static final int MOIS_CLOS_SURVEILLES = 2;

    /**
     * Duree pendant laquelle le controle d'integrite d'une fenetre n'est pas refait.
     *
     * <p>
     * Un affichage d'onglet demande les agregats plusieurs fois - la periode regardee, celle a laquelle on la compare,
     * la fenetre du graphique, la meme decalee. Sans cette memoire, le controle serait relance a chaque fois pour
     * rendre la meme reponse.
     */
    /*
     * Elle est volontairement COURTE : quelques secondes couvrent un affichage, pas davantage. Reglee a une minute,
     * elle empechait de voir une correction faite dans la foulee - le controle e2e l'a prise en defaut, et c'etait bien
     * le defaut : un garde-fou contre les calculs inutiles ne doit jamais retarder la verite.
     */
    private static final long MEMOIRE_CONTROLE_MS = 5L * 1000L;

    /** Fenetres deja controlees et l'instant du controle : partagees par tous les operateurs. */
    private static final Map<String, Long> CONTROLES = new java.util.concurrent.ConcurrentHashMap<>();

    /**
     * UN SEUL rattrapage en tache de fond a la fois.
     *
     * <p>
     * Le journal de l'officine du 19/09 signale des blocages « pool de connexions JDBC vide ». Plusieurs onglets
     * ouverts coup sur coup lanceraient autant de rattrapages simultanes, chacun prenant sa connexion : c'est
     * exactement ce qu'il ne faut pas faire a un serveur deja charge. Les rattrapages se font donc l'un apres l'autre,
     * et un rattrapage demande pendant qu'un autre tourne est simplement ignore - il sera redemande a la prochaine
     * ouverture.
     */
    private static final java.util.concurrent.atomic.AtomicBoolean RATTRAPAGE_EN_COURS = new java.util.concurrent.atomic.AtomicBoolean(
            false);

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
        /** Part des annulations reglee en especes : ce qui est ressorti du tiroir. */
        public double annuleEspece;
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
        /*
         * CE QUI A BOUGE DEPUIS LE DERNIER CALCUL. Un mois clos ne change plus - tant que personne n'y touche. Or
         * l'officine corrige : une vente annulee apres coup, un bon d'assurance saisi en retard, une vente d'un jour
         * passe modifiee. Une seule lecture agregee dit ce que la base compte AUJOURD'HUI pour chaque mois ; les mois
         * qui ne correspondent plus a leur agregat sont repris, les autres sont lus tels quels.
         */
        java.util.Set<String> aRevoirIntegrite = moisDivergents(mois, connus);
        List<String> aCalculer = new ArrayList<>();
        String moisCourant = YearMonth.now().toString();
        String plusVieuxSurveille = YearMonth.now().minusMonths(MOIS_CLOS_SURVEILLES).toString();
        List<String> aRevoir = new ArrayList<>();
        for (String m : mois) {
            Agregat a = connus.get(m);
            if (a == null || aRevoirIntegrite.contains(m)) {
                aCalculer.add(m);
            } else if (m.equals(moisCourant)) {
                /*
                 * LE MOIS EN COURS NE SE RECALCULE PLUS EN ENTIER. Une journee close ne change plus : le mois en cours
                 * est donc la somme des journees deja calculees et de celle d'aujourd'hui. Le 31 du mois, cela coute
                 * une journee au lieu de trente et une.
                 */
                Agregat duJour = moisEnCours(m);
                if (duJour != null) {
                    connus.put(m, duJour);
                }
            } else if (m.compareTo(plusVieuxSurveille) >= 0 && perime(m, FRAICHEUR_MOIS_CLOS_MS)) {
                /* Mois clos recent : on le revoit, mais sans faire attendre l'ecran. */
                aRevoir.add(m);
            }
        }
        if (!aRevoir.isEmpty()) {
            moiMeme.completerEnFond(aRevoir);
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

    /**
     * Les mois dont l'agregat ne correspond plus a ce que dit la base.
     *
     * <p>
     * Le controle porte sur le NOMBRE DE VENTES et le CHIFFRE D'AFFAIRES : c'est ce qui bouge quand une vente est
     * ajoutee, supprimee, annulee ou corrigee. Une difference d'un franc suffit a declencher le recalcul - mieux vaut
     * un calcul de trop qu'un chiffre faux affiche comme s'il etait juste.
     *
     * <p>
     * Ce controle ne voit pas une correction qui ne touche ni le nombre ni le chiffre d'affaires (un mode de reglement
     * change, par exemple). Pour celles-la, il reste la reprise quotidienne des deux derniers mois clos et le bouton «
     * Recalculer ».
     */
    private java.util.Set<String> moisDivergents(List<String> mois, Map<String, Agregat> connus) {
        java.util.Set<String> divergents = new java.util.LinkedHashSet<>();
        if (mois == null || mois.isEmpty() || connus.isEmpty()) {
            return divergents;
        }
        String cle = mois.get(0) + '|' + mois.get(mois.size() - 1);
        Long dernier = CONTROLES.get(cle);
        if (dernier != null && System.currentTimeMillis() - dernier < MEMOIRE_CONTROLE_MS) {
            return divergents;
        }
        CONTROLES.put(cle, System.currentTimeMillis());
        try {
            LocalDate debut = LocalDate.parse(mois.get(0) + "-01");
            LocalDate fin = LocalDate.parse(mois.get(mois.size() - 1) + "-01").plusMonths(1);
            Map<String, double[]> base = new LinkedHashMap<>();
            for (Tuple t : lire(PilotageSql.empreinteParMois(), debut, fin)) {
                base.put(t.get("mois", String.class),
                        new double[] { entier(t.get("nbVentes")), nombre(t.get("caTTC")) });
            }
            for (Map.Entry<String, Agregat> entree : connus.entrySet()) {
                double[] reel = base.get(entree.getKey());
                Agregat a = entree.getValue();
                double ventes = reel == null ? 0 : reel[0];
                double caTTC = reel == null ? 0 : reel[1];
                if (a.nbVentes != (int) ventes || Math.abs(a.caTTC - caTTC) >= 1d) {
                    divergents.add(entree.getKey());
                }
            }
            if (!divergents.isEmpty()) {
                LOG.log(Level.INFO, "Pilotage : {0} mois ont change depuis leur calcul et sont repris : {1}",
                        new Object[] { divergents.size(), divergents });
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "pilotage : controle d'integrite des agregats", e);
        }
        return divergents;
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
                    + " a.int_MONTANT_ANNULE AS montantAnnule, a.int_ANNULE_ESPECE AS annuleEspece,"
                    + " a.int_ENTREES_STOCK AS entrees," + " a.int_SORTIES_STOCK AS sorties"
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
                a.annuleEspece = nombre(t.get("annuleEspece"));
                a.entreesStock = nombre(t.get("entrees"));
                a.sortiesStock = nombre(t.get("sorties"));
                out.put(a.mois, a);
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "pilotage : lecture des agregats", e);
        }
        return out;
    }

    /**
     * Recalcule de force les mois demandes : c'est le « Recalculer » de l'ecran.
     *
     * <p>
     * Le seul geste qui reprend un mois clos ancien. Il existe parce qu'une regularisation tardive - une vente de mars
     * annulee en septembre - ne se devine pas : l'officine sait quand elle en a fait une, le logiciel non.
     */
    public int recalculer(List<String> mois) {
        /* Un recalcul demande a la main doit repartir de zero : la memoire du controle d'integrite est effacee. */
        CONTROLES.clear();
        int faits = 0;
        commencer(mois.size());
        try {
            for (String m : mois) {
                etape(faits, "Mois de " + m);
                if (moiMeme.calculerEtEnregistrer(m) != null) {
                    faits++;
                }
            }
        } finally {
            terminer();
        }
        return faits;
    }

    /**
     * PRECHAUFFAGE : les mois clos sont calcules AVANT qu'on ouvre l'ecran, pas pendant.
     *
     * <p>
     * C'est la reponse au dernier reproche de lenteur (20/09) : « le chargement est encore lent pour des donnees deja
     * sauvegardees, juste a afficher ». Il avait raison sur le principe et la mesure lui donnait raison - le journal du
     * support montre plus de cinq secondes au PREMIER passage sur chaque onglet, et quelques millisecondes ensuite. Ces
     * secondes-la n'etaient pas de l'affichage : c'etait le calcul du mois, fait dans la requete de l'operateur parce
     * que personne ne l'avait fait avant lui.
     *
     * <p>
     * Ce traitement le fait avant : au demarrage du serveur, puis chaque nuit. Il ne recalcule RIEN de ce qui existe
     * deja - il ne remplit que les trous - et il s'arrete la ou l'ecran s'arrete, vingt-cinq mois en arriere, qui est
     * la plus longue fenetre proposee par le selecteur de periode.
     *
     * @return le nombre de mois effectivement calcules
     */
    public int prechauffer() {
        if (!RATTRAPAGE_EN_COURS.compareAndSet(false, true)) {
            /* Un rattrapage tourne deja : inutile de lui disputer les connexions. */
            return 0;
        }
        try {
            List<String> mois = new ArrayList<>();
            YearMonth curseur = YearMonth.now().minusMonths(MOIS_PRECHAUFFES);
            YearMonth dernier = YearMonth.now().minusMonths(1);
            while (!curseur.isAfter(dernier)) {
                mois.add(curseur.toString());
                curseur = curseur.plusMonths(1);
            }
            Map<String, Agregat> connus = lire(mois);
            int faits = 0;
            for (String m : mois) {
                if (connus.get(m) == null && moiMeme.calculerEtEnregistrer(m) != null) {
                    faits++;
                }
            }
            if (faits > 0) {
                LOG.log(Level.INFO, "Pilotage : {0} mois clos calcules d''avance, l''ecran n''aura plus a les"
                        + " calculer lui-meme", faits);
            }
            return faits;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "pilotage : prechauffage des agregats", e);
            return 0;
        } finally {
            RATTRAPAGE_EN_COURS.set(false);
        }
    }

    /**
     * Jusqu'ou le prechauffage remonte : la plus longue fenetre du selecteur, douze mois compares aux douze d'avant.
     */
    private static final int MOIS_PRECHAUFFES = 25;

    /*
     * ================================================================= l'avancement du recalcul
     *
     * Un recalcul sur vingt-cinq mois demande une bonne demi-minute, et l'ecran restait fige sans rien dire. « Ajouter
     * une barre de progression pour ne pas faire attendre sans infos » (20/09). L'avancement vit ici, EN MEMOIRE :
     * l'ecran l'interroge pendant que le calcul tourne, et cette lecture-la ne touche pas la base - elle doit repondre
     * meme quand le recalcul occupe les connexions.
     */
    private static final java.util.concurrent.atomic.AtomicInteger FAITS = new java.util.concurrent.atomic.AtomicInteger();
    private static final java.util.concurrent.atomic.AtomicInteger TOTAL = new java.util.concurrent.atomic.AtomicInteger();
    private static final java.util.concurrent.atomic.AtomicReference<String> ETAPE = new java.util.concurrent.atomic.AtomicReference<>(
            "");

    /** Ce que l'ecran affiche dans la barre : combien de mois sont faits, sur combien, et lequel tourne. */
    public static final class Avancement {
        public final int faits;
        public final int total;
        public final String etape;

        Avancement(int faits, int total, String etape) {
            this.faits = faits;
            this.total = total;
            this.etape = etape;
        }

        public boolean enCours() {
            return total > 0;
        }
    }

    public static Avancement avancement() {
        String etape = ETAPE.get();
        return new Avancement(FAITS.get(), TOTAL.get(), etape == null ? "" : etape);
    }

    private static void commencer(int total) {
        FAITS.set(0);
        ETAPE.set("");
        TOTAL.set(total);
    }

    private static void etape(int faits, String libelle) {
        FAITS.set(faits);
        ETAPE.set(libelle);
    }

    private static void terminer() {
        TOTAL.set(0);
        FAITS.set(0);
        ETAPE.set("");
    }

    /**
     * Le mois en cours, obtenu en additionnant ses JOURNEES.
     *
     * <p>
     * Chaque journee close est calculee une fois puis relue ; seule celle d'aujourd'hui est reprise, et au plus une
     * fois toutes les dix minutes. Le total est ensuite ecrit dans la table mensuelle, pour que les lectures qui ne
     * connaissent que les mois (les totaux de periode, les series) n'aient rien a savoir de ce decoupage.
     */
    private Agregat moisEnCours(String mois) {
        try {
            LocalDate premier = LocalDate.parse(mois + "-01");
            LocalDate aujourdHui = LocalDate.now();
            LocalDate finExclue = aujourdHui.plusDays(1);
            Map<String, Agregat> journees = lireJournees(premier, finExclue);
            /*
             * LES JOURNEES QUI ONT BOUGE. Une journee close ne change plus - sauf quand on y revient : une vente du 5
             * annulee le 19, un bon d'assurance saisi en retard, une vente corrigee. Le meme controle que pour les
             * mois, applique aux journees du mois en cours : une lecture agregee dit ce que la base compte aujourd'hui,
             * jour par jour, et seules les journees qui ne correspondent plus sont reprises.
             */
            java.util.Set<String> journeesDivergentes = journeesDivergentes(premier, finExclue, journees);
            long debut = System.currentTimeMillis();
            List<LocalDate> enRetard = new ArrayList<>();
            for (LocalDate jour = premier; jour.isBefore(finExclue); jour = jour.plusDays(1)) {
                Agregat connu = journees.get(jour.toString());
                boolean aReprendre = connu == null || journeesDivergentes.contains(jour.toString())
                        || (jour.isEqual(aujourdHui) && perimeJour(jour, FRAICHEUR_MOIS_COURANT_MS));
                if (!aReprendre) {
                    continue;
                }
                /*
                 * La journee d'AUJOURD'HUI passe toujours en premier, quel que soit le budget : c'est celle que
                 * l'operateur regarde. Les journees plus anciennes qui manquent - premiere ouverture du mois, ou
                 * serveur eteint - attendront la tache de fond si le temps manque.
                 */
                if (!jour.isEqual(aujourdHui) && System.currentTimeMillis() - debut > BUDGET_MS) {
                    enRetard.add(jour);
                    continue;
                }
                Agregat calcule = moiMeme.calculerJournee(jour);
                if (calcule != null) {
                    journees.put(jour.toString(), calcule);
                }
            }
            if (!enRetard.isEmpty()) {
                moiMeme.completerJourneesEnFond(enRetard);
            }
            Agregat total = new Agregat(mois);
            for (Agregat j : journees.values()) {
                ajouter(total, j);
            }
            moiMeme.enregistrerMois(total, false);
            /*
             * Le mix de reglement et les achats par grossiste du mois en cours ne se decoupent pas en journees sans
             * multiplier les lignes : ils sont repris ici, sur le mois, a la meme fraicheur que la journee du jour. Ce
             * sont deux lectures agregees, sans commune mesure avec les huit requetes de detail que le mois entier
             * coutait auparavant - la plus chere d'entre elles, la marge au niveau ligne, est desormais journaliere.
             */
            if (detailPerime(mois)) {
                moiMeme.rafraichirDetailDuMois(mois, premier, premier.plusMonths(1));
            }
            return total;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "pilotage : agregat du mois en cours " + mois, e);
            return null;
        }
    }

    /** Ajoute les grandeurs d'une journee a un cumul. */
    private static void ajouter(Agregat cumul, Agregat j) {
        cumul.caTTC += j.caTTC;
        cumul.nbVentes += j.nbVentes;
        cumul.remises += j.remises;
        cumul.partTiersPayant += j.partTiersPayant;
        cumul.caHT += j.caHT;
        cumul.coutAchat += j.coutAchat;
        cumul.achatTTC += j.achatTTC;
        cumul.nbBons += j.nbBons;
        cumul.encaisse += j.encaisse;
        cumul.nbAnnulees += j.nbAnnulees;
        cumul.montantAnnule += j.montantAnnule;
        cumul.annuleEspece += j.annuleEspece;
        cumul.entreesStock += j.entreesStock;
        cumul.sortiesStock += j.sortiesStock;
    }

    /** Les journees dont l'agregat ne correspond plus a ce que dit la base - meme controle que pour les mois. */
    private java.util.Set<String> journeesDivergentes(LocalDate debut, LocalDate finExclue,
            Map<String, Agregat> journees) {
        java.util.Set<String> divergentes = new java.util.LinkedHashSet<>();
        if (journees.isEmpty()) {
            return divergentes;
        }
        try {
            Map<String, double[]> base = new LinkedHashMap<>();
            for (Tuple t : lire(PilotageSql.empreinteParJour(), debut, finExclue)) {
                Object jour = t.get("jour");
                String cle = jour instanceof java.sql.Date ? ((java.sql.Date) jour).toLocalDate().toString()
                        : String.valueOf(jour);
                base.put(cle, new double[] { entier(t.get("nbVentes")), nombre(t.get("caTTC")) });
            }
            for (Map.Entry<String, Agregat> entree : journees.entrySet()) {
                double[] reel = base.get(entree.getKey());
                Agregat a = entree.getValue();
                double ventes = reel == null ? 0 : reel[0];
                double caTTC = reel == null ? 0 : reel[1];
                if (a.nbVentes != (int) ventes || Math.abs(a.caTTC - caTTC) >= 1d) {
                    divergentes.add(entree.getKey());
                }
            }
            if (!divergentes.isEmpty()) {
                LOG.log(Level.INFO, "Pilotage : {0} journee(s) du mois en cours ont change et sont reprises : {1}",
                        new Object[] { divergentes.size(), divergentes });
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "pilotage : controle d'integrite des journees", e);
        }
        return divergentes;
    }

    /** Les journees deja calculees entre deux dates, indexees par jour (AAAA-MM-JJ). */
    @SuppressWarnings("unchecked")
    private Map<String, Agregat> lireJournees(LocalDate debut, LocalDate finExclue) {
        Map<String, Agregat> out = new LinkedHashMap<>();
        Query q = em.createNativeQuery("SELECT a.dt_JOUR AS jour, a.int_CA_TTC AS caTTC, a.int_NB_VENTES AS nbVentes,"
                + " a.int_REMISES AS remises, a.int_PART_TP AS partTp, a.int_CA_HT AS caHT,"
                + " a.int_COUT_ACHAT AS coutAchat, a.int_ACHAT_TTC AS achatTTC, a.int_NB_BONS AS nbBons,"
                + " a.int_ENCAISSE AS encaisse, a.int_NB_ANNULEES AS nbAnnulees,"
                + " a.int_MONTANT_ANNULE AS montantAnnule, a.int_ANNULE_ESPECE AS annuleEspece,"
                + " a.int_ENTREES_STOCK AS entrees, a.int_SORTIES_STOCK AS sorties"
                + " FROM pilotage_agregat_jour a WHERE a.lg_EMPLACEMENT_ID = ?1"
                + " AND a.dt_JOUR >= ?2 AND a.dt_JOUR < ?3", Tuple.class);
        q.setParameter(1, PilotageSql.EMPLACEMENT_OFFICINE).setParameter(2, java.sql.Date.valueOf(debut))
                .setParameter(3, java.sql.Date.valueOf(finExclue));
        for (Tuple t : (List<Tuple>) q.getResultList()) {
            Object jour = t.get("jour");
            String cle = jour instanceof java.sql.Date ? ((java.sql.Date) jour).toLocalDate().toString()
                    : String.valueOf(jour);
            Agregat a = new Agregat(cle);
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
            a.annuleEspece = nombre(t.get("annuleEspece"));
            a.entreesStock = nombre(t.get("entrees"));
            a.sortiesStock = nombre(t.get("sorties"));
            out.put(cle, a);
        }
        return out;
    }

    /** Calcule UNE journee et l'enregistre, dans sa propre transaction. */
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public Agregat calculerJournee(LocalDate jour) {
        try {
            Agregat a = grandeurs(jour.toString(), jour, jour.plusDays(1));
            enregistrerJournee(a, jour, jour.isBefore(LocalDate.now()));
            return a;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "pilotage : calcul de la journee " + jour, e);
            return null;
        }
    }

    /** Complete les journees manquantes en tache de fond, et UN SEUL rattrapage a la fois. */
    @Asynchronous
    public void completerJourneesEnFond(List<LocalDate> jours) {
        if (!RATTRAPAGE_EN_COURS.compareAndSet(false, true)) {
            LOG.log(Level.FINE, "Pilotage : un rattrapage est deja en cours, ces journees attendront");
            return;
        }
        try {
            for (LocalDate j : jours) {
                try {
                    moiMeme.calculerJournee(j);
                } catch (Exception e) {
                    LOG.log(Level.WARNING, "pilotage : journee de fond " + j, e);
                }
            }
        } finally {
            RATTRAPAGE_EN_COURS.set(false);
        }
    }

    /** Ecrit le total du mois en cours, calcule a partir de ses journees. */
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void enregistrerMois(Agregat a, boolean clos) {
        enregistrer(a, clos);
    }

    /** Reecrit le mix de reglement et les achats par grossiste d'un mois, dans sa propre transaction. */
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void rafraichirDetailDuMois(String mois, LocalDate debut, LocalDate fin) {
        enregistrerReglements(mois, debut, fin);
        enregistrerGrossistes(mois, debut, fin);
    }

    /** Vrai si le detail du mois (modes de reglement, grossistes) merite d'etre repris. */
    private boolean detailPerime(String mois) {
        try {
            Object calcul = em
                    .createNativeQuery("SELECT MAX(r.dt_CALCUL) FROM pilotage_agregat_reglement r"
                            + " WHERE r.str_MOIS = ?1 AND r.lg_EMPLACEMENT_ID = ?2")
                    .setParameter(1, mois).setParameter(2, PilotageSql.EMPLACEMENT_OFFICINE).getSingleResult();
            if (calcul instanceof java.sql.Timestamp) {
                return System.currentTimeMillis() - ((java.sql.Timestamp) calcul).getTime() > FRAICHEUR_MOIS_COURANT_MS;
            }
        } catch (Exception e) {
            LOG.log(Level.FINE, "fraicheur du detail d'un mois", e);
        }
        return true;
    }

    private boolean perimeJour(LocalDate jour, long fraicheurMs) {
        try {
            Object calcul = em
                    .createNativeQuery("SELECT a.dt_CALCUL FROM pilotage_agregat_jour a"
                            + " WHERE a.dt_JOUR = ?1 AND a.lg_EMPLACEMENT_ID = ?2")
                    .setParameter(1, java.sql.Date.valueOf(jour)).setParameter(2, PilotageSql.EMPLACEMENT_OFFICINE)
                    .getSingleResult();
            if (calcul instanceof java.sql.Timestamp) {
                return System.currentTimeMillis() - ((java.sql.Timestamp) calcul).getTime() > fraicheurMs;
            }
        } catch (Exception e) {
            LOG.log(Level.FINE, "fraicheur d'une journee", e);
        }
        return true;
    }

    private boolean perime(String mois, long fraicheurMs) {
        try {
            Object calcul = em
                    .createNativeQuery("SELECT a.dt_CALCUL FROM pilotage_agregat_mensuel a"
                            + " WHERE a.str_MOIS = ?1 AND a.lg_EMPLACEMENT_ID = ?2")
                    .setParameter(1, mois).setParameter(2, PilotageSql.EMPLACEMENT_OFFICINE).getSingleResult();
            if (calcul instanceof java.sql.Timestamp) {
                return System.currentTimeMillis() - ((java.sql.Timestamp) calcul).getTime() > fraicheurMs;
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
            Agregat a = grandeurs(mois, debut, fin);
            boolean clos = fin.isBefore(LocalDate.now().withDayOfMonth(1).plusDays(1))
                    && !mois.equals(YearMonth.now().toString());
            enregistrer(a, clos);
            /*
             * LE DETAIL NE PEUT PLUS EMPORTER LES CHIFFRES DU MOIS.
             *
             * Le mix de reglement et les achats par grossiste s'ecrivaient dans la MEME transaction que le mois. Le
             * jour ou l'un d'eux a echoue chez l'officine - un libelle d'affichage trop long pour sa colonne - la
             * transaction a ete annulee en entier et le mois de juillet a purement disparu des agregats, alors que ses
             * chiffres etaient justes et deja calcules. Un ornement d'affichage ne doit jamais faire perdre un chiffre
             * : chaque detail prend desormais sa propre transaction, et son echec est journalise sans rien emporter.
             */
            detailIsole("reglements", mois, () -> moiMeme.enregistrerDetailReglements(mois, debut, fin));
            detailIsole("grossistes", mois, () -> moiMeme.enregistrerDetailGrossistes(mois, debut, fin));
            return a;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "pilotage : calcul de l'agregat " + mois, e);
            return null;
        }
    }

    /** Ecrit un detail dans SA transaction : son echec est journalise, jamais propage. */
    private void detailIsole(String quoi, String mois, Runnable ecriture) {
        try {
            ecriture.run();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "pilotage : le detail " + quoi + " du mois " + mois
                    + " n'a pas pu etre enregistre ; les chiffres du mois, eux, sont conserves", e);
        }
    }

    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void enregistrerDetailReglements(String mois, LocalDate debut, LocalDate fin) {
        enregistrerReglements(mois, debut, fin);
    }

    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void enregistrerDetailGrossistes(String mois, LocalDate debut, LocalDate fin) {
        enregistrerGrossistes(mois, debut, fin);
    }

    /**
     * Les grandeurs d'une periode bornee, quelle que soit sa duree : un mois, ou une journee.
     *
     * <p>
     * Ecrites une seule fois : un mois et une journee doivent se calculer exactement de la meme facon, sans quoi la
     * somme des journees d'un mois ne retomberait pas sur le total de ce mois.
     */
    private Agregat grandeurs(String cle, LocalDate debut, LocalDate fin) {
        Agregat a = new Agregat(cle);
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
        lireUneLigne(PilotageSql.totalAnnulationsEspece(), debut, fin,
                t -> a.annuleEspece = nombre(t.get("montantEspece")));
        lireUneLigne(PilotageSql.entreesStockParMois(), debut, fin, t -> a.entreesStock = nombre(t.get("montant")));
        lireUneLigne(PilotageSql.sortiesStockParMois(), debut, fin, t -> a.sortiesStock = nombre(t.get("montant")));
        return a;
    }

    /** Ecrit une journee ; un seul ordre, qui remplace la ligne si elle existe. */
    private void enregistrerJournee(Agregat a, LocalDate jour, boolean clos) {
        em.createNativeQuery("INSERT INTO pilotage_agregat_jour (dt_JOUR, lg_EMPLACEMENT_ID, int_CA_TTC,"
                + " int_NB_VENTES, int_REMISES, int_PART_TP, int_CA_HT, int_COUT_ACHAT, int_ACHAT_TTC,"
                + " int_NB_BONS, int_ENCAISSE, int_NB_ANNULEES, int_MONTANT_ANNULE, int_ANNULE_ESPECE,"
                + " int_ENTREES_STOCK, int_SORTIES_STOCK, b_CLOS, dt_CALCUL)"
                + " VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, NOW())"
                + " ON DUPLICATE KEY UPDATE int_CA_TTC = VALUES(int_CA_TTC), int_NB_VENTES = VALUES(int_NB_VENTES),"
                + " int_REMISES = VALUES(int_REMISES), int_PART_TP = VALUES(int_PART_TP),"
                + " int_CA_HT = VALUES(int_CA_HT), int_COUT_ACHAT = VALUES(int_COUT_ACHAT),"
                + " int_ACHAT_TTC = VALUES(int_ACHAT_TTC), int_NB_BONS = VALUES(int_NB_BONS),"
                + " int_ENCAISSE = VALUES(int_ENCAISSE), int_NB_ANNULEES = VALUES(int_NB_ANNULEES),"
                + " int_MONTANT_ANNULE = VALUES(int_MONTANT_ANNULE),"
                + " int_ANNULE_ESPECE = VALUES(int_ANNULE_ESPECE), int_ENTREES_STOCK = VALUES(int_ENTREES_STOCK),"
                + " int_SORTIES_STOCK = VALUES(int_SORTIES_STOCK), b_CLOS = VALUES(b_CLOS), dt_CALCUL = NOW()")
                .setParameter(1, java.sql.Date.valueOf(jour)).setParameter(2, PilotageSql.EMPLACEMENT_OFFICINE)
                .setParameter(3, Math.round(a.caTTC)).setParameter(4, a.nbVentes).setParameter(5, Math.round(a.remises))
                .setParameter(6, Math.round(a.partTiersPayant)).setParameter(7, Math.round(a.caHT))
                .setParameter(8, Math.round(a.coutAchat)).setParameter(9, Math.round(a.achatTTC))
                .setParameter(10, a.nbBons).setParameter(11, Math.round(a.encaisse)).setParameter(12, a.nbAnnulees)
                .setParameter(13, Math.round(a.montantAnnule)).setParameter(14, Math.round(a.annuleEspece))
                .setParameter(15, Math.round(a.entreesStock)).setParameter(16, Math.round(a.sortiesStock))
                .setParameter(17, clos ? 1 : 0).executeUpdate();
    }

    /** Complete l'historique en tache de fond, un mois a la fois, et UN SEUL rattrapage a la fois. */
    @Asynchronous
    public void completerEnFond(List<String> mois) {
        if (!RATTRAPAGE_EN_COURS.compareAndSet(false, true)) {
            LOG.log(Level.FINE, "Pilotage : un rattrapage est deja en cours, celui-ci est laisse pour plus tard");
            return;
        }
        try {
            for (String m : mois) {
                try {
                    moiMeme.calculerEtEnregistrer(m);
                } catch (Exception e) {
                    LOG.log(Level.WARNING, "pilotage : agregat de fond " + m, e);
                }
            }
            LOG.log(Level.INFO, "Pilotage : {0} mois d''agregats completes en tache de fond", mois.size());
        } finally {
            RATTRAPAGE_EN_COURS.set(false);
        }
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
                + " int_NB_BONS, int_ENCAISSE, int_NB_ANNULEES, int_MONTANT_ANNULE, int_ANNULE_ESPECE,"
                + " int_ENTREES_STOCK, int_SORTIES_STOCK, b_CLOS, dt_CALCUL)"
                + " VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, NOW())"
                + " ON DUPLICATE KEY UPDATE int_CA_TTC = VALUES(int_CA_TTC), int_NB_VENTES = VALUES(int_NB_VENTES),"
                + " int_REMISES = VALUES(int_REMISES), int_PART_TP = VALUES(int_PART_TP),"
                + " int_CA_HT = VALUES(int_CA_HT), int_COUT_ACHAT = VALUES(int_COUT_ACHAT),"
                + " int_ACHAT_TTC = VALUES(int_ACHAT_TTC), int_NB_BONS = VALUES(int_NB_BONS),"
                + " int_ENCAISSE = VALUES(int_ENCAISSE), int_NB_ANNULEES = VALUES(int_NB_ANNULEES),"
                + " int_MONTANT_ANNULE = VALUES(int_MONTANT_ANNULE),"
                + " int_ANNULE_ESPECE = VALUES(int_ANNULE_ESPECE), int_ENTREES_STOCK = VALUES(int_ENTREES_STOCK),"
                + " int_SORTIES_STOCK = VALUES(int_SORTIES_STOCK), b_CLOS = VALUES(b_CLOS), dt_CALCUL = NOW()")
                .setParameter(1, a.mois).setParameter(2, PilotageSql.EMPLACEMENT_OFFICINE)
                .setParameter(3, Math.round(a.caTTC)).setParameter(4, a.nbVentes).setParameter(5, Math.round(a.remises))
                .setParameter(6, Math.round(a.partTiersPayant)).setParameter(7, Math.round(a.caHT))
                .setParameter(8, Math.round(a.coutAchat)).setParameter(9, Math.round(a.achatTTC))
                .setParameter(10, a.nbBons).setParameter(11, Math.round(a.encaisse)).setParameter(12, a.nbAnnulees)
                .setParameter(13, Math.round(a.montantAnnule)).setParameter(14, Math.round(a.annuleEspece))
                .setParameter(15, Math.round(a.entreesStock)).setParameter(16, Math.round(a.sortiesStock))
                .setParameter(17, clos ? 1 : 0).executeUpdate();
    }

    /**
     * Le mix de reglement du mois : une ligne par mode reellement encaisse.
     *
     * <p>
     * Le nombre de modes n'est pas connu a l'avance - l'officine peut en activer un nouveau demain - donc ils ne
     * peuvent pas tenir dans des colonnes de la table mensuelle. Les anciennes lignes du mois sont effacees avant
     * reecriture : un mode qui disparait d'un mois recalcule doit disparaitre de la table aussi.
     */
    private void enregistrerReglements(String mois, LocalDate debut, LocalDate fin) {
        em.createNativeQuery("DELETE FROM pilotage_agregat_reglement WHERE str_MOIS = ?1 AND lg_EMPLACEMENT_ID = ?2")
                .setParameter(1, mois).setParameter(2, PilotageSql.EMPLACEMENT_OFFICINE).executeUpdate();
        for (Tuple t : lire(PilotageSql.reglementsParMois(), debut, fin)) {
            String mode = t.get("mode", String.class);
            if (mode == null || mode.trim().isEmpty()) {
                mode = "Autre";
            }
            em.createNativeQuery("INSERT INTO pilotage_agregat_reglement (str_MOIS, lg_EMPLACEMENT_ID, str_MODE,"
                    + " int_MONTANT, dt_CALCUL) VALUES (?1, ?2, ?3, ?4, NOW())"
                    + " ON DUPLICATE KEY UPDATE int_MONTANT = int_MONTANT + VALUES(int_MONTANT), dt_CALCUL = NOW()")
                    .setParameter(1, mois).setParameter(2, PilotageSql.EMPLACEMENT_OFFICINE).setParameter(3, mode)
                    .setParameter(4, Math.round(nombre(t.get("montant")))).executeUpdate();
        }
    }

    /** Les achats du mois par grossiste : une ligne par fournisseur qui a reellement livre. */
    private void enregistrerGrossistes(String mois, LocalDate debut, LocalDate fin) {
        em.createNativeQuery("DELETE FROM pilotage_agregat_grossiste WHERE str_MOIS = ?1 AND lg_EMPLACEMENT_ID = ?2")
                .setParameter(1, mois).setParameter(2, PilotageSql.EMPLACEMENT_OFFICINE).executeUpdate();
        for (Tuple t : lire(PilotageSql.achatsParMoisEtGrossiste(null), debut, fin)) {
            String id = t.get("grossisteId", String.class);
            if (id == null) {
                continue;
            }
            String libelle = t.get("grossiste", String.class);
            /*
             * Les AGENCES qui composent un groupe sont gardees avec lui : regrouper les cinq LABOREX en une colonne ne
             * doit pas faire disparaitre leurs noms de l'ecran. Un fournisseur sans groupe n'a rien a nommer d'autre
             * que lui-meme : la colonne reste vide.
             */
            /*
             * La liste des agences est un libelle d'AFFICHAGE : elle est bornee, et une officine qui aurait quarante
             * agences dans un groupe verrait « ... » plutot que de faire echouer son mois.
             */
            String membres = borner(t.get("membres", String.class), 900);
            em.createNativeQuery("INSERT INTO pilotage_agregat_grossiste (str_MOIS, lg_EMPLACEMENT_ID,"
                    + " lg_GROSSISTE_ID, str_GROSSISTE, str_MEMBRES, int_MONTANT, int_NB_BONS, dt_CALCUL)"
                    + " VALUES (?1, ?2, ?3, ?4, ?7, ?5, ?6, NOW())"
                    + " ON DUPLICATE KEY UPDATE int_MONTANT = VALUES(int_MONTANT),"
                    + " str_MEMBRES = VALUES(str_MEMBRES)," + " int_NB_BONS = VALUES(int_NB_BONS), dt_CALCUL = NOW()")
                    .setParameter(1, mois).setParameter(2, PilotageSql.EMPLACEMENT_OFFICINE).setParameter(3, id)
                    .setParameter(4, libelle == null ? "Sans grossiste" : libelle)
                    .setParameter(5, Math.round(nombre(t.get("montant")))).setParameter(6, entier(t.get("nbBons")))
                    .setParameter(7, membres == null ? "" : membres).executeUpdate();
        }
    }

    /** Les lignes d'une requete bornee a un mois. */
    @SuppressWarnings("unchecked")
    private List<Tuple> lire(String sql, LocalDate debut, LocalDate fin) {
        Query q = em.createNativeQuery(sql, Tuple.class);
        q.setParameter("debut", java.sql.Timestamp.valueOf(debut.atStartOfDay()));
        q.setParameter("fin", java.sql.Timestamp.valueOf(fin.atStartOfDay()));
        if (sql.contains(":typeExclu")) {
            q.setParameter("typeExclu", PilotageSql.TYPE_VENTE_EXCLU);
        }
        return q.getResultList();
    }

    /** Le mix de reglement des mois demandes : mois, mode, montant. */
    @SuppressWarnings("unchecked")
    public List<Tuple> reglements(List<String> mois) {
        if (mois == null || mois.isEmpty()) {
            return new ArrayList<>();
        }
        Query q = em.createNativeQuery(
                "SELECT r.str_MOIS AS mois, r.str_MODE AS mode, r.int_MONTANT AS montant"
                        + " FROM pilotage_agregat_reglement r WHERE r.lg_EMPLACEMENT_ID = ?1"
                        + " AND r.str_MOIS >= ?2 AND r.str_MOIS <= ?3 ORDER BY r.str_MOIS ASC, r.str_MODE ASC",
                Tuple.class);
        q.setParameter(1, PilotageSql.EMPLACEMENT_OFFICINE).setParameter(2, mois.get(0)).setParameter(3,
                mois.get(mois.size() - 1));
        return q.getResultList();
    }

    /** Les achats par grossiste des mois demandes, eventuellement restreints a un fournisseur. */
    @SuppressWarnings("unchecked")
    public List<Tuple> grossistes(List<String> mois, String grossisteId) {
        if (mois == null || mois.isEmpty()) {
            return new ArrayList<>();
        }
        boolean filtre = grossisteId != null && !grossisteId.trim().isEmpty();
        /*
         * UN IDENTIFIANT D'AGENCE EST TRADUIT EN CLE DE GROUPE.
         *
         * Depuis que les agences d'un meme groupe ne font plus qu'une colonne, la table d'agregats porte la cle du
         * GROUPE (« GRP1 ») et non celle de l'agence. Une demande qui nomme encore une agence - un lien garde en
         * favori, un appel ecrit a la main - ne trouverait plus rien et l'ecran afficherait un tableau vide sans rien
         * dire. On traduit donc, et la reponse porte le groupe auquel l'agence appartient : c'est l'unite que
         * l'officine a choisie de regarder.
         */
        String cleFiltre = filtre ? cleDeGroupe(grossisteId.trim()) : null;
        Query q = em.createNativeQuery("SELECT g.str_MOIS AS mois, g.lg_GROSSISTE_ID AS grossisteId,"
                + " g.str_GROSSISTE AS grossiste, g.str_MEMBRES AS membres,"
                + " g.int_MONTANT AS montant, g.int_NB_BONS AS nbBons"
                + " FROM pilotage_agregat_grossiste g WHERE g.lg_EMPLACEMENT_ID = ?1"
                + " AND g.str_MOIS >= ?2 AND g.str_MOIS <= ?3" + (filtre ? " AND g.lg_GROSSISTE_ID = ?4" : "")
                + " ORDER BY g.str_MOIS ASC, g.int_MONTANT DESC", Tuple.class);
        q.setParameter(1, PilotageSql.EMPLACEMENT_OFFICINE).setParameter(2, mois.get(0)).setParameter(3,
                mois.get(mois.size() - 1));
        if (filtre) {
            q.setParameter(4, cleFiltre);
        }
        return q.getResultList();
    }

    /** La cle sous laquelle un fournisseur est agrege : celle de son groupe, ou la sienne s'il n'en a pas. */
    private String cleDeGroupe(String grossisteId) {
        try {
            /* La MEME regle que l'ecran : le groupe fourre-tout « AUTRES » ne regroupe rien. */
            Object cle = em.createNativeQuery("SELECT CASE WHEN gf.id IS NULL OR UPPER(gf.libelle) = 'AUTRES'"
                    + "   THEN g.lg_GROSSISTE_ID ELSE CONCAT('GRP', gf.id) END"
                    + " FROM t_grossiste g LEFT JOIN groupefournisseur gf ON gf.id = g.groupeId"
                    + " WHERE g.lg_GROSSISTE_ID = ?1").setParameter(1, grossisteId).getSingleResult();
            if (cle != null) {
                return String.valueOf(cle);
            }
        } catch (Exception e) {
            /* Identifiant inconnu, ou deja une cle de groupe : on le garde tel quel. */
            LOG.log(Level.FINE, "cle de groupe d'un grossiste", e);
        }
        return grossisteId;
    }

    /** Coupe un libelle trop long sans couper un mot en deux, et le dit par des points de suspension. */
    private static String borner(String texte, int maximum) {
        if (texte == null || texte.length() <= maximum) {
            return texte;
        }
        int coupe = texte.lastIndexOf(',', maximum - 4);
        return (coupe > 0 ? texte.substring(0, coupe) : texte.substring(0, maximum - 4)) + "...";
    }

    private static double nombre(Object valeur) {
        return valeur instanceof Number ? ((Number) valeur).doubleValue() : 0d;
    }

    private static int entier(Object valeur) {
        return valeur instanceof Number ? ((Number) valeur).intValue() : 0;
    }
}
