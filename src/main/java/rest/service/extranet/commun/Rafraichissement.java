package rest.service.extranet.commun;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * Regle du rafraichissement automatique des listes (demande du 08/11) : une liste reglee a un delai est relue quand sa
 * derniere lecture complete date de plus que ce delai (ou n'existe pas). Apres un essai (reussi ou non), pas de nouvel
 * essai avant {@link #ATTENTE_APRES_ESSAI_MAX} minutes (ou le delai s'il est plus court) : sans Internet, l'extranet
 * n'est pas sollicite toutes les dix minutes, et le cache reste celui de la derniere lecture complete.
 */
public final class Rafraichissement {

    /** Delais proposes, en minutes (0 : jamais). */
    public static final List<Integer> DELAIS = Collections
            .unmodifiableList(Arrays.asList(0, 30, 60, 120, 240, 480, 720, 1440));
    public static final int ATTENTE_APRES_ESSAI_MAX = 30;

    private Rafraichissement() {
    }

    public static boolean delaiValide(int minutes) {
        return DELAIS.contains(minutes);
    }

    /**
     * Prochaine lecture due, ou null si la liste n'est pas reglee (delai 0).
     *
     * @param derniereComplete
     *            debut de la derniere lecture complete (null : jamais)
     * @param dernierEssai
     *            debut du dernier essai, quel que soit son resultat (null : jamais)
     */
    public static LocalDateTime prochaine(int delaiMinutes, LocalDateTime derniereComplete,
            LocalDateTime dernierEssai) {
        if (delaiMinutes <= 0) {
            return null;
        }
        LocalDateTime due = derniereComplete == null ? LocalDateTime.MIN : derniereComplete.plusMinutes(delaiMinutes);
        if (dernierEssai != null) {
            LocalDateTime apresEssai = dernierEssai.plusMinutes(Math.min(delaiMinutes, ATTENTE_APRES_ESSAI_MAX));
            if (apresEssai.isAfter(due)) {
                due = apresEssai;
            }
        }
        return due;
    }

    public static boolean echue(int delaiMinutes, LocalDateTime derniereComplete, LocalDateTime dernierEssai,
            LocalDateTime maintenant) {
        LocalDateTime p = prochaine(delaiMinutes, derniereComplete, dernierEssai);
        return p != null && !p.isAfter(maintenant);
    }
}
