package rest.service.facture;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import javax.persistence.EntityManager;
import javax.persistence.Query;

import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Plan du 21/11, point 9 : « Déjà facturé ? ». Retrouve les bons de tiers payant (une part tiers payant d'une vente
 * close et non annulee) par numero de bon, numero de ticket, matricule ou nom du client, sur toutes les factures et
 * sans limite de periode, et dit pour chacun s'il est facture et dans quelle facture.
 *
 * <p>
 * Regles :
 * <ul>
 * <li>une facture compte si elle est definitive (pas un modele : template nul ou 0) et ni annulee par un avoir (statut
 * « avoir ») ni supprimee a l'ancienne (statut « delete ») ;</li>
 * <li>un bon est FACTURE s'il figure dans au moins une facture qui compte ; sinon NON_FACTURE, avec la liste des
 * factures annulees qui l'ont porte ;</li>
 * <li>le nom se cherche mot par mot, dans n'importe quel ordre, n'importe ou dans « prenom nom » ; numero de bon,
 * ticket et matricule se cherchent a l'identique ;</li>
 * <li>au plus {@link #LIMITE} bons, les plus recents d'abord ; au-dela, la reponse le dit.</li>
 * </ul>
 */
public final class DejaFacture {

    public static final int LIMITE = 100;
    public static final String FACTURE = "FACTURE";
    public static final String NON_FACTURE = "NON_FACTURE";
    static final int LONGUEUR_MAX = 60;
    /** au-dela, la liste des bons candidats est coupee (la reponse dit alors que la recherche est a preciser) */
    static final int CANDIDATS_MAX = 2000;

    private DejaFacture() {
    }

    /** Saisie nettoyee (espaces reduits, 60 caracteres au plus) ; null si moins de 2 caracteres utiles. */
    public static String saisie(String q) {
        if (q == null) {
            return null;
        }
        String s = q.trim().replaceAll("\\s+", " ");
        if (s.length() > LONGUEUR_MAX) {
            s = s.substring(0, LONGUEUR_MAX).trim();
        }
        return s.length() < 2 ? null : s;
    }

    /** Motifs LIKE des mots de la saisie (% et _ neutralises) : chacun doit apparaitre dans « prenom nom ». */
    public static List<String> motifsNom(String saisie) {
        List<String> l = new ArrayList<>();
        if (saisie == null) {
            return l;
        }
        for (String m : saisie.split(" ")) {
            if (!m.isEmpty()) {
                l.add("%" + m.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%");
            }
        }
        return l;
    }

    /** Une facture compte : definitive, ni annulee par avoir, ni supprimee. */
    public static boolean active(String statut, Number template) {
        boolean modele = template != null && template.intValue() != 0;
        return !modele && !"avoir".equalsIgnoreCase(statut) && !"delete".equalsIgnoreCase(statut);
    }

    /** Une facture portant le bon. */
    public static final class Facture {
        public final String id;
        public final String code;
        public final Date date;
        public final String statut;
        public final Number template;
        public final String organisme;

        public Facture(String id, String code, Date date, String statut, Number template, String organisme) {
            this.id = id;
            this.code = code;
            this.date = date;
            this.statut = statut;
            this.template = template;
            this.organisme = organisme;
        }

        public boolean active() {
            return DejaFacture.active(statut, template);
        }

        boolean definitive() {
            return template == null || template.intValue() == 0;
        }
    }

    /** Un bon (part tiers payant d'une vente). */
    public static final class Bon {
        public String id;
        public String bon;
        public String ticket;
        public String client;
        public String matricule;
        public Date dateVente;
        public int montant;
        public String organisme;
        public String statutFacture;
        public final List<Facture> factures = new ArrayList<>();

        /** La facture qui compte (la plus recente s'il y en avait plusieurs), ou null. */
        public Facture factureActive() {
            Facture r = null;
            for (Facture f : factures) {
                if (f.active() && (r == null || r.date == null || (f.date != null && !f.date.before(r.date)))) {
                    r = f;
                }
            }
            return r;
        }

        /** Factures definitives annulees (avoir ou suppression a l'ancienne) qui ont porte le bon. */
        public List<Facture> annulees() {
            List<Facture> l = new ArrayList<>();
            for (Facture f : factures) {
                if (f.definitive() && !f.active()) {
                    l.add(f);
                }
            }
            return l;
        }

        public String etat() {
            return factureActive() == null ? NON_FACTURE : FACTURE;
        }
    }

    /** Recherche complete : candidats, puis bons, puis leurs factures. */
    public static Map<String, Object> chercher(EntityManager em, String saisie) {
        Map<String, Object> r = new LinkedHashMap<>();
        List<String> ids = candidats(em, saisie);
        boolean coupe = ids.size() >= CANDIDATS_MAX;
        List<Bon> bons = bons(em, ids);
        boolean tronque = coupe || bons.size() > LIMITE;
        if (bons.size() > LIMITE) {
            bons = new ArrayList<>(bons.subList(0, LIMITE));
        }
        factures(em, bons);
        r.put("bons", bons);
        r.put("tronque", tronque);
        return r;
    }

    @SuppressWarnings("unchecked")
    static List<String> candidats(EntityManager em, String saisie) {
        Set<String> ids = new LinkedHashSet<>();
        String p = "SELECT p.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID FROM t_preenregistrement_compte_client_tiers_payent p";
        String[] exacts = { p + " WHERE p.str_REF_BON = ?1", p
                + " JOIN t_preenregistrement v ON v.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID WHERE v.str_REF_BON = ?1",
                p + " JOIN t_preenregistrement v ON v.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID WHERE v.str_REF = ?1",
                p + " JOIN t_preenregistrement v ON v.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID WHERE v.str_REF_TICKET = ?1",
                p + " JOIN t_compte_client_tiers_payant c ON c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = p.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
                        + " WHERE c.str_NUMERO_SECURITE_SOCIAL = ?1",
                p + " JOIN t_compte_client_tiers_payant c ON c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = p.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
                        + " JOIN t_compte_client cc ON cc.lg_COMPTE_CLIENT_ID = c.lg_COMPTE_CLIENT_ID"
                        + " JOIN t_client cl ON cl.lg_CLIENT_ID = cc.lg_CLIENT_ID WHERE cl.str_NUMERO_SECURITE_SOCIAL = ?1" };
        for (String sql : exacts) {
            Query q = em.createNativeQuery(sql + " LIMIT " + CANDIDATS_MAX);
            q.setParameter(1, saisie);
            ids.addAll((List<String>) q.getResultList());
        }
        List<String> motifs = motifsNom(saisie);
        if (!motifs.isEmpty() && ids.size() < CANDIDATS_MAX) {
            StringBuilder w = new StringBuilder();
            for (int i = 0; i < motifs.size(); i++) {
                w.append(i == 0 ? " WHERE " : " AND ")
                        .append("CONCAT_WS(' ', cl.str_FIRST_NAME, cl.str_LAST_NAME) LIKE ?").append(i + 1);
            }
            Query q = em.createNativeQuery(p
                    + " JOIN t_compte_client_tiers_payant c ON c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = p.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
                    + " JOIN t_compte_client cc ON cc.lg_COMPTE_CLIENT_ID = c.lg_COMPTE_CLIENT_ID"
                    + " JOIN t_client cl ON cl.lg_CLIENT_ID = cc.lg_CLIENT_ID" + w + " LIMIT " + CANDIDATS_MAX);
            for (int i = 0; i < motifs.size(); i++) {
                q.setParameter(i + 1, motifs.get(i));
            }
            ids.addAll((List<String>) q.getResultList());
        }
        List<String> l = new ArrayList<>(ids);
        return l.size() > CANDIDATS_MAX ? l.subList(0, CANDIDATS_MAX) : l;
    }

    private static String marques(int n) {
        StringBuilder m = new StringBuilder();
        for (int i = 1; i <= n; i++) {
            m.append(i == 1 ? "" : ",").append('?').append(i);
        }
        return m.toString();
    }

    @SuppressWarnings("unchecked")
    static List<Bon> bons(EntityManager em, List<String> ids) {
        List<Bon> l = new ArrayList<>();
        if (ids.isEmpty()) {
            return l;
        }
        Query q = em.createNativeQuery("SELECT p.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID,"
                + " COALESCE(NULLIF(p.str_REF_BON, ''), v.str_REF_BON), v.str_REF,"
                + " TRIM(CONCAT_WS(' ', cl.str_FIRST_NAME, cl.str_LAST_NAME)),"
                + " COALESCE(NULLIF(c.str_NUMERO_SECURITE_SOCIAL, ''), cl.str_NUMERO_SECURITE_SOCIAL), v.dt_UPDATED,"
                + " p.int_PRICE, tp.str_FULLNAME, p.str_STATUT_FACTURE"
                + " FROM t_preenregistrement_compte_client_tiers_payent p"
                + " JOIN t_preenregistrement v ON v.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID"
                + " JOIN t_compte_client_tiers_payant c ON c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = p.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
                + " LEFT JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = c.lg_TIERS_PAYANT_ID"
                + " LEFT JOIN t_compte_client cc ON cc.lg_COMPTE_CLIENT_ID = c.lg_COMPTE_CLIENT_ID"
                + " LEFT JOIN t_client cl ON cl.lg_CLIENT_ID = cc.lg_CLIENT_ID"
                + " WHERE p.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID IN (" + marques(ids.size()) + ")"
                + " AND v.str_STATUT = 'is_Closed' AND v.b_IS_CANCEL = 0"
                + " ORDER BY v.dt_UPDATED DESC, p.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID LIMIT " + (LIMITE + 1));
        for (int i = 0; i < ids.size(); i++) {
            q.setParameter(i + 1, ids.get(i));
        }
        for (Object[] o : (List<Object[]>) q.getResultList()) {
            Bon b = new Bon();
            b.id = (String) o[0];
            b.bon = StringUtils.defaultString((String) o[1]);
            b.ticket = StringUtils.defaultString((String) o[2]);
            b.client = StringUtils.defaultString((String) o[3]);
            b.matricule = StringUtils.defaultString((String) o[4]);
            b.dateVente = (Date) o[5];
            b.montant = o[6] == null ? 0 : ((Number) o[6]).intValue();
            b.organisme = StringUtils.defaultString((String) o[7]);
            b.statutFacture = StringUtils.defaultString((String) o[8]);
            l.add(b);
        }
        return l;
    }

    @SuppressWarnings("unchecked")
    static void factures(EntityManager em, List<Bon> bons) {
        if (bons.isEmpty()) {
            return;
        }
        Map<String, Bon> parId = new LinkedHashMap<>();
        for (Bon b : bons) {
            parId.put(b.id, b);
        }
        List<String> ids = new ArrayList<>(parId.keySet());
        Query q = em.createNativeQuery("SELECT d.str_REF, f.lg_FACTURE_ID, f.str_CODE_FACTURE, f.dt_DATE_FACTURE,"
                + " f.str_STATUT, CAST(COALESCE(f.template, 0) AS SIGNED), tp.str_FULLNAME FROM t_facture_detail d"
                + " JOIN t_facture f ON f.lg_FACTURE_ID = d.lg_FACTURE_ID"
                + " LEFT JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = COALESCE(f.tiersPayant, f.str_CUSTOMER)"
                + " WHERE d.str_REF IN (" + marques(ids.size()) + ") ORDER BY f.dt_CREATED, f.lg_FACTURE_ID");
        for (int i = 0; i < ids.size(); i++) {
            q.setParameter(i + 1, ids.get(i));
        }
        for (Object[] o : (List<Object[]>) q.getResultList()) {
            Bon b = parId.get((String) o[0]);
            if (b != null) {
                b.factures.add(new Facture((String) o[1], (String) o[2], (Date) o[3], (String) o[4], (Number) o[5],
                        StringUtils.defaultString((String) o[6])));
            }
        }
    }

    private static JSONObject facture(Facture f, SimpleDateFormat jour) {
        return new JSONObject().put("id", f.id).put("code", StringUtils.defaultString(f.code))
                .put("date", f.date == null ? "" : jour.format(f.date))
                .put("statut", StringUtils.defaultString(f.statut)).put("organisme", f.organisme);
    }

    /** Reponse de l'API. */
    @SuppressWarnings("unchecked")
    public static JSONObject json(Map<String, Object> resultat) {
        List<Bon> bons = resultat == null ? Collections.<Bon> emptyList() : (List<Bon>) resultat.get("bons");
        SimpleDateFormat jour = new SimpleDateFormat("dd/MM/yyyy");
        JSONArray data = new JSONArray();
        int factures = 0;
        for (Bon b : bons) {
            Facture f = b.factureActive();
            JSONArray annulees = new JSONArray();
            for (Facture a : b.annulees()) {
                annulees.put(facture(a, jour));
            }
            if (f != null) {
                factures++;
            }
            data.put(new JSONObject().put("id", b.id).put("bon", b.bon).put("ticket", b.ticket).put("client", b.client)
                    .put("matricule", b.matricule).put("dateVente", b.dateVente == null ? "" : jour.format(b.dateVente))
                    .put("montant", b.montant).put("organisme", b.organisme).put("etat", b.etat())
                    .put("statutFacture", b.statutFacture)
                    .put("facture", f == null ? JSONObject.NULL : facture(f, jour)).put("annulees", annulees));
        }
        return new JSONObject().put("success", true).put("total", bons.size()).put("factures", factures)
                .put("tronque", resultat != null && Boolean.TRUE.equals(resultat.get("tronque"))).put("limite", LIMITE)
                .put("data", data);
    }
}
