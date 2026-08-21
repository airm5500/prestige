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
 * @author koben
 */
@Stateless
public class AnalyseTiersPayantServiceImpl implements AnalyseTiersPayantService {

    private static final Logger LOG = Logger.getLogger(AnalyseTiersPayantServiceImpl.class.getName());

    private static final DateTimeFormatter ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    /**
     * Ventes retenues, communes aux deux niveaux d'analyse. Reprend mot pour mot les filtres des procedures
     * analyse_20_80_par_* : ?1 debut, ?2 fin (incluse), ?3 emplacement.
     */
    private static final String VENTES_TIERS_PAYANT = " FROM t_preenregistrement p"
            + " JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID"
            + " JOIN t_preenregistrement_detail pd ON pd.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID"
            + " JOIN t_famille f ON f.lg_FAMILLE_ID = pd.lg_FAMILLE_ID"
            + " JOIN t_preenregistrement_compte_client_tiers_payent tpv"
            + "   ON tpv.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID" + " JOIN t_compte_client_tiers_payant c"
            + "   ON c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = tpv.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
            + " JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = c.lg_TIERS_PAYANT_ID" + " WHERE p.dt_UPDATED >= ?1"
            + " AND p.dt_UPDATED < DATE_ADD(?2, INTERVAL 1 DAY)" + " AND p.str_STATUT = 'is_Closed'"
            + " AND p.b_IS_CANCEL = 0" + " AND p.int_PRICE > 0" + " AND p.lg_TYPE_VENTE_ID <> '5'"
            + " AND u.lg_EMPLACEMENT_ID = ?3";

    /** Chiffre d'affaires hors taxes net de remise, et marge : formule de l'analyse 20/80. */
    private static final String AGREGATS = " SUM(pd.int_QUANTITY) AS quantite," + " SUM(pd.int_PRICE) AS ca_ttc,"
            + " SUM(pd.int_PRICE - pd.int_PRICE_REMISE - pd.montantTva) AS ca_ht,"
            + " SUM(pd.prixAchat * pd.int_QUANTITY) AS achat,"
            + " SUM(pd.int_PRICE - pd.int_PRICE_REMISE - pd.montantTva) - SUM(pd.prixAchat * pd.int_QUANTITY) AS marge";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private SessionHelperService sessionHelperService;

    @Override
    public List<AnalyseTiersPayantDTO> parTiersPayant(String dtStart, String dtEnd, String recherche) {
        String[] periode = periodeOuMoisEnCours(dtStart, dtEnd);
        String motif = motifRecherche(recherche);
        try {
            String sql = "SELECT tp.lg_TIERS_PAYANT_ID, tp.str_NAME,"
                    + " COUNT(DISTINCT p.lg_PREENREGISTREMENT_ID) AS nb_ventes," + AGREGATS + VENTES_TIERS_PAYANT
                    + " AND (?4 = '' OR tp.str_NAME LIKE ?5)"
                    + " GROUP BY tp.lg_TIERS_PAYANT_ID, tp.str_NAME ORDER BY marge DESC";
            Query query = em.createNativeQuery(sql);
            parametresCommuns(query, periode);
            query.setParameter(4, StringUtils.trimToEmpty(recherche));
            query.setParameter(5, motif);

            List<AnalyseTiersPayantDTO> lignes = new ArrayList<>();
            for (Object[] row : (List<Object[]>) query.getResultList()) {
                AnalyseTiersPayantDTO dto = new AnalyseTiersPayantDTO();
                dto.setTiersPayantId(texte(row[0]));
                dto.setTiersPayant(texte(row[1]));
                dto.setNbVentes(entier(row[2]));
                remplirAgregats(dto, row, 3);
                lignes.add(dto);
            }
            remplirPartTiersPayant(lignes, periode);
            return lignes;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "parTiersPayant", e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<AnalyseTiersPayantDTO> parProduit(String dtStart, String dtEnd, String tiersPayantId,
            String recherche) {
        String[] periode = periodeOuMoisEnCours(dtStart, dtEnd);
        String motif = motifRecherche(recherche);
        String tp = StringUtils.trimToEmpty(tiersPayantId);
        try {
            String sql = "SELECT f.lg_FAMILLE_ID, f.int_CIP, f.str_DESCRIPTION," + AGREGATS + VENTES_TIERS_PAYANT
                    + " AND (?4 = '' OR c.lg_TIERS_PAYANT_ID = ?4)"
                    + " AND (?5 = '' OR f.str_DESCRIPTION LIKE ?6 OR f.int_CIP LIKE ?6)"
                    + " GROUP BY f.lg_FAMILLE_ID, f.int_CIP, f.str_DESCRIPTION ORDER BY marge DESC";
            Query query = em.createNativeQuery(sql);
            parametresCommuns(query, periode);
            query.setParameter(4, tp);
            query.setParameter(5, StringUtils.trimToEmpty(recherche));
            query.setParameter(6, motif);

            List<AnalyseTiersPayantDTO> lignes = new ArrayList<>();
            for (Object[] row : (List<Object[]>) query.getResultList()) {
                AnalyseTiersPayantDTO dto = new AnalyseTiersPayantDTO();
                dto.setCip(texte(row[1]));
                dto.setDesignation(texte(row[2]));
                remplirAgregats(dto, row, 3);
                lignes.add(dto);
            }
            return lignes;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "parProduit", e);
            return Collections.emptyList();
        }
    }

    @Override
    public String[] periodeRetenue(String dtStart, String dtEnd) {
        return periodeOuMoisEnCours(dtStart, dtEnd);
    }

    /**
     * Part prise en charge par chaque tiers payant sur la periode.
     *
     * Elle se lit sur la ligne qui rattache la vente au tiers payant, une seule fois par vente : elle ne peut pas etre
     * calculee dans la requete precedente, ou la jointure sur les lignes de vente la repeterait autant de fois qu'il y
     * a de produits dans la vente.
     */
    private void remplirPartTiersPayant(List<AnalyseTiersPayantDTO> lignes, String[] periode) {
        if (lignes.isEmpty()) {
            return;
        }
        try {
            String sql = "SELECT c.lg_TIERS_PAYANT_ID, SUM(tpv.int_PRICE)"
                    + " FROM t_preenregistrement_compte_client_tiers_payent tpv"
                    + " JOIN t_compte_client_tiers_payant c"
                    + "   ON c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = tpv.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
                    + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = tpv.lg_PREENREGISTREMENT_ID"
                    + " JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID" + " WHERE p.dt_UPDATED >= ?1"
                    + " AND p.dt_UPDATED < DATE_ADD(?2, INTERVAL 1 DAY)" + " AND p.str_STATUT = 'is_Closed'"
                    + " AND p.b_IS_CANCEL = 0" + " AND p.int_PRICE > 0" + " AND p.lg_TYPE_VENTE_ID <> '5'"
                    + " AND u.lg_EMPLACEMENT_ID = ?3" + " GROUP BY c.lg_TIERS_PAYANT_ID";
            Query query = em.createNativeQuery(sql);
            parametresCommuns(query, periode);
            java.util.Map<String, Long> parts = new java.util.HashMap<>();
            for (Object[] row : (List<Object[]>) query.getResultList()) {
                parts.put(texte(row[0]), entier(row[1]));
            }
            for (AnalyseTiersPayantDTO ligne : lignes) {
                ligne.setPartTiersPayant(parts.getOrDefault(ligne.getTiersPayantId(), 0L));
            }
        } catch (Exception e) {
            // La part est une information complementaire : son absence ne doit pas priver l'ecran de l'analyse.
            LOG.log(Level.WARNING, "remplirPartTiersPayant", e);
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
