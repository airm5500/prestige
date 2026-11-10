package rest.service.impl.activite;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Plan avoir du 08/11, point 1 : rapport « employé × tranche horaire × CA réalisé » (calcul sans base : les ventes sont
 * lues par le service avec les règles de l'écran : clôturées, non annulées, montant &gt; 0, hors dépôt, au moins une
 * ligne).
 * <ul>
 * <li>tranche : heure de l'encaissement divisée par la taille de la tranche (1 à 6 h) ; la dernière tranche de la
 * journée s'arrête à 24 h ;</li>
 * <li>attribution CAISSIER (par défaut) : la caissière qui a encaissé, à défaut l'opérateur de la vente ;</li>
 * <li>attribution VENDEUR : le vendeur qui a saisi la vente (prévente), à défaut la caissière, puis l'opérateur ;</li>
 * <li>attribution CONSEIL (plan du 09/11, point 10) : l'employé choisi dans « Conseil » à la vente ; les ventes sans
 * conseil forment la ligne « Sans conseil » ;</li>
 * <li>chaque vente compte une fois, dans une seule case : la somme des cases égale le CA de la période, quelle que soit
 * l'attribution.</li>
 * </ul>
 */
public final class CaTranchesEmploye {

    public static final String CAISSIER = "CAISSIER";
    public static final String VENDEUR = "VENDEUR";
    public static final String CONSEIL = "CONSEIL";
    /** Ligne des ventes sans conseil (attribution CONSEIL). */
    public static final String SANS_CONSEIL = "SANS_CONSEIL";
    public static final int TAILLE_MIN = 1;
    public static final int TAILLE_MAX = 6;

    private CaTranchesEmploye() {
    }

    /** Une vente encaissée (lue par le service). */
    public static final class Vente {

        final String caissier;
        final String vendeur;
        final String operateur;
        final LocalDateTime encaissement;
        final long montant;
        /** plan du 09/11, point 10 : employé qui a conseillé le client (facultatif) */
        final String conseil;

        public Vente(String caissier, String vendeur, String operateur, LocalDateTime encaissement, long montant) {
            this(caissier, vendeur, operateur, encaissement, montant, null);
        }

        public Vente(String caissier, String vendeur, String operateur, LocalDateTime encaissement, long montant,
                String conseil) {
            this.caissier = caissier;
            this.vendeur = vendeur;
            this.operateur = operateur;
            this.encaissement = encaissement;
            this.montant = montant;
            this.conseil = conseil;
        }
    }

    /** Taille de tranche ramenée entre 1 et 6 h (2 h si absente, comme la fréquentation). */
    public static int taille(Integer t) {
        return t == null ? 2 : Math.max(TAILLE_MIN, Math.min(TAILLE_MAX, t));
    }

    /** VENDEUR, CONSEIL ou CAISSIER (défaut). */
    public static String attribution(String a) {
        String x = a == null ? "" : a.trim();
        if (VENDEUR.equalsIgnoreCase(x)) {
            return VENDEUR;
        }
        return CONSEIL.equalsIgnoreCase(x) ? CONSEIL : CAISSIER;
    }

    static boolean vide(String s) {
        return s == null || s.isBlank() || "null".equalsIgnoreCase(s);
    }

    /** Employé à qui revient la vente selon l'attribution (jamais null : « ? » si rien n'est connu). */
    public static String employe(Vente v, String attribution) {
        if (CONSEIL.equals(attribution)) {
            return vide(v.conseil) ? SANS_CONSEIL : v.conseil;
        }
        if (VENDEUR.equals(attribution) && !vide(v.vendeur)) {
            return v.vendeur;
        }
        if (!vide(v.caissier)) {
            return v.caissier;
        }
        return vide(v.operateur) ? "?" : v.operateur;
    }

    /** Index de la tranche d'une heure (0 à 23). */
    public static int tranche(int heure, int taille) {
        return heure / taille;
    }

    /** Nombre de tranches dans une journée. */
    public static int nombreTranches(int taille) {
        return (24 + taille - 1) / taille;
    }

    /** « 8 h - 10 h » ; la dernière tranche s'arrête à 24 h. */
    public static String libelle(int index, int taille) {
        return index * taille + " h - " + Math.min(24, (index + 1) * taille) + " h";
    }

    /**
     * Le rapport : colonnes = tranches de la première à la dernière qui a une vente ; une ligne par employé (CA
     * décroissant, puis nom) ; totaux par ligne et par colonne. employeId non vide : seules ses ventes (selon
     * l'attribution choisie).
     */
    public static Map<String, Object> calculer(List<Vente> ventes, Integer tailleDemandee, String attributionDemandee,
            Map<String, String> noms, String employeId) {
        int taille = taille(tailleDemandee);
        String attribution = attribution(attributionDemandee);
        int n = nombreTranches(taille);
        Map<String, long[][]> parEmploye = new LinkedHashMap<>();
        long[][] colonnes = new long[n][2];
        long ca = 0, nb = 0;
        int premiere = n, derniere = -1;
        for (Vente v : ventes) {
            if (v.encaissement == null || v.montant <= 0) {
                continue;
            }
            String e = employe(v, attribution);
            if (!vide(employeId) && !employeId.equals(e)) {
                continue;
            }
            int t = tranche(v.encaissement.getHour(), taille);
            long[][] l = parEmploye.computeIfAbsent(e, k -> new long[n][2]);
            l[t][0] += v.montant;
            l[t][1]++;
            colonnes[t][0] += v.montant;
            colonnes[t][1]++;
            ca += v.montant;
            nb++;
            premiere = Math.min(premiere, t);
            derniere = Math.max(derniere, t);
        }
        List<Map<String, Object>> tranches = new ArrayList<>();
        for (int t = premiere; t <= derniere; t++) {
            Map<String, Object> x = new LinkedHashMap<>();
            x.put("index", t);
            x.put("debut", t * taille);
            x.put("fin", Math.min(24, (t + 1) * taille));
            x.put("libelle", libelle(t, taille));
            tranches.add(x);
        }
        final int p = premiere, d = derniere;
        List<Map<String, Object>> lignes = new ArrayList<>();
        parEmploye.forEach((id, l) -> {
            long c = 0, k = 0;
            for (long[] x : l) {
                c += x[0];
                k += x[1];
            }
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", id);
            m.put("nom", SANS_CONSEIL.equals(id) ? "Sans conseil" : noms.getOrDefault(id, "?"));
            m.put("cellules", cellules(l, p, d));
            m.put("ca", c);
            m.put("ventes", k);
            lignes.add(m);
        });
        lignes.sort(Comparator.comparingLong((Map<String, Object> m) -> (Long) m.get("ca")).reversed()
                .thenComparing(m -> String.valueOf(m.get("nom"))));
        Map<String, Object> totaux = new LinkedHashMap<>();
        totaux.put("cellules", cellules(colonnes, p, d));
        totaux.put("ca", ca);
        totaux.put("ventes", nb);
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("taille", taille);
        r.put("attribution", attribution);
        r.put("tranches", tranches);
        r.put("lignes", lignes);
        r.put("totaux", totaux);
        return r;
    }

    private static List<Map<String, Object>> cellules(long[][] l, int premiere, int derniere) {
        List<Map<String, Object>> c = new ArrayList<>();
        for (int t = premiere; t <= derniere; t++) {
            Map<String, Object> x = new LinkedHashMap<>();
            x.put("ca", l[t][0]);
            x.put("ventes", l[t][1]);
            c.add(x);
        }
        return c;
    }
}
