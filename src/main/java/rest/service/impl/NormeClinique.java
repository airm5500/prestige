package rest.service.impl;

import java.util.List;

/**
 * ANALYSE D'UNE MESURE selon les normes (retour du 30/09) : chaque parametre a ses valeurs de reference, par tranche
 * d'age (tension, frequence cardiaque) ou pour tous (glycemie, temperature, saturation). L'IMC est calcule du poids et
 * de la taille, et classe pour l'adulte.
 *
 * <p>
 * Aucun acces a la base : les normes sont passees par le service, la logique se teste seule.
 */
public final class NormeClinique {

    public static final String BAS = "bas";
    public static final String NORMAL = "normal";
    public static final String HAUT = "haut";
    public static final String INCONNU = "inconnu";

    private NormeClinique() {
    }

    /** Une norme : tranche d'age (bornes comprises, null = ouverte) et valeurs de reference. */
    public static final class Norme {
        final Integer ageMin;
        final Integer ageMax;
        final Double bas;
        final Double haut;
        final Double bas2;
        final Double haut2;
        final String source;

        public Norme(Integer ageMin, Integer ageMax, Double bas, Double haut, Double bas2, Double haut2,
                String source) {
            this.ageMin = ageMin;
            this.ageMax = ageMax;
            this.bas = bas;
            this.haut = haut;
            this.bas2 = bas2;
            this.haut2 = haut2;
            this.source = source;
        }

        boolean couvre(Integer age) {
            if (age == null) {
                return false;
            }
            return (ageMin == null || age >= ageMin) && (ageMax == null || age <= ageMax);
        }

        boolean sansAge() {
            return ageMin == null && ageMax == null;
        }

        public String getSource() {
            return source;
        }

        /** « 90 - 139 / 60 - 89 » ou « 0,70 - 1,10 ». */
        public String plage() {
            String p = nombre(bas) + " - " + nombre(haut);
            return bas2 != null || haut2 != null ? p + " / " + nombre(bas2) + " - " + nombre(haut2) : p;
        }
    }

    /** Le resultat de l'analyse d'une mesure. */
    public static final class Evaluation {
        public final String etat;
        public final String libelle;
        public final Norme norme;

        Evaluation(String etat, String libelle, Norme norme) {
            this.etat = etat;
            this.libelle = libelle;
            this.norme = norme;
        }
    }

    /**
     * La norme qui s'applique a cet age : celle de sa tranche, sinon une norme sans age. Age inconnu : la norme sans
     * age, sinon celle des adultes (tranche ouverte vers le haut).
     */
    public static Norme choisir(List<Norme> normes, Integer age) {
        if (normes == null || normes.isEmpty()) {
            return null;
        }
        for (Norme n : normes) {
            if (!n.sansAge() && n.couvre(age)) {
                return n;
            }
        }
        for (Norme n : normes) {
            if (n.sansAge()) {
                return n;
            }
        }
        if (age == null) {
            for (Norme n : normes) {
                if (n.ageMax == null) {
                    return n;
                }
            }
        }
        return null;
    }

    /** Analyse une mesure (valeur2 : diastolique pour la tension, sinon null). */
    public static Evaluation evaluer(double valeur, Double valeur2, Integer age, List<Norme> normes) {
        Norme n = choisir(normes, age);
        if (n == null) {
            return new Evaluation(INCONNU, "Pas de norme", null);
        }
        boolean bas = (n.bas != null && valeur < n.bas) || (valeur2 != null && n.bas2 != null && valeur2 < n.bas2);
        boolean haut = (n.haut != null && valeur > n.haut) || (valeur2 != null && n.haut2 != null && valeur2 > n.haut2);
        if (haut) {
            return new Evaluation(HAUT, "Élevée", n);
        }
        if (bas) {
            return new Evaluation(BAS, "Basse", n);
        }
        return new Evaluation(NORMAL, "Normale", n);
    }

    /** IMC = poids (kg) / taille (m) au carre, a une decimale ; null sans poids ou taille plausibles. */
    public static Double imc(Double poidsKg, Double tailleCm) {
        if (poidsKg == null || tailleCm == null || poidsKg <= 0 || tailleCm < 30) {
            return null;
        }
        double m = tailleCm / 100.0;
        return Math.round(poidsKg / (m * m) * 10.0) / 10.0;
    }

    /**
     * Classe de corpulence de l'adulte (OMS). Avant 18 ans, l'IMC se lit sur les courbes de corpulence de l'enfant :
     * pas de classe adulte.
     */
    public static Evaluation classerImc(double imc, Integer age) {
        if (age != null && age < 18) {
            return new Evaluation(INCONNU, "Enfant : à lire sur les courbes de corpulence", null);
        }
        if (imc < 18.5) {
            return new Evaluation(BAS, "Maigreur", null);
        }
        if (imc < 25) {
            return new Evaluation(NORMAL, "Corpulence normale", null);
        }
        if (imc < 30) {
            return new Evaluation(HAUT, "Surpoids", null);
        }
        return new Evaluation(HAUT, "Obésité", null);
    }

    static String nombre(Double v) {
        if (v == null) {
            return "…";
        }
        return v == Math.rint(v) ? String.valueOf(v.longValue()) : String.valueOf(v).replace('.', ',');
    }
}
