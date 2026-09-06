package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Point 15 : nom donne a la copie d'un modele de message.
 *
 * <p>
 * Le libelle est unique en base et borne a 80 caracteres. La regle est donc verifiee ici sans base : on rejoue la
 * recherche d'un rang libre sur un ensemble de libelles deja pris, exactement comme le service le fait avec sa requete
 * de comptage.
 * </p>
 */
class LibelleCopieModeleTest {

    private static final int LIBELLE_MAX = ModeleMessageServiceImpl.LIBELLE_MAX;

    /** Meme regle que {@code ModeleMessageServiceImpl.libelleDeCopieLibre}, avec un annuaire en memoire. */
    private static String copie(String source, Set<String> pris) {
        String base = source == null ? "" : source.trim();
        for (int rang = 1; rang <= 100; rang++) {
            String suffixe = rang == 1 ? " (Copie)" : " (Copie " + rang + ")";
            String candidat = base.length() + suffixe.length() > LIBELLE_MAX
                    ? base.substring(0, LIBELLE_MAX - suffixe.length()).trim() + suffixe : base + suffixe;
            if (!pris.contains(candidat.toUpperCase(Locale.ROOT))) {
                return candidat;
            }
        }
        return base + " (Copie ?)";
    }

    private static Set<String> annuaire(String... libelles) {
        Set<String> pris = new HashSet<>();
        for (String l : libelles) {
            pris.add(l.toUpperCase(Locale.ROOT));
        }
        return pris;
    }

    @Test
    @DisplayName("La premiere copie porte le suffixe « (Copie) »")
    void premiereCopie() {
        assertEquals("Rappel ordonnance (Copie)", copie("Rappel ordonnance", annuaire("Rappel ordonnance")));
    }

    @Test
    @DisplayName("La copie d'une copie prend le rang suivant, jamais le meme nom")
    void copieDeCopie() {
        Set<String> pris = annuaire("Rappel ordonnance", "Rappel ordonnance (Copie)");
        assertEquals("Rappel ordonnance (Copie 2)", copie("Rappel ordonnance", pris));
        pris.add("RAPPEL ORDONNANCE (COPIE 2)");
        assertEquals("Rappel ordonnance (Copie 3)", copie("Rappel ordonnance", pris));
    }

    @Test
    @DisplayName("Le rang libre est trouve meme si les rangs intermediaires ont ete supprimes")
    void rangLibreIntermediaire() {
        Set<String> pris = annuaire("Promo", "Promo (Copie)", "Promo (Copie 3)");
        assertEquals("Promo (Copie 2)", copie("Promo", pris));
    }

    @Test
    @DisplayName("Un libelle deja a la longueur maximale est raccourci pour laisser la place au suffixe")
    void libelleTropLong() {
        StringBuilder tresLong = new StringBuilder();
        while (tresLong.length() < LIBELLE_MAX) {
            tresLong.append('A');
        }
        String resultat = copie(tresLong.toString(), annuaire());
        assertTrue(resultat.length() <= LIBELLE_MAX,
                "le libelle de la copie depasse " + LIBELLE_MAX + " caracteres : " + resultat.length());
        assertTrue(resultat.endsWith(" (Copie)"), resultat);
    }

    @Test
    @DisplayName("La comparaison ignore la casse : « (COPIE) » deja pris fait passer au rang suivant")
    void comparaisonInsensibleALaCasse() {
        assertEquals("Promo (Copie 2)", copie("Promo", annuaire("PROMO (COPIE)")));
    }
}
