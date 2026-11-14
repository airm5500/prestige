package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Random;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import rest.service.dto.SupportEventDTO;

/**
 * Rapport d'exploitation du 13/11, point 7 : 6 evenements constates sur les caisses affichaient au serveur « Fichier de
 * detail introuvable sur le disque » ; seul un extrait de 4 000 caracteres etait garde en base.
 * <p>
 * Test de COHERENCE sur 1 000 evenements tires au hasard (graine fixe) : detail de 1 caractere a 300 000, accents,
 * emojis (paires de substitution), retours chariot, utilisateur absent ou present. Regles : le detail garde en base est
 * EXACTEMENT le contenu du fichier quand il tient en 64 Ko ; sinon il en est le debut, suivi de la mention de
 * troncature, sans jamais couper un caractere en deux, et tient dans la colonne ; il est toujours reconnu comme detail
 * complet (et l'ancien extrait de 4 000 caracteres ne l'est pas).
 * </p>
 */
class SupportDetailEnBaseCoherenceTest {

    private static final String[] MORCEAUX = { "at rest.CaisseRessource.ticket(CaisseRessource.java:120)\n", "é à ç ô ",
            "😀", "\r\n", "Communications link failure ", "x" };

    private static String texte(Random r, int longueur) {
        StringBuilder sb = new StringBuilder();
        while (sb.length() < longueur) {
            sb.append(MORCEAUX[r.nextInt(MORCEAUX.length)]);
        }
        return sb.toString();
    }

    @Test
    @DisplayName("1 000 evenements : detail en base = fichier (ou son debut, tronque proprement a 64 Ko)")
    void milleEvenements() {
        Random r = new Random(20261113L);
        int tronques = 0;
        for (int i = 0; i < 1000; i++) {
            SupportEventDTO dto = new SupportEventDTO();
            dto.setType(r.nextBoolean() ? "JS" : "JAVA");
            dto.setModule(r.nextBoolean() ? "FRONTEND" : "BLOCAGE");
            dto.setMessageCourt("Erreur " + i);
            dto.setUrlOuEcran("POST /prestige/api/v1/x/" + i);
            int taille = r.nextInt(4) == 0 ? 60_000 + r.nextInt(240_000) : 1 + r.nextInt(20_000);
            dto.setStack(texte(r, taille));
            String utilisateur = r.nextInt(3) == 0 ? null : "CAISSE (c" + i + ") [IP 192.168.1." + r.nextInt(255) + "]";

            String fichier = SupportEventServiceImpl.contenuDetail(dto, utilisateur,
                    LocalDateTime.of(2026, 11, 13, 18, 37));
            String enBase = SupportEventServiceImpl.detailEnBase(fichier);
            String quoi = "evenement " + i + " (" + fichier.length() + " car.)";

            assertTrue(fichier.startsWith("Date : 13/11/2026") || fichier.startsWith("Date : "), quoi);
            assertTrue(fichier.endsWith(dto.getStack()), quoi + " : le detail technique est en entier dans le fichier");
            assertTrue(SupportEventServiceImpl.detailComplet(enBase), quoi);
            assertTrue(enBase.length() <= SupportEventServiceImpl.DETAIL_MAX, quoi + " : taille " + enBase.length());
            assertTrue(enBase.getBytes(StandardCharsets.UTF_8).length < 16_000_000, quoi + " : colonne MEDIUMTEXT");
            if (fichier.length() <= SupportEventServiceImpl.DETAIL_MAX) {
                assertEquals(fichier, enBase, quoi + " : detail en base different du fichier");
            } else {
                tronques++;
                assertTrue(enBase.endsWith(SupportEventServiceImpl.DETAIL_TRONQUE), quoi);
                String debut = enBase.substring(0, enBase.length() - SupportEventServiceImpl.DETAIL_TRONQUE.length());
                assertTrue(fichier.startsWith(debut), quoi + " : le debut garde n'est pas celui du fichier");
                assertTrue(debut.length() >= SupportEventServiceImpl.DETAIL_MAX
                        - SupportEventServiceImpl.DETAIL_TRONQUE.length() - 1, quoi);
                assertFalse(Character.isHighSurrogate(debut.charAt(debut.length() - 1)),
                        quoi + " : caractere coupe en deux");
            }
        }
        assertTrue(tronques > 100, "trop peu de details longs tires : " + tronques);
    }

    @Test
    @DisplayName("L'ancien extrait de 4 000 caracteres n'est pas pris pour le detail complet")
    void ancienExtrait() {
        assertFalse(SupportEventServiceImpl.detailComplet("java.lang.NullPointerException\n\tat x.y(z.java:1)"));
        assertFalse(SupportEventServiceImpl.detailComplet(null));
        assertEquals(null, SupportEventServiceImpl.detailEnBase(null));
    }
}
