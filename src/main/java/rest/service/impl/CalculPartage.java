package rest.service.impl;

import java.util.function.LongSupplier;
import java.util.function.Supplier;

/**
 * Un calcul couteux demande presque en meme temps par deux routes (lenteurs d'appaul, 12/11 : les ruptures du tableau
 * de bord, calculees par les tuiles ET par les alertes, jusqu'a 2,4 s chacune). Le second appel reprend le resultat du
 * premier s'il a moins de {@code dureeMs} et porte sur la meme cle, ou l'attend s'il est en cours. Une seule valeur est
 * gardee : une autre cle remplace la precedente.
 */
public final class CalculPartage<T> {

    private final long dureeMs;
    private final LongSupplier horloge;
    private String cle;
    private long instant;
    private T valeur;

    public CalculPartage(long dureeMs) {
        this(dureeMs, System::currentTimeMillis);
    }

    CalculPartage(long dureeMs, LongSupplier horloge) {
        this.dureeMs = dureeMs;
        this.horloge = horloge;
    }

    /** Le resultat partage pour cette cle, calcule par {@code calcul} s'il est absent ou trop ancien. */
    public synchronized T obtenir(String cleDemandee, Supplier<T> calcul) {
        long maintenant = horloge.getAsLong();
        if (valeur != null && cleDemandee.equals(cle) && maintenant - instant < dureeMs && maintenant >= instant) {
            return valeur;
        }
        T v = calcul.get();
        cle = cleDemandee;
        instant = horloge.getAsLong();
        valeur = v;
        return v;
    }
}
