package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

/** Retours du 08/10 (11) : bon de livraison valorise (§ 3.2.4) et alertes (§ 3.2.6, 3.2.7). */
class BlvAlertePharmaMlTest {

    private static String enveloppe(String corps) {
        return "<CSRP_ENVELOPPE xmlns=\"urn:x-csrp:fr.csrp.protocole:enveloppe\"><ENTETE><REF_MESSAGE>M1</REF_MESSAGE></ENTETE>"
                + "<CORPS><MESSAGE_REPARTITEUR xmlns=\"urn:x-csrp:fr.csrp.protocole:message\"><CORPS>" + corps
                + "</CORPS></MESSAGE_REPARTITEUR></CORPS></CSRP_ENVELOPPE>";
    }

    @Test
    void bonDeLivraisonValorise() throws Exception {
        String xml = enveloppe("<BON_LIVRAISON Nature_Document=\"0003\" Ref_Document=\"DOC1\">"
                + "<INFOS_LIVRAISON><LIVREUR Societe=\"TRANSP\"/><TOURNEE Reference=\"T2\"/></INFOS_LIVRAISON>"
                + "<VALOR Ref_Facture=\"F1\" Date=\"2026-10-08\"><CUMUL Montant_HT=\"1200.500\" Montant_Total_Taxes=\"10\"/></VALOR>"
                + "<VALOR Ref_Facture=\"F2\" Date=\"2026-10-08\"><CUMUL Montant_HT=\"300\"/></VALOR>"
                + "<LIVRAISON Ref_Livraison=\"BL9\" Date=\"2026-10-08\">"
                + "<LIGNE Num_Ligne=\"1\" Ref_Cde_Client=\"C1\" Quantite_commandee=\"3\" Quantite_livree=\"1\">"
                + "<PRIX Nature=\"PHAHT\" Valeur=\"1700\"/><PRIX Nature=\"NETHT\" Valeur=\"1600.400\"/><TAXE_LV Nature=\"TVA\" Taux=\"5.5\"/>"
                + "<NORMALE Type_Codification=\"CIP39\" Code_Produit=\"3000147\" Designation=\"A 313\"/>"
                + "<INDISPONIBILITE><PRODUIT_REMPLACANT Code_Produit=\"9999999\"/></INDISPONIBILITE></LIGNE>"
                + "<LIGNE Num_Ligne=\"2\" Quantite_livree=\"2\" Quantite_facturee=\"2\"><PRIX Nature=\"PHAHT\" Valeur=\"500\"/>"
                + "<NORMALE Type_Codification=\"CIP39\" Code_Produit=\"8452598\"/></LIGNE>"
                + "</LIVRAISON></BON_LIVRAISON>");
        assertTrue(BlvPharmaMl.estBlv(xml));
        assertFalse(BlvPharmaMl.estAlerte(xml));
        PharmaMlMessages.Blv b = PharmaMlMessages.lireBonLivraison(xml);
        assertEquals("DOC1", b.refDocument);
        assertEquals("BL9", b.refLivraison);
        assertEquals("2026-10-08", b.dateLivraison);
        assertEquals("F1", b.refFacture, "premiere facture");
        assertEquals("TRANSP", b.societeLivraison);
        assertEquals("T2", b.tournee);
        assertEquals(Long.valueOf(1501), b.montantHt, "cumuls additionnes, arrondis");
        assertEquals(Long.valueOf(10), b.montantTaxes);
        assertEquals(2, b.lignes.size());
        PharmaMlMessages.LigneBlv l1 = b.lignes.get(0);
        assertEquals("3000147", l1.code, "produit livre, pas le remplacant");
        assertEquals("C1", l1.refCdeClient);
        assertEquals(3, l1.quantiteCommandee);
        assertEquals(1, l1.quantiteLivree);
        assertEquals(1, l1.quantiteFacturee, "facturee = livree si absente");
        assertEquals(Long.valueOf(1600), l1.prix, "NETHT prioritaire");
        assertEquals("NETHT", l1.naturePrix);
        assertEquals(0, new BigDecimal("5.5").compareTo(l1.tauxTva));
        PharmaMlMessages.LigneBlv l2 = b.lignes.get(1);
        assertEquals(Long.valueOf(500), l2.prix);
        assertEquals("PHAHT", l2.naturePrix);
        assertNull(l2.tauxTva);
        b.montantHt = null;
        assertEquals(Long.valueOf(1600 + 1000), BlvPharmaMl.montantHt(b), "sans cumul : somme des lignes facturees");
        assertNull(PharmaMlMessages.lireBonLivraison(enveloppe("<REP_COMMANDE/>")));
    }

    @Test
    void alertes() throws Exception {
        String xml = enveloppe(
                "<ALERTE_REGLEMENTAIRE Numero_Alerte=\"A1\" Motif=\"Qualité\" Designation_globale=\"Retrait\""
                        + " Arret_immediat=\"true\" Commentaire_Instructions=\"Quarantaine\">"
                        + "<EMETTEUR_FABRICANT Nom=\"LABO\"><INSTRUCTIONS Renvoi=\"1\" Date_limite_Reprise=\"2026-10-31\"/>"
                        + "<PRODUIT Num_Ligne=\"1\" Type_Codification=\"CIP39\" Code_Produit=\"3000147\"><LOT Numero_Lot=\"L1\"/><LOT Numero_Lot=\"L2\"/></PRODUIT>"
                        + "<PRODUIT Num_Ligne=\"2\" Type_Codification=\"CIP39\" Code_Produit=\"8452598\"><TOUS_LOTS/></PRODUIT>"
                        + "</EMETTEUR_FABRICANT></ALERTE_REGLEMENTAIRE>");
        assertTrue(BlvPharmaMl.estAlerte(xml));
        PharmaMlMessages.Alerte a = PharmaMlMessages.lireAlerte(xml);
        assertEquals("REGLEMENTAIRE", a.type);
        assertEquals("A1", a.numero);
        assertTrue(a.arretImmediat);
        assertTrue(a.renvoi);
        assertEquals("2026-10-31", a.dateLimiteReprise);
        assertEquals("Quarantaine", a.commentaireInstructions);
        assertEquals(2, a.produits.size());
        assertEquals("LABO", a.produits.get(0).fabricant);
        assertEquals(java.util.Arrays.asList("L1", "L2"), a.produits.get(0).lots);
        assertTrue(a.produits.get(1).lots.isEmpty(), "tous les lots");
        PharmaMlMessages.Alerte c = PharmaMlMessages
                .lireAlerte(enveloppe("<ALERTE_COMMERCIALE Arret_immediat=\"false\">"
                        + "<EMETTEUR_FABRICANT Nom=\"L\"><PRODUIT Num_Ligne=\"1\" Type_Codification=\"CIP39\" Code_Produit=\"1\"/></EMETTEUR_FABRICANT></ALERTE_COMMERCIALE>"));
        assertEquals("COMMERCIALE", c.type);
        assertFalse(c.arretImmediat);
        assertFalse(c.renvoi);
        assertNull(PharmaMlMessages.lireAlerte(enveloppe("<REP_COMMANDE/>")));
    }

    @Test
    void montantsEtDetail() {
        assertEquals(Long.valueOf(1235), PharmaMlMessages.montant("1234.500"));
        assertNull(PharmaMlMessages.montant("abc"));
        assertNull(PharmaMlMessages.montant(""));
        assertEquals("refus du grossiste", TableauBordPharmaMl.detailLisible("{\"msg\":\"refus du grossiste\"}"));
        assertEquals("texte libre", TableauBordPharmaMl.detailLisible("texte libre"));
        assertEquals("", TableauBordPharmaMl.detailLisible(null));
        assertTrue(TableauBordPharmaMl.detailLisible("x".repeat(300)).length() <= 160);
    }
}
