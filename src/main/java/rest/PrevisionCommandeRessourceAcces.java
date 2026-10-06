package rest;

/** Verrou partage entre le calcul a la demande et celui de la nuit (un seul calcul a la fois). */
public final class PrevisionCommandeRessourceAcces {

    private PrevisionCommandeRessourceAcces() {
    }

    public static boolean prendre() {
        return PrevisionCommandeRessource.EN_COURS.compareAndSet(false, true);
    }

    public static void rendre() {
        PrevisionCommandeRessource.EN_COURS.set(false);
    }
}
