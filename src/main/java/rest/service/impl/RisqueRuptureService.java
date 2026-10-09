package rest.service.impl;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.impl.RisqueRupture.Calcul;
import rest.service.impl.RisqueRupture.Reglages;
import rest.service.impl.RisqueRupture.Statut;

/**
 * Retours du 09/10 (3) : onglet « Risque de rupture » de Commandes en cours. Ventes par jour issues des previsions de
 * la nuit (t_prevision_produit), stock (rayon + reserve) et commandes en cours lus en direct, delai du grossiste
 * habituel (sinon le delai par defaut), ruptures signalees par les grossistes sur 30 jours (affichees a part : rupture
 * fournisseur). Classement par {@link RisqueRupture}. Lecture seule.
 */
@Stateless
public class RisqueRuptureService {

    static final int JOURS_COMMANDE_EN_COURS = PrevisionCommandeServiceImpl.JOURS_COMMANDE_EN_COURS;
    static final int JOURS_RUPTURE_FOURNISSEUR = 30;
    private static final DateTimeFormatter JJ_MM = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    /** Statuts proposes a l'ouverture : ceux qui demandent une action ou une attention. */
    public static final Set<Statut> A_TRAITER = java.util.EnumSet.of(Statut.RUPTURE, Statut.CRITIQUE, Statut.RISQUE,
            Statut.A_SURVEILLER);

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    public static class Ligne {

        public String id, cip, designation, grossiste, rayon, derniereVente, ruptureFournisseur;
        public double parJour;
        public int stock, enCours, ventes12Mois, prixAchat;
        public Calcul calcul;

        JSONObject json() {
            Calcul c = calcul;
            return new JSONObject().put("id", id).put("cip", cip).put("designation", designation)
                    .put("grossiste", StringUtils.defaultString(grossiste))
                    .put("rayon", StringUtils.defaultString(rayon)).put("statut", c.statut.name())
                    .put("parJour", Math.round(parJour * 100) / 100.0).put("stock", stock).put("enCours", enCours)
                    .put("couverture", c.couverture == null ? JSONObject.NULL : c.couverture).put("delai", c.delai)
                    .put("horizon", c.horizon).put("seuil", c.seuil).put("aCommander", c.aCommander)
                    .put("valeurACommander", (long) c.aCommander * prixAchat)
                    .put("epuisement", c.epuisement == null ? JSONObject.NULL : c.epuisement.format(JJ_MM))
                    .put("derniereVente", StringUtils.defaultString(derniereVente))
                    .put("ruptureFournisseur", StringUtils.defaultString(ruptureFournisseur));
        }
    }

    private int parametre(String cle, int defaut) {
        try {
            List<?> l = em.createNativeQuery("SELECT str_VALUE FROM t_parameters WHERE str_KEY = ?1")
                    .setParameter(1, cle).getResultList();
            return l.isEmpty() || l.get(0) == null ? defaut : Integer.parseInt(String.valueOf(l.get(0)).trim());
        } catch (RuntimeException e) {
            return defaut;
        }
    }

    public Reglages reglages() {
        Reglages r = new Reglages();
        r.delaiDefaut = Math.max(0, parametre("KEY_PREVISION_DELAI_JOURS", 3));
        r.securite = Math.max(0, parametre("KEY_RISQUE_SECURITE_JOURS", 2));
        r.surveillance = Math.max(0, parametre("KEY_RISQUE_SURVEILLANCE_JOURS", 3));
        r.surstock = Math.max(1, parametre("KEY_PREVISION_SURSTOCK_JOURS", 90));
        r.couvertureCible = Math.max(0, parametre("KEY_PREVISION_COUVERTURE_JOURS", 15));
        return r;
    }

    private static int entier(Object o) {
        return o == null ? 0 : ((Number) o).intValue();
    }

    /** Toutes les lignes (produits suivis par les previsions) de l'emplacement, classees. */
    @SuppressWarnings("unchecked")
    public List<Ligne> lignes(String emplacement, Reglages r) {
        LocalDate aujourdhui = LocalDate.now();
        List<Object[]> rows = em.createNativeQuery("SELECT f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME, g.str_LIBELLE,"
                + " z.str_LIBELLEE, p.prevu_mois, p.ventes_12_mois,"
                + " COALESCE(s.int_NUMBER_AVAILABLE, 0) + COALESCE(rs.reserve, 0), COALESCE(ec.qte, 0),"
                + " g.int_DELAI_REAPPROVISIONNEMENT, COALESCE(f.int_PAF, 0), DATE_FORMAT(p.derniere_vente, '%d/%m/%Y'),"
                + " rf.motif" + " FROM t_prevision_produit p"
                + " JOIN t_famille f ON f.lg_FAMILLE_ID = p.lg_FAMILLE_ID AND f.str_STATUT = 'enable'"
                + " LEFT JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = ?1"
                + "   AND s.str_STATUT = 'enable'"
                + " LEFT JOIN (SELECT lg_FAMILLE_ID, SUM(int_NUMBER) reserve FROM t_type_stock_famille"
                + "   WHERE lg_TYPE_STOCK_ID = '2' AND lg_EMPLACEMENT_ID = ?1 GROUP BY lg_FAMILLE_ID) rs"
                + "   ON rs.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
                + " LEFT JOIN (SELECT od.lg_FAMILLE_ID, SUM(od.int_NUMBER) qte FROM t_order_detail od"
                + "   JOIN t_order o ON o.lg_ORDER_ID = od.lg_ORDER_ID WHERE o.str_STATUT IN ('is_Process', 'passed')"
                + "   AND o.dt_UPDATED >= ?2 GROUP BY od.lg_FAMILLE_ID) ec ON ec.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
                + " LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID"
                + " LEFT JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID"
                + " LEFT JOIN (SELECT d.produitId, SUBSTRING_INDEX(GROUP_CONCAT(CONCAT(DATE_FORMAT(r.dtCreated, '%d/%m'),"
                + "   ' ', COALESCE(gg.str_LIBELLE, ''), IF(d.motif IS NULL OR d.motif = '', '', CONCAT(' : ', d.motif)))"
                + "   ORDER BY r.dtHeure DESC SEPARATOR '\\n'), '\\n', 1) motif"
                + "   FROM rupture_detail d JOIN rupture r ON r.id = d.ruptureId"
                + "   LEFT JOIN t_grossiste gg ON gg.lg_GROSSISTE_ID = r.grossisteId"
                + "   WHERE r.dtCreated >= ?3 GROUP BY d.produitId) rf ON rf.produitId = f.lg_FAMILLE_ID"
                + " WHERE p.lg_EMPLACEMENT_ID = ?1").setParameter(1, emplacement)
                .setParameter(2, Timestamp.valueOf(aujourdhui.minusDays(JOURS_COMMANDE_EN_COURS).atStartOfDay()))
                .setParameter(3, java.sql.Date.valueOf(aujourdhui.minusDays(JOURS_RUPTURE_FOURNISSEUR)))
                .getResultList();
        List<Ligne> sortie = new ArrayList<>(rows.size());
        for (Object[] o : rows) {
            Ligne l = new Ligne();
            l.id = (String) o[0];
            l.cip = (String) o[1];
            l.designation = (String) o[2];
            l.grossiste = (String) o[3];
            l.rayon = (String) o[4];
            l.parJour = o[5] == null ? 0 : ((Number) o[5]).doubleValue() / 30.0;
            l.ventes12Mois = entier(o[6]);
            l.stock = entier(o[7]);
            l.enCours = entier(o[8]);
            Integer delai = o[9] == null ? null : entier(o[9]);
            l.prixAchat = entier(o[10]);
            l.derniereVente = (String) o[11];
            l.ruptureFournisseur = (String) o[12];
            l.calcul = RisqueRupture.evaluer(l.parJour, l.stock, l.enCours, delai, l.ventes12Mois, r, aujourdhui);
            sortie.add(l);
        }
        return sortie;
    }

    /** Ordre d'urgence : statut, puis date d'epuisement, puis designation. */
    static final Comparator<Ligne> URGENCE = Comparator.<Ligne> comparingInt(l -> l.calcul.statut.ordinal())
            .thenComparing(l -> l.calcul.couverture == null ? Double.MAX_VALUE : l.calcul.couverture)
            .thenComparing(l -> StringUtils.defaultString(l.designation));

    /** Filtres de l'ecran ; statuts vides = ceux a traiter. */
    public List<Ligne> filtrer(List<Ligne> toutes, Set<Statut> statuts, String recherche, String grossiste,
            String rayon, boolean ruptureFournisseurSeulement) {
        String q = StringUtils.left(StringUtils.trimToEmpty(recherche), 100).toUpperCase(Locale.FRENCH);
        return toutes.stream().filter(l -> statuts.contains(l.calcul.statut))
                .filter(l -> q.isEmpty() || StringUtils.defaultString(l.cip).startsWith(q)
                        || StringUtils.defaultString(l.designation).toUpperCase(Locale.FRENCH).contains(q))
                .filter(l -> StringUtils.isBlank(grossiste) || grossiste.equals(l.grossiste))
                .filter(l -> StringUtils.isBlank(rayon) || rayon.equals(l.rayon))
                .filter(l -> !ruptureFournisseurSeulement || StringUtils.isNotBlank(l.ruptureFournisseur))
                .sorted(URGENCE).collect(Collectors.toList());
    }

    public static Set<Statut> statuts(String liste) {
        if (StringUtils.isBlank(liste)) {
            return A_TRAITER;
        }
        Set<Statut> s = java.util.EnumSet.noneOf(Statut.class);
        Arrays.stream(liste.split(",")).map(String::trim).forEach(x -> {
            for (Statut t : Statut.values()) {
                if (t.name().equalsIgnoreCase(x)) {
                    s.add(t);
                }
            }
        });
        return s.isEmpty() ? A_TRAITER : s;
    }

    public JSONObject page(String emplacement, String statuts, String recherche, String grossiste, String rayon,
            boolean ruptureFournisseur, int start, int limit) {
        Reglages r = reglages();
        List<Ligne> toutes = lignes(emplacement, r);
        /* compteurs par statut : sur les memes filtres, hors filtre de statut */
        Map<Statut, Integer> compte = new EnumMap<>(Statut.class);
        filtrer(toutes, java.util.EnumSet.allOf(Statut.class), recherche, grossiste, rayon, ruptureFournisseur)
                .forEach(l -> compte.merge(l.calcul.statut, 1, Integer::sum));
        List<Ligne> choisies = filtrer(toutes, statuts(statuts), recherche, grossiste, rayon, ruptureFournisseur);
        JSONArray data = new JSONArray();
        int debut = Math.max(0, start), fin = Math.min(choisies.size(), debut + Math.max(1, Math.min(limit, 500)));
        for (int i = debut; i < fin; i++) {
            data.put(choisies.get(i).json());
        }
        JSONObject compteurs = new JSONObject();
        for (Statut s : Statut.values()) {
            compteurs.put(s.name(), compte.getOrDefault(s, 0));
        }
        long valeur = choisies.stream().mapToLong(l -> (long) l.calcul.aCommander * l.prixAchat).sum();
        return new JSONObject().put("success", true).put("total", choisies.size()).put("data", data)
                .put("compteurs", compteurs).put("valeurACommander", valeur)
                .put("ruptureFournisseur",
                        toutes.stream().filter(l -> StringUtils.isNotBlank(l.ruptureFournisseur)).count())
                .put("reglages",
                        new JSONObject().put("delaiDefaut", r.delaiDefaut).put("securite", r.securite)
                                .put("surveillance", r.surveillance).put("surstock", r.surstock)
                                .put("couvertureCible", r.couvertureCible))
                .put("calcul", derniereNuit(emplacement));
    }

    /** Date du calcul des previsions utilise (les ventes par jour en viennent). */
    private Object derniereNuit(String emplacement) {
        List<?> l = em.createNativeQuery("SELECT DATE_FORMAT(MAX(dt_CALCUL), '%d/%m/%Y %H:%i') FROM t_prevision_produit"
                + " WHERE lg_EMPLACEMENT_ID = ?1").setParameter(1, emplacement).getResultList();
        return l.isEmpty() || l.get(0) == null ? JSONObject.NULL : l.get(0);
    }
}
