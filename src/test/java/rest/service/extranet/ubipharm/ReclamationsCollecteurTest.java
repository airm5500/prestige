package rest.service.extranet.ubipharm;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.FauxExtranet;
import rest.service.extranet.commun.FauxExtranet.Reponse;
import rest.service.extranet.commun.SourceExtranet;
import rest.service.extranet.commun.TransportExtranet;

/**
 * Collecte des reclamations contre un faux extranet local (127.0.0.1) : requetes exactes, controles avant appel,
 * completude, session expiree, PDF. Aucun vrai extranet n'est appele.
 */
class ReclamationsCollecteurTest {

    private static final String CONNEXION = "<html><body><form action='/Login' method='post'>"
            + "<input name='login'><input type='password' name='pwd'></form></body></html>";

    private static TransportExtranet transport(FauxExtranet f) {
        return f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=essai-local");
    }

    @Test
    void listeRequeteExacte() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            String json = ReclamationsParseurTest.ressource("reconstitue-liste-all.json");
            f.route(ReclamationsCollecteur.CHEMIN_LISTE, Reponse.json(json));
            for (String filtre : List.of("ALL", "C", "V")) {
                List<ReclamationUbipharm> l = ReclamationsCollecteur.liste(transport(f), filtre);
                assertEquals(5, l.size());
                FauxExtranet.Appel a = f.appels().get(f.appels().size() - 1);
                assertEquals("GET", a.methode);
                assertEquals("/ReturnReclamationsTransmisesJSON", a.chemin);
                assertEquals("filtre=" + filtre, a.requete);
                assertEquals("XMLHttpRequest", a.ajax);
                assertEquals("SESSIONID=essai-local", a.cookie);
            }
            assertEquals(3, f.appels().size());
        }
    }

    @Test
    void filtreInvalideAucunAppel() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            f.route(ReclamationsCollecteur.CHEMIN_LISTE, Reponse.json("{}"));
            TransportExtranet t = transport(f);
            for (String filtre : Arrays.asList(null, "", "all", "S", "SUP", "ALL&x=1", " C ", "D", "ALL ")) {
                assertThrows(IllegalArgumentException.class, () -> ReclamationsCollecteur.liste(t, filtre),
                        String.valueOf(filtre));
            }
            assertEquals(0, f.appels().size());
            assertEquals(0, t.appels());
        }
    }

    @Test
    void parametresDeDetailInvalidesAucunAppel() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            TransportExtranet t = transport(f);
            String[][] refuses = { { null, "VRI", "EXT" }, { "12a", "VRI", "EXT" }, { "1408456", "", "EXT" },
                    { "1408456", "VRI&x=1", "EXT" }, { "1408456", "VRI", "EXTRAVAGANT1" }, { "1408456", "V-R", "EXT" },
                    { "1408456", "VRI", null }, { "-1", "VRI", "EXT" } };
            for (String[] p : refuses) {
                assertThrows(IllegalArgumentException.class, () -> ReclamationsCollecteur.detail(t, p[0], p[1], p[2]));
                assertThrows(IllegalArgumentException.class, () -> ReclamationsCollecteur.pdf(t, p[0], p[1], p[2]));
            }
            assertEquals(0, f.appels().size());
        }
    }

    @Test
    void listeIncompleteRefusee() throws Exception {
        JSONArray data = new JSONArray();
        for (int i = 0; i < 1051; i++) {
            data.put(new JSONArray()
                    .put("<a href=\"AfficherReclamation?id=" + (1400000 + i) + "&amp;eta=VRI&amp;appl=EXT\"></a>")
                    .put("EXT" + (1400000 + i) + "VRI").put("").put("Clôturée").put("01/01/2026").put("02/01/2026"));
        }
        String json = new JSONObject().put("msg", new JSONArray())
                .put("datatables",
                        new JSONObject().put("recordsFiltered", 1052).put("recordsTotal", 1052).put("data", data))
                .toString();
        try (FauxExtranet f = new FauxExtranet()) {
            f.route(ReclamationsCollecteur.CHEMIN_LISTE, Reponse.json(json));
            ExtranetException e = assertThrows(ExtranetException.class,
                    () -> ReclamationsCollecteur.liste(transport(f), "ALL"));
            assertEquals(ExtranetException.Nature.PAGINATION, e.nature());
            assertTrue(e.getMessage().contains("1051") && e.getMessage().contains("1052"));
        }
    }

    @Test
    void pageDeConnexionEn200ExpireLaSession() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            f.route(ReclamationsCollecteur.CHEMIN_LISTE, Reponse.html(CONNEXION));
            f.route(ReclamationsCollecteur.CHEMIN_DETAIL, Reponse.html(CONNEXION));
            assertEquals(ExtranetException.Nature.SESSION_EXPIREE,
                    assertThrows(ExtranetException.class, () -> ReclamationsCollecteur.liste(transport(f), "ALL"))
                            .nature());
            assertEquals(ExtranetException.Nature.SESSION_EXPIREE, assertThrows(ExtranetException.class,
                    () -> ReclamationsCollecteur.detail(transport(f), "1408456", "VRI", "EXT")).nature());
        }
    }

    @Test
    void detailRequeteExacte() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            f.route(ReclamationsCollecteur.CHEMIN_DETAIL,
                    Reponse.html(ReclamationsParseurTest.ressource("reconstitue-detail-EXT1408456VRI.html")));
            ReclamationUbipharm r = ReclamationsCollecteur.detail(transport(f), "1408456", "VRI", "EXT");
            assertEquals("EXT1408456VRI", r.reference());
            assertEquals("RABE102", r.lignes().get(0).pscode());
            FauxExtranet.Appel a = f.appels().get(0);
            assertEquals("GET", a.methode);
            assertEquals("/AfficherReclamation", a.chemin);
            assertEquals("id=1408456&eta=VRI&appl=EXT", a.requete);
        }
    }

    @Test
    void pdfValideOctetsIdentiquesEtSha256(@TempDir Path dossier) throws Exception {
        byte[] pdf = new byte[3000];
        byte[] tete = "%PDF-1.4\n%âãÏÓ\n".getBytes(StandardCharsets.ISO_8859_1);
        System.arraycopy(tete, 0, pdf, 0, tete.length);
        for (int i = tete.length; i < pdf.length; i++) {
            pdf[i] = (byte) (i * 31 + 7); /* octets binaires, y compris hors ASCII */
        }
        try (FauxExtranet f = new FauxExtranet()) {
            f.route(ReclamationsCollecteur.CHEMIN_PDF, new Reponse(200, "application/pdf", pdf, null));
            ReclamationsCollecteur.PdfReclamation p = ReclamationsCollecteur.pdf(transport(f), "1408456", "VRI", "YOP");
            assertArrayEquals(pdf, p.octets());
            assertEquals(pdf.length, p.taille());
            StringBuilder hex = new StringBuilder();
            for (byte b : MessageDigest.getInstance("SHA-256").digest(pdf)) {
                hex.append(String.format("%02x", b));
            }
            assertEquals(hex.toString(), p.sha256());
            assertEquals(Map.of("id", "1408456", "eta", "VRI", "appl", "YOP"), p.parametres());
            assertEquals("/ReclamationPDF", p.cheminSource());
            assertEquals("application/pdf", p.typeContenu());
            FauxExtranet.Appel a = f.appels().get(0);
            assertEquals("/ReclamationPDF", a.chemin);
            assertEquals("id=1408456&eta=VRI&appl=YOP", a.requete);

            /* ecriture disque : nom tire du SHA-256, octets relus identiques, pas de doublon */
            String nom = ReclamationsDepot.ecrireFichier(dossier, p.octets(), p.sha256());
            assertEquals(p.sha256() + ".pdf", nom);
            assertArrayEquals(pdf, Files.readAllBytes(dossier.resolve(nom)));
            assertEquals(nom, ReclamationsDepot.ecrireFichier(dossier, p.octets(), p.sha256()));
            try (var l = Files.list(dossier)) {
                assertEquals(1, l.count());
            }
            assertThrows(IllegalArgumentException.class,
                    () -> ReclamationsDepot.ecrireFichier(dossier, new byte[] { 1 }, p.sha256()));
            assertEquals("id=1408456&eta=VRI&appl=YOP", ReclamationsDepot.parametres(p.parametres()));
        }
    }

    @Test
    void pageHtmlServieEnPdfRefusee() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            f.route(ReclamationsCollecteur.CHEMIN_PDF, new Reponse(200, "application/pdf",
                    "<html><body><h1>Erreur 500</h1></body></html>".getBytes(StandardCharsets.UTF_8), null));
            ExtranetException e = assertThrows(ExtranetException.class,
                    () -> ReclamationsCollecteur.pdf(transport(f), "1408456", "VRI", "EXT"));
            assertEquals(ExtranetException.Nature.REPONSE_INATTENDUE, e.nature());
        }
        try (FauxExtranet f = new FauxExtranet()) {
            f.route(ReclamationsCollecteur.CHEMIN_PDF,
                    new Reponse(200, "application/pdf", CONNEXION.getBytes(StandardCharsets.UTF_8), null));
            assertEquals(ExtranetException.Nature.SESSION_EXPIREE, assertThrows(ExtranetException.class,
                    () -> ReclamationsCollecteur.pdf(transport(f), "1408456", "VRI", "EXT")).nature());
        }
        try (FauxExtranet f = new FauxExtranet()) {
            f.route(ReclamationsCollecteur.CHEMIN_PDF, new Reponse(200, "application/pdf", new byte[0], null));
            assertThrows(ExtranetException.class, () -> ReclamationsCollecteur.pdf(transport(f), "1", "A", "B"));
        }
    }

    @Test
    void lectureSeuleParConstruction() {
        for (Method m : ReclamationsCollecteur.class.getDeclaredMethods()) {
            if (Modifier.isPublic(m.getModifiers())) {
                String n = m.getName().toLowerCase();
                assertFalse(n.contains("creer") || n.contains("envoyer") || n.contains("repondre")
                        || n.contains("modifier") || n.contains("soumettre") || n.contains("post"), m.getName());
            }
        }
        for (String c : List.of(ReclamationsCollecteur.CHEMIN_LISTE, ReclamationsCollecteur.CHEMIN_DETAIL,
                ReclamationsCollecteur.CHEMIN_PDF)) {
            assertTrue(c.startsWith("/") && !c.contains("?"));
        }
    }
}
