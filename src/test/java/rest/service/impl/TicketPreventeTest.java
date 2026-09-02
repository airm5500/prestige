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

    @Test
    @DisplayName("Le QR code encode l'identifiant de la vente tel quel")
    void qrCode() {
        assertEquals("4cc645b0-6309-427d-83f0-1633b08ea17e",
                TicketPrevente.contenuQrCode("4cc645b0-6309-427d-83f0-1633b08ea17e"));
        assertEquals("", TicketPrevente.contenuQrCode(null));
    }
}
