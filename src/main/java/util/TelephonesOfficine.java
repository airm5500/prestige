package util;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Plan du 12/11, « Identification de l'officine » : telephones de l'officine. Le champ « Telephone » de l'ecran accepte
 * plusieurs numeros ; la base les range en deux colonnes (t_officine.str_PHONE = le premier, str_AUTRESPHONES = les
 * suivants separes par « ; »).
 * <p>
 * Avant : seul « ; » separait les numeros. Une saisie « A,B » (ou un seul numero) etait recopiee entiere dans les deux
 * colonnes, et l'ecran relisait « A,B;A,B ». Regle unique, la meme que celle du ticket de caisse : les numeros sont
 * separes par « ; », « , », « / » ou « | », les espaces autour sont retires (ceux a l'interieur d'un numero sont
 * gardes), les vides et les doublons sont ecartes, l'ordre de saisie est garde.
 */
public final class TelephonesOfficine {

    /** Separateurs acceptes entre deux numeros. */
    public static final String SEPARATEURS = "[;/,|]";

    private TelephonesOfficine() {
    }

    /** Numeros distincts, dans l'ordre, lus dans les champs donnes (null accepte). */
    public static List<String> numeros(String... champs) {
        List<String> l = new ArrayList<>();
        if (champs == null) {
            return l;
        }
        for (String t : Arrays.asList(champs)) {
            if (t == null) {
                continue;
            }
            for (String n : t.split(SEPARATEURS)) {
                String x = n.trim();
                if (!x.isEmpty() && !l.contains(x)) {
                    l.add(x);
                }
            }
        }
        return l;
    }

    /**
     * Saisie de l'ecran -> { str_PHONE, str_AUTRESPHONES } : le premier numero, puis les suivants separes par « ; ».
     * Saisie vide : deux chaines vides.
     */
    public static String[] decouper(String saisie) {
        List<String> l = numeros(saisie);
        if (l.isEmpty()) {
            return new String[] { "", "" };
        }
        return new String[] { l.get(0), String.join(";", l.subList(1, l.size())) };
    }

    /** Colonnes de la base -> valeur affichee dans le champ de l'ecran : tous les numeros separes par « ; ». */
    public static String affiche(String principal, String autres) {
        return String.join(";", numeros(principal, autres));
    }
}
