package rest.service.impl;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import rest.report.pdf.Gs1;
import rest.service.ParametreService;

/**
 * Retours du 10/10 (Q6) : lecture a la vente d'une etiquette GS1 (QR ou DataMatrix), derriere le parametre
 * KEY_VENTE_LECTURE_GS1 (0 par defaut : rien ne change a la vente). Le produit est retrouve par son CIP (240), sinon
 * par l'EAN du GTIN (01), produit puis fabricant ; lot (10) et peremption (17) sont rappeles, un lot perime refuse.
 */
@Stateless
public class LectureGs1Service {

    public static final String PARAM = "KEY_VENTE_LECTURE_GS1";
    private static final DateTimeFormatter JJ = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private ParametreService parametreService;

    public boolean active() {
        return "1".equals(StringUtils.trim(parametreService.getValue(PARAM, "0")));
    }

    public static final String PARAM_CONTROLE = "KEY_VENTE_CONTROLE_LOT_GS1";

    /**
     * Retours du 10/10 : que faire quand la boite scannee n'est pas du lot que Prestige sort. A = avertir seulement
     * (defaut, et toute valeur inconnue) ; B = avertir et sortir le lot scanne ; C = bloquer l'ajout.
     */
    public String modeControle() {
        return mode(parametreService.getValue(PARAM_CONTROLE, "A"));
    }

    static String mode(String valeur) {
        String v = StringUtils.upperCase(StringUtils.trimToEmpty(valeur));
        return "B".equals(v) || "C".equals(v) ? v : "A";
    }

    /** Le lot existe pour ce produit, avec du stock, et n'est pas perime (il peut donc etre sorti). */
    public boolean lotEnStock(String produitId, String lot) {
        if (StringUtils.isAnyBlank(produitId, lot)) {
            return false;
        }
        Number n = (Number) em
                .createNativeQuery("SELECT COUNT(*) FROM t_lot WHERE lg_FAMILLE_ID = ?1"
                        + " AND UPPER(int_NUM_LOT) = UPPER(?2) AND current_stock > 0"
                        + " AND (dt_PEREMPTION IS NULL OR dt_PEREMPTION > NOW())")
                .setParameter(1, produitId).setParameter(2, lot.trim()).getSingleResult();
        return n != null && n.intValue() > 0;
    }

    /**
     * Codes a essayer pour retrouver le produit, dans l'ordre : CIP, EAN-13, CIP du produit dont c'est l'EAN fabricant.
     */
    @SuppressWarnings("unchecked")
    public List<String> codesProduit(Gs1.Contenu c) {
        List<String> codes = new java.util.ArrayList<>();
        if (c.cip != null) {
            codes.add(c.cip);
        }
        String ean = Gs1.ean13(c.gtin);
        if (ean != null) {
            codes.add(ean);
            List<Object> r = em
                    .createNativeQuery("SELECT int_CIP FROM t_famille WHERE str_STATUT = 'enable'"
                            + " AND code_ean_fabriquant = ?1 AND int_CIP IS NOT NULL")
                    .setParameter(1, ean).setMaxResults(1).getResultList();
            if (!r.isEmpty() && r.get(0) != null) {
                codes.add(String.valueOf(r.get(0)));
            }
        }
        return codes;
    }

    /** Lot et peremption lus, et perime ou non (date passee) ; ajoute au resultat de la recherche du produit. */
    public static JSONObject completer(JSONObject o, Gs1.Contenu c, LocalDate aujourdhui) {
        o.put("gs1", true).put("lot", StringUtils.defaultString(c.lot))
                .put("peremption", c.peremption == null ? "" : c.peremption.format(JJ))
                .put("perime", c.peremption != null && c.peremption.isBefore(aujourdhui))
                .put("cip", StringUtils.defaultString(c.cip)).put("gtin", StringUtils.defaultString(c.gtin));
        return o;
    }

    /**
     * Retours du 10/10 : le but de la lecture est de CONTROLER que la boite prise en rayon est bien celle du lot que
     * Prestige sort (le plus proche de la peremption, deja affiche a la vente). Compare le lot lu (sinon la peremption
     * lue) au lot prevu {date jj/mm/aaaa, lot, quantite} :
     * <ul>
     * <li>CONFORME : meme lot (casse et espaces ignores), ou meme peremption quand l'un des lots manque ;</li>
     * <li>DIFFERENT : autre lot, ou autre peremption ;</li>
     * <li>INCONNU : rien a comparer (aucun lot en stock ni date, ou etiquette sans lot ni peremption).</li>
     * </ul>
     */
    public static JSONObject controlerLot(JSONObject o, Gs1.Contenu c, Object[] prevu) {
        String lotPrevu = prevu == null || prevu.length < 2 || prevu[1] == null ? "" : String.valueOf(prevu[1]).trim();
        String datePrevue = prevu == null || prevu.length < 1 || prevu[0] == null ? ""
                : String.valueOf(prevu[0]).trim();
        String lotLu = c.lot == null ? "" : c.lot.trim();
        String dateLue = c.peremption == null ? "" : c.peremption.format(JJ);
        String controle;
        if (!lotPrevu.isEmpty() && !lotLu.isEmpty()) {
            controle = lotPrevu.replace(" ", "").equalsIgnoreCase(lotLu.replace(" ", "")) ? "CONFORME" : "DIFFERENT";
        } else if (!datePrevue.isEmpty() && !dateLue.isEmpty()) {
            controle = datePrevue.equals(dateLue) ? "CONFORME" : "DIFFERENT";
        } else {
            controle = "INCONNU";
        }
        return o.put("lotPrevu", lotPrevu).put("peremptionPrevue", datePrevue).put("controle", controle);
    }
}
