package rest.service.extranet.ubipharm;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import javax.persistence.EntityManager;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Cache des fiches produit Ubipharm : tables {@code extranet_produit} et {@code extranet_stock_agence}
 * (V7.5.1__extranet_produit.sql). Ecrit seulement dans ces tables ; aucune table metier de Prestige n'est touchee.
 * <p>
 * Une fiche par pscode : {@link #enregistrer} remplace les lignes du meme pscode. {@link #lire} relit la fiche avec sa
 * date de collecte ; le JSON brut complet reste en base et n'est jamais renvoye. La transaction est celle de l'appelant
 * (comme {@code JournalCollecte}).
 */
public final class FicheProduitDepot {

    private static final String COLONNES_PRODUIT = "pslib, pslibc, picode, cips, cips_brut, cmcode, falib, nalib,"
            + " fslib, stlib, psdtcr_brut, pspven_brut, pspven, psppub_brut, psppub, pspvig_brut, pspvig, tvtaux_brut,"
            + " tvtaux, psstk_soc_brut, psstk_soc, nb_substitution_brut, nb_substitution, infos_etablissement_brut,"
            + " nb_agences, listes_brutes, absents";
    private static final String COLONNES_AGENCE = "rang, etcode, etlib, env_produit_brut, pectvp_brut, psstk_brut,"
            + " psstk, colisages, colisages_brut, absents";

    private final EntityManager em;

    public FicheProduitDepot(EntityManager em) {
        this.em = em;
    }

    /** Remplace la fiche du meme pscode (produit et stocks par agence) par celle de la collecte donnee. */
    public void enregistrer(long collecteId, FicheProduitUbipharm f) {
        if (f == null || f.pscode() == null) {
            throw new IllegalArgumentException("Fiche sans référence");
        }
        String pscode = f.pscode();
        em.createNativeQuery("DELETE FROM extranet_stock_agence WHERE pscode = ?1").setParameter(1, pscode)
                .executeUpdate();
        em.createNativeQuery("DELETE FROM extranet_produit WHERE pscode = ?1").setParameter(1, pscode).executeUpdate();

        Object[] v = { t(f.pslib, 500), t(f.pslibc, 500), t(f.picode, 100),
                f.cips == null ? null : new JSONArray(f.cips).toString(), f.cipsBrut, t(f.cmcode, 255), t(f.falib, 500),
                t(f.nalib, 500), t(f.fslib, 500), t(f.stlib, 255), f.psdtcrBrut, f.pspvenBrut, f.pspven, f.psppubBrut,
                f.psppub, f.pspvigBrut, f.pspvig, f.tvtauxBrut, f.tvtaux, f.psstkSocBrut, f.psstkSoc,
                f.nbProduitsSubstitutionBrut, f.nbProduitsSubstitution,
                f.agences == null ? f.infosParEtablissementBrut : null, f.agences == null ? null : f.agences.size(),
                new JSONObject(f.listesBrutes).toString(), new JSONArray(f.absents).toString() };
        StringBuilder sql = new StringBuilder("INSERT INTO extranet_produit (collecte_id, horodatage, pscode, ")
                .append(COLONNES_PRODUIT).append(", json_brut) VALUES (?1, NOW(), ?2");
        for (int i = 0; i < v.length; i++) {
            sql.append(", ?").append(i + 3);
        }
        sql.append(", ?").append(v.length + 3).append(')');
        javax.persistence.Query q = em.createNativeQuery(sql.toString()).setParameter(1, collecteId).setParameter(2,
                pscode);
        for (int i = 0; i < v.length; i++) {
            q.setParameter(i + 3, v[i]);
        }
        q.setParameter(v.length + 3, f.jsonBrut).executeUpdate();

        if (f.agences != null) {
            int rang = 0;
            for (StockAgenceUbipharm a : f.agences) {
                em.createNativeQuery("INSERT INTO extranet_stock_agence (collecte_id, horodatage, pscode, "
                        + COLONNES_AGENCE + ") VALUES (?1, NOW(), ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)")
                        .setParameter(1, collecteId).setParameter(2, pscode).setParameter(3, rang++)
                        .setParameter(4, t(a.etcode, 50)).setParameter(5, t(a.etlib, 255))
                        .setParameter(6, a.envProduitBrut).setParameter(7, a.pectvpBrut).setParameter(8, a.psstkBrut)
                        .setParameter(9, a.psstk)
                        .setParameter(10, a.colisages == null ? null : new JSONArray(a.colisages).toString())
                        .setParameter(11, a.colisagesBrut).setParameter(12, new JSONArray(a.absents).toString())
                        .executeUpdate();
            }
        }
    }

    /**
     * Derniere fiche en cache d'un pscode, au format de {@link FicheProduitUbipharm#toJson()}, avec {@code collecteId},
     * {@code horodatage} et {@code dateCollecte} (fin de la collecte, sinon son debut) ; null si aucune.
     */
    @SuppressWarnings("unchecked")
    public JSONObject lire(String pscode) {
        if (!FicheProduitCollecteur.pscodeValide(pscode)) {
            return null;
        }
        List<Object[]> l = em
                .createNativeQuery("SELECT p.collecte_id, p.horodatage, COALESCE(c.fin, c.debut), p.pscode, "
                        + prefixer(COLONNES_PRODUIT) + " FROM extranet_produit p"
                        + " LEFT JOIN extranet_collecte c ON c.id = p.collecte_id WHERE p.pscode = ?1")
                .setParameter(1, pscode).getResultList();
        if (l.isEmpty()) {
            return null;
        }
        Object[] o = l.get(0);
        FicheProduitUbipharm f = new FicheProduitUbipharm();
        int i = 3;
        f.pscode = s(o[i++]);
        f.pslib = s(o[i++]);
        f.pslibc = s(o[i++]);
        f.picode = s(o[i++]);
        String cips = s(o[i++]);
        if (cips != null) {
            f.cips = new ArrayList<>();
            for (Object x : new JSONArray(cips)) {
                f.cips.add(x.toString());
            }
        }
        f.cipsBrut = s(o[i++]);
        f.cmcode = s(o[i++]);
        f.falib = s(o[i++]);
        f.nalib = s(o[i++]);
        f.fslib = s(o[i++]);
        f.stlib = s(o[i++]);
        f.psdtcrBrut = s(o[i++]);
        f.pspvenBrut = s(o[i++]);
        f.pspven = d(o[i++]);
        f.psppubBrut = s(o[i++]);
        f.psppub = d(o[i++]);
        f.pspvigBrut = s(o[i++]);
        f.pspvig = d(o[i++]);
        f.tvtauxBrut = s(o[i++]);
        f.tvtaux = d(o[i++]);
        f.psstkSocBrut = s(o[i++]);
        f.psstkSoc = n(o[i++]);
        f.nbProduitsSubstitutionBrut = s(o[i++]);
        f.nbProduitsSubstitution = n(o[i++]);
        f.infosParEtablissementBrut = s(o[i++]);
        Integer nbAgences = n(o[i++]);
        String listes = s(o[i++]);
        if (listes != null) {
            JSONObject lo = new JSONObject(listes);
            for (String k : lo.keySet()) {
                f.listesBrutes.put(k, lo.getString(k));
            }
        }
        String absents = s(o[i]);
        if (absents != null) {
            for (Object x : new JSONArray(absents)) {
                f.absents.add(x.toString());
            }
        }
        if (nbAgences != null) {
            f.agences = agences(pscode);
        }
        JSONObject r = f.toJson();
        r.put("collecteId", ((Number) o[0]).longValue());
        r.put("horodatage", o[1] == null ? JSONObject.NULL : o[1].toString());
        r.put("dateCollecte", o[2] == null ? JSONObject.NULL : o[2].toString());
        if (nbAgences != null && nbAgences != f.agences.size()) {
            /* lignes d'agence manquantes ou en trop : la fiche n'est pas presentee comme complete */
            r.put("agencesIncompletes", true);
        }
        return r;
    }

    @SuppressWarnings("unchecked")
    private List<StockAgenceUbipharm> agences(String pscode) {
        List<StockAgenceUbipharm> r = new ArrayList<>();
        for (Object[] o : (List<Object[]>) em
                .createNativeQuery(
                        "SELECT " + COLONNES_AGENCE + " FROM extranet_stock_agence WHERE pscode = ?1 ORDER BY rang")
                .setParameter(1, pscode).getResultList()) {
            StockAgenceUbipharm a = new StockAgenceUbipharm();
            a.etcode = s(o[1]);
            a.etlib = s(o[2]);
            a.envProduitBrut = s(o[3]);
            a.pectvpBrut = s(o[4]);
            a.psstkBrut = s(o[5]);
            a.psstk = n(o[6]);
            String c = s(o[7]);
            if (c != null) {
                a.colisages = new ArrayList<>();
                for (Object x : new JSONArray(c)) {
                    a.colisages.add(((Number) x).intValue());
                }
            }
            a.colisagesBrut = s(o[8]);
            String ab = s(o[9]);
            if (ab != null) {
                for (Object x : new JSONArray(ab)) {
                    a.absents.add(x.toString());
                }
            }
            r.add(a);
        }
        return r;
    }

    private static String prefixer(String colonnes) {
        StringBuilder sb = new StringBuilder();
        for (String c : colonnes.split(",")) {
            sb.append(sb.length() == 0 ? "" : ", ").append("p.").append(c.trim());
        }
        return sb.toString();
    }

    private static String t(String s, int n) {
        return s == null || s.length() <= n ? s : s.substring(0, n);
    }

    private static String s(Object o) {
        return o == null ? null : o.toString();
    }

    private static BigDecimal d(Object o) {
        if (o == null) {
            return null;
        }
        BigDecimal b = (o instanceof BigDecimal ? (BigDecimal) o : new BigDecimal(o.toString())).stripTrailingZeros();
        /* DECIMAL(20,6) rend 6431.000000 : on revient a l'ecriture sans zeros ni exposant (6431) */
        return b.scale() < 0 ? b.setScale(0) : b;
    }

    private static Integer n(Object o) {
        return o == null ? null : ((Number) o).intValue();
    }
}
