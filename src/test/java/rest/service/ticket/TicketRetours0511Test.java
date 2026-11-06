package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Retours du 05/11 (lot A) : valeurs par defaut v2 sans toucher aux reglages deja enregistres, reglages communs, blocs
 * retrecis termines par « … », tailles par partie, contenu du ticket assurance (matricule, P.REF, taux a 100 %).
 */
class TicketRetours0511Test {

    private static String texte(TicketDocument d) {
        return d.blocsNonVides().stream().flatMap(b -> b.elements.stream()).map(Object::toString)
                .collect(Collectors.joining("\n"));
    }

    private static List<String> bloc(TicketDocument d, String id) {
        TicketDocument.Bloc b = d.existant(id);
        return b == null ? Collections.emptyList()
                : b.elements.stream().map(Object::toString).collect(Collectors.toList());
    }

    private static TicketDocument doc(ModeleTicket t, ReglagesTicket r) {
        return ConversionTicket.convertir(ExemplesTicket.exemple(t, 80), r);
    }

    /* ---------- taux affiches ---------- */

    @Test
    void tauxAffichesJamaisAuDelaDeCent() {
        assertEquals(Arrays.asList(70, 30), CreditLigne.tauxAffiches(Arrays.asList(70, 29)));
        assertEquals(Arrays.asList(70, 30), CreditLigne.tauxAffiches(Arrays.asList(70, 31)));
        assertEquals(Arrays.asList(80, 20), CreditLigne.tauxAffiches(Arrays.asList(80, 30)));
        assertEquals(Arrays.asList(60, 20), CreditLigne.tauxAffiches(Arrays.asList(60, 20)));
        assertEquals(Collections.singletonList(80), CreditLigne.tauxAffiches(Collections.singletonList(80)));
        assertEquals(Collections.singletonList(100), CreditLigne.tauxAffiches(Collections.singletonList(120)));
        assertTrue(CreditLigne.tauxAffiches(null).isEmpty());
    }

    @Test
    void blocClientTauxNormalisesEtMatriculeBrut() {
        ConversionTicket.Source s = ExemplesTicket.exemple(ModeleTicket.VENTE_ASSURANCE, 80);
        s.infoTiersPayants = Arrays.asList("Matricule Assuré:: 0102345678", "CNAM   70% :: 2.000  CFA",
                "MUPEMENET   29% :: 900  CFA");
        TicketDocument d = ConversionTicket.convertir(s, new ReglagesTicket(ModeleTicket.VENTE_ASSURANCE));
        String client = String.join("\n", bloc(d, TicketDocument.CLIENT));
        assertTrue(client.contains("Matricule assuré : | 0102345678]"), client);
        assertFalse(client.contains("102 345 678"), client);
        assertTrue(client.contains("CNAM [**70%**]"), client);
        assertTrue(client.contains("MUPEMENET [**30%**]"), client);
    }

    @Test
    void prixDeReference() {
        assertEquals("P.REF 6 000", CreditLigne.prixReference(6000, 5500));
        assertEquals("", CreditLigne.prixReference(null, 5500));
        assertEquals("", CreditLigne.prixReference(0, 5500));
        assertEquals("", CreditLigne.prixReference(5500, 5500));
    }

    /* ---------- ticket Z, depot, contenu ---------- */

    @Test
    void libellesDuTicketZ() {
        assertEquals("Crédit", ConversionTicket.libelleZ("Crédit(vno/vo)"));
        assertEquals("TOTAL CRÉDIT", ConversionTicket.libelleZ("TOTAL (VNO/VO)"));
        assertEquals("OM (vno/vo)", ConversionTicket.libelleZ("OM (vno/vo)"));
    }

    @Test
    void ticketZSansCadreParDefaut() {
        String t = texte(doc(ModeleTicket.TICKET_Z, new ReglagesTicket(ModeleTicket.TICKET_Z)));
        assertTrue(t.contains("PAIRE[Espèces en caisse | 169 350 F CFA]"), t);
        assertFalse(t.contains("ENCADRE["), t);
    }

    @Test
    void ticketZEnregistreAvantLe0511GardeSonCadre() {
        ReglagesTicket v1 = ReglagesTicket.depuis(ModeleTicket.TICKET_Z, new JSONObject().put("modele", "NOUVEAU"));
        String t = texte(doc(ModeleTicket.TICKET_Z, v1));
        assertTrue(t.contains("ENCADRE[Espèces en tiroir | 169 350 F CFA]"), t);
    }

    @Test
    void venteDepotSansNetParDefaut() {
        TicketDocument d = doc(ModeleTicket.VENTE_DEPOT, new ReglagesTicket(ModeleTicket.VENTE_DEPOT));
        assertTrue(bloc(d, TicketDocument.NET).isEmpty(), texte(d));
        JSONObject avecNet = new ReglagesTicket(ModeleTicket.VENTE_DEPOT).json().put("net", true);
        TicketDocument d2 = doc(ModeleTicket.VENTE_DEPOT, ReglagesTicket.depuis(ModeleTicket.VENTE_DEPOT, avecNet));
        assertFalse(bloc(d2, TicketDocument.NET).isEmpty(), texte(d2));
    }

    @Test
    void enTeteEnTroisBlocsEtTraitFinAuDessusDuNumero() {
        TicketDocument d = doc(ModeleTicket.VENTE, new ReglagesTicket(ModeleTicket.VENTE));
        assertEquals(Collections.singletonList("TEXTE[Dr Awa KOUASSI]"), bloc(d, TicketDocument.PHARMACIEN));
        assertEquals(Collections.singletonList("TEXTE[Ouvert 7 j/7 de 8 h à 22 h]"), bloc(d, TicketDocument.MESSAGE));
        assertFalse(String.join("", bloc(d, TicketDocument.COORDONNEES)).contains("KOUASSI"));
        assertTrue(bloc(d, TicketDocument.TITRE).get(0).startsWith("TRAIT_FIN"),
                bloc(d, TicketDocument.TITRE).toString());
        assertTrue(texte(d).contains("3 lignes · 4 articles"), texte(d));
    }

    @Test
    void venteATermeEnGras() {
        TicketDocument d = doc(ModeleTicket.VENTE_ASSURANCE, new ReglagesTicket(ModeleTicket.VENTE_ASSURANCE));
        TicketDocument.Element e = d.existant(TicketDocument.TOTAUX).elements.stream()
                .filter(x -> "Vente à terme".equals(x.a)).findFirst().orElse(null);
        assertNotNull(e, texte(d));
        assertEquals(TicketDocument.Style.GRAS, e.style);
    }

    /* ---------- reglages : version, defauts, communs ---------- */

    @Test
    void nouvellesValeursParDefaut() {
        ReglagesTicket r = new ReglagesTicket(ModeleTicket.VENTE);
        assertEquals("Arial Narrow", r.police());
        assertEquals(-2, r.position(TicketDocument.ENTETE).taille);
        assertEquals(-1, r.position(TicketDocument.TITRE).taille);
        assertEquals(-1, r.position(TicketDocument.CLIENT).taille);
        assertEquals(-1, r.position(TicketDocument.CORPS).nom);
        assertEquals(-1, r.position(TicketDocument.CORPS).detail);
        assertEquals(-2, new ReglagesTicket(ModeleTicket.VENTE_MIXTE).position(TicketDocument.TITRE).taille);
        assertEquals(-1, new ReglagesTicket(ModeleTicket.TICKET_Z).position(TicketDocument.CORPS).section);
        assertEquals(2, r.json().getInt("version"));
    }

    @Test
    void reglagesEnregistresAvantLe0511Inchanges() {
        JSONObject ancien = new JSONObject().put("modele", "NOUVEAU").put("police", "Tahoma");
        ReglagesTicket r = ReglagesTicket.depuis(ModeleTicket.VENTE, ancien);
        assertEquals(1, r.version());
        assertEquals("Tahoma", r.police());
        assertTrue(r.disposition().isEmpty());
        assertTrue(r.cadreNet());
        ReglagesTicket sansPolice = ReglagesTicket.depuis(ModeleTicket.VENTE,
                new JSONObject().put("modele", "NOUVEAU"));
        assertEquals("Segoe UI", sansPolice.police());
        // relu puis reecrit : toujours version 1
        assertEquals(1, ReglagesTicket.depuis(ModeleTicket.VENTE, r.json()).version());
    }

    @Test
    void positionLargeurEtPartiesEnJson() {
        ReglagesTicket.Position p = new ReglagesTicket.Position(TicketDocument.CORPS, "C", 1, 10, 2, -1, 3);
        assertEquals(ReglagesTicket.LARGEUR_MIN, p.largeur);
        JSONObject j = new ReglagesTicket(ModeleTicket.VENTE).json();
        j.put("disposition",
                new JSONArray().put(new JSONObject().put("bloc", TicketDocument.CORPS).put("alignement", "")
                        .put("taille", 0).put("largeur", 60).put("section", 2).put("nom", -1).put("detail", 9)));
        ReglagesTicket r = ReglagesTicket.depuis(ModeleTicket.VENTE, j);
        ReglagesTicket.Position c = r.position(TicketDocument.CORPS);
        assertEquals(60, c.largeur);
        assertEquals(2, c.section);
        assertEquals(ReglagesTicket.ECART_TAILLE_MAX, c.detail);
        assertEquals(60, ReglagesTicket.depuis(ModeleTicket.VENTE, r.json()).position(TicketDocument.CORPS).largeur);
    }

    @Test
    void reglagesCommunsReportes() {
        JSONObject j = new ReglagesTicket(ModeleTicket.VENTE).json().put("police", "Tahoma").put("marge", 3);
        j.put("disposition", new JSONArray()
                .put(new JSONObject().put("bloc", TicketDocument.ENTETE).put("alignement", "G").put("taille", 1)
                        .put("largeur", 80))
                .put(new JSONObject().put("bloc", TicketDocument.CORPS).put("alignement", "").put("taille", 2))
                .put(new JSONObject().put("bloc", TicketDocument.PIED).put("alignement", "").put("taille", -1)));
        ReglagesTicket source = ReglagesTicket.depuis(ModeleTicket.VENTE, j);
        ReglagesTicket cible = new ReglagesTicket(ModeleTicket.TICKET_Z).avecCommuns(source);
        assertEquals("Tahoma", cible.police());
        assertEquals(3, cible.marge());
        assertEquals(1, cible.position(TicketDocument.ENTETE).taille);
        assertEquals(80, cible.position(TicketDocument.ENTETE).largeur);
        assertEquals("G", cible.position(TicketDocument.ENTETE).alignement);
        assertEquals(-1, cible.position(TicketDocument.PIED).taille);
        List<ReglagesTicket.Position> d = cible.disposition();
        assertEquals(TicketDocument.PIED, d.get(d.size() - 1).bloc);
        // le corps n'est pas commun : celui du ticket Z garde son reglage
        assertEquals(-1, cible.position(TicketDocument.CORPS).section);
        assertEquals(0, cible.position(TicketDocument.CORPS).taille);
        assertTrue(RenduTicket.controler(cible, new java.util.ArrayList<>()).isEmpty());
    }

    /* ---------- rendu ---------- */

    @Test
    void blocRetreciSurUneLigneAvecPoints() {
        JSONObject j = new ReglagesTicket(ModeleTicket.VENTE).json();
        j.put("disposition", new JSONArray().put(new JSONObject().put("bloc", TicketDocument.COORDONNEES)
                .put("alignement", "C").put("taille", 0).put("largeur", 40)));
        ReglagesTicket r = ReglagesTicket.depuis(ModeleTicket.VENTE, j);
        ReglagesTicket normal = new ReglagesTicket(ModeleTicket.VENTE);
        RenduTicket.Resultat[] etroit = new RenduTicket.Resultat[1];
        RenduTicket.Resultat[] large = new RenduTicket.Resultat[1];
        RenduTicket.apercu(doc(ModeleTicket.VENTE, r), r, 80, 1, etroit);
        RenduTicket.apercu(doc(ModeleTicket.VENTE, normal), normal, 80, 1, large);
        assertTrue(etroit[0].debordements.isEmpty(), etroit[0].debordements.toString());
        int[] ze = etroit[0].zones.get(TicketDocument.COORDONNEES);
        int[] zl = large[0].zones.get(TicketDocument.COORDONNEES);
        // une ligne par texte : le bloc retreci n'est jamais plus haut
        assertTrue(ze[1] - ze[0] <= zl[1] - zl[0], (ze[1] - ze[0]) + " > " + (zl[1] - zl[0]));
    }

    @Test
    void pointsDeSuspension() {
        BufferedImage img = new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setFont(new java.awt.Font("Dialog", java.awt.Font.PLAIN, 9));
        String t = "BOULEVARD DE LA REPUBLIQUE ABIDJAN PLATEAU";
        double l = g.getFontMetrics().stringWidth(t) / 2.0;
        g.dispose();
        String p = RenduTicket.pointsPour(t, l);
        assertTrue(p.endsWith("…"), p);
        assertTrue(p.length() < t.length(), p);
    }

    @Test
    void margeEtTailleDuCodeBarres() {
        ReglagesTicket sans = new ReglagesTicket(ModeleTicket.VENTE);
        JSONObject j = sans.json().put("marge", 4);
        JSONArray d = j.getJSONArray("disposition");
        d.put(new JSONObject().put("bloc", TicketDocument.PIED).put("alignement", "").put("taille", 3));
        ReglagesTicket avec = ReglagesTicket.depuis(ModeleTicket.VENTE, j);
        assertEquals(4, avec.marge());
        RenduTicket.Resultat[] a = new RenduTicket.Resultat[1];
        RenduTicket.Resultat[] b = new RenduTicket.Resultat[1];
        RenduTicket.apercu(doc(ModeleTicket.VENTE, sans), sans, 80, 1, a);
        RenduTicket.apercu(doc(ModeleTicket.VENTE, avec), avec, 80, 1, b);
        assertTrue(b[0].debordements.isEmpty(), b[0].debordements.toString());
        int[] pa = a[0].zones.get(TicketDocument.PIED);
        int[] pb = b[0].zones.get(TicketDocument.PIED);
        assertTrue(pb[1] - pb[0] > pa[1] - pa[0], "code-barres agrandi");
        assertTrue(RenduTicket.controler(avec, new java.util.ArrayList<>()).isEmpty());
        assertNull(sans.position(TicketDocument.PIED));
    }
}
