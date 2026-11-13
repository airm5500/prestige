package rest.service.impl;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.function.Function;

/**
 * Plan du 12/11 (mouvement de caisse) : le mode et le type de reglement d'un mouvement sont retrouves EXACTEMENT.
 * Avant, « LIKE '1%' » limite a une ligne : « 1 » (especes) pouvait donner le mode 11 (WAVE) ou 19 (DJAMO), « 2 »
 * (cheques) le type 20 (points de fidelite). Le type de la transaction de caisse est toujours celui du mode.
 */
public final class ModesMvtCaisse {

    private ModesMvtCaisse() {
    }

    /**
     * L'element dont l'identifiant est exactement la saisie ; a defaut, l'unique element dont un des libelles est la
     * saisie (casse et espaces ignores) ; sinon null (saisie vide, inconnue ou ambigue).
     */
    @SafeVarargs
    public static <T> T retrouver(String saisie, Collection<T> tous, Function<T, String> id,
            Function<T, String>... libelles) {
        if (saisie == null || saisie.trim().isEmpty() || tous == null) {
            return null;
        }
        for (T t : tous) {
            if (saisie.equals(id.apply(t))) {
                return t;
            }
        }
        String cle = saisie.trim().toLowerCase(Locale.ROOT);
        List<T> trouves = new ArrayList<>();
        for (T t : tous) {
            for (Function<T, String> l : libelles) {
                String v = l.apply(t);
                if (v != null && v.trim().toLowerCase(Locale.ROOT).equals(cle)) {
                    trouves.add(t);
                    break;
                }
            }
        }
        return trouves.size() == 1 ? trouves.get(0) : null;
    }

    /**
     * Message de refus quand le type choisi n'est pas celui du mode (null si tout va bien). Un type non donne prend
     * celui du mode ; un type donne mais inconnu est refuse.
     */
    public static String incoherence(String typeSaisi, String typeRetrouve, String typeDuMode) {
        if (typeSaisi == null || typeSaisi.trim().isEmpty()) {
            return null;
        }
        if (typeRetrouve == null) {
            return "Type de règlement inexistant.";
        }
        if (!typeRetrouve.equals(typeDuMode)) {
            return "Le mode de règlement ne correspond pas au type de règlement choisi.";
        }
        return null;
    }

    /** Ordre d'affichage des types : especes d'abord, puis par identifiant numerique, puis alphabetique. */
    public static int comparerIdentifiants(String a, String b) {
        Long na = nombre(a);
        Long nb = nombre(b);
        if (na != null && nb != null) {
            return Long.compare(na, nb);
        }
        if (na != null) {
            return -1;
        }
        if (nb != null) {
            return 1;
        }
        return String.valueOf(a).compareTo(String.valueOf(b));
    }

    private static Long nombre(String s) {
        try {
            return s == null ? null : Long.valueOf(s.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
