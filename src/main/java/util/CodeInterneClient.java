package util;

import java.security.SecureRandom;
import java.util.Random;
import java.util.function.Predicate;

/**
 * Code interne d'un nouveau client : six chiffres, jamais déjà porté par un autre client.
 * <p>
 * L'ancien code était tiré de l'heure (minute, seconde, millième, coupé à six caractères) : peu de valeurs possibles,
 * et sur une base de plusieurs dizaines de milliers de clients il retombait souvent sur un code existant ; la création
 * était alors refusée (« Le code interne existe déjà »). Ici le code est tiré au hasard entre 100000 et 999999 et
 * redemandé tant qu'il est pris.
 */
public final class CodeInterneClient {

    public static final int MINIMUM = 100000;
    public static final int MAXIMUM = 999999;
    /** Avec 30 000 codes pris sur 900 000, la chance d'en enchaîner 200 pris est nulle en pratique. */
    static final int ESSAIS = 200;

    private static final Random ALEA = new SecureRandom();

    private CodeInterneClient() {
    }

    /**
     * Un code libre.
     *
     * @param existe
     *            dit si un code est déjà porté par un client
     *
     * @throws IllegalStateException
     *             si aucun code libre n'est trouvé après {@value #ESSAIS} essais
     */
    public static String libre(Predicate<String> existe) {
        return libre(existe, ALEA);
    }

    static String libre(Predicate<String> existe, Random alea) {
        for (int i = 0; i < ESSAIS; i++) {
            String code = String.valueOf(MINIMUM + alea.nextInt(MAXIMUM - MINIMUM + 1));
            if (!existe.test(code)) {
                return code;
            }
        }
        throw new IllegalStateException("Aucun code interne libre trouvé.");
    }
}
