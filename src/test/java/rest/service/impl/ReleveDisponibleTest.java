package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.Test;

/**
 * Distinction entre une journee sans releve et une officine sans stock.
 *
 * <p>
 * Les deux rendent les memes zeros. Sans ce drapeau, une valorisation demandee sur une date ou le traitement de nuit
 * n'a pas tourne — poste eteint, traitement desactive — s'affiche comme un stock nul, ce qui est faux et se remarque
 * rarement.
 * </p>
 */
public class ReleveDisponibleTest {

    /** La date du jour est calculee en direct sur le stock courant : la mesure existe toujours. */
    @Test
    public void laDateDuJourEstToujoursDisponible() {
        assertTrue(ProduitServiceImpl.releveDisponible(true, false, () -> 0L));
        assertTrue(ProduitServiceImpl.releveDisponible(true, true, () -> 0L));
    }

    /** Journee relevee : des lignes existent, l'etat affiche est une vraie mesure. */
    @Test
    public void journeeReleveeEstDisponible() {
        assertTrue(ProduitServiceImpl.releveDisponible(false, true, () -> 6637L));
    }

    /** Journee jamais relevee : aucune ligne, l'ecran doit pouvoir le dire au lieu d'afficher un total. */
    @Test
    public void journeeSansReleveEstSignalee() {
        assertFalse(ProduitServiceImpl.releveDisponible(false, true, () -> 0L));
    }

    /**
     * Lecture dans l'archive JSON : mode de retour arriere temporaire, non verifiable a cout raisonnable. Il conserve
     * son comportement d'origine et ne signale rien, plutot que d'annoncer une absence dont il n'a pas la preuve.
     */
    @Test
    public void laLectureJsonNeSignaleRien() {
        assertTrue(ProduitServiceImpl.releveDisponible(false, false, () -> 0L));
    }

    /** Le comptage ne doit etre interroge que lorsqu'il sert : c'est une requete, pas une valeur deja connue. */
    @Test
    public void leComptageNestPasEvalueInutilement() {
        AtomicInteger appels = new AtomicInteger();
        ProduitServiceImpl.releveDisponible(true, true, () -> {
            appels.incrementAndGet();
            return 0L;
        });
        ProduitServiceImpl.releveDisponible(false, false, () -> {
            appels.incrementAndGet();
            return 0L;
        });
        org.junit.jupiter.api.Assertions.assertEquals(0, appels.get());
    }
}
