package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

/**
 * Cas 1 du 03/11/2026 : credit par ligne sur le ticket assurance (Q1.9) et ticket client combine (VENTE_MIXTE), rendu
 * texte compare a la maquette validee (cas1-tickets.html).
 */
class TicketLigneComptantTest {

    private static String texte(TicketDocument d) {
        return d.blocsNonVides().stream().flatMap(b -> b.elements.stream()).map(Object::toString)
                .collect(Collectors.joining("\n"));
    }

    @Test
    void partsParLigneRameneesAuTotalDeLOrganisme() {
        // maquette : 6 725 et 3 145 a 70 % -> 4 708 et 2 201, somme 6 909 (la part enregistree)
        List<Integer> parts = CreditLigne.parts(Arrays.asList(6725, 3145), 70, 6909);
        assertEquals(Arrays.asList(4708, 2201), parts);
        // sans ecart : arrondi simple
        assertEquals(Arrays.asList(700, 350), CreditLigne.parts(Arrays.asList(1000, 500), 70, 1050));
        // organisme plafonne a 600 : prorata, la somme vaut le plafond
        List<Integer> plafonne = CreditLigne.parts(Arrays.asList(1000, 500), 70, 600);
        assertEquals(600, plafonne.get(0) + plafonne.get(1));
        assertEquals(Arrays.asList(400, 200), plafonne);
        assertTrue(CreditLigne.parts(Collections.emptyList(), 70, 100).isEmpty());
        assertEquals("Crédit : T[70 %] — Mont. : 4 708", CreditLigne.libelle(null, 70, 4708));
        assertEquals("Crédit MUGEF-CI : T[80 %] — Mont. : 1 200", CreditLigne.libelle("MUGEF-CI", 80, 1200));
    }

    @Test
    void ticketAssuranceAvecCreditParLigne() {
        ConversionTicket.Source s = ExemplesTicket.exemple(ModeleTicket.VENTE_ASSURANCE, 80);
        s.articles = Arrays.asList(
                new ConversionTicket.Article("RAPICLAV 1G CPR B/14", 1, 6725, 6725, "",
                        Collections.singletonList(CreditLigne.libelle(null, 70, 4708))),
                new ConversionTicket.Article("ISOLONE 20MG CPR EFFV B/20", 1, 3145, 3145, "",
                        Collections.singletonList(CreditLigne.libelle(null, 70, 2201))));
        String t = texte(ConversionTicket.convertir(s, new ReglagesTicket(ModeleTicket.VENTE_ASSURANCE)));
        int rapiclav = t.indexOf("ARTICLE[RAPICLAV 1G CPR B/14");
        int credit1 = t.indexOf("TEXTE[Crédit : T[70 %] — Mont. : 4 708]");
        int isolone = t.indexOf("ARTICLE[ISOLONE 20MG CPR EFFV B/20");
        int credit2 = t.indexOf("TEXTE[Crédit : T[70 %] — Mont. : 2 201]");
        assertTrue(rapiclav >= 0 && credit1 > rapiclav && isolone > credit1 && credit2 > isolone, t);
        // sans credit : le ticket est celui d'aujourd'hui (aucune mention)
        String sans = texte(ConversionTicket.convertir(ExemplesTicket.exemple(ModeleTicket.VENTE_ASSURANCE, 80),
                new ReglagesTicket(ModeleTicket.VENTE_ASSURANCE)));
        assertFalse(sans.contains("Crédit"), sans);
        assertFalse(sans.contains("COMPTANT"), sans);
    }

    @Test
    void ticketClientCombineReprendLesDeuxVentes() {
        ConversionTicket.Source s = ExemplesTicket.exemple(ModeleTicket.VENTE_MIXTE, 80);
        TicketDocument d = ConversionTicket.convertir(s, new ReglagesTicket(ModeleTicket.VENTE_MIXTE));
        String t = texte(d);
        assertTrue(t.contains("TICKET N° VO-2026-01039 · VNO-2026-01040"), t);
        int assurance = t.indexOf("TEXTE[VENTE ASSURANCE — VO-2026-01039]");
        int rapiclav = t.indexOf("ARTICLE[RAPICLAV 1G CPR B/14 | 1 × 6 725 | 6 725]");
        int credit = t.indexOf("TEXTE[Crédit : T[70 %] — Mont. : 4 708]");
        int mci = t.indexOf("PAIRE[MCI-CARE 70 % | 6 909 F CFA]");
        int remiseVo = t.indexOf("PAIRE[(-) Remise | 148 F CFA]");
        int partClient = t.indexOf("PAIRE[Part du client | 2 810 F CFA]");
        int comptant = t.indexOf("TEXTE[VENTE AU COMPTANT — VNO-2026-01040]");
        int ketoderm = t.indexOf("ARTICLE[KETODERM 2% CREME T/15G | 1 × 4 135 | 4 135]");
        int ligneComptant = t.indexOf("TEXTE[LIGNE COMPTANT]");
        int remiseVno = t.indexOf("PAIRE[(-) Remise | 207 F CFA]");
        int netVno = t.indexOf("PAIRE[Comptant | 3 930 F CFA]");
        int ttc = t.indexOf("PAIRE[TTC des deux ventes | 14 005 F CFA]");
        int net = t.indexOf("ENCADRE[NET À PAYER | 6 740 F CFA]");
        int[] ordre = { assurance, rapiclav, credit, mci, remiseVo, partClient, comptant, ketoderm, ligneComptant,
                remiseVno, netVno, ttc, net };
        for (int i = 0; i < ordre.length; i++) {
            assertTrue(ordre[i] >= 0, i + " absent : " + t);
            if (i > 0) {
                assertTrue(ordre[i] > ordre[i - 1], i + " mal place : " + t);
            }
        }
        assertTrue(t.contains("PAIRE[Assuré / bénéficiaire | N. ESSAI]"), t);
        assertTrue(t.contains("PAIRE[Espèces versées | 6 740 F CFA]"), t);
        assertTrue(t.contains("PAIRE[Monnaie rendue | 0 F CFA]"), t);
        assertTrue(t.contains("TEXTE[3 articles · 3 boîtes]"), t);
        // un seul code-barres : celui de la vente assurance
        assertEquals(1, d.existant(TicketDocument.PIED).elements.stream()
                .filter(e -> e.genre == TicketDocument.Genre.PIED).count());
        // en 58 mm comme en 80 mm, rien ne deborde
        for (int mm : new int[] { 80, 58 }) {
            ReglagesTicket r = new ReglagesTicket(ModeleTicket.VENTE_MIXTE);
            RenduTicket.Resultat[] res = new RenduTicket.Resultat[1];
            RenduTicket.apercu(ConversionTicket.convertir(ExemplesTicket.exemple(ModeleTicket.VENTE_MIXTE, mm), r), r,
                    mm, 2, res);
            assertTrue(res[0].debordements.isEmpty(), mm + " : " + res[0].debordements);
        }
    }

    @Test
    void ancienTicketCombineGardeLesMemesInformations() {
        TicketCombine.Sortie s = TicketCombine.construire(entree());
        assertEquals("Ticket N° VO-2026-01039 | VNO-2026-01040", s.titre);
        assertEquals(6740, s.net);
        assertEquals(14005, s.ttc);
        String datas = String.join("\n", s.datas);
        assertTrue(datas.contains("VENTE ASSURANCE VO-2026-01039"), datas);
        assertTrue(datas.contains(" 1; *;RAPICLAV 1G CPR B/14;6 725;6 725"), datas);
        assertTrue(datas.contains(" ; ;Crédit : T[70 %] — Mont. : 4 708;;"), datas);
        assertTrue(datas.contains("VENTE AU COMPTANT VNO-2026-01040"), datas);
        assertTrue(datas.contains(" ; ;LIGNE COMPTANT;;"), datas);
        assertTrue(datas.endsWith(";;;;------\n;;;;14 005"), datas);
        assertEquals(Arrays.asList("Net à payer: ;     6 740; F CFA;1", "Règlement: ;     Espèces; ;0",
                "Montant Versé: ;     6 740; F CFA;0", "Monnaie: ;     0; F CFA;0"), s.subtotal);
        assertEquals(Collections.singletonList("Assuré / bénéficiaire:: N. ESSAI"), s.infoTiersPayants);
        // chaque ligne d'ancien ticket a ses cinq champs (le rendu Java2D les lit par position)
        for (String l : s.datas) {
            assertEquals(5, l.split(";", -1).length, l);
        }
    }

    private static TicketCombine.Entree entree() {
        TicketCombine.Entree e = new TicketCombine.Entree();
        e.refVo = "VO-2026-01039";
        e.refVno = "VNO-2026-01040";
        e.articlesVo = Arrays.asList(
                new ConversionTicket.Article("RAPICLAV 1G CPR B/14", 1, 6725, 6725, "",
                        Collections.singletonList(CreditLigne.libelle(null, 70, 4708))),
                new ConversionTicket.Article("ISOLONE 20MG CPR EFFV B/20", 1, 3145, 3145, "",
                        Collections.singletonList(CreditLigne.libelle(null, 70, 2201))));
        e.articlesVno = Collections
                .singletonList(new ConversionTicket.Article("KETODERM 2% CREME T/15G", 1, 4135, 4135, ""));
        e.tiersPayants = Collections.singletonList(new String[] { "MCI-CARE", "70", "6909" });
        e.totalVo = 9870;
        e.remiseVo = 148;
        e.partClientVo = 2810;
        e.totalVno = 4135;
        e.remiseVno = 207;
        e.netVno = 3930;
        e.assure = "N. ESSAI";
        e.modeReglement = "Espèces";
        e.verse = 6740;
        e.monnaie = 0;
        return e;
    }
}
