package rest.service.impl;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.apache.commons.lang3.StringUtils;
import rest.service.AnalyseTiersPayantService;
import rest.service.SessionHelperService;
import rest.service.dto.AnalyseTiersPayantDTO;

/**
 * Analyse des ventes prises en charge par les tiers payants.
 *
 * Les ventes retenues et la formule de marge sont celles de l'analyse 20/80 du chiffre d'affaires (procedures
 * analyse_20_80_par_*) : ventes cloturees, non annulees, hors depot, de l'emplacement de l'utilisateur, et marge egale
 * au chiffre d'affaires hors taxes net de remise diminue du prix d'achat reel porte par la ligne de vente.
 *
 * Une difference assumee avec le 20/80 : le statut du produit n'est pas filtre. Le 20/80 classe des produits en vue
 * d'un reapprovisionnement, ou un article desactive n'a pas sa place ; ici on rend compte de ce qu'un tiers payant a
 * reellement coute et rapporte, et ecarter des ventes reelles parce que le produit a ete desactive depuis en fausserait
 * le montant. Sur la base de reference, 95 lignes de vente tiers payant sur 5685 sont dans ce cas.
 *
 * Plan du 21/11, point 14 (lenteurs) : les tables, les jointures internes et les conditions sont inchangees ; seul
 * l'ordre de lecture est impose (voir {@link Lecture}). Sans cela, le moteur partait des utilisateurs et relisait
 * toutes les ventes depuis l'origine avant de filtrer la periode.
 *
 * @author koben
 */
@Stateless
public class AnalyseTiersPayantServiceImpl implements AnalyseTiersPayantService {

    private static final Logger LOG = Logger.getLogger(AnalyseTiersPayantServiceImpl.class.getName());

    private static final DateTimeFormatter ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    /**
     * Ventes retenues, communes aux deux niveaux d'analyse, dans l'ordre d'origine : gardees comme lecture de secours.
     */
    private static final String VENTES_ANCIENNES = " FROM t_preenregistrement p"
            + " JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID"
            + " JOIN t_preenregistrement_detail pd ON pd.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID"
            + " JOIN t_famille f ON f.lg_FAMILLE_ID = pd.lg_FAMILLE_ID"
            + " JOIN t_preenregistrement_compte_client_tiers_payent tpv"
            + "   ON tpv.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID" + " JOIN t_compte_client_tiers_payant c"
            + "   ON c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = tpv.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
            + " JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = c.lg_TIERS_PAYANT_ID";

    /** Ventes retenues pour la part des tiers payants, dans l'ordre d'origine (secours). */
    private static final String PARTS_ANCIENNES = " FROM t_preenregistrement_compte_client_tiers_payent tpv"
            + " JOIN t_compte_client_tiers_payant c"
            + "   ON c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = tpv.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
            + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = tpv.lg_PREENREGISTREMENT_ID"
            + " JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID";

    /**
     * Conditions des ventes retenues. Reprend mot pour mot les filtres des procedures analyse_20_80_par_* : ?1 debut,
     * ?2 fin (incluse), ?3 emplacement.
     */
    private static final String CONDITIONS_VENTES = " WHERE p.dt_UPDATED >= ?1"
            + " AND p.dt_UPDATED < DATE_ADD(?2, INTERVAL 1 DAY)" + " AND p.str_STATUT = 'is_Closed'"
            + " AND p.b_IS_CANCEL = 0" + " AND p.int_PRICE > 0" + " AND p.lg_TYPE_VENTE_ID <> '5'"
            + " AND u.lg_EMPLACEMENT_ID = ?3";

    /*
     * Filtre par groupe de tiers payants. Valeur vide = tous les groupes, la requete rend alors exactement ce qu'elle
     * rendait avant l'ajout du filtre. Le numero du parametre differe selon la requete : les positions sont deja prises
     * jusqu'a 5 pour l'analyse par tiers payant, jusqu'a 6 pour l'analyse par produit (Hibernate exige une numerotation
     * sequentielle, sans trou).
     */
    private static final String FILTRE_GROUPE = " AND (?6 = '' OR tp.lg_GROUPE_ID = ?6)";
    private static final String FILTRE_GROUPE_7 = " AND (?7 = '' OR tp.lg_GROUPE_ID = ?7)";

    /** Chiffre d'affaires hors taxes net de remise, et marge : formule de l'analyse 20/80. */
    private static final String AGREGATS = " SUM(pd.int_QUANTITY) AS quantite," + " SUM(pd.int_PRICE) AS ca_ttc,"
            + " SUM(pd.int_PRICE - pd.int_PRICE_REMISE - pd.montantTva) AS ca_ht,"
            + " SUM(pd.prixAchat * pd.int_QUANTITY) AS achat,"
            + " SUM(pd.int_PRICE - pd.int_PRICE_REMISE - pd.montantTva) - SUM(pd.prixAchat * pd.int_QUANTITY) AS marge";

    /**
     * Clause de tri des deux listes, decroissante, choisie par l'utilisateur.
     *
     * <p>
     * La valeur recue ne peut PAS etre recopiee telle quelle dans le SQL : ce serait une porte ouverte a l'injection.
     * Elle sert donc uniquement a choisir dans cette liste fermee, et toute valeur inconnue - ou absente - retombe sur
     * la marge, qui etait le seul tri jusqu'ici.
     *
     * <p>
     * « CA » designe le chiffre d'affaires TTC : c'est le montant reellement facture, et la premiere colonne de chiffre
     * d'affaires de l'ecran.
     */
    static String ordreDeTri(String tri) {
        String demande = StringUtils.trimToEmpty(tri).toUpperCase();
        if ("QUANTITE".equals(demande)) {
            return " ORDER BY quantite DESC";
        }
        if ("CA".equals(demande)) {
            return " ORDER BY ca_ttc DESC";
        }
        return " ORDER BY marge DESC";
    }

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private SessionHelperService sessionHelperService;

    @Override
    public List<AnalyseTiersPayantDTO> parTiersPayant(String dtStart, String dtEnd, String recherche, String tri,
            String groupeId) {
        String[] periode = periodeOuMoisEnCours(dtStart, dtEnd);
        String motif = motifRecherche(recherche);
        List<String> vises = tiersPayantsVises("", recherche, groupeId);
        if (vises != null && vises.isEmpty()) {
            // Aucun tiers payant ne repond au nom ou au groupe : la requete d'analyse ne rendrait rien non plus.
            return new ArrayList<>();
        }
        Lecture lecture = lecture(vises, periode);
        try {
            return lireParTiersPayant(lecture, periode, recherche, motif, tri, groupeId);
        } catch (Exception e) {
            if (lecture != Lecture.ANCIENNE) {
                LOG.log(Level.WARNING, "parTiersPayant : lecture ordonnee impossible, lecture d'origine", e);
                try {
                    return lireParTiersPayant(Lecture.ANCIENNE, periode, recherche, motif, tri, groupeId);
                } catch (Exception e2) {
                    LOG.log(Level.SEVERE, "parTiersPayant", e2);
                    return Collections.emptyList();
                }
            }
            LOG.log(Level.SEVERE, "parTiersPayant", e);
            return Collections.emptyList();
        }
    }

    private List<AnalyseTiersPayantDTO> lireParTiersPayant(Lecture lecture, String[] periode, String recherche,
            String motif, String tri, String groupeId) {
        String sql = "SELECT tp.lg_TIERS_PAYANT_ID, tp.str_NAME,"
                + " COUNT(DISTINCT p.lg_PREENREGISTREMENT_ID) AS nb_ventes," + AGREGATS + lecture.source
                + CONDITIONS_VENTES + " AND (?4 = '' OR tp.str_NAME LIKE ?5)" + FILTRE_GROUPE + lecture.restriction(7)
                + " GROUP BY tp.lg_TIERS_PAYANT_ID, tp.str_NAME" + ordreDeTri(tri)
                // Plan du 21/11 : ex aequo departages par le nom, l'ordre ne depend plus du chemin de lecture et reste
                // le meme d'une page a l'autre, a l'ecran comme sur les exports.
                + ", tp.str_NAME, tp.lg_TIERS_PAYANT_ID";
        Query query = em.createNativeQuery(sql);
        parametresCommuns(query, periode);
        query.setParameter(4, StringUtils.trimToEmpty(recherche));
        query.setParameter(5, motif);
        query.setParameter(6, StringUtils.trimToEmpty(groupeId));
        lecture.parametres(query, 7);

        List<AnalyseTiersPayantDTO> lignes = new ArrayList<>();
        for (Object[] row : (List<Object[]>) query.getResultList()) {
            AnalyseTiersPayantDTO dto = new AnalyseTiersPayantDTO();
            dto.setTiersPayantId(texte(row[0]));
            dto.setTiersPayant(texte(row[1]));
            dto.setNbVentes(entier(row[2]));
            remplirAgregats(dto, row, 3);
            lignes.add(dto);
        }
        remplirPartTiersPayant(lignes, periode, lecture);
        return lignes;
    }

    @Override
    public List<AnalyseTiersPayantDTO> parProduit(String dtStart, String dtEnd, String tiersPayantId, String recherche,
            String tri, String groupeId) {
        String[] periode = periodeOuMoisEnCours(dtStart, dtEnd);
        String motif = motifRecherche(recherche);
        String tp = StringUtils.trimToEmpty(tiersPayantId);
        List<String> vises = tiersPayantsVises(tp, "", groupeId);
        if (vises != null && vises.isEmpty()) {
            return new ArrayList<>();
        }
        Lecture lecture = lecture(vises, periode);
        try {
            return lireParProduit(lecture, periode, tp, recherche, motif, tri, groupeId);
        } catch (Exception e) {
            if (lecture != Lecture.ANCIENNE) {
                LOG.log(Level.WARNING, "parProduit : lecture ordonnee impossible, lecture d'origine", e);
                try {
                    return lireParProduit(Lecture.ANCIENNE, periode, tp, recherche, motif, tri, groupeId);
                } catch (Exception e2) {
                    LOG.log(Level.SEVERE, "parProduit", e2);
                    return Collections.emptyList();
                }
            }
            LOG.log(Level.SEVERE, "parProduit", e);
            return Collections.emptyList();
        }
    }

    private List<AnalyseTiersPayantDTO> lireParProduit(Lecture lecture, String[] periode, String tp, String recherche,
            String motif, String tri, String groupeId) {
        String sql = "SELECT f.lg_FAMILLE_ID, f.int_CIP, f.str_DESCRIPTION," + AGREGATS + lecture.source
                + CONDITIONS_VENTES + " AND (?4 = '' OR c.lg_TIERS_PAYANT_ID = ?4)"
                + " AND (?5 = '' OR f.str_DESCRIPTION LIKE ?6 OR f.int_CIP LIKE ?6)" + FILTRE_GROUPE_7
                + lecture.restriction(8) + " GROUP BY f.lg_FAMILLE_ID, f.int_CIP, f.str_DESCRIPTION" + ordreDeTri(tri)
                + ", f.str_DESCRIPTION, f.lg_FAMILLE_ID";
        Query query = em.createNativeQuery(sql);
        parametresCommuns(query, periode);
        query.setParameter(4, tp);
        query.setParameter(5, StringUtils.trimToEmpty(recherche));
        query.setParameter(6, motif);
        query.setParameter(7, StringUtils.trimToEmpty(groupeId));
        lecture.parametres(query, 8);

        List<AnalyseTiersPayantDTO> lignes = new ArrayList<>();
        for (Object[] row : (List<Object[]>) query.getResultList()) {
            AnalyseTiersPayantDTO dto = new AnalyseTiersPayantDTO();
            dto.setProduitId(texte(row[0]));
            dto.setCip(texte(row[1]));
            dto.setDesignation(texte(row[2]));
            remplirAgregats(dto, row, 3);
            lignes.add(dto);
        }
        return lignes;
    }

    @Override
    public String libelleTiersPayant(String tiersPayantId) {
        if (StringUtils.isBlank(tiersPayantId)) {
            return "";
        }
        try {
            dal.TTiersPayant tp = em.find(dal.TTiersPayant.class, tiersPayantId);
            return tp == null || StringUtils.isBlank(tp.getStrNAME()) ? tiersPayantId : tp.getStrNAME();
        } catch (Exception e) {
            return tiersPayantId;
        }
    }

    @Override
    public String[] periodeRetenue(String dtStart, String dtEnd) {
        return periodeOuMoisEnCours(dtStart, dtEnd);
    }

    @Override
    public dal.TFamille produit(String produitId) {
        if (StringUtils.isBlank(produitId)) {
            return null;
        }
        try {
            return em.find(dal.TFamille.class, produitId);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Part prise en charge par chaque tiers payant sur la periode.
     *
     * Elle se lit sur la ligne qui rattache la vente au tiers payant, une seule fois par vente : elle ne peut pas etre
     * calculee dans la requete precedente, ou la jointure sur les lignes de vente la repeterait autant de fois qu'il y
     * a de produits dans la vente.
     *
     * Plan du 21/11 : meme chemin que la liste. Lue par tiers payant, elle est limitee aux tiers payants de la liste.
     */
    private void remplirPartTiersPayant(List<AnalyseTiersPayantDTO> lignes, String[] periode, Lecture lecture) {
        if (lignes.isEmpty()) {
            return;
        }
        try {
            Lecture parts = lecture;
            if (lecture.ids != null) {
                List<String> ids = new ArrayList<>();
                lignes.forEach(l -> ids.add(l.getTiersPayantId()));
                parts = Lecture.parTiersPayant(ids);
            }
            String sql = "SELECT c.lg_TIERS_PAYANT_ID, SUM(tpv.int_PRICE)" + parts.sourceParts + CONDITIONS_VENTES
                    + parts.restriction(4) + " GROUP BY c.lg_TIERS_PAYANT_ID";
            Query query = em.createNativeQuery(sql);
            parametresCommuns(query, periode);
            parts.parametres(query, 4);
            java.util.Map<String, Long> montants = new java.util.HashMap<>();
            for (Object[] row : (List<Object[]>) query.getResultList()) {
                montants.put(texte(row[0]), entier(row[1]));
            }
            for (AnalyseTiersPayantDTO ligne : lignes) {
                ligne.setPartTiersPayant(montants.getOrDefault(ligne.getTiersPayantId(), 0L));
            }
        } catch (Exception e) {
            if (lecture != Lecture.ANCIENNE) {
                LOG.log(Level.WARNING, "remplirPartTiersPayant : lecture ordonnee impossible, lecture d'origine", e);
                remplirPartTiersPayant(lignes, periode, Lecture.ANCIENNE);
                return;
            }
            // La part est une information complementaire : son absence ne doit pas priver l'ecran de l'analyse.
            LOG.log(Level.WARNING, "remplirPartTiersPayant", e);
        }
    }

    /**
     * Tiers payants vises par la demande, lus sur leur fiche avec les MEMES filtres que la requete d'analyse
     * (identifiant, nom, groupe). Rend null quand rien ne restreint les tiers payants.
     */
    private List<String> tiersPayantsVises(String tiersPayantId, String rechercheNom, String groupeId) {
        String id = StringUtils.trimToEmpty(tiersPayantId);
        String nom = StringUtils.trimToEmpty(rechercheNom);
        String groupe = StringUtils.trimToEmpty(groupeId);
        if (id.isEmpty() && nom.isEmpty() && groupe.isEmpty()) {
            return null;
        }
        try {
            Query query = em.createNativeQuery("SELECT tp.lg_TIERS_PAYANT_ID FROM t_tiers_payant tp"
                    + " WHERE (?1 = '' OR tp.lg_TIERS_PAYANT_ID = ?1) AND (?2 = '' OR tp.str_NAME LIKE ?3)"
                    + " AND (?4 = '' OR tp.lg_GROUPE_ID = ?4)");
            query.setParameter(1, id);
            query.setParameter(2, nom);
            query.setParameter(3, motifRecherche(nom));
            query.setParameter(4, groupe);
            List<String> ids = new ArrayList<>();
            for (Object o : (List<Object>) query.getResultList()) {
                ids.add(texte(o));
            }
            return ids;
        } catch (Exception e) {
            LOG.log(Level.WARNING, "tiersPayantsVises", e);
            return null;
        }
    }

    /**
     * Chemin de lecture : par la date de la vente, sauf quand peu de tiers payants sont vises et qu'ils comptent,
     * depuis toujours, moins de ventes que la periode : on part alors de leurs ventes. Les deux comptes ne lisent que
     * des index.
     */
    private Lecture lecture(List<String> vises, String[] periode) {
        if (vises == null || vises.size() > Lecture.MAX_TIERS_PAYANTS) {
            return Lecture.PAR_DATE;
        }
        try {
            Query ventes = em.createNativeQuery("SELECT COUNT(*) FROM t_preenregistrement p"
                    + " FORCE INDEX (idx_preenr_statut_date) WHERE p.str_STATUT = 'is_Closed'"
                    + " AND p.dt_UPDATED >= ?1 AND p.dt_UPDATED < DATE_ADD(?2, INTERVAL 1 DAY)");
            ventes.setParameter(1, periode[0]);
            ventes.setParameter(2, periode[1]);
            Lecture parTp = Lecture.parTiersPayant(vises);
            Query lignesTp = em.createNativeQuery("SELECT COUNT(*) FROM t_compte_client_tiers_payant c"
                    + " FORCE INDEX (lg_TIERS_PAYANT_ID)"
                    + " STRAIGHT_JOIN t_preenregistrement_compte_client_tiers_payent tpv"
                    + "   ON tpv.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID WHERE 1 = 1"
                    + parTp.restriction(1));
            parTp.parametres(lignesTp, 1);
            long nbVentes = entier(ventes.getSingleResult());
            long nbLignesTp = entier(lignesTp.getSingleResult());
            return nbLignesTp < nbVentes ? parTp : Lecture.PAR_DATE;
        } catch (Exception e) {
            LOG.log(Level.WARNING, "choix du chemin de lecture", e);
            return Lecture.PAR_DATE;
        }
    }

    /**
     * Ordre de lecture des ventes. Memes tables, memes jointures internes, memes conditions : le resultat ne change
     * pas, seul l'ordre dans lequel le moteur parcourt les tables est impose (STRAIGHT_JOIN).
     */
    static final class Lecture {

        /** Au-dela, la liste des tiers payants vises n'est plus un raccourci : lecture par la date. */
        static final int MAX_TIERS_PAYANTS = 50;

        private static final String SUITE = " STRAIGHT_JOIN t_tiers_payant tp"
                + "   ON tp.lg_TIERS_PAYANT_ID = c.lg_TIERS_PAYANT_ID"
                + " STRAIGHT_JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID"
                + " STRAIGHT_JOIN t_preenregistrement_detail pd"
                + "   ON pd.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID"
                + " STRAIGHT_JOIN t_famille f ON f.lg_FAMILLE_ID = pd.lg_FAMILLE_ID";
        private static final String UTILISATEUR = " STRAIGHT_JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID";
        private static final String PAR_DATE_DEBUT = " FROM t_preenregistrement p"
                + " FORCE INDEX (idx_preenr_statut_date)"
                + " STRAIGHT_JOIN t_preenregistrement_compte_client_tiers_payent tpv"
                + "   ON tpv.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID"
                + " STRAIGHT_JOIN t_compte_client_tiers_payant c"
                + "   ON c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = tpv.lg_COMPTE_CLIENT_TIERS_PAYANT_ID";
        private static final String PAR_TP_DEBUT = " FROM t_compte_client_tiers_payant c"
                + " FORCE INDEX (lg_TIERS_PAYANT_ID)"
                + " STRAIGHT_JOIN t_preenregistrement_compte_client_tiers_payent tpv"
                + "   ON tpv.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
                + " STRAIGHT_JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = tpv.lg_PREENREGISTREMENT_ID";

        /** Lecture d'origine, en secours si un index venait a manquer. */
        static final Lecture ANCIENNE = new Lecture(VENTES_ANCIENNES, PARTS_ANCIENNES, null);
        /** Par la date de la vente : tous les tiers payants. */
        static final Lecture PAR_DATE = new Lecture(PAR_DATE_DEBUT + SUITE, PAR_DATE_DEBUT + UTILISATEUR, null);

        /** Par les ventes de ces tiers payants. */
        static Lecture parTiersPayant(List<String> ids) {
            return new Lecture(PAR_TP_DEBUT + SUITE, PAR_TP_DEBUT + UTILISATEUR, ids);
        }

        final String source;
        final String sourceParts;
        /** Tiers payants dont on part ; null pour les autres lectures. */
        final List<String> ids;

        private Lecture(String source, String sourceParts, List<String> ids) {
            this.source = source;
            this.sourceParts = sourceParts;
            this.ids = ids;
        }

        /** Restriction aux tiers payants vises, parametres numerotes a partir de premier, sans trou. */
        String restriction(int premier) {
            if (ids == null) {
                return "";
            }
            if (ids.isEmpty()) {
                return " AND 1 = 0";
            }
            StringBuilder sb = new StringBuilder(" AND c.lg_TIERS_PAYANT_ID IN (");
            for (int i = 0; i < ids.size(); i++) {
                sb.append(i == 0 ? "?" : ", ?").append(premier + i);
            }
            return sb.append(')').toString();
        }

        void parametres(Query query, int premier) {
            if (ids != null) {
                for (int i = 0; i < ids.size(); i++) {
                    query.setParameter(premier + i, ids.get(i));
                }
            }
        }
    }

    private void parametresCommuns(Query query, String[] periode) {
        query.setParameter(1, periode[0]);
        query.setParameter(2, periode[1]);
        query.setParameter(3, sessionHelperService.getCurrentUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
    }

    private void remplirAgregats(AnalyseTiersPayantDTO dto, Object[] row, int debut) {
        dto.setQuantite(entier(row[debut]));
        dto.setCaTtc(entier(row[debut + 1]));
        dto.setCaHt(entier(row[debut + 2]));
        dto.setMontantAchat(entier(row[debut + 3]));
        dto.setMarge(entier(row[debut + 4]));
    }

    /**
     * Periode demandee, ou le mois en cours a defaut : c'est la fenetre que l'on regarde le plus souvent, et elle evite
     * de balayer tout l'historique quand l'ecran s'ouvre.
     *
     * Une date illisible est traitee comme une date absente plutot que comme une erreur : l'analyse s'affiche sur le
     * mois en cours au lieu de renvoyer une page vide sans explication.
     */
    static String[] periodeOuMoisEnCours(String dtStart, String dtEnd) {
        LocalDate debut = date(dtStart);
        LocalDate fin = date(dtEnd);
        if (debut == null || fin == null) {
            LocalDate aujourdhui = LocalDate.now();
            debut = aujourdhui.withDayOfMonth(1);
            fin = aujourdhui;
        }
        if (fin.isBefore(debut)) {
            // Bornes inversees a la saisie : on les remet dans l'ordre plutot que de rendre une liste vide.
            LocalDate echange = debut;
            debut = fin;
            fin = echange;
        }
        return new String[] { debut.format(ISO), fin.format(ISO) };
    }

    private static LocalDate date(String valeur) {
        try {
            return LocalDate.parse(StringUtils.trimToEmpty(valeur), ISO);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    /** Recherche « contenant », comme sur les autres ecrans d'analyse. */
    static String motifRecherche(String recherche) {
        return "%" + StringUtils.trimToEmpty(recherche) + "%";
    }

    private static String texte(Object valeur) {
        return valeur == null ? "" : valeur.toString();
    }

    private static long entier(Object valeur) {
        return valeur instanceof Number ? ((Number) valeur).longValue() : 0L;
    }
}
