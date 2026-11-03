package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Retour du 03/11 sur le ticket de vente a credit (nouveau modele) : taux du tiers-payant en gras entre crochets,
 * numero de bon au-dessus de la part du tiers-payant plutot que dans le titre, montant du credit en gras, telephones et
 * adresse sur une ligne, numero du ticket une seule fois (en haut), cadre du net a payer facultatif.
 */
class TicketCreditRetoursTest {

    private static String texte(TicketDocument d) {
        return d.blocsNonVides().stream().flatMap(b -> b.elements.stream()).map(Object::toString)
                .collect(Collectors.joining("\n"));
    }

    private static List<String> bloc(TicketDocument d, String id) {
        TicketDocument.Bloc b = d.existant(id);
        return b == null ? Collections.emptyList()
                : b.elements.stream().map(Object::toString).collect(Collectors.toList());
    }

    private static TicketDocument assurance(ReglagesTicket r) {
        return ConversionTicket.convertir(ExemplesTicket.exemple(ModeleTicket.VENTE_ASSURANCE, 80), r);
    }

    @Test
    void tauxDuTiersPayantEnGrasEntreCrochets() {
        List<String> client = bloc(assurance(new ReglagesTicket(ModeleTicket.VENTE_ASSURANCE)), TicketDocument.CLIENT);
        assertTrue(client.contains("PAIRE[MUGEF-CI [**80%**] : | 3 960 F CFA]"), client.toString());
    }

    @Test
    void numeroDeBonAuDessusDeLaPartDuTiersPayant() {
        TicketDocument d = assurance(new ReglagesTicket(ModeleTicket.VENTE_ASSURANCE));
        List<String> titre = bloc(d, TicketDocument.TITRE);
        assertEquals(Collections.singletonList("TEXTE[TICKET N° 0127]"), titre);
        List<String> client = bloc(d, TicketDocument.CLIENT);
        int bon = client.indexOf("PAIRE[Bon N° : | 558213]");
        int beneficiaire = client.indexOf("PAIRE[Bénéficiaire : | N. ESSAI]");
        int partClient = client.indexOf("PAIRE[Part du client : | 990 F CFA]");
        int tp = client.indexOf("PAIRE[MUGEF-CI [**80%**] : | 3 960 F CFA]");
        // retour du 03/11 : le bon sous le beneficiaire, jamais entre la part du client et celle de l'assurance
        assertTrue(beneficiaire >= 0 && bon == beneficiaire + 1 && partClient == bon + 1 && tp == partClient + 1,
                client.toString());
    }

    @Test
    void bonVideNiDansLeTitreNiDansLeBlocClient() {
        ConversionTicket.Source s = ExemplesTicket.exemple(ModeleTicket.VENTE_ASSURANCE, 80);
        s.titre = "Ticket N° 0127 | Bon N°:: ";
        TicketDocument d = ConversionTicket.convertir(s, new ReglagesTicket(ModeleTicket.VENTE_ASSURANCE));
        assertEquals(Collections.singletonList("TEXTE[TICKET N° 0127]"), bloc(d, TicketDocument.TITRE));
        assertFalse(texte(d).contains("Bon N°"), texte(d));
    }

    @Test
    void montantDuCreditEnGras() {
        ConversionTicket.Source s = ExemplesTicket.exemple(ModeleTicket.VENTE_ASSURANCE, 80);
        s.articles = Collections.singletonList(new ConversionTicket.Article("ISOLONE 20MG CPR EFFV B/20", 1, 3710, 3710,
                "", Collections.singletonList(CreditLigne.libelle(null, 70, 2597))));
        String t = texte(ConversionTicket.convertir(s, new ReglagesTicket(ModeleTicket.VENTE_ASSURANCE)));
        assertTrue(t.contains("TEXTE[Taux 70 % : **2 597**]"), t);
    }

    @Test
    void telephonesEtAdresseSurUneLigne() {
        ConversionTicket.Source s = ExemplesTicket.exemple(ModeleTicket.VENTE_ASSURANCE, 80);
        s.adresse = "BP 771 YAMOUSSOUKRO";
        s.telephone = "2724361166";
        s.autresTelephones = "0708123958";
        for (int mm : new int[] { 80, 58 }) {
            s.papierMm = mm;
            List<String> c = bloc(ConversionTicket.convertir(s, new ReglagesTicket(ModeleTicket.VENTE_ASSURANCE)),
                    TicketDocument.COORDONNEES);
            assertTrue(c.contains("TEXTE[2724361166-0708123958 | BP 771 YAMOUSSOUKRO]"), mm + " " + c);
            assertFalse(c.toString().contains("Tél."), mm + " " + c);
        }
    }

    @Test
    void numeroDuTicketPasRepeteAuPied() {
        ConversionTicket.Source s = ExemplesTicket.exemple(ModeleTicket.VENTE_ASSURANCE, 80);
        s.titre = "Ticket N° 5849567953 | Bon N°:: ZZAUDIT-BON-C1";
        s.referencePied = "5849567953";
        List<String> pied = bloc(ConversionTicket.convertir(s, new ReglagesTicket(ModeleTicket.VENTE_ASSURANCE)),
                TicketDocument.PIED);
        assertTrue(pied.contains("PIED[ | 02/11/2026 17:42]"), pied.toString());
    }

    @Test
    void referenceGardeeAuPiedQuandLeTitreNeLaPortePas() {
        List<String> pied = bloc(ConversionTicket.convertir(ExemplesTicket.exemple(ModeleTicket.VENTE, 80),
                new ReglagesTicket(ModeleTicket.VENTE)), TicketDocument.PIED);
        assertTrue(pied.contains("PIED[ | 4K7Q2M9XPA | 02/11/2026 17:42]"), pied.toString());
    }

    /** Image du code-barres comme GenerateTicketServiceImpl.buildLineBarecode : barres puis numero en dessous. */
    private static BufferedImage codeBarresAvecNumero() {
        BufferedImage bi = new BufferedImage(100, 70, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = bi.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(4, 2, 90, 50);
        g.setColor(Color.BLACK);
        for (int x = 6; x < 92; x += 3) {
            g.fillRect(x, 2, 1 + x % 2, 50);
        }
        g.drawString("5849567953", 10, 65);
        g.dispose();
        return bi;
    }

    @Test
    void codeBarresSansLeNumeroImprimeDessous() {
        BufferedImage img = RenduTicket.sansTexte(codeBarresAvecNumero());
        assertEquals(50, img.getHeight());
        assertEquals(100, img.getWidth());
    }

    @Test
    void imageSansBarresVerticalesGardeeTelleQuelle() {
        BufferedImage qr = new BufferedImage(40, 40, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = qr.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, 40, 40);
        g.setColor(Color.BLACK);
        g.fillRect(0, 0, 10, 10);
        g.fillRect(20, 5, 10, 30);
        g.dispose();
        assertEquals(40, RenduTicket.sansTexte(qr).getHeight());
    }

    @Test
    void cadreDuNetAPayerFacultatif() {
        String avec = texte(assurance(new ReglagesTicket(ModeleTicket.VENTE_ASSURANCE)));
        assertTrue(avec.contains("ENCADRE[NET À PAYER | 990 F CFA]"), "cadre par defaut\n" + avec);
        ReglagesTicket sans = ReglagesTicket.depuis(ModeleTicket.VENTE_ASSURANCE,
                new JSONObject().put("cadreNet", false));
        assertFalse(sans.cadreNet());
        assertFalse(sans.json().getBoolean("cadreNet"));
        String t = texte(assurance(sans));
        assertFalse(t.contains("ENCADRE["), t);
        assertTrue(t.contains("PAIRE[NET À PAYER | 990 F CFA]"), t);
        for (ModeleTicket m : Arrays.asList(ModeleTicket.MOUVEMENT_CAISSE, ModeleTicket.REGLEMENT_FACTURE,
                ModeleTicket.PREVENTE, ModeleTicket.TICKET_Z)) {
            ReglagesTicket r = ReglagesTicket.depuis(m, new JSONObject().put("cadreNet", false));
            TicketDocument d = ConversionTicket.convertir(ExemplesTicket.exemple(m, 80), r);
            assertFalse(bloc(d, TicketDocument.NET).toString().contains("ENCADRE["), m + " " + texte(d));
        }
    }

    @Test
    void lesMarquesDeGrasNeSontPasImprimees() {
        ReglagesTicket r = new ReglagesTicket(ModeleTicket.VENTE_ASSURANCE);
        for (int mm : new int[] { 80, 58 }) {
            RenduTicket.Resultat[] res = new RenduTicket.Resultat[1];
            RenduTicket.apercu(assurance(r), r, mm, 1, res);
            assertTrue(res[0].debordements.isEmpty(), mm + " " + res[0].debordements);
        }
        assertEquals("80%", RenduTicket.sansMarques(TicketDocument.gras("80%")));
    }
}
