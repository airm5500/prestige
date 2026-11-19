package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import javax.print.PrintService;
import org.junit.jupiter.api.Test;
import rest.service.ticket.ChoixImprimanteCoherenceTest;

/**
 * CAISSE11 (16/11) : 23 tickets en echec, « Imprimante inconnue », dont 20 reimpressions rendues en erreur 500 (« Une
 * erreur interne est survenue »). Le service des tickets prend l'imprimante declaree quand le serveur n'a pas
 * d'imprimante par defaut, et dit clairement pourquoi un ticket ne sort pas.
 */
class ImprimanteServeurTicketTest {

    /** Le service des tickets, avec un poste simule : imprimante par defaut, imprimantes installees et declarees. */
    static final class Poste extends GenerateTicketServiceImpl {
        PrintService parDefaut;
        PrintService[] installees = new PrintService[0];
        List<String> declarees = Collections.emptyList();
        final AtomicInteger lecturesDeclarees = new AtomicInteger();

        @Override
        protected PrintService imprimanteParDefaut() {
            return parDefaut;
        }

        @Override
        protected PrintService[] imprimantesInstallees() {
            return installees;
        }

        @Override
        protected List<String> imprimantesDeclarees() {
            lecturesDeclarees.incrementAndGet();
            return declarees;
        }
    }

    @Test
    void serveurEnServiceWindowsImprimeSurLImprimanteDeclaree() {
        Poste p = new Poste();
        PrintService tm = ChoixImprimanteCoherenceTest.service("TM-T20II");
        p.installees = new PrintService[] { ChoixImprimanteCoherenceTest.service("Microsoft Print to PDF"), tm };
        p.declarees = Arrays.asList("TM-T20II");
        assertSame(tm, p.findPrintService());
    }

    @Test
    void imprimanteParDefautInchangeeEtSansLectureDeLaBase() {
        Poste p = new Poste();
        PrintService star = ChoixImprimanteCoherenceTest.service("Star TSP100");
        p.parDefaut = star;
        p.installees = new PrintService[] { star, ChoixImprimanteCoherenceTest.service("TM-T20II") };
        p.declarees = Arrays.asList("TM-T20II");
        assertSame(star, p.findPrintService(), "serveur lancé à la main : comme avant");
        assertEquals(0, p.lecturesDeclarees.get(), "aucune requête de plus quand l'imprimante par défaut existe");
    }

    @Test
    void aucuneImprimanteTrouvee() {
        Poste p = new Poste();
        p.installees = new PrintService[] { ChoixImprimanteCoherenceTest.service("Microsoft Print to PDF") };
        p.declarees = Arrays.asList("TM-T20II");
        assertNull(p.findPrintService());
    }

    @Test
    void messageDeLEcran() {
        IllegalStateException inconnue = new IllegalStateException("Imprimante inconnue");
        assertTrue(GenerateTicketServiceImpl.printServiceInconnu(inconnue));
        assertEquals(GenerateTicketServiceImpl.MSG_SANS_IMPRIMANTE,
                GenerateTicketServiceImpl.messageEchecImpression(inconnue));
        assertTrue(GenerateTicketServiceImpl.MSG_SANS_IMPRIMANTE.contains("aucune imprimante")
                && GenerateTicketServiceImpl.MSG_SANS_IMPRIMANTE.contains("La vente est enregistrée"));
        /* toute autre erreur garde le message d'avant */
        for (Exception e : Arrays.asList(new IllegalStateException("autre"),
                new RuntimeException("Imprimante inconnue"), new java.awt.print.PrinterException("papier"),
                new NullPointerException())) {
            assertFalse(GenerateTicketServiceImpl.printServiceInconnu(e), String.valueOf(e));
            assertEquals("Impression n'a pas aboutie", GenerateTicketServiceImpl.messageEchecImpression(e));
        }
    }
}
