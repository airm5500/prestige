package util;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Numero de badge RH (demande du 16/10) : {@code PRE-AA-NNNNN-C}, par exemple {@code PGB-26-00017-K}.
 * <ul>
 * <li>PRE : abreviation du nom de l'officine (« PHIE DE GBOGUHE SARL-U » -> PGB) ;</li>
 * <li>AA : annee d'emission ; NNNNN : numero d'ordre dans l'annee ;</li>
 * <li>C : lettre de controle (une faute de frappe sur le numero est detectee).</li>
 * </ul>
 */
public final class NumeroBadge {

    /** 23 lettres sans I, O, Q (confusion avec 1 et 0). */
    static final String LETTRES = "ABCDEFGHJKLMNPRSTUVWXYZ";
    private static final Set<String> MOTS_VIDES = new HashSet<>(Arrays.asList("DE", "DU", "DES", "LA", "LE", "LES", "L",
            "D", "ET", "SARL", "SARLU", "SA", "SAS", "SASU", "U", "EURL", "GIE", "SCI", "SNC"));
    private static final Set<String> PHARMACIE = new HashSet<>(
            Arrays.asList("PHIE", "PHARMACIE", "PHCIE", "PHARMA", "PHARM", "PHARMACY", "PH", "PHIES"));

    private NumeroBadge() {
    }

    /** Abreviation de trois lettres du nom de l'officine ; « BDG » si le nom ne donne rien. */
    public static String prefixe(String nomOfficine) {
        String n = Normalizer.normalize(nomOfficine == null ? "" : nomOfficine, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toUpperCase();
        List<String> mots = new ArrayList<>();
        for (String m : n.split("[^A-Z]+")) {
            if (!m.isEmpty() && !MOTS_VIDES.contains(m)) {
                mots.add(m);
            }
        }
        StringBuilder p = new StringBuilder();
        if (!mots.isEmpty() && PHARMACIE.contains(mots.get(0))) {
            p.append('P');
            mots.remove(0);
            mots.removeIf(PHARMACIE::contains);
        }
        if (mots.size() >= 3 - p.length() && mots.size() > 1) {
            for (String m : mots) {
                if (p.length() == 3) {
                    break;
                }
                p.append(m.charAt(0));
            }
        } else if (!mots.isEmpty()) {
            String m = mots.get(0);
            p.append(m, 0, Math.min(m.length(), 3 - p.length()));
            for (int i = 1; i < mots.size() && p.length() < 3; i++) {
                p.append(mots.get(i).charAt(0));
            }
        }
        return p.length() == 3 ? p.toString() : "BDG";
    }

    /** Numero complet avec sa lettre de controle. */
    public static String numero(String prefixe, int annee, int ordre) {
        String corps = prefixe + "-" + String.format("%02d", annee % 100) + "-" + String.format("%05d", ordre);
        return corps + "-" + cle(corps);
    }

    /** Vrai si le numero a la forme PRE-AA-NNNNN-C et que sa lettre de controle est juste. */
    public static boolean valide(String numero) {
        if (numero == null || !numero.matches("[A-Z]{3}-\\d{2}-\\d{5}-[A-Z]")) {
            return false;
        }
        return numero.charAt(numero.length() - 1) == cle(numero.substring(0, numero.length() - 2));
    }

    static char cle(String corps) {
        int somme = 0, rang = 1;
        for (char c : corps.toCharArray()) {
            if (c == '-') {
                continue;
            }
            int v = Character.isDigit(c) ? c - '0' : c - 'A' + 10;
            somme += v * rang++;
        }
        return LETTRES.charAt(somme % LETTRES.length());
    }
}
