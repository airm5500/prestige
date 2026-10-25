package rest.service.impl.whatsapp;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import util.Constant;

class DiscussionReglesTest {

    @Test
    void texteNettoyeEtBorne() {
        assertEquals("Bonjour\nmerci", DiscussionRegles.nettoyer("  Bonjour\r\nmerci\u0007 "));
        assertEquals("", DiscussionRegles.nettoyer(null));
        assertEquals(Constant.WHATSAPP_DISCUSSION_TEXTE_MAX, DiscussionRegles.nettoyer("x".repeat(5000)).length());
    }

    @Test
    void extraitSurUneLigne() {
        assertEquals("Bonjour merci", DiscussionRegles.extrait("Bonjour\n  merci"));
        String e = DiscussionRegles.extrait("a".repeat(300));
        assertEquals(Constant.WHATSAPP_DISCUSSION_EXTRAIT, e.length());
        assertTrue(e.endsWith("…"));
    }

    @Test
    void typeEtRefus() {
        assertEquals("IMAGE", DiscussionRegles.type("image"));
        assertEquals("TEXTE", DiscussionRegles.type("inconnu"));
        assertNotNull(DiscussionRegles.refusReponse("  ", false));
        assertNull(DiscussionRegles.refusReponse("  ", true));
        assertNull(DiscussionRegles.refusReponse("Bonjour", false));
        assertNotNull(DiscussionRegles.refusReponse("x".repeat(5000), false));
    }
}
