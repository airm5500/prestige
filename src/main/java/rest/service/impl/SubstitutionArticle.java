package rest.service.impl;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Regles de SUBSTITUTION d'un article par un autre (retour du 23/09), sans base de donnees pour etre verifiables une a
 * une.
 *
 * <p>
 * Le point de depart est la DCI renseignee sur les fiches articles : deux produits ne sont comparables que s'ils ont
 * EXACTEMENT les memes DCI. Le dosage et la forme ne sont pas des champs de la base (la forme n'est remplie nulle part)
 * : ils sont LUS DANS LE LIBELLE (« 500MG », « 1G », « CPR EFFV »...). D'ou deux niveaux :
 * <ul>
 * <li><b>equivalent direct</b> : memes DCI, meme dosage, meme famille de forme ;</li>
 * <li><b>a adapter</b> : memes DCI, mais dosage ou forme differents - ou illisibles dans le libelle. Jamais presente
 * comme equivalent : la raison est donnee.</li>
 * </ul>
 * Pour les DCI a marge therapeutique etroite, l'ecran dit que la substitution est a eviter sans avis medical.
 *
 * <p>
 * Le logiciel PROPOSE, le pharmacien DECIDE.
 */
public final class SubstitutionArticle {

    public static final String DIRECT = "direct";
    public static final String ADAPTER = "adapter";

    private SubstitutionArticle() {
    }

    /** Libelle en majuscules sans accents, pour lire dosage et forme. */
    static String normaliser(String libelle) {
        return Normalizer.normalize(libelle == null ? "" : libelle, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toUpperCase(Locale.ROOT);
    }

    /* ------------------------------------------------------------------------------------------------ dosage */

    /** « 500MG », « 1 G », « 20/120MG », « 62,5MG », « 75MCG », « 3% ». Les volumes (ML) ne sont pas des dosages. */
    private static final Pattern DOSE = Pattern
            .compile("(\\d+(?:[.,]\\d+)?(?:\\s*/\\s*\\d+(?:[.,]\\d+)?)*)\\s*(MG|G|MCG|UG|UI|%)(?![A-Z])");

    /**
     * Les doses lues dans le libelle, ramenees a une unite commune (le gramme en milligrammes) et triees : « 1G » et «
     * 1000MG » donnent la meme chose. Liste vide si rien n'est lisible.
     */
    public static List<String> dosage(String libelle) {
        List<String> doses = new ArrayList<>();
        Matcher m = DOSE.matcher(normaliser(libelle));
        while (m.find()) {
            String unite = m.group(2);
            for (String n : m.group(1).split("/")) {
                double v;
                try {
                    v = Double.parseDouble(n.trim().replace(',', '.'));
                } catch (NumberFormatException e) {
                    continue;
                }
                String u = unite;
                if ("G".equals(u)) {
                    v = v * 1000;
                    u = "MG";
                } else if ("UG".equals(u)) {
                    u = "MCG";
                }
                doses.add(texte(v) + " " + u.toLowerCase(Locale.ROOT));
            }
        }
        Collections.sort(doses);
        return doses;
    }

    private static String texte(double v) {
        return v == Math.rint(v) ? String.valueOf((long) v) : String.valueOf(v).replace('.', ',');
    }

    /* ------------------------------------------------------------------------------------------------- forme */

    /** Famille de forme et son libelle ; l'ordre compte (« CPR EFFV » est effervescent avant d'etre un comprime). */
    private static final String[][] FORMES = {
            { "effervescent", "comprimé effervescent", "EFFV", "EFFERV", "EFFERVESCENT" },
            { "liberation_prolongee", "libération prolongée", "LP", "LM", "RETARD" },
            { "dispersible", "comprimé dispersible / orodispersible", "DISP", "ORO", "ORODISP", "LYOC" },
            /* Les voies non orales AVANT les formes buvables : « SOL INJ » est injectable, pas buvable. */
            { "injectable", "injectable", "INJ", "AMP", "INJECTABLE", "SERINGUE" },
            { "collyre", "collyre", "COLL", "COLLYRE" },
            { "suppositoire", "suppositoire", "SUPPO", "SUPP", "SUPPOSITOIRE" },
            { "ovule", "ovule", "OVULE", "OVULES" },
            { "cutane", "crème / pommade", "CREME", "CR", "POMMADE", "PDE", "DERM" },
            { "sachet", "poudre en sachet", "SACH", "SACHET", "SACHETS" },
            { "buvable", "forme buvable", "SIROP", "SP", "SBUV", "BUV", "SUSP", "GTTE", "GTT", "SOL" },
            { "oral_solide", "comprimé / gélule", "CPR", "CP", "COMP", "COMPRIME", "PELL", "SEC", "DRG", "GEL",
                    "GELULE", "CAPS", "CAPSULE" } };

    /** Famille de forme lue dans le libelle, ou null si aucune n'est reconnaissable. */
    public static String forme(String libelle) {
        List<String> mots = Arrays.asList(normaliser(libelle).split("[^A-Z0-9]+"));
        for (String[] f : FORMES) {
            for (int i = 2; i < f.length; i++) {
                if (mots.contains(f[i])) {
                    return f[0];
                }
            }
        }
        return null;
    }

    public static String libelleForme(String forme) {
        for (String[] f : FORMES) {
            if (f[0].equals(forme)) {
                return f[1];
            }
        }
        return "forme non lue dans le libellé";
    }

    /** Ce qu'une forme change pour le patient, dit dans la raison d'un « a adapter ». */
    static String consequenceForme(String forme) {
        if (forme == null) {
            return "forme à vérifier";
        }
        switch (forme) {
        case "effervescent":
            return "forme effervescente : contient du sodium";
        case "buvable":
            return "forme buvable : adapter la mesure, vérifier le sucre et les excipients";
        case "liberation_prolongee":
            return "libération prolongée : rythme de prise différent";
        case "sachet":
            return "poudre en sachet : mode de prise différent";
        case "dispersible":
            return "comprimé dispersible : mode de prise différent";
        default:
            return "autre forme : " + libelleForme(forme);
        }
    }

    /* ------------------------------------------------------------------------------------------ classement */

    /** Niveau et raison d'un candidat, compare au produit d'origine. */
    public static final class Verdict {
        public final String niveau;
        public final String raison;

        Verdict(String niveau, String raison) {
            this.niveau = niveau;
            this.raison = raison;
        }
    }

    /** Voie d'administration d'une famille de forme : toutes les formes orales partagent la meme. */
    static String voie(String forme) {
        if (forme == null) {
            return null;
        }
        switch (forme) {
        case "effervescent":
        case "liberation_prolongee":
        case "dispersible":
        case "sachet":
        case "buvable":
        case "oral_solide":
            return "orale";
        default:
            return forme;
        }
    }

    /**
     * Suppose les DCI identiques (c'est la requete qui l'assure) : compare dosage et forme. Rend {@code null} quand le
     * candidat ne se prend pas par la meme voie - un collyre de ciprofloxacine n'est pas un substitut du comprime, ni «
     * a adapter » : il n'est pas propose du tout.
     */
    public static Verdict comparer(String origine, String candidat) {
        List<String> d1 = dosage(origine);
        List<String> d2 = dosage(candidat);
        String f1 = forme(origine);
        String f2 = forme(candidat);
        if (f1 != null && f2 != null && !voie(f1).equals(voie(f2))) {
            return null;
        }
        List<String> raisons = new ArrayList<>();
        if (d1.isEmpty() || d2.isEmpty()) {
            raisons.add("dosage à vérifier (non lu dans le libellé)");
        } else if (!d1.equals(d2)) {
            raisons.add("dosage différent : " + String.join(" + ", d2) + " au lieu de " + String.join(" + ", d1)
                    + ", adapter la posologie");
        }
        if (f1 == null || f2 == null) {
            raisons.add("forme à vérifier (non lue dans le libellé)");
        } else if (!f1.equals(f2)) {
            raisons.add(consequenceForme(f2));
        }
        if (raisons.isEmpty()) {
            return new Verdict(DIRECT, "même DCI, même dosage (" + String.join(" + ", d1) + "), " + libelleForme(f1));
        }
        return new Verdict(ADAPTER, "même DCI ; " + String.join(" ; ", raisons));
    }

    /* ------------------------------------------------------------------------------------ marge etroite */

    /**
     * DCI pour lesquelles changer de specialite demande une surveillance, meme a dosage identique : marge therapeutique
     * etroite (mises en garde ANSM). Reconnues par un morceau de leur nom.
     */
    static final String[] MARGE_ETROITE = { "LEVOTHYROX", "ACENOCOUMAROL", "WARFARIN", "FLUINDIONE", "VALPRO",
            "CARBAMAZEPIN", "PHENYTOIN", "LAMOTRIGIN", "LEVETIRACETAM", "PHENOBARBITAL", "TOPIRAMAT", "CICLOSPORIN",
            "TACROLIMUS", "MYCOPHENOL", "LITHIUM", "DIGOXIN" };

    /** Message d'avertissement si l'une des DCI est a marge etroite, sinon chaine vide. */
    public static String avertissement(List<String> dcis) {
        for (String d : dcis) {
            String n = normaliser(d);
            for (String m : MARGE_ETROITE) {
                if (n.contains(m)) {
                    return "Substitution à éviter sans avis médical : " + d.trim()
                            + " est à marge thérapeutique étroite. Tout changement de spécialité demande une "
                            + "surveillance clinique et biologique.";
                }
            }
        }
        return "";
    }
}
