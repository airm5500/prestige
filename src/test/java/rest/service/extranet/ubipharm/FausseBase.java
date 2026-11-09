package rest.service.extranet.ubipharm;

import java.lang.reflect.Proxy;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import javax.persistence.EntityManager;
import javax.persistence.Query;

/**
 * Base en memoire pour les tests, sans serveur : un EntityManager dont les requetes natives sont reconnues par leur
 * texte (celles de JournalCollecte et de NouveauxProduitsDepot) et appliquees a des tables en memoire. Elle permet de
 * relire ce qui est ecrit (regle « donnee ecrite = donnee relue ») ; une requete inconnue fait echouer le test.
 */
final class FausseBase {

    final List<Map<String, Object>> collectes = new ArrayList<>();
    final List<Map<String, Object>> produits = new ArrayList<>();
    final List<Map<String, Object>> agences = new ArrayList<>();
    final List<String> requetes = new ArrayList<>();
    private long sequence;
    private long dernierId;

    EntityManager em() {
        return (EntityManager) Proxy.newProxyInstance(getClass().getClassLoader(),
                new Class<?>[] { EntityManager.class }, (o, m, a) -> {
                    if ("createNativeQuery".equals(m.getName())) {
                        return requete((String) a[0]);
                    }
                    throw new UnsupportedOperationException(m.getName());
                });
    }

    private Query requete(String sql) {
        requetes.add(sql);
        Map<Object, Object> p = new HashMap<>();
        Query[] q = new Query[1];
        q[0] = (Query) Proxy.newProxyInstance(getClass().getClassLoader(), new Class<?>[] { Query.class },
                (o, m, a) -> {
                    switch (m.getName()) {
                    case "setParameter":
                        p.put(a[0], a[1]);
                        return q[0];
                    case "executeUpdate":
                        return ecrire(sql, p);
                    case "getResultList":
                        return lire(sql, p);
                    case "getSingleResult":
                        return lire(sql, p).get(0);
                    default:
                        throw new UnsupportedOperationException(m.getName());
                    }
                });
        return q[0];
    }

    private int ecrire(String sql, Map<Object, Object> p) {
        if (sql.startsWith("INSERT INTO extranet_collecte ")) {
            Map<String, Object> l = ligne("source", p.get(1), "module", p.get(2), "parametres", p.get(3), "utilisateur",
                    p.get(4), "debut", new Timestamp(System.currentTimeMillis()), "statut", p.get(5));
            collectes.add(l);
            return 1;
        }
        if (sql.startsWith("UPDATE extranet_collecte SET fin")) {
            for (Map<String, Object> c : collectes) {
                if (Objects.equals(c.get("id"), ((Number) p.get(5)).longValue())) {
                    c.put("fin", new Timestamp(System.currentTimeMillis()));
                    c.put("statut", p.get(1));
                    c.put("lignes_annoncees", p.get(2));
                    c.put("lignes_recues", p.get(3));
                    c.put("message", p.get(4));
                    return 1;
                }
            }
            return 0;
        }
        if (sql.equals(NouveauxProduitsDepot.INSERER_PRODUIT)) {
            produits.add(ligne("collecte_id", p.get(1), "position", p.get(2), "pscode", p.get(3), "sheettype", p.get(4),
                    "designation", p.get(5), "cip", p.get(6), "cip_source", p.get(7), "categorie", p.get(8),
                    "date_affichee", p.get(9), "date_jour", p.get(10), "mouvement", p.get(11), "disponibilite_brute",
                    p.get(12)));
            return 1;
        }
        if (sql.equals(NouveauxProduitsDepot.INSERER_AGENCE)) {
            agences.add(ligne("produit_id", p.get(1), "position", p.get(2), "etcoda", p.get(3), "etlib", p.get(4),
                    "lgetlib", p.get(5), "disponibilite_brute", p.get(6), "colisages_brut", p.get(7), "colisages",
                    p.get(8)));
            return 1;
        }
        if (sql.equals(NouveauxProduitsDepot.PURGER_AGENCES)) {
            long garde = ((Number) p.get(1)).longValue();
            Set<Object> gardes = produits.stream().filter(x -> ((Number) x.get("collecte_id")).longValue() == garde)
                    .map(x -> x.get("id")).collect(Collectors.toSet());
            int avant = agences.size();
            agences.removeIf(a -> !gardes.contains(a.get("produit_id")));
            return avant - agences.size();
        }
        if (sql.equals(NouveauxProduitsDepot.PURGER_PRODUITS)) {
            long garde = ((Number) p.get(1)).longValue();
            int avant = produits.size();
            produits.removeIf(x -> ((Number) x.get("collecte_id")).longValue() != garde);
            return avant - produits.size();
        }
        throw new AssertionError("Requete inattendue : " + sql);
    }

    private List<Object> lire(String sql, Map<Object, Object> p) {
        List<Object> r = new ArrayList<>();
        if (sql.equals(NouveauxProduitsDepot.DERNIER_ID)) {
            r.add(java.math.BigInteger.valueOf(dernierId));
            return r;
        }
        if (sql.equals(NouveauxProduitsDepot.DERNIERE_COLLECTE)) {
            collectes.stream()
                    .filter(c -> c.get("source").equals(p.get(1)) && c.get("module").equals(p.get(2))
                            && (c.get("statut").equals(p.get(3)) || c.get("statut").equals(p.get(4))))
                    .max(Comparator.comparingLong(c -> (Long) c.get("id")))
                    .ifPresent(c -> r.add(new Object[] { java.math.BigInteger.valueOf((Long) c.get("id")),
                            c.get("debut"), c.get("fin"), c.get("statut") }));
            return r;
        }
        if (sql.equals(NouveauxProduitsDepot.LIRE_PRODUITS)) {
            long id = ((Number) p.get(1)).longValue();
            produits.stream().filter(x -> ((Number) x.get("collecte_id")).longValue() == id)
                    .sorted(Comparator.comparingInt((Map<String, Object> x) -> (Integer) x.get("position"))
                            .thenComparingLong(x -> (Long) x.get("id")))
                    .forEach(x -> r.add(new Object[] { java.math.BigInteger.valueOf((Long) x.get("id")),
                            x.get("position"), x.get("pscode"), x.get("sheettype"), x.get("designation"), x.get("cip"),
                            x.get("cip_source"), x.get("categorie"), x.get("date_affichee"), x.get("date_jour"),
                            x.get("mouvement"), x.get("disponibilite_brute") }));
            return r;
        }
        if (sql.equals(NouveauxProduitsDepot.LIRE_AGENCES)) {
            long id = ((Number) p.get(1)).longValue();
            Set<Object> ids = produits.stream().filter(x -> ((Number) x.get("collecte_id")).longValue() == id)
                    .map(x -> x.get("id")).collect(Collectors.toSet());
            agences.stream().filter(a -> ids.contains(a.get("produit_id"))).sorted(Comparator
                    .comparingLong((Map<String, Object> a) -> ((Number) a.get("produit_id")).longValue())
                    .thenComparingInt(a -> (Integer) a.get("position")).thenComparingLong(a -> (Long) a.get("id")))
                    .forEach(a -> r
                            .add(new Object[] { a.get("produit_id"), a.get("etcoda"), a.get("etlib"), a.get("lgetlib"),
                                    a.get("disponibilite_brute"), a.get("colisages_brut"), a.get("colisages") }));
            return r;
        }
        throw new AssertionError("Requete inattendue : " + sql);
    }

    private Map<String, Object> ligne(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        dernierId = ++sequence;
        m.put("id", dernierId);
        for (int i = 0; i < kv.length; i += 2) {
            m.put((String) kv[i], kv[i + 1]);
        }
        return m;
    }

    /** Collecte enregistree par son id. */
    Map<String, Object> collecte(long id) {
        return collectes.stream().filter(c -> (Long) c.get("id") == id).findFirst().orElse(null);
    }
}
