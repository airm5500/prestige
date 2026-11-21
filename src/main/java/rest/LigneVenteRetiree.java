package rest;

import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.Set;

/**
 * Journal d'appaul du 21/11 (N1) : une quantite tapee dans la grille de vente part a la validation de la cellule, au
 * moment ou la caissiere clique sur « Supprimer le produit » de la meme ligne. Le retrait est valide le premier ; la
 * modification, qui avait deja lu la ligne, echoue a l'enregistrement (« Row was updated or deleted by another
 * transaction ») et l'ecran recevait une erreur 500.
 *
 * Cette classe reconnait ce conflit dans la chaine des causes, pour repondre le refus deja prevu quand la ligne
 * n'existe plus (« Ce produit n'est plus dans la vente »). Toute autre erreur est relancee telle quelle.
 */
final class LigneVenteRetiree {

    static final String MESSAGE = "Ce produit n'est plus dans la vente : actualisez l'écran avant de continuer.";

    /**
     * Noms simples des exceptions d'Hibernate et de JPA levees quand la ligne a disparu entre la lecture et l'ecriture.
     */
    private static final Set<String> CONFLITS = Set.of("StaleStateException", "StaleObjectStateException",
            "OptimisticLockException");

    private static final int PROFONDEUR_MAX = 30;

    private LigneVenteRetiree() {
    }

    static boolean estConflit(Throwable erreur) {
        Set<Throwable> vues = Collections.newSetFromMap(new IdentityHashMap<>());
        return chercher(erreur, vues, 0);
    }

    private static boolean chercher(Throwable t, Set<Throwable> vues, int profondeur) {
        if (t == null || profondeur > PROFONDEUR_MAX || !vues.add(t)) {
            return false;
        }
        for (Class<?> c = t.getClass(); c != null && c != Object.class; c = c.getSuperclass()) {
            if (CONFLITS.contains(c.getSimpleName())) {
                return true;
            }
        }
        for (Throwable s : t.getSuppressed()) {
            if (chercher(s, vues, profondeur + 1)) {
                return true;
            }
        }
        return chercher(t.getCause(), vues, profondeur + 1);
    }
}
