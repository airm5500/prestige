package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Plan du 09/11, point 13 : trace de l'envoi du ticket Z au pharmacien dans le journal des evenements, par SMS et par
 * WhatsApp. Elle dit le canal et l'etat, jamais le texte du ticket, et tient dans la colonne (255).
 */
class TicketZTraceTest {

    @Test
    void casDeBase() {
        assertEquals("Ticket Z envoyé au pharmacien (WhatsApp) : Simulé (mode test)",
                GenerateTicketServiceImpl.traceTicketZ("WhatsApp", "Simulé (mode test)"));
        assertEquals("Ticket Z envoyé au pharmacien (SMS) : Envoyé",
                GenerateTicketServiceImpl.traceTicketZ("SMS", "Envoyé"));
        /* etat absent : echec, jamais une trace vide */
        assertEquals("Ticket Z envoyé au pharmacien (SMS) : Échec",
                GenerateTicketServiceImpl.traceTicketZ("SMS", null));
    }

    @Test
    void reglesSurDesMilliersDEtats() {
        Random r = new Random(20261113L);
        String[] etats = { "Envoyé", "Échec", "Simulé (mode test)", "Non envoyé : aucun numéro d'administration",
                "Non envoyé : envois suspendus", "Non envoyé : aucun fournisseur SMS", "", null };
        for (int i = 0; i < 3000; i++) {
            String canal = r.nextBoolean() ? "SMS" : "WhatsApp";
            String etat = etats[r.nextInt(etats.length)];
            if (r.nextInt(20) == 0) {
                etat = "Non envoyé : " + "x".repeat(r.nextInt(400));
            }
            String t = GenerateTicketServiceImpl.traceTicketZ(canal, etat);
            assertTrue(t.length() <= 255, t);
            assertTrue(t.startsWith("Ticket Z envoyé au pharmacien (" + canal + ") : "), t);
            assertFalse(t.endsWith(": "), "etat toujours present : " + t);
            /* jamais de montant ni de ligne de ticket : une seule ligne, sans chiffre de recette */
            assertFalse(t.contains("\n"), t);
        }
    }
}
