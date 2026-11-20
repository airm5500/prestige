package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Demande 66 (20/11) : sur le ticket client combine (vente assurance liee a une vente comptant) et sur le ticket de
 * vente modifiee, les taux imprimes des organismes ne depassent jamais 100 % au total (regle
 * {@link CreditLigne#tauxAffiches}, dans l'ordre recu : celui du bloc client du ticket de vente). Les parts ne changent
 * pas ; les organismes a part nulle sont retires AVANT par l'appelant et ne sont donc jamais imprimes.
 */
class TauxOrganismesTicketsTest {

    private static TicketCombine.Entree combine(List<String[]> tps) {
        TicketCombine.Entree e = new TicketCombine.Entree();
        e.refVo = "VO-1";
        e.refVno = "VNO-2";
        e.tiersPayants = tps;
        e.totalVo = 10_000;
        e.partClientVo = 0;
        e.totalVno = 3_000;
        e.netVno = 3_000;
        e.assure = "N. ESSAI";
        e.modeReglement = "Espèces";
        return e;
    }

    private static List<String[]> totauxAssurance(TicketCombine.Sortie s) {
        return s.sections.get(0).totaux;
    }

    @Test
    @DisplayName("Ticket combine : 80 % + 30 % -> « ... 80 % » et « ... 20 % », parts inchangees")
    void combine80Et30() {
        TicketCombine.Sortie s = TicketCombine.construire(combine(
                Arrays.asList(new String[] { "MUGEFCI", "80", "8000" }, new String[] { "ASCOMA", "30", "2000" })));
        List<String[]> t = totauxAssurance(s);
        assertEquals("MUGEFCI 80 %", t.get(0)[0]);
        assertEquals(ConversionTicket.nombre(8000), t.get(0)[1]);
        assertEquals("ASCOMA 20 %", t.get(1)[0]);
        assertEquals(ConversionTicket.nombre(2000), t.get(1)[1]);
    }

    @Test
    @DisplayName("Ticket combine : 70 % + 29 % -> 70 % et 30 % ; un seul organisme garde son taux")
    void combineResteExactEtSeul() {
        List<String[]> t = totauxAssurance(TicketCombine.construire(combine(
                Arrays.asList(new String[] { "MUGEFCI", "70", "7000" }, new String[] { "ASCOMA", "29", "2900" }))));
        assertEquals("MUGEFCI 70 %", t.get(0)[0]);
        assertEquals("ASCOMA 30 %", t.get(1)[0]);
        List<String[]> seul = totauxAssurance(TicketCombine
                .construire(combine(Collections.singletonList(new String[] { "MCI-CARE", "80", "8000" }))));
        assertEquals("MCI-CARE 80 %", seul.get(0)[0]);
    }

    @Test
    @DisplayName("Ticket combine : l'entree n'est pas modifiee (les taux enregistres restent ceux du contrat)")
    void combineEntreeIntacte() {
        String[] c = { "ASCOMA", "30", "2000" };
        TicketCombine.construire(combine(Arrays.asList(new String[] { "MUGEFCI", "80", "8000" }, c)));
        assertEquals("30", c[1]);
    }

    @Test
    @DisplayName("Ticket de vente modifiee : origine et modifiee bornees chacune, 80 % + 30 % -> 80 % et 20 %")
    void venteModifiee() {
        TicketVenteModifiee.Entree e = new TicketVenteModifiee.Entree();
        e.origine.ref = "O";
        e.origine.total = 10_000;
        e.origine.tiersPayants = Arrays.asList(new String[] { "MUGEFCI", "80", "8000" },
                new String[] { "ASCOMA", "30", "2000" });
        e.modifiee.ref = "M";
        e.modifiee.total = 12_000;
        e.modifiee.tiersPayants = Arrays.asList(new String[] { "MUGEFCI", "70", "8400" },
                new String[] { "ASCOMA", "29", "3480" });
        TicketCombine.Sortie s = TicketVenteModifiee.construire(e);
        List<String> origine = libelles(s.sections.get(0).totaux);
        List<String> modifiee = libelles(s.sections.get(1).totaux);
        assertTrue(origine.contains("MUGEFCI 80 %") && origine.contains("ASCOMA 20 %"), origine.toString());
        assertTrue(modifiee.contains("MUGEFCI 70 %") && modifiee.contains("ASCOMA 30 %"), modifiee.toString());
    }

    /* ---- prevente au nouveau modele (image du serveur, impression au nouveau modele) ---- */

    private static List<String> pairesClient(List<String> lignesPrevente, int mm) {
        ConversionTicket.Source s = ExemplesTicket.exemple(ModeleTicket.PREVENTE, mm);
        s.datas = lignesPrevente;
        TicketDocument d = ConversionTicket.convertir(s, new ReglagesTicket(ModeleTicket.PREVENTE));
        List<String> l = new ArrayList<>();
        TicketDocument.Bloc b = d.existant(TicketDocument.CLIENT);
        for (TicketDocument.Element e : b == null ? Collections.<TicketDocument.Element> emptyList() : b.elements) {
            if (e.genre == TicketDocument.Genre.PAIRE) {
                l.add(RenduTicket.sansMarques(e.a) + " = " + RenduTicket.sansMarques(e.b));
            }
        }
        return l;
    }

    @Test
    @DisplayName("Prevente, nouveau modele : deux organismes -> chacun avec son taux (80 % et 20 %), puis la part assurance")
    void preventeDeuxOrganismesNouveauModele() {
        List<String> lignes = new rest.service.impl.TicketPrevente("2", "R", "d", "v", 10_000, 0, 0,
                Arrays.asList(new rest.service.impl.TicketPrevente.Organisme("MUGEFCI", 80, 8_000),
                        new rest.service.impl.TicketPrevente.Organisme("ASCOMA", 30, 2_000))).lignes();
        for (int mm : new int[] { 58, 80 }) {
            List<String> p = pairesClient(lignes, mm);
            String f = mm == 58 ? " F" : " F CFA";
            assertTrue(p.contains("MUGEFCI 80 % = "), mm + " " + p);
            assertTrue(p.contains("ASCOMA 20 % = "), mm + " " + p);
            assertTrue(p.contains("Part assurance = 10 000" + f), mm + " " + p);
            assertTrue(p.indexOf("MUGEFCI 80 % = ") < p.indexOf("ASCOMA 20 % = ")
                    && p.indexOf("ASCOMA 20 % = ") < p.indexOf("Part assurance = 10 000" + f), mm + " " + p);
        }
    }

    @Test
    @DisplayName("Prevente, nouveau modele : un seul organisme -> rendu inchange (« MUGEFCI 80 % » et sa part)")
    void preventeUnOrganismeInchange() {
        List<String> lignes = new rest.service.impl.TicketPrevente("2", "R", "d", "v", 12_000, 0, 2_400,
                Collections.singletonList(new rest.service.impl.TicketPrevente.Organisme("MUGEFCI", 80, 9_600)))
                        .lignes();
        assertTrue(pairesClient(lignes, 80).contains("MUGEFCI 80 % = 9 600 F CFA"),
                pairesClient(lignes, 80).toString());
        List<String> carnet = new rest.service.impl.TicketPrevente("3", "R", "d", "v", 5_000, 0, 0,
                Collections.singletonList(new rest.service.impl.TicketPrevente.Organisme("CARNET DUPONT", null, 5_000)))
                        .lignes();
        assertTrue(pairesClient(carnet, 80).contains("CARNET DUPONT = 5 000 F CFA"),
                pairesClient(carnet, 80).toString());
    }

    @Test
    @DisplayName("Ancien ticket (repli) : la regle appliquee deux fois ne change rien (taux deja bornes relus par le"
            + " nouveau modele) ; 10 000 listes tirees au hasard")
    void regleStableSurTauxDejaBornes() {
        Random r = new Random(66L);
        for (int cas = 0; cas < 10_000; cas++) {
            List<Integer> bruts = new ArrayList<>();
            int n = 1 + r.nextInt(5);
            for (int i = 0; i < n; i++) {
                bruts.add(r.nextInt(12) == 0 ? null : r.nextInt(110));
            }
            List<Integer> une = CreditLigne.tauxAffiches(bruts);
            assertEquals(une, CreditLigne.tauxAffiches(une), "cas " + cas + " " + bruts);
            assertTrue(une.stream().mapToInt(Integer::intValue).sum() <= 100, "cas " + cas + " " + bruts);
        }
    }

    private static List<String> libelles(List<String[]> totaux) {
        List<String> l = new ArrayList<>();
        for (String[] t : totaux) {
            l.add(t[0]);
        }
        return l;
    }

    @Test
    @DisplayName("Coherence : 5 000 tickets combines tires au hasard, taux = tauxAffiches, total <= 100 %, parts intactes")
    void coherence() {
        Random r = new Random(20261120L);
        for (int cas = 0; cas < 5_000; cas++) {
            int n = 1 + r.nextInt(4);
            List<String[]> tps = new ArrayList<>();
            List<Integer> bruts = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                int taux = r.nextInt(101);
                int part = 1 + r.nextInt(20_000);
                tps.add(new String[] { "TP" + i, String.valueOf(taux), String.valueOf(part) });
                bruts.add(taux);
            }
            List<Integer> attendus = CreditLigne.tauxAffiches(bruts);
            List<String[]> t = totauxAssurance(TicketCombine.construire(combine(tps)));
            int cumul = 0;
            for (int i = 0; i < n; i++) {
                assertEquals("TP" + i + " " + attendus.get(i) + " %", t.get(i)[0], "cas " + cas);
                assertEquals(ConversionTicket.nombre(Integer.parseInt(tps.get(i)[2])), t.get(i)[1], "cas " + cas);
                assertEquals(String.valueOf(bruts.get(i)), tps.get(i)[1], "entree intacte (cas " + cas + ")");
                cumul += attendus.get(i);
            }
            assertTrue(cumul <= 100, "cas " + cas);
        }
    }
}
