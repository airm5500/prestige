package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

/**
 * Retour du 25/11, point 5 : tickets de vente comptant et a credit (assurance, carnet), le montant total de la vente
 * est imprime en face, a droite, du nombre de lignes et d'articles. Precise le meme jour (photo du ticket) : en gras,
 * apres « TOTAL : » (« 3 lignes · 5 articles ...... TOTAL : 12 500 F CFA ») ; le ticket combine porte deja « Total des
 * deux ventes », qui n'est pas rappele sur sa ligne de recapitulatif.
 *
 * Coherence, sur des milliers de tickets tires avec une graine fixe (1 a 12 lignes, quantites de 1 a 9 dont une
 * annulation negative de temps en temps, prix dont zero, papier 80 et 58 mm, comptant, assurance, carnet) : - le
 * recapitulatif est une paire : a gauche « n lignes · m articles » (inchange), a droite le total de la vente ; - total
 * imprime = somme des montants des lignes = total de la vente ; unite « F CFA » en 80 mm, « F » en 58 mm ; - sans total
 * connu, le recapitulatif reste le texte seul d'avant ; - recapitulatif desactive dans le modele : rien.
 */
class RecapTotalTicketTest {

    private static final ModeleTicket[] VENTES = { ModeleTicket.VENTE, ModeleTicket.VENTE_ASSURANCE,
            ModeleTicket.VENTE_CARNET };

    private static ConversionTicket.Source source(ModeleTicket t, int mm, List<ConversionTicket.Article> l,
            String total) {
        ConversionTicket.Source s = new ConversionTicket.Source();
        s.ticket = t;
        s.papierMm = mm;
        s.nomOfficine = "PHARMACIE TEST";
        s.titre = "Ticket N° 0127";
        s.articles = l;
        s.datas = total == null ? Collections.emptyList() : Collections.singletonList(" ; ; ; ;" + total);
        return s;
    }

    private static TicketDocument.Element recap(TicketDocument d) {
        TicketDocument.Bloc b = d.existant(TicketDocument.RECAP);
        assertNotNull(b, "bloc du recapitulatif absent");
        assertEquals(1, b.elements.size(), "une seule ligne de recapitulatif");
        return b.elements.get(0);
    }

    @Test
    void totalEnFaceDuNombreDeLignesSurDesMilliersDeTickets() {
        Random r = new Random(20261125L);
        for (int i = 0; i < 6_000; i++) {
            ModeleTicket t = VENTES[r.nextInt(VENTES.length)];
            int mm = r.nextBoolean() ? 80 : 58;
            int n = 1 + r.nextInt(12);
            List<ConversionTicket.Article> l = new ArrayList<>();
            int somme = 0;
            for (int k = 0; k < n; k++) {
                int q = (r.nextInt(10) == 0 ? -1 : 1) * (1 + r.nextInt(9));
                int pu = r.nextInt(8) == 0 ? 0 : 50 + r.nextInt(40_000);
                l.add(new ConversionTicket.Article("PRODUIT " + k, q, pu, q * pu, ""));
                somme += q * pu;
            }
            if (somme < 0) {
                continue; // une vente n'est jamais negative : le cas n'existe pas
            }
            TicketDocument d = ConversionTicket.convertir(source(t, mm, l, String.valueOf(somme)),
                    new ReglagesTicket(t));
            TicketDocument.Element e = recap(d);
            String cas = t + " " + mm + " mm, " + n + " lignes, total " + somme;
            assertEquals(TicketDocument.Genre.PAIRE, e.genre, cas);
            assertEquals(ConversionTicket.recapitulatif(l), e.a, cas);
            assertTrue(
                    e.b.startsWith(TicketDocument.GRAS_DEBUT + "TOTAL : ")
                            && e.b.endsWith(String.valueOf(TicketDocument.GRAS_FIN)),
                    cas + " : en gras, apres TOTAL : " + e);
            String b = sansGras(e.b);
            assertEquals(String.valueOf(somme), b.replaceAll("\\D", ""), cas + " : " + b);
            assertTrue(b.endsWith(mm <= 58 ? " F" : " F CFA"), cas + " : " + b);
        }
    }

    @Test
    void sansTotalConnuLeTexteSeulCommeAvant() {
        List<ConversionTicket.Article> l = new ArrayList<>();
        l.add(new ConversionTicket.Article("A", 2, 1000, 2000, ""));
        l.add(new ConversionTicket.Article("B", 1, 500, 500, ""));
        TicketDocument.Element e = recap(ConversionTicket.convertir(source(ModeleTicket.VENTE, 80, l, null),
                new ReglagesTicket(ModeleTicket.VENTE)));
        assertEquals(TicketDocument.Genre.TEXTE, e.genre);
        assertEquals("2 lignes · 3 articles", e.a);
    }

    @Test
    void totalAZero() {
        List<ConversionTicket.Article> l = new ArrayList<>();
        l.add(new ConversionTicket.Article("GRATUIT", 1, 0, 0, ""));
        TicketDocument.Element e = recap(ConversionTicket.convertir(source(ModeleTicket.VENTE, 80, l, "0"),
                new ReglagesTicket(ModeleTicket.VENTE)));
        assertEquals(TicketDocument.Genre.PAIRE, e.genre);
        assertEquals(TicketDocument.gras("TOTAL : 0 F CFA"), e.b);
    }

    @Test
    void exemplesDesModelesComptantEtCredit() {
        for (ModeleTicket t : new ModeleTicket[] { ModeleTicket.VENTE, ModeleTicket.VENTE_ASSURANCE,
                ModeleTicket.VENTE_CARNET }) {
            for (int mm : new int[] { 80, 58 }) {
                TicketDocument.Element e = recap(
                        ConversionTicket.convertir(ExemplesTicket.exemple(t, mm), new ReglagesTicket(t)));
                assertEquals(TicketDocument.Genre.PAIRE, e.genre, t + " " + mm);
                assertTrue(e.a.matches("\\d+ lignes? · \\d+ articles?"), t + " " + mm + " : " + e.a);
                assertTrue(sansGras(e.b).matches("TOTAL : [\\d  ]+ F( CFA)?"), t + " " + mm + " : " + e.b);
                assertEquals(TicketDocument.gras(sansGras(e.b)), e.b, t + " " + mm + " : tout le total en gras");
            }
        }
    }

    /**
     * Photo du ticket du 25/11 : le combine porte deja « Total des deux ventes » ; son recapitulatif reste le texte
     * seul.
     */
    @Test
    void ticketCombineSansTotalRappele() {
        for (int mm : new int[] { 80, 58 }) {
            TicketDocument d = ConversionTicket.convertir(ExemplesTicket.exemple(ModeleTicket.VENTE_MIXTE, mm),
                    new ReglagesTicket(ModeleTicket.VENTE_MIXTE));
            TicketDocument.Element e = recap(d);
            assertEquals(TicketDocument.Genre.TEXTE, e.genre, mm + " : " + e);
            assertTrue(e.a.matches("\\d+ lignes? · \\d+ articles?"), mm + " : " + e.a);
            String tout = d.blocsNonVides().stream().flatMap(b -> b.elements.stream()).map(Object::toString)
                    .collect(Collectors.joining("\n"));
            assertTrue(tout.contains("Total des deux ventes"), tout);
            assertFalse(tout.contains("TOTAL :"), tout);
        }
    }

    private static String sansGras(String t) {
        return t.replace(String.valueOf(TicketDocument.GRAS_DEBUT), "").replace(String.valueOf(TicketDocument.GRAS_FIN),
                "");
    }
}
