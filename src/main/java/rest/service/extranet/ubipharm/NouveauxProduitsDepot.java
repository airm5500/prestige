package rest.service.extranet.ubipharm;

import java.math.BigInteger;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import javax.persistence.EntityManager;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.extranet.commun.JournalCollecte;
import rest.service.extranet.commun.SourceExtranet;
import rest.service.extranet.ubipharm.NouveauProduitUbipharm.DisponibiliteAgence;

/**
 * Cache des nouveaux produits Ubipharm : tables {@code extranet_nouveau_produit} et
 * {@code extranet_nouveau_produit_agence} (migration V7.5.4). Requetes natives parametrees ; seules les lignes de la
 * derniere collecte reussie sont gardees. La lecture renvoie les lignes avec la date de collecte, et dit si la liste
 * est complete (collecte COMPLETE) ou peut-etre partielle (pagination visible).
 */
public final class NouveauxProduitsDepot {

    static final String INSERER_PRODUIT = "INSERT INTO extranet_nouveau_produit (collecte_id, position, pscode,"
            + " sheettype, designation, cip, cip_source, categorie, date_affichee, date_jour, mouvement,"
            + " disponibilite_brute) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)";
    static final String DERNIER_ID = "SELECT LAST_INSERT_ID()";
    static final String INSERER_AGENCE = "INSERT INTO extranet_nouveau_produit_agence (produit_id, position, etcoda,"
            + " etlib, lgetlib, disponibilite_brute, colisages_brut, colisages) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)";
    static final String PURGER_AGENCES = "DELETE a FROM extranet_nouveau_produit_agence a JOIN extranet_nouveau_produit p"
            + " ON p.id = a.produit_id WHERE p.collecte_id <> ?1";
    static final String PURGER_PRODUITS = "DELETE FROM extranet_nouveau_produit WHERE collecte_id <> ?1";
    static final String DERNIERE_COLLECTE = "SELECT c.id, c.debut, c.fin, c.statut FROM extranet_collecte c"
            + " WHERE c.source = ?1 AND c.module = ?2 AND c.statut IN (?3, ?4) ORDER BY c.id DESC LIMIT 1";
    static final String LIRE_PRODUITS = "SELECT id, position, pscode, sheettype, designation, cip, cip_source,"
            + " categorie, date_affichee, date_jour, mouvement, disponibilite_brute FROM extranet_nouveau_produit"
            + " WHERE collecte_id = ?1 ORDER BY position, id";
    static final String LIRE_AGENCES = "SELECT a.produit_id, a.etcoda, a.etlib, a.lgetlib, a.disponibilite_brute,"
            + " a.colisages_brut, a.colisages FROM extranet_nouveau_produit_agence a JOIN extranet_nouveau_produit p"
            + " ON p.id = a.produit_id WHERE p.collecte_id = ?1 ORDER BY a.produit_id, a.position, a.id";

    private final EntityManager em;

    public NouveauxProduitsDepot(EntityManager em) {
        this.em = em;
    }

    /** Enregistre les lignes lues par une collecte (aucun article de Prestige n'est touche). */
    public void enregistrer(long collecteId, List<NouveauProduitUbipharm> lignes) {
        for (NouveauProduitUbipharm p : lignes) {
            LocalDate d = p.date();
            em.createNativeQuery(INSERER_PRODUIT).setParameter(1, collecteId).setParameter(2, p.position())
                    .setParameter(3, tronquer(p.pscode(), 40)).setParameter(4, tronquer(p.sheettype(), 40))
                    .setParameter(5, tronquer(p.designation(), 255)).setParameter(6, tronquer(p.cip(), 40))
                    .setParameter(7, p.cipSource()).setParameter(8, tronquer(p.categorie(), 120))
                    .setParameter(9, tronquer(p.dateAffichee(), 40))
                    .setParameter(10, d == null ? null : java.sql.Date.valueOf(d))
                    .setParameter(11, tronquer(p.mouvement(), 120))
                    .setParameter(12, tronquer(p.disponibiliteBrute(), 120)).executeUpdate();
            long id = nombre(em.createNativeQuery(DERNIER_ID).getSingleResult());
            int pos = 0;
            for (DisponibiliteAgence a : p.agences()) {
                List<Integer> c = a.colisages();
                em.createNativeQuery(INSERER_AGENCE).setParameter(1, id).setParameter(2, ++pos)
                        .setParameter(3, tronquer(a.etcoda(), 20)).setParameter(4, tronquer(a.etlib(), 120))
                        .setParameter(5, tronquer(a.lgetlib(), 255))
                        .setParameter(6, tronquer(a.disponibiliteBrute(), 120))
                        .setParameter(7, tronquer(a.colisagesBrut(), 255))
                        .setParameter(8,
                                c == null ? null : tronquer(
                                        c.stream().map(String::valueOf).collect(Collectors.joining(",")), 255))
                        .executeUpdate();
            }
        }
    }

    /** Ne garde que les lignes de cette collecte (appele une fois la collecte fermee avec succes). */
    public void garderSeulement(long collecteId) {
        em.createNativeQuery(PURGER_AGENCES).setParameter(1, collecteId).executeUpdate();
        em.createNativeQuery(PURGER_PRODUITS).setParameter(1, collecteId).executeUpdate();
    }

    /**
     * Derniere liste reussie : {collecte, dateCollecte, listeComplete, paginationDetectee, produits}. Sans collecte
     * reussie : collecte null et liste vide.
     */
    @SuppressWarnings("unchecked")
    public JSONObject lire() {
        List<Object[]> c = em.createNativeQuery(DERNIERE_COLLECTE).setParameter(1, SourceExtranet.UBIPHARM.name())
                .setParameter(2, NouveauxProduitsCollecteur.MODULE).setParameter(3, JournalCollecte.COMPLETE)
                .setParameter(4, NouveauxProduitsCollecteur.PARTIELLE).getResultList();
        JSONObject r = new JSONObject().put("source", SourceExtranet.UBIPHARM.name());
        if (c.isEmpty()) {
            return r.put("collecte", JSONObject.NULL).put("dateCollecte", JSONObject.NULL).put("listeComplete", false)
                    .put("paginationDetectee", false).put("produits", new JSONArray());
        }
        Object[] col = c.get(0);
        long collecteId = nombre(col[0]);
        String statut = (String) col[3];
        String fin = col[2] == null ? null : col[2].toString();
        r.put("collecte",
                new JSONObject().put("id", collecteId)
                        .put("debut", col[1] == null ? JSONObject.NULL : col[1].toString())
                        .put("fin", fin == null ? JSONObject.NULL : fin).put("statut", statut))
                .put("dateCollecte", fin == null ? JSONObject.NULL : fin)
                .put("listeComplete", JournalCollecte.COMPLETE.equals(statut))
                .put("paginationDetectee", NouveauxProduitsCollecteur.PARTIELLE.equals(statut));

        Map<Long, JSONArray> agences = new LinkedHashMap<>();
        for (Object[] a : (List<Object[]>) em.createNativeQuery(LIRE_AGENCES).setParameter(1, collecteId)
                .getResultList()) {
            String brute = (String) a[4];
            agences.computeIfAbsent(nombre(a[0]), k -> new JSONArray())
                    .put(new JSONObject().put("etcoda", nul(a[1])).put("etlib", nul(a[2])).put("lgetlib", nul(a[3]))
                            .put("disponibilite", nul(NouveauProduitUbipharm.connue(brute)))
                            .put("disponibiliteBrute", nul(brute)).put("colisages", colisages((String) a[6]))
                            .put("colisagesBrut", nul(a[5])));
        }
        JSONArray produits = new JSONArray();
        for (Object[] p : (List<Object[]>) em.createNativeQuery(LIRE_PRODUITS).setParameter(1, collecteId)
                .getResultList()) {
            String brute = (String) p[11];
            JSONArray ag = agences.get(nombre(p[0]));
            produits.put(new JSONObject().put("position", ((Number) p[1]).intValue()).put("pscode", nul(p[2]))
                    .put("sheettype", nul(p[3])).put("designation", nul(p[4])).put("cip", nul(p[5]))
                    .put("cipSource", nul(p[6])).put("categorie", nul(p[7])).put("dateAffichee", nul(p[8]))
                    .put("date", p[9] == null ? JSONObject.NULL : p[9].toString()).put("mouvement", nul(p[10]))
                    .put("disponibilite", nul(NouveauProduitUbipharm.connue(brute)))
                    .put("disponibiliteBrute", nul(brute)).put("agences", ag == null ? new JSONArray() : ag));
        }
        return r.put("produits", produits);
    }

    /** "12,24" -> [12, 24] ; "" -> [] ; NULL -> null (inconnu). */
    static Object colisages(String s) {
        if (s == null) {
            return JSONObject.NULL;
        }
        JSONArray a = new JSONArray();
        for (String x : s.split(",")) {
            if (!x.trim().isEmpty()) {
                a.put(Integer.parseInt(x.trim()));
            }
        }
        return a;
    }

    private static Object nul(Object o) {
        return o == null ? JSONObject.NULL : o;
    }

    private static long nombre(Object o) {
        return o instanceof BigInteger ? ((BigInteger) o).longValue() : ((Number) o).longValue();
    }

    static String tronquer(String s, int n) {
        return s == null || s.length() <= n ? s : s.substring(0, n);
    }
}
