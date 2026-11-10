package rest.service.impl.prevision;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Plan du 09/11, points 5 et 6 : taux de rupture, un seul calcul pour le menu Prevision et le tableau de bord.
 * <ul>
 * <li>periode : les {@code mois} derniers mois complets de l'historique de ventes du produit (le plus recent etant le
 * mois dernier) ;</li>
 * <li>produit vendu frequemment : vendu dans au moins {@code moisVente} mois de la periode <b>et</b> au moins
 * {@code quantiteMin} unites au total ;</li>
 * <li>en rupture : stock actuel nul (rayon, compte a 0 s'il est negatif, + reserve) ;</li>
 * <li>taux = produits frequents en rupture / produits frequents, au dixieme (0 sans produit frequent).</li>
 * </ul>
 * Parametres : KEY_PREVISION_RUPTURE_MOIS, KEY_PREVISION_RUPTURE_MOIS_VENTE, KEY_PREVISION_RUPTURE_QTE_MIN (ecran
 * Prevision, onglet Tableau, et Parametrages > PREVISION).
 */
public final class TauxRupture {

    public static final String MOIS = "KEY_PREVISION_RUPTURE_MOIS";
    public static final String MOIS_VENTE = "KEY_PREVISION_RUPTURE_MOIS_VENTE";
    public static final String QTE_MIN = "KEY_PREVISION_RUPTURE_QTE_MIN";

    private TauxRupture() {
    }

    /** Un produit suivi : historique mensuel (du plus ancien au plus recent, separe par des virgules) et stock. */
    public static final class Produit {
        final String id, cip, nom, historique;
        final int rayon, reserve;

        public Produit(String id, String cip, String nom, String historique, int rayon, int reserve) {
            this.id = id;
            this.cip = cip;
            this.nom = nom;
            this.historique = historique;
            this.rayon = rayon;
            this.reserve = reserve;
        }

        int stock() {
            return Math.max(0, rayon) + Math.max(0, reserve);
        }
    }

    /** Ventes des {@code mois} derniers mois de l'historique (moins si l'historique est plus court). */
    static double[] derniers(String historique, int mois) {
        if (historique == null || historique.trim().isEmpty() || mois <= 0) {
            return new double[0];
        }
        String[] h = historique.split(",");
        int n = Math.min(mois, h.length);
        double[] v = new double[n];
        for (int i = 0; i < n; i++) {
            try {
                v[i] = Math.max(0, Double.parseDouble(h[h.length - n + i].trim()));
            } catch (NumberFormatException e) {
                v[i] = 0;
            }
        }
        return v;
    }

    /** [mois vendus, quantite] sur la periode. */
    static double[] ventes(String historique, int mois) {
        double[] v = derniers(historique, mois);
        double moisVendus = 0, total = 0;
        for (double x : v) {
            if (x > 0) {
                moisVendus++;
            }
            total += x;
        }
        return new double[] { moisVendus, total };
    }

    public static boolean frequent(String historique, int mois, int moisVente, int quantiteMin) {
        double[] v = ventes(historique, mois);
        return v[0] >= Math.max(1, moisVente) && v[1] >= Math.max(1, quantiteMin);
    }

    /**
     * Taux et liste des produits comptes en rupture (au plus {@code limite}, du plus vendu au moins vendu sur la
     * periode ; 0 = aucune liste).
     */
    public static Map<String, Object> calculer(List<Produit> produits, int mois, int moisVente, int quantiteMin,
            int limite) {
        /* « vendu dans N mois » ne peut pas depasser la periode observee */
        moisVente = Math.max(1, Math.min(moisVente, Math.max(1, mois)));
        int frequents = 0;
        List<Object[]> enRupture = new ArrayList<>();
        for (Produit p : produits) {
            if (!frequent(p.historique, mois, moisVente, quantiteMin)) {
                continue;
            }
            frequents++;
            if (p.stock() <= 0) {
                enRupture.add(new Object[] { p, ventes(p.historique, mois) });
            }
        }
        enRupture.sort(Comparator.comparingDouble((Object[] x) -> -((double[]) x[1])[1])
                .thenComparing(x -> String.valueOf(((Produit) x[0]).nom)));
        List<Map<String, Object>> liste = new ArrayList<>();
        List<String> ids = new ArrayList<>();
        for (Object[] x : enRupture) {
            Produit p = (Produit) x[0];
            ids.add(p.id);
            if (liste.size() < limite) {
                double[] v = (double[]) x[1];
                Map<String, Object> l = new LinkedHashMap<>();
                l.put("id", p.id);
                l.put("cip", p.cip);
                l.put("nom", p.nom);
                l.put("vendus", Math.round(v[1]));
                l.put("moisVendus", (int) v[0]);
                l.put("rayon", p.rayon);
                l.put("reserve", Math.max(0, p.reserve));
                liste.add(l);
            }
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("mois", mois);
        m.put("moisVente", moisVente);
        m.put("quantiteMin", quantiteMin);
        m.put("frequents", frequents);
        m.put("ruptures", enRupture.size());
        m.put("taux", frequents == 0 ? 0.0 : Math.round(enRupture.size() * 1000.0 / frequents) / 10.0);
        m.put("ids", ids);
        m.put("liste", liste);
        return m;
    }
}
