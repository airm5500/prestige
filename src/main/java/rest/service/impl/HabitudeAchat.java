package rest.service.impl;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.TreeSet;

/**
 * Habitude d'achat d'un produit par un client (plan d'octobre, section 4.1, lot L10) : le calcul, sans base de donnees.
 *
 * <p>
 * Un produit est un ACHAT REGULIER quand il a ete achete au moins N fois (jours distincts, 3 par defaut), avec un ecart
 * moyen entre deux achats compris entre 7 et 120 jours, et des ecarts STABLES : le coefficient de variation (ecart type
 * / moyenne) ne depasse pas le seuil (35 % par defaut). Le prochain achat est attendu a la date du dernier achat +
 * l'ecart moyen. Une habitude dont le client a laisse passer plus d'une periode complete sans acheter est consideree
 * perdue (on ne relance pas indefiniment).
 */
public final class HabitudeAchat {

    public static final int MIN_ACHATS_DEFAUT = 3;
    public static final int ECART_MAX_DEFAUT = 35;
    static final int FREQUENCE_MIN = 7;
    static final int FREQUENCE_MAX = 120;

    private HabitudeAchat() {
    }

    /** Resultat pour un produit d'un client. */
    public static final class Resultat {

        public final boolean reguliere;
        public final int achats;
        public final int frequenceJours;
        public final double variation;
        public final LocalDate dernierAchat;
        public final LocalDate prochainAchat;
        public final String raison;

        Resultat(boolean reguliere, int achats, int frequenceJours, double variation, LocalDate dernierAchat,
                LocalDate prochainAchat, String raison) {
            this.reguliere = reguliere;
            this.achats = achats;
            this.frequenceJours = frequenceJours;
            this.variation = variation;
            this.dernierAchat = dernierAchat;
            this.prochainAchat = prochainAchat;
            this.raison = raison;
        }

        /**
         * Le rappel tombe-t-il aujourd'hui ? Prochain achat d'ici N jours ; un retard n'est repris que s'il ne depasse
         * pas N jours (la tache est quotidienne : au-dela, le client a deja ete inscrit, ou l'habitude est rompue),
         * pour ne pas inonder la liste a la mise en service.
         */
        public boolean aRappeler(LocalDate aujourdhui, int joursAvant) {
            if (!reguliere || prochainAchat == null) {
                return false;
            }
            int n = Math.max(0, joursAvant);
            long ecart = ChronoUnit.DAYS.between(aujourdhui, prochainAchat);
            return ecart <= n && ecart >= -n;
        }
    }

    public static Resultat analyser(List<LocalDate> achats, LocalDate aujourdhui) {
        return analyser(achats, aujourdhui, MIN_ACHATS_DEFAUT, ECART_MAX_DEFAUT);
    }

    /**
     * @param achats
     *            dates d'achat (les doublons d'un meme jour comptent une fois)
     * @param minAchats
     *            nombre minimal d'achats
     * @param ecartMaxPourcent
     *            coefficient de variation maximal des ecarts, en %
     */
    public static Resultat analyser(List<LocalDate> achats, LocalDate aujourdhui, int minAchats, int ecartMaxPourcent) {
        List<LocalDate> jours = new ArrayList<>(new TreeSet<>(achats));
        int n = jours.size();
        if (n == 0) {
            return new Resultat(false, 0, 0, 0, null, null, "aucun achat");
        }
        LocalDate dernier = jours.get(n - 1);
        if (n < Math.max(2, minAchats)) {
            return new Resultat(false, n, 0, 0, dernier, null, "moins de " + Math.max(2, minAchats) + " achats");
        }
        double[] ecarts = new double[n - 1];
        double somme = 0;
        for (int i = 1; i < n; i++) {
            ecarts[i - 1] = ChronoUnit.DAYS.between(jours.get(i - 1), jours.get(i));
            somme += ecarts[i - 1];
        }
        double moyenne = somme / ecarts.length;
        double var = 0;
        for (double e : ecarts) {
            var += (e - moyenne) * (e - moyenne);
        }
        double cv = moyenne > 0 ? Math.sqrt(var / ecarts.length) / moyenne : 1;
        int frequence = (int) Math.round(moyenne);
        LocalDate prochain = dernier.plusDays(frequence);
        double cvPourcent = Math.round(cv * 1000) / 10.0;
        if (frequence < FREQUENCE_MIN || frequence > FREQUENCE_MAX) {
            return new Resultat(false, n, frequence, cvPourcent, dernier, prochain,
                    "écart moyen de " + frequence + " jours hors de la plage " + FREQUENCE_MIN + "-" + FREQUENCE_MAX);
        }
        if (cvPourcent > ecartMaxPourcent) {
            return new Resultat(false, n, frequence, cvPourcent, dernier, prochain,
                    "achats irréguliers (variation " + cvPourcent + " %)");
        }
        if (aujourdhui != null && ChronoUnit.DAYS.between(prochain, aujourdhui) > frequence) {
            return new Resultat(false, n, frequence, cvPourcent, dernier, prochain, "habitude interrompue");
        }
        return new Resultat(true, n, frequence, cvPourcent, dernier, prochain,
                "achat régulier tous les " + frequence + " jours");
    }
}
