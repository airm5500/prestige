package rest.service.impl.fidelite;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Retours du 10/10 (section 15) : analyse des points de fidelite d'une periode, a partir du registre des points.
 * <ul>
 * <li>gagnes = GAIN, moins les ANNULATION (ventes annulees ou modifiees) ;</li>
 * <li>utilises = UTILISATION (points retires), moins les RESTITUTION (paiement en points d'une vente annulee) ;</li>
 * <li>expires = EXPIRATION ; ajustements = AJUSTEMENT (gestes commerciaux, corrections) ;</li>
 * <li>taux d'utilisation = utilises ÷ gagnes ; cout = valeur FCFA des points utilises ;</li>
 * <li>clients actifs = clients ayant une operation dans la periode ; repartition par palier et meilleurs clients.</li>
 * </ul>
 */
public final class AnalyseFidelite {

    private static final class Cumul {
        long gagnes, annules, utilises, restitues, expires, ajustements, cout;

        void ajouter(String type, long points, long valeur) {
            switch (type == null ? "" : type) {
            case "GAIN":
                gagnes += points;
                break;
            case "ANNULATION":
                annules += -points;
                break;
            case "UTILISATION":
                utilises += -points;
                cout += valeur;
                break;
            case "RESTITUTION":
                restitues += points;
                cout -= valeur;
                break;
            case "EXPIRATION":
                expires += -points;
                break;
            case "AJUSTEMENT":
                ajustements += points;
                break;
            default:
                break;
            }
        }

        long gagnesNets() {
            return gagnes - annules;
        }

        long utilisesNets() {
            return utilises - restitues;
        }

        JSONObject json() {
            long g = gagnesNets(), u = utilisesNets();
            return new JSONObject().put("gagnes", g).put("annules", annules).put("utilises", u).put("expires", expires)
                    .put("ajustements", ajustements).put("cout", Math.max(0, cout))
                    .put("tauxUtilisation", g <= 0 ? 0 : Math.round(u * 1000.0 / g) / 10.0);
        }
    }

    private static final class Client {
        final String id;
        String nom = "", palier = "";
        long solde;
        final Cumul cumul = new Cumul();

        Client(String id) {
            this.id = id;
        }
    }

    private final Cumul total = new Cumul();
    private final Map<String, Cumul> mois = new TreeMap<>();
    private final Map<String, Client> clients = new LinkedHashMap<>();

    /** Une operation (ou un cumul d'operations) d'un client : mois « aaaa-mm », type, points (signes), valeur FCFA. */
    public void ajouter(String moisOperation, String clientId, String type, long points, long valeur) {
        total.ajouter(type, points, valeur);
        mois.computeIfAbsent(moisOperation, m -> new Cumul()).ajouter(type, points, valeur);
        clients.computeIfAbsent(clientId, Client::new).cumul.ajouter(type, points, valeur);
    }

    /** Fiche d'un client actif : nom, solde actuel, palier actuel. */
    public void decrire(String clientId, String nom, long solde, String palier) {
        Client c = clients.get(clientId);
        if (c != null) {
            c.nom = nom == null ? "" : nom.trim();
            c.solde = solde;
            c.palier = palier == null ? "" : palier;
        }
    }

    public List<String> clientsActifs() {
        return new ArrayList<>(clients.keySet());
    }

    public JSONObject json(int nbMeilleurs, List<String> ordrePaliers) {
        JSONArray m = new JSONArray();
        mois.forEach((k, c) -> m.put(c.json().put("mois", k)));
        Map<String, Integer> parPalier = new LinkedHashMap<>();
        ordrePaliers.forEach(p -> parPalier.put(p, 0));
        Map<String, Integer> autres = new HashMap<>();
        for (Client c : clients.values()) {
            String p = c.palier.isEmpty() ? "Sans palier" : c.palier;
            (parPalier.containsKey(p) ? parPalier : autres).merge(p, 1, Integer::sum);
        }
        parPalier.putAll(autres);
        JSONArray paliers = new JSONArray();
        parPalier.forEach((p, n) -> paliers.put(new JSONObject().put("palier", p).put("clients", n).put("part",
                clients.isEmpty() ? 0 : Math.round(n * 1000.0 / clients.size()) / 10.0)));
        List<Client> l = new ArrayList<>(clients.values());
        l.sort(Comparator.<Client> comparingLong(c -> c.cumul.gagnesNets()).reversed()
                .thenComparing(Comparator.<Client> comparingLong(c -> c.solde).reversed()).thenComparing(c -> c.nom));
        JSONArray meilleurs = new JSONArray();
        l.stream().limit(nbMeilleurs).forEach(c -> meilleurs
                .put(c.cumul.json().put("id", c.id).put("nom", c.nom).put("solde", c.solde).put("palier", c.palier)));
        return new JSONObject().put("total", total.json().put("clientsActifs", clients.size())).put("mois", m)
                .put("paliers", paliers).put("meilleurs", meilleurs);
    }
}
