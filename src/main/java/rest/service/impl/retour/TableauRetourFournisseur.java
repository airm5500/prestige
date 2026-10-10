package rest.service.impl.retour;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Retours du 10/10 (point 7) : tableau de bord des retours fournisseur, calcule a partir des lignes des retours
 * clotures de la periode (meme perimetre que la liste) :
 * <ul>
 * <li>par mois : nombre de retours, quantite retournee, quantite acceptee (avoir), montant (PAF × quantite) ;</li>
 * <li>produits les plus retournes (quantite decroissante, puis nombre de retours) ;</li>
 * <li>motifs les plus utilises (lignes decroissantes) avec leur part des lignes.</li>
 * </ul>
 */
public final class TableauRetourFournisseur {

    public static final String SANS_MOTIF = "Sans motif";

    private static final class Cumul {
        final String id, cip, libelle;
        final Set<String> retours = new HashSet<>();
        int lignes, quantite, acceptee;
        long montant;

        Cumul(String id, String cip, String libelle) {
            this.id = id;
            this.cip = cip;
            this.libelle = libelle;
        }

        void ajouter(String retourId, int qte, int acceptee, long montant) {
            retours.add(retourId);
            lignes++;
            quantite += qte;
            this.acceptee += acceptee;
            this.montant += montant;
        }

        JSONObject json() {
            JSONObject o = new JSONObject().put("libelle", libelle).put("retours", retours.size()).put("lignes", lignes)
                    .put("quantite", quantite).put("acceptee", acceptee).put("montant", montant);
            if (cip != null) {
                o.put("id", id).put("cip", cip);
            }
            return o;
        }
    }

    private final Cumul total = new Cumul("", null, "Total");
    private final Map<String, Cumul> mois = new TreeMap<>();
    private final Map<String, Cumul> produits = new LinkedHashMap<>();
    private final Map<String, Cumul> motifs = new LinkedHashMap<>();

    /**
     * Une ligne de retour : mois « aaaa-mm », retour, produit, motif, quantite retournee, quantite acceptee par le
     * fournisseur, prix d'achat unitaire.
     */
    public void ajouter(String moisRetour, String retourId, String produitId, String cip, String produit,
            String motifId, String motif, int quantite, int acceptee, int paf) {
        long montant = (long) quantite * paf;
        total.ajouter(retourId, quantite, acceptee, montant);
        mois.computeIfAbsent(moisRetour, m -> new Cumul(m, null, m)).ajouter(retourId, quantite, acceptee, montant);
        produits.computeIfAbsent(produitId, p -> new Cumul(p, cip == null ? "" : cip, produit)).ajouter(retourId,
                quantite, acceptee, montant);
        String cle = motifId == null || motifId.isEmpty() ? "" : motifId;
        motifs.computeIfAbsent(cle,
                m -> new Cumul(m, null, m.isEmpty() || motif == null || motif.isEmpty() ? SANS_MOTIF : motif))
                .ajouter(retourId, quantite, acceptee, montant);
    }

    public JSONObject json(int nbProduits) {
        JSONArray parMois = new JSONArray();
        mois.values().forEach(c -> parMois.put(c.json().put("mois", c.id)));
        List<Cumul> p = new ArrayList<>(produits.values());
        p.sort(Comparator.<Cumul> comparingInt(c -> c.quantite).reversed()
                .thenComparing(Comparator.<Cumul> comparingInt(c -> c.retours.size()).reversed())
                .thenComparing(c -> c.libelle == null ? "" : c.libelle));
        JSONArray top = new JSONArray();
        p.stream().limit(nbProduits).forEach(c -> top.put(c.json()));
        List<Cumul> m = new ArrayList<>(motifs.values());
        m.sort(Comparator.<Cumul> comparingInt(c -> c.lignes).reversed()
                .thenComparing(Comparator.<Cumul> comparingInt(c -> c.quantite).reversed())
                .thenComparing(c -> c.libelle));
        JSONArray parMotif = new JSONArray();
        m.forEach(c -> parMotif.put(
                c.json().put("part", total.lignes == 0 ? 0 : Math.round(c.lignes * 1000.0 / total.lignes) / 10.0)));
        return new JSONObject().put("total", total.json().put("produits", produits.size())).put("mois", parMois)
                .put("produits", top).put("motifs", parMotif);
    }
}
