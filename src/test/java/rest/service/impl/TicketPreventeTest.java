package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Ticket synthetique d'une prevente. On verifie ce qui sera imprime, ligne par ligne, pour les trois types de vente. Le
 * format d'une ligne est « libelle;valeur;gras », celui que le service d'impression lit.
 */
class TicketPreventeTest {

    private static final List<TicketPrevente.Organisme> MUGEFCI = Collections
            .singletonList(new TicketPrevente.Organisme("MUGEFCI", 80, 9_600));

    @Test
    @DisplayName("Comptant : le net a payer, en gras, arrondi au multiple de 5, et rien d'autre")
    void comptant() {
        TicketPrevente t = new TicketPrevente("1", "260902_00004", "02/09/2026 00:57", "A.KOUADIO", 12_003, 0, 0, null);
        assertFalse(t.estTiersPayant());
        assertEquals(Arrays.asList("Net à payer;12 005 F CFA;1"), t.lignes());
    }

    @Test
    @DisplayName("Comptant avec remise : total, remise puis net, le net tenant compte de la remise")
    void comptantAvecRemise() {
        TicketPrevente t = new TicketPrevente("1", "R", "d", "v", 12_000, 500, 0, null);
        assertEquals(Arrays.asList("Total;12 000 F CFA;0", "Remise;(-) 500 F CFA;0", "Net à payer;11 500 F CFA;1"),
                t.lignes());
    }

    @Test
    @DisplayName("Assurance : organisme et taux, total, part client, part assurance")
    void assurance() {
        TicketPrevente t = new TicketPrevente("2", "R", "d", "v", 12_000, 0, 2_400, MUGEFCI);
        assertTrue(t.estTiersPayant());
        assertEquals(Arrays.asList("Assurance 80%;MUGEFCI;1", "Total vente;12 000 F CFA;0", "Part client;2 400 F CFA;1",
                "Part assurance;9 600 F CFA;1"), t.lignes());
    }

    @Test
    @DisplayName("Carnet : se lit comme une assurance, avec le mot « Carnet »")
    void carnet() {
        TicketPrevente t = new TicketPrevente("3", "R", "d", "v", 5_000, 0, 0,
                Collections.singletonList(new TicketPrevente.Organisme("CARNET DUPONT", null, 5_000)));
        assertTrue(t.estTiersPayant());
        assertEquals(Arrays.asList("Carnet;CARNET DUPONT;1", "Total vente;5 000 F CFA;0", "Part client;0 F CFA;1",
                "Part carnet;5 000 F CFA;1"), t.lignes());
    }

    @Test
    @DisplayName("Deux organismes : chacun sur sa ligne, la part assurance est leur somme")
    void deuxOrganismes() {
        TicketPrevente t = new TicketPrevente("2", "R", "d", "v", 10_000, 0, 1_000, Arrays.asList(
                new TicketPrevente.Organisme("MUGEFCI", 70, 7_000), new TicketPrevente.Organisme("ASCOMA", 20, 2_000)));
        List<String> l = t.lignes();
        assertEquals("Assurance 70%;MUGEFCI;1", l.get(0));
        assertEquals("Assurance 20%;ASCOMA;1", l.get(1));
        assertEquals("Part assurance;9 000 F CFA;1", l.get(l.size() - 1));
    }

    @Test
    @DisplayName("Assurance sans organisme renseigne : la part assurance se deduit du total et de la part client")
    void assuranceSansOrganisme() {
        TicketPrevente t = new TicketPrevente("2", "R", "d", "v", 10_000, 0, 3_000, null);
        List<String> l = t.lignes();
        assertEquals("Assurance;;1", l.get(0));
        assertEquals("Part assurance;7 000 F CFA;1", l.get(l.size() - 1));
    }

    @Test
    @DisplayName("Titre et en-tete : reference, date et heure, vendeur ; le vendeur absent n'ajoute pas de ligne")
    void titreEtEnTete() {
        TicketPrevente t = new TicketPrevente("1", "260902_00004", "02/09/2026 00:57", "A.KOUADIO", 100, 0, 0, null);
        assertEquals("TICKET PREVENTE N° 260902_00004", t.titre());
        assertEquals(Arrays.asList("Date:: 02/09/2026 00:57", "Vendeur:: A.KOUADIO"), t.enTete());
        assertEquals(Arrays.asList("Date:: d"), new TicketPrevente("1", "R", "d", "", 100, 0, 0, null).enTete());
    }

    @Test
    @DisplayName("Vente a credit : beneficiaire et matricule dans l'en-tete ; ignores en vente au comptant")
    void beneficiaireEtMatricule() {
        TicketPrevente credit = new TicketPrevente("2", "R", "d", "v", 100, 0, 20, null).avecBeneficiaire("KONAN AYA",
                "MAT-4521");
        assertEquals(Arrays.asList("Date:: d", "Vendeur:: v", "Bénéficiaire:: KONAN AYA", "Matricule:: MAT-4521"),
                credit.enTete());
        TicketPrevente comptant = new TicketPrevente("1", "R", "d", "v", 100, 0, 0, null).avecBeneficiaire("X", "Y");
        assertEquals(Arrays.asList("Date:: d", "Vendeur:: v"), comptant.enTete());
        assertEquals(Arrays.asList("Date:: d", "Vendeur:: v"),
                new TicketPrevente("2", "R", "d", "v", 100, 0, 20, null).avecBeneficiaire("", null).enTete());
    }

    @Test
    @DisplayName("Aucune ligne ne mentionne un produit : le ticket est synthetique")
    void aucunProduit() {
        TicketPrevente t = new TicketPrevente("2", "R", "d", "v", 12_000, 0, 2_400, MUGEFCI);
        for (String ligne : t.lignes()) {
            assertEquals(3, ligne.split(";", -1).length, "trois champs par ligne : " + ligne);
        }
    }

    private static List<String> lignesAssurance(String type, int total, int partClient,
            TicketPrevente.Organisme... organismes) {
        return new TicketPrevente(type, "R", "d", "v", total, 0, partClient, Arrays.asList(organismes)).lignes();
    }

    @Test
    @DisplayName("Demande 66 : 80 % + 30 % -> 80 % et 20 % ; parts et part organismes inchangees")
    void demande66PrincipalEtComplementaire() {
        List<String> l = lignesAssurance("2", 10_000, 0, new TicketPrevente.Organisme("MUGEFCI", 80, 8_000),
                new TicketPrevente.Organisme("ASCOMA", 30, 2_000));
        assertEquals(Arrays.asList("Assurance 80%;MUGEFCI;1", "Assurance 20%;ASCOMA;1", "Total vente;10 000 F CFA;0",
                "Part client;0 F CFA;1", "Part assurance;10 000 F CFA;1"), l);
    }

    @Test
    @DisplayName("Demande 66 : 70 % + 29 % -> 70 % et 30 % (reste exact) ; un seul organisme a 80 % -> 80 %")
    void demande66ResteExactEtOrganismeSeul() {
        List<String> l = lignesAssurance("2", 10_000, 100, new TicketPrevente.Organisme("MUGEFCI", 70, 7_000),
                new TicketPrevente.Organisme("ASCOMA", 29, 2_900));
        assertEquals("Assurance 70%;MUGEFCI;1", l.get(0));
        assertEquals("Assurance 30%;ASCOMA;1", l.get(1));
        assertEquals("Part assurance;9 900 F CFA;1", l.get(l.size() - 1));
        assertEquals("Assurance 80%;MUGEFCI;1",
                lignesAssurance("2", 12_000, 2_400, new TicketPrevente.Organisme("MUGEFCI", 80, 9_600)).get(0));
    }

    @Test
    @DisplayName("Demande 66 : carnet 100 % + 30 % -> 100 % et 0 % ; organisme sans taux toujours sans taux")
    void demande66CarnetEtSansTaux() {
        List<String> l = lignesAssurance("3", 5_000, 0, new TicketPrevente.Organisme("CARNET DUPONT", 100, 5_000),
                new TicketPrevente.Organisme("ASCOMA", 30, 0));
        assertEquals("Carnet 100%;CARNET DUPONT;1", l.get(0));
        assertEquals("Carnet 0%;ASCOMA;1", l.get(1));
        assertEquals("Part carnet;5 000 F CFA;1", l.get(l.size() - 1));
        List<String> s = lignesAssurance("2", 5_000, 1_000, new TicketPrevente.Organisme("SANS TAUX", null, 1_000),
                new TicketPrevente.Organisme("MUGEFCI", 80, 3_000));
        assertEquals("Assurance;SANS TAUX;1", s.get(0));
        assertEquals("Assurance 80%;MUGEFCI;1", s.get(1));
    }

    @Test
    @DisplayName("Demande 66, coherence : 5 000 ventes tirees au hasard, taux imprimes = tauxAffiches, total <= 100 %")
    void demande66Coherence() {
        java.util.Random r = new java.util.Random(20261120L);
        for (int cas = 0; cas < 5_000; cas++) {
            int n = 1 + r.nextInt(4);
            List<TicketPrevente.Organisme> orgs = new java.util.ArrayList<>();
            List<Integer> bruts = new java.util.ArrayList<>();
            int somme = 0;
            for (int i = 0; i < n; i++) {
                Integer taux = r.nextInt(10) == 0 ? null : r.nextInt(101);
                int part = r.nextInt(8) == 0 ? 0 : r.nextInt(20_000);
                orgs.add(new TicketPrevente.Organisme("TP" + i, taux, part));
                bruts.add(taux);
                somme += part;
            }
            String type = r.nextBoolean() ? "2" : "3";
            int total = somme + r.nextInt(5_000);
            List<String> l = new TicketPrevente(type, "R", "d", "v", total, 0, total - somme, orgs).lignes();
            List<Integer> attendus = rest.service.ticket.CreditLigne.tauxAffiches(bruts);
            String intitule = "3".equals(type) ? "Carnet" : "Assurance";
            int cumul = 0;
            for (int i = 0; i < n; i++) {
                String attendu = intitule + (bruts.get(i) == null ? "" : " " + attendus.get(i) + "%") + ";TP" + i
                        + ";1";
                assertEquals(attendu, l.get(i), "cas " + cas);
                cumul += bruts.get(i) == null ? 0 : attendus.get(i);
            }
            assertTrue(cumul <= 100, "total des taux imprimes <= 100 % (cas " + cas + ")");
            assertEquals("Part " + intitule.toLowerCase() + ";" + util.DateConverter.amountFormat(somme) + " F CFA;1",
                    l.get(l.size() - 1), "cas " + cas);
            assertEquals(n + 3, l.size(), "aucune ligne en plus ni en moins (cas " + cas + ")");
        }
    }

    @Test
    @DisplayName("Le QR code encode l'identifiant de la vente tel quel")
    void qrCode() {
        assertEquals("4cc645b0-6309-427d-83f0-1633b08ea17e",
                TicketPrevente.contenuQrCode("4cc645b0-6309-427d-83f0-1633b08ea17e"));
        assertEquals("", TicketPrevente.contenuQrCode(null));
    }
}
