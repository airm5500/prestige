package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.awt.image.BufferedImage;
import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import javax.imageio.ImageIO;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Nouveau modele de ticket (demande du 02/11) : contenu converti depuis les lignes de l'ancien ticket, rendu sans
 * debordement en 80 et 58 mm, reglages (remise masquee, lot, CC/RC, carnet, signatures) et disposition controlee.
 * Les apercus sont ecrits dans le dossier donne par -Dticket.apercus (facultatif) pour les regarder.
 */
class RenduTicketTest {

    private static String texte(TicketDocument d) {
        return d.blocsNonVides().stream().flatMap(b -> b.elements.stream()).map(Object::toString)
                .collect(Collectors.joining("\n"));
    }

    private static TicketDocument doc(ModeleTicket t, int mm, ReglagesTicket r) {
        return ConversionTicket.convertir(ExemplesTicket.exemple(t, mm), r);
    }

    @Test
    void chaqueTicketSeDessineSansDebordementEn80Et58() throws Exception {
        String dossier = System.getProperty("ticket.apercus");
        for (ModeleTicket t : ModeleTicket.values()) {
            if (!t.nouveauDisponible()) {
                continue;
            }
            for (int mm : new int[] { 80, 58 }) {
                ReglagesTicket r = new ReglagesTicket(t);
                RenduTicket.Resultat[] res = new RenduTicket.Resultat[1];
                BufferedImage img = RenduTicket.apercu(doc(t, mm, r), r, mm, 2, res);
                assertNotNull(res[0]);
                assertTrue(res[0].debordements.isEmpty(), t + " " + mm + " : " + res[0].debordements);
                assertTrue(res[0].zones.containsKey(TicketDocument.ENTETE), t + " " + mm);
                assertTrue(res[0].zones.containsKey(TicketDocument.PIED), t + " " + mm);
                if (dossier != null) {
                    ImageIO.write(img, "png", new File(dossier, t + "-" + mm + ".png"));
                }
            }
        }
    }

    @Test
    void venteComptant() {
        String t = texte(doc(ModeleTicket.VENTE, 80, new ReglagesTicket(ModeleTicket.VENTE)));
        assertTrue(t.contains("TICKET N° 0127"), t);
        assertTrue(t.contains("27 20 00 00 00 · 07 00 00 00 00"), t);
        assertTrue(t.contains("AMOXICILLINE BIOGARAN 1 G CPR B/14"), "designation entiere\n" + t);
        assertTrue(t.contains("2 × 1 205 | 2 410"), t);
        assertTrue(t.contains("3 articles · 4 boîtes"), t);
        assertTrue(t.contains("PAIRE[Total | 5 210 F CFA]"), t);
        assertTrue(t.contains("PAIRE[* | − 260 F CFA]"), t);
        assertTrue(t.contains("ENCADRE[NET À PAYER | 4 950 F CFA]"), t);
        assertTrue(t.contains("PAIRE[Espèces versées | 5 000 F CFA]"), t);
        assertTrue(t.contains("PAIRE[Monnaie rendue | 50 F CFA]"), t);
        assertTrue(t.contains("Merci de votre confiance"), t);
        assertTrue(t.contains("PIED[ | 4K7Q2M9XPA | 02/11/2026 17:42]"), t);
        assertFalse(t.contains("CC "), "CC/RC desactives par defaut\n" + t);
        assertFalse(t.contains("Lot B2417"), "lot desactive par defaut\n" + t);
    }

    @Test
    void remiseMasqueeNiRemiseNiTotal() {
        ReglagesTicket r = ReglagesTicket.depuis(ModeleTicket.VENTE, new JSONObject().put("remise", false));
        String t = texte(doc(ModeleTicket.VENTE, 80, r));
        assertFalse(t.contains("PAIRE[* "), t);
        assertFalse(t.contains("PAIRE[Total "), t);
        assertTrue(t.contains("ENCADRE[NET À PAYER | 4 950 F CFA]"), t);
    }

    @Test
    void optionsLotEtCcRc() {
        ReglagesTicket r = ReglagesTicket.depuis(ModeleTicket.VENTE,
                new JSONObject().put("lot", true).put("ccRc", true));
        String t = texte(doc(ModeleTicket.VENTE, 80, r));
        assertTrue(t.contains("Lot B2417 · 08/2028"), t);
        assertTrue(t.contains("CC 1234567 X · RC CI-ABJ-2019-B-0000"), t);
    }

    @Test
    void assurancePresentationB() {
        String t = texte(doc(ModeleTicket.VENTE_ASSURANCE, 80, new ReglagesTicket(ModeleTicket.VENTE_ASSURANCE)));
        assertTrue(t.contains("TICKET N° 0127 · Bon N° 558213"), t);
        assertTrue(t.contains("PAIRE[Matricule assuré | MAT-00000]"), t);
        assertTrue(t.contains("PAIRE[MUGEF-CI 80 % | 3 960 F CFA]"), t);
        assertTrue(t.contains("PAIRE[Vente à terme | 3 960 F CFA]"), t);
        assertTrue(t.contains("ENCADRE[NET À PAYER | 990 F CFA]"), t);
    }

    @Test
    void carnetEncoursEtSignatureSurReglage() {
        String sans = texte(doc(ModeleTicket.VENTE_CARNET, 80, new ReglagesTicket(ModeleTicket.VENTE_CARNET)));
        assertTrue(sans.contains("PAIRE[Pris sur le carnet | 4 950 F CFA]"), sans);
        assertFalse(sans.contains("Encours"), sans);
        assertFalse(sans.contains("Signature du client"), sans);
        ReglagesTicket r = ReglagesTicket.depuis(ModeleTicket.VENTE_CARNET,
                new JSONObject().put("encoursCarnet", true).put("signatureClient", true));
        TicketDocument d = doc(ModeleTicket.VENTE_CARNET, 80, r);
        String avec = texte(d);
        assertTrue(avec.contains("Encours du carnet après la vente | 48 200 F CFA"), avec);
        assertEquals("[Signature du client]", d.existant(TicketDocument.SIGNATURES).elements.get(0).libelles
                .toString());
    }

    @Test
    void mouvementDeCaisseSignaturesParDefaut() {
        TicketDocument d = doc(ModeleTicket.MOUVEMENT_CAISSE, 80, new ReglagesTicket(ModeleTicket.MOUVEMENT_CAISSE));
        String t = texte(d);
        assertTrue(t.contains("SORTIE DE CAISSE"), t);
        assertTrue(t.contains("ENCADRE[MONTANT | 15 000 F CFA]"), t);
        assertTrue(t.contains("Achat de fournitures de bureau"), t);
        assertEquals("[Caissier, Bénéficiaire]", d.existant(TicketDocument.SIGNATURES).elements.get(0).libelles
                .toString());
    }

    @Test
    void reglementDiffere() {
        String t = texte(doc(ModeleTicket.REGLEMENT_DIFFERE, 80, new ReglagesTicket(ModeleTicket.REGLEMENT_DIFFERE)));
        assertTrue(t.contains("REÇU DE RÈGLEMENT · DIFFÉRÉ"), t);
        assertTrue(t.contains("PAIRE[Montant dû (3 dossiers) | 27 450 F CFA]"), t);
        assertTrue(t.contains("ENCADRE[RÉGLÉ | 20 000 F CFA]"), t);
        assertTrue(t.contains("PAIRE[Reste dû | 7 450 F CFA]"), t);
        assertTrue(t.contains("PAIRE[Vente 261028_00041 | 12 300]"), t);
    }

    @Test
    void preventeNumeroEtQr() {
        String t = texte(doc(ModeleTicket.PREVENTE, 80, new ReglagesTicket(ModeleTicket.PREVENTE)));
        assertTrue(t.contains("TEXTE[N° 0042]"), t);
        assertTrue(t.contains("Vendeur : M.TOURE · 3 articles · 4 boîtes"), t);
        assertTrue(t.contains("ENCADRE[NET À PAYER | 4 950 F CFA]"), t);
        assertTrue(t.contains("Présentez ce ticket à la caisse"), t);
    }

    @Test
    void cinquanteHuitMillimetres() {
        String t = texte(doc(ModeleTicket.VENTE, 58, new ReglagesTicket(ModeleTicket.VENTE)));
        assertTrue(t.contains("ENCADRE[NET | 4 950 F CFA]"), t);
        assertTrue(t.contains("PAIRE[Monnaie rendue | 50 F]"), t);
        assertTrue(t.contains("TEXTE[Tél. 07 00 00 00 00]"), "un telephone par ligne\n" + t);
    }

    @Test
    void dispositionDeplaceUnBlocEtGardeLesFixes() {
        JSONArray d = new JSONArray().put(new JSONObject().put("bloc", "COORDONNEES").put("alignement", "G"))
                .put(new JSONObject().put("bloc", "TITRE")).put(new JSONObject().put("bloc", "NET"))
                .put(new JSONObject().put("bloc", "CORPS"));
        ReglagesTicket r = ReglagesTicket.depuis(ModeleTicket.VENTE, new JSONObject().put("disposition", d));
        List<String> ordre = RenduTicket.ordre(r);
        assertEquals("ENTETE", ordre.get(0));
        assertEquals("PIED", ordre.get(ordre.size() - 1));
        assertTrue(ordre.indexOf("NET") < ordre.indexOf("CORPS"), ordre.toString());
        assertEquals(TicketDocument.ORDRE.size(), ordre.size());
        List<String> avert = new ArrayList<>();
        assertTrue(RenduTicket.controler(r, avert).isEmpty());
        assertFalse(avert.isEmpty(), "net avant les articles : avertissement");
    }

    @Test
    void dispositionRefuseeQuandUnBlocFixeBougeOuInconnu() {
        JSONArray d = new JSONArray().put(new JSONObject().put("bloc", "TITRE"))
                .put(new JSONObject().put("bloc", "ENTETE")).put(new JSONObject().put("bloc", "XYZ"))
                .put(new JSONObject().put("bloc", "TITRE"));
        ReglagesTicket r = ReglagesTicket.depuis(ModeleTicket.VENTE, new JSONObject().put("disposition", d));
        List<String> bloquants = RenduTicket.controler(r, new ArrayList<>());
        assertTrue(bloquants.stream().anyMatch(b -> b.contains("en tête")), bloquants.toString());
        assertTrue(bloquants.stream().anyMatch(b -> b.contains("inconnu")), bloquants.toString());
        assertTrue(bloquants.stream().anyMatch(b -> b.contains("deux fois")), bloquants.toString());
    }

    @Test
    void tailleBorneeALaLecture() {
        JSONArray d = new JSONArray().put(new JSONObject().put("bloc", "NET").put("taille", 40));
        ReglagesTicket r = ReglagesTicket.depuis(ModeleTicket.VENTE, new JSONObject().put("disposition", d));
        assertEquals(ReglagesTicket.ECART_TAILLE_MAX, r.position("NET").taille);
    }

    @Test
    void ancienModeleEtTicketZ() {
        assertFalse(ReglagesTicket.depuis(ModeleTicket.VENTE, new JSONObject().put("modele", "ANCIEN")).nouveau());
        assertTrue(new ReglagesTicket(ModeleTicket.VENTE).nouveau());
        assertFalse(new ReglagesTicket(ModeleTicket.TICKET_Z).nouveau(), "Z : nouveau modele pas encore disponible");
    }

    @Test
    void montantsDeLAncienTicket() {
        assertEquals("2 410", ConversionTicket.montant("2.410"));
        assertEquals("260", ConversionTicket.montant("(-) 260"));
        assertEquals("1 234 567", ConversionTicket.montant("1.234.567"));
        assertEquals("990", ConversionTicket.montant("990  CFA"));
        assertEquals("1 205", ConversionTicket.nombre(1205));
        assertEquals("27 20 00 00 00 · 07 00 00 00 00",
                ConversionTicket.telephones("27 20 00 00 00", "07 00 00 00 00"));
    }
}
