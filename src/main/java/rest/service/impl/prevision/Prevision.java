package rest.service.impl.prevision;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Prevision des ventes d'un produit (plan d'octobre, section 5, lot L12), sans base de donnees : a partir des ventes
 * MENSUELLES (du plus ancien au plus recent, le dernier mois etant complet), trois methodes simples et explicables :
 * <ul>
 * <li>MOYENNE : moyenne mobile des 3 derniers mois ;</li>
 * <li>SAISON : meme mois de l'annee precedente, corrige de la tendance (12 derniers mois / 12 precedents) ;</li>
 * <li>HOLT : lissage exponentiel double (niveau + tendance) ; HOLT_WINTERS (saison de 12 mois) quand il y a au moins 24
 * mois d'historique.</li>
 * </ul>
 * Chaque methode est jugee sur les derniers mois connus (prevision d'un mois a la fois, sans regarder la suite) ;
 * l'erreur est le WAPE (somme des ecarts / somme des ventes, robuste aux mois a zero). La plus juste est retenue ; sa
 * FIABILITE vaut 100 - WAPE (bornee a 0..100).
 */
public final class Prevision {

    public static final String MOYENNE = "MOYENNE";
    public static final String SAISON = "SAISON";
    public static final String HOLT = "HOLT";
    public static final String HOLT_WINTERS = "HOLT_WINTERS";
    /** Mois jugés pour choisir la methode. */
    static final int MOIS_TEST = 6;
    static final double ALPHA = 0.4;
    static final double BETA = 0.2;
    static final double GAMMA = 0.3;

    private Prevision() {
    }

    /** Resultat : methode retenue, prevision du mois a venir, fiabilite, et l'erreur de chaque methode jugee. */
    public static final class Resultat {
        public final String methode;
        public final double prevuMois;
        public final int fiabilite;
        public final double ecartTypeMois;
        public final double[] erreurs;
        public final String[] methodes;

        Resultat(String methode, double prevuMois, int fiabilite, double ecartTypeMois, String[] methodes,
                double[] erreurs) {
            this.methode = methode;
            this.prevuMois = prevuMois;
            this.fiabilite = fiabilite;
            this.ecartTypeMois = ecartTypeMois;
            this.methodes = methodes;
            this.erreurs = erreurs;
        }

        /** Ventes attendues par jour (mois de 30 jours). */
        public double parJour() {
            return prevuMois / 30.0;
        }
    }

    /** Prevision du mois suivant la serie par une methode donnee ; NaN si la methode n'est pas applicable. */
    public static double prevoir(double[] serie, String methode) {
        int n = serie.length;
        switch (methode) {
        case MOYENNE:
            if (n == 0) {
                return Double.NaN;
            }
            double s = 0;
            int k = Math.min(3, n);
            for (int i = n - k; i < n; i++) {
                s += serie[i];
            }
            return s / k;
        case SAISON:
            if (n < 12) {
                return Double.NaN;
            }
            double base = serie[n - 12];
            if (n >= 24) {
                double recent = somme(serie, n - 12, n), ancien = somme(serie, n - 24, n - 12);
                double tendance = ancien > 0 ? Math.max(0.5, Math.min(2, recent / ancien)) : 1;
                return base * tendance;
            }
            return base;
        case HOLT:
            if (n < 4) {
                return Double.NaN;
            }
            double niveau = serie[0], pente = serie[1] - serie[0];
            for (int i = 1; i < n; i++) {
                double ancienNiveau = niveau;
                niveau = ALPHA * serie[i] + (1 - ALPHA) * (niveau + pente);
                pente = BETA * (niveau - ancienNiveau) + (1 - BETA) * pente;
            }
            return Math.max(0, niveau + pente);
        case HOLT_WINTERS:
            if (n < 24) {
                return Double.NaN;
            }
            double moyenne1 = somme(serie, 0, 12) / 12, moyenne2 = somme(serie, 12, 24) / 12;
            double niv = moyenne1, tend = (moyenne2 - moyenne1) / 12;
            double[] saison = new double[12];
            for (int i = 0; i < 12; i++) {
                saison[i] = (serie[i] - moyenne1 + serie[i + 12] - moyenne2) / 2;
            }
            for (int i = 0; i < n; i++) {
                double ancien = niv;
                int m = i % 12;
                niv = ALPHA * (serie[i] - saison[m]) + (1 - ALPHA) * (niv + tend);
                tend = BETA * (niv - ancien) + (1 - BETA) * tend;
                saison[m] = GAMMA * (serie[i] - niv) + (1 - GAMMA) * saison[m];
            }
            return Math.max(0, niv + tend + saison[n % 12]);
        default:
            return Double.NaN;
        }
    }

    public static Resultat analyser(double[] serie) {
        return analyser(serie, MOIS_TEST);
    }

    /** Retours du 10/10 : nombre de mois d'essai des methodes parametrable. */
    public static Resultat analyser(double[] serie, int moisTest) {
        String[] candidates = { MOYENNE, SAISON, HOLT, HOLT_WINTERS };
        List<String> jugees = new ArrayList<>();
        List<Double> erreurs = new ArrayList<>();
        int n = serie.length;
        int test = Math.min(Math.max(1, moisTest), Math.max(0, n - 3));
        String meilleure = MOYENNE;
        double meilleureErreur = Double.MAX_VALUE;
        for (String m : candidates) {
            double ecarts = 0, ventes = 0;
            boolean applicable = test > 0;
            for (int t = n - test; t < n && applicable; t++) {
                double p = prevoir(Arrays.copyOfRange(serie, 0, t), m);
                if (Double.isNaN(p)) {
                    applicable = false;
                    break;
                }
                ecarts += Math.abs(p - serie[t]);
                ventes += serie[t];
            }
            if (!applicable) {
                continue;
            }
            double wape = ventes > 0 ? ecarts * 100 / ventes : (ecarts > 0 ? 100 : 0);
            jugees.add(m);
            erreurs.add(wape);
            /* a erreur egale, la methode la plus simple (ordre de la liste) l'emporte */
            if (wape < meilleureErreur - 1e-9) {
                meilleureErreur = wape;
                meilleure = m;
            }
        }
        double prevu = prevoir(serie, meilleure);
        if (Double.isNaN(prevu)) {
            prevu = prevoir(serie, MOYENNE);
        }
        if (Double.isNaN(prevu)) {
            prevu = 0;
        }
        int fiabilite = jugees.isEmpty() ? 0 : (int) Math.round(Math.max(0, Math.min(100, 100 - meilleureErreur)));
        double[] e = new double[erreurs.size()];
        for (int i = 0; i < e.length; i++) {
            e[i] = Math.round(erreurs.get(i) * 10) / 10.0;
        }
        return new Resultat(meilleure, Math.round(prevu * 10) / 10.0, fiabilite, ecartType(serie, 12),
                jugees.toArray(new String[0]), e);
    }

    /** Ecart type des ventes mensuelles sur les k derniers mois. */
    static double ecartType(double[] serie, int k) {
        int n = serie.length, d = Math.max(0, n - k);
        if (n - d < 2) {
            return 0;
        }
        double m = somme(serie, d, n) / (n - d), v = 0;
        for (int i = d; i < n; i++) {
            v += (serie[i] - m) * (serie[i] - m);
        }
        return Math.sqrt(v / (n - d - 1));
    }

    static double somme(double[] s, int de, int a) {
        double t = 0;
        for (int i = de; i < a; i++) {
            t += s[i];
        }
        return t;
    }
}
