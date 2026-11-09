package rest.service.extranet.commun;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import org.json.JSONArray;
import org.junit.jupiter.api.Test;
import rest.service.extranet.commun.FauxExtranet.Reponse;
import rest.service.extranet.commun.TransportExtranet.Attendu;

/**
 * Fichiers des documents des extranets (demande du 09/11, point 4). Regles verifiees sur des milliers de documents
 * tires au hasard (graine fixe) : les parametres envoyes sont exactement les references gardees de la ligne plus les
 * valeurs fixes relevees sur l'extranet ; une reference absente ou de forme inattendue (separateur d'adresse, espace,
 * chemin, trop longue) n'est jamais envoyee ; le nom du fichier ne contient que des caracteres surs, porte le grossiste
 * et l'extension du format ; le fichier rendu est celui de l'extranet, octet pour octet.
 */
class FichiersExtranetCoherenceTest {

    private static final String SURS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    /** caracteres jamais admis dans une reference (le « / », le « . », le « - » et le « _ » le sont) */
    private static final String INTERDITS = "&?=#%\\ :;'\"<>éÀ+,";
    private static final String PIEGES = INTERDITS + "./-_";

    private static String hasard(Random r, String alphabet, int min, int max) {
        int n = min + r.nextInt(max - min + 1);
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < n; i++) {
            b.append(alphabet.charAt(r.nextInt(alphabet.length())));
        }
        return b.toString();
    }

    @Test
    void catalogueReleve() throws Exception {
        /* ce que l'extranet propose, ni plus ni moins (releve du 09/11) */
        List<String> attendu = Arrays.asList("UBIPHARM FACTURES CSV /BLVCSV csv",
                "UBIPHARM FACTURES EXCEL /BLVExcel xlsx", "UBIPHARM FACTURES TXT /BLVTxt txt",
                "TEDIS TEDIS_BL_QUINZAINE TXT /exportationsBlTxt txt",
                "TEDIS TEDIS_BL_QUINZAINE CSV /exportationsBlQuizainecsv csv",
                "DPCI DPCI_FACTURES CSV_9 /ExportDonnee.action csv",
                "DPCI DPCI_FACTURES CSV_2 /ExportDonnee.action csv",
                "COPHARMED COPHARMED_FACTURES CSV ViewPharmacy-DownloadInvoiceCSVXLS csv",
                "COPHARMED COPHARMED_FACTURES EXCEL ViewPharmacy-DownloadInvoiceCSVXLS xls",
                "COPHARMED COPHARMED_AVOIRS CSV ViewPharmacy-DownloadInvoiceCSVXLS csv",
                "COPHARMED COPHARMED_AVOIRS EXCEL ViewPharmacy-DownloadInvoiceCSVXLS xls",
                /* releve du 09/11 : icone PDF de chaque releve Copharmed */
                "COPHARMED COPHARMED_RELEVES PDF ViewPharmacy-DownloadStatementsPDF pdf");
        List<String> vu = new ArrayList<>();
        for (FichiersExtranet.Fichier f : FichiersExtranet.tous()) {
            String c = f.chemin.substring(f.chemin.lastIndexOf('/') + (f.source == SourceExtranet.COPHARMED ? 1 : 0));
            vu.add(f.source + " " + f.liste + " " + f.format + " " + c + " " + f.extension);
            TransportExtranet.verifierChemin(f.chemin);
            TransportExtranet.verifierChemin(f.referer);
        }
        assertEquals(attendu, vu);
        assertNull(FichiersExtranet.un(SourceExtranet.DPCI, "DPCI_BL", "CSV_9"), "BL DPCI : PDF seulement");
        assertNull(FichiersExtranet.un(SourceExtranet.DPCI, "DPCI_AVOIRS", "CSV_9"), "avoirs DPCI non proposes");
        assertNull(FichiersExtranet.un(SourceExtranet.UBIPHARM, "FACTURES", "PDF"));
        assertNull(FichiersExtranet.un(SourceExtranet.TEDIS, "FACTURES", "CSV"), "liste d'un autre extranet");
        assertEquals("TXT", FichiersExtranet.un(SourceExtranet.UBIPHARM, "FACTURES", " txt ").format);
    }

    @Test
    void parametresExactsEtReferencesRefusees_hasard() throws Exception {
        Random r = new Random(20261109L);
        int envoyes = 0, refuses = 0;
        for (int t = 0; t < 6000; t++) {
            FichiersExtranet.Fichier f = FichiersExtranet.tous().get(r.nextInt(FichiersExtranet.tous().size()));
            Map<String, String> doc = new LinkedHashMap<>();
            boolean piege = false;
            for (String c : f.cles) {
                int choix = r.nextInt(10);
                String v;
                if (c.equals("date")) {
                    v = choix == 0 ? "07/11/2026" : LocalDate.of(2024, 1, 1).plusDays(r.nextInt(1500)).toString();
                    piege |= choix == 0;
                } else if (choix == 0) {
                    v = hasard(r, SURS, 1, 10) + INTERDITS.charAt(r.nextInt(INTERDITS.length()))
                            + hasard(r, SURS, 1, 10);
                    piege = true;
                } else if (choix == 1 && r.nextBoolean()) {
                    v = hasard(r, SURS, 41, 60);
                    piege = true;
                } else if (choix == 1) {
                    v = null;
                    piege = true;
                } else {
                    v = hasard(r, SURS, 1, 12) + (r.nextBoolean() ? "-" + hasard(r, SURS, 1, 6) : "");
                }
                if (v != null) {
                    doc.put(c, v);
                }
            }
            if (piege) {
                assertThrows(IllegalArgumentException.class, () -> f.parametres(doc), f.liste + " " + doc);
                assertEquals(0, FichiersExtranet.formats(f.source, f.liste, doc).toList().stream()
                        .filter(x -> ((Map<?, ?>) x).get("format").equals(f.format)).count());
                refuses++;
                continue;
            }
            Map<String, String> p = f.parametres(doc);
            /* chaque valeur envoyee vient de la ligne ou des valeurs fixes de l'extranet */
            Set<String> valeurs = new HashSet<>(doc.values());
            if (f.source == SourceExtranet.DPCI) {
                String j = doc.get("date").replace("-", "");
                assertEquals(Arrays.asList("dateDebut", "dateFin", "typeDocument", "nbColonnes", "selectIdDocument"),
                        new ArrayList<>(p.keySet()));
                assertEquals(j, p.get("dateDebut"));
                assertEquals(j, p.get("dateFin"));
                assertEquals("FACTURE", p.get("typeDocument"));
                assertEquals(f.format.substring(4), p.get("nbColonnes"));
                assertEquals(doc.get("id"), p.get("selectIdDocument"));
            } else if (f.source == SourceExtranet.COPHARMED && "COPHARMED_RELEVES".equals(f.liste)) {
                /* releve : les trois references du lien PDF, dans son ordre, rien d'autre */
                assertEquals(Arrays.asList("StatementNo", "SpoolName", "Year"), new ArrayList<>(p.keySet()));
                for (String c : p.keySet()) {
                    assertEquals(doc.get(c), p.get(c));
                }
            } else if (f.source == SourceExtranet.COPHARMED) {
                assertEquals(doc.get("InvoiceNo"), p.get("InvoiceNo"));
                assertEquals(f.liste.endsWith("FACTURES") ? "Invoices" : "CreditNotes", p.get("Type"));
                assertEquals(f.extension, p.get("Format"));
                assertEquals(3, p.size());
            } else {
                assertEquals(new LinkedHashMap<>(doc), new LinkedHashMap<>(p));
                assertTrue(valeurs.containsAll(p.values()));
            }
            assertTrue(FichiersExtranet.formats(f.source, f.liste, doc).length() == FichiersExtranet
                    .de(f.source, f.liste).size(), "toutes les references : tous les formats de la liste");
            envoyes++;
        }
        assertTrue(envoyes > 3000 && refuses > 1000, envoyes + " / " + refuses);
    }

    @Test
    void nomDuFichier_hasard() {
        Random r = new Random(9112026L);
        for (int t = 0; t < 4000; t++) {
            FichiersExtranet.Fichier f = FichiersExtranet.tous().get(r.nextInt(FichiersExtranet.tous().size()));
            String numero = r.nextInt(8) == 0 ? (r.nextBoolean() ? null : "   ") : hasard(r, SURS + PIEGES, 1, 90);
            String nom = f.nom(numero);
            assertTrue(nom.matches("[A-Za-z0-9._-]+"), nom);
            assertTrue(nom.startsWith(f.prefixe), nom);
            assertTrue(nom.endsWith("." + f.extension), nom);
            assertFalse(nom.contains(".."), nom);
            assertTrue(nom.length() <= f.prefixe.length() + 1 + 60 + 1 + f.extension.length(), nom);
        }
        FichiersExtranet.Fichier tedis = FichiersExtranet.un(SourceExtranet.TEDIS, "TEDIS_BL_QUINZAINE", "TXT");
        assertEquals("TEDIS_BLV_2629645160-BKE.txt", tedis.nom("2629645160-BKE"));
        assertEquals("Ubipharm_BLV_BKE-765220.xlsx",
                FichiersExtranet.un(SourceExtranet.UBIPHARM, "FACTURES", "EXCEL").nom("BKE/765220"));
        assertEquals("DPCI_Facture_9col_R40237756.csv",
                FichiersExtranet.un(SourceExtranet.DPCI, "DPCI_FACTURES", "CSV_9").nom("R40237756"));
        assertEquals("TEDIS_BLV.txt", tedis.nom(""));
    }

    /**
     * Essai reel du 09/11 : le BLV Excel d'Ubipharm est un classeur xlsx (signature ZIP « PK »), l'Excel de Copharmed
     * un xls (signature OLE « D0 CF 11 E0 »). L'extension et le type rendus suivent la signature du fichier recu,
     * jamais une extension figee qu'Excel signalerait a l'ouverture. Jeux tires au hasard (graine fixe), tous les
     * fichiers.
     */
    @Test
    void extensionSelonSignature_hasard() {
        byte[] zip = { 0x50, 0x4B, 0x03, 0x04 };
        byte[] ole = { (byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0 };
        byte[] html = "<table><tr><td>1</td></tr></table>".getBytes(StandardCharsets.UTF_8);
        Random r = new Random(9112026L);
        int xlsx = 0, xls = 0, autres = 0;
        for (int t = 0; t < 3000; t++) {
            FichiersExtranet.Fichier f = FichiersExtranet.tous().get(r.nextInt(FichiersExtranet.tous().size()));
            byte[] corps = new byte[r.nextInt(3) == 0 ? r.nextInt(4) : 4 + r.nextInt(500)];
            r.nextBytes(corps);
            int genre = r.nextInt(4);
            byte[] tete = genre == 0 ? zip : genre == 1 ? ole : genre == 2 ? html : new byte[0];
            System.arraycopy(tete, 0, corps, 0, Math.min(tete.length, corps.length));
            boolean complet = corps.length >= tete.length;
            String numero = "N" + r.nextInt(1_000_000);
            String nom = f.nom(numero, corps);
            String type = f.typeMime(corps);
            if ("EXCEL".equals(f.format) && complet && genre == 0) {
                assertTrue(nom.endsWith(".xlsx"), nom);
                assertEquals("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", type);
                xlsx++;
            } else if ("EXCEL".equals(f.format)) {
                assertTrue(nom.endsWith(".xls"), nom);
                assertEquals("application/vnd.ms-excel", type);
                xls++;
            } else {
                /* CSV et TXT : toujours l'extension et le type declares, quel que soit le debut du corps */
                assertEquals(f.nom(numero), nom);
                assertEquals(f.typeMime, type);
                autres++;
            }
            assertEquals(f.nom(numero).replaceAll("\\.[a-z]+$", ""), nom.replaceAll("\\.[a-z]+$", ""), nom);
        }
        assertTrue(xlsx > 100 && xls > 100 && autres > 1000, xlsx + " / " + xls + " / " + autres);
        assertEquals("Ubipharm_BLV_BKE-765220.xlsx",
                FichiersExtranet.un(SourceExtranet.UBIPHARM, "FACTURES", "EXCEL").nom("BKE/765220", zip));
        assertEquals("Copharmed_Facture_26-999999-99.xls",
                FichiersExtranet.un(SourceExtranet.COPHARMED, "COPHARMED_FACTURES", "EXCEL").nom("26-999999-99", ole));
        FichiersExtranet.Fichier ubi = FichiersExtranet.un(SourceExtranet.UBIPHARM, "FACTURES", "EXCEL");
        assertEquals(ubi.nom("x"), ubi.nom("x", null));
    }

    /** Nom propose a « Enregistrer sous » : le meme que celui du fichier rendu, pour chaque format de la ligne. */
    @Test
    void nomProposeParFormat() {
        Map<String, String> d = new LinkedHashMap<>();
        d.put("fcnum", "765220");
        d.put("etcoda", "BKE");
        JSONArray a = FichiersExtranet.formats(SourceExtranet.UBIPHARM, "FACTURES", d, "BKE/765220");
        assertEquals(3, a.length());
        assertEquals("Ubipharm_BLV_BKE-765220.csv", a.getJSONObject(0).getString("nom"));
        assertEquals("Ubipharm_BLV_BKE-765220.xlsx", a.getJSONObject(1).getString("nom"));
        assertEquals("Ubipharm_BLV_BKE-765220.txt", a.getJSONObject(2).getString("nom"));
        for (FichiersExtranet.Fichier f : FichiersExtranet.de(SourceExtranet.UBIPHARM, "FACTURES")) {
            assertEquals(f.nom("BKE/765220"),
                    FichiersExtranet.formats(SourceExtranet.UBIPHARM, "FACTURES", d, "BKE/765220")
                            .getJSONObject(FichiersExtranet.de(SourceExtranet.UBIPHARM, "FACTURES").indexOf(f))
                            .getString("nom"));
        }
        assertEquals("Ubipharm_BLV.csv", FichiersExtranet.formats(SourceExtranet.UBIPHARM, "FACTURES", d, null)
                .getJSONObject(0).getString("nom"));
    }

    @Test
    void colonneDuNumero() {
        assertEquals(3, FichiersExtranet
                .colonneNumero(new JSONArray(Arrays.asList("Quinzaine", "Date", "Type", "N° Document", "Total HT"))));
        assertEquals(0, FichiersExtranet.colonneNumero(new JSONArray(Arrays.asList("N° avoir", "Date"))));
        assertEquals(-1, FichiersExtranet.colonneNumero(new JSONArray(Arrays.asList("N° commande", "Date"))));
    }

    @Test
    void documentGardeRelu() {
        Map<String, String> d = new LinkedHashMap<>();
        d.put("fcnum", "F261000");
        d.put("etcoda", "BKE");
        assertEquals(d, FichiersExtranet.lireDocument(FichiersExtranet.ecrireDocument(d)));
        assertNull(FichiersExtranet.ecrireDocument(null));
        assertNull(FichiersExtranet.lireDocument(null));
        assertNull(FichiersExtranet.lireDocument("pas du json"));
        assertNull(FichiersExtranet.lireDocument("{}"));
    }

    /* ================================================== transport : le fichier de l'extranet, tel quel */

    @Test
    void fichierRenduOctetPourOctet() throws Exception {
        byte[] csv = "N° BL;CIP;Qté\r\nYOP-1;3400000000012;12\r\néàù;€;0\r\n".getBytes(StandardCharsets.ISO_8859_1);
        byte[] xls = new byte[600];
        new Random(7).nextBytes(xls);
        xls[0] = (byte) 0xD0;
        xls[1] = (byte) 0xCF;
        byte[] txt = "2629645160-BKE|3400000000012|5\n".getBytes(StandardCharsets.UTF_8);
        String tableau = "<table><tr><td>YOP-1</td><td>12</td></tr></table>";
        try (FauxExtranet f = new FauxExtranet()) {
            f.route("/BLVCSV", new Reponse(200, "text/csv", csv, Map.of()));
            f.route("/BLVExcel", new Reponse(200, "application/vnd.ms-excel", xls, Map.of()));
            /* TEDIS sert du texte avec un type HTML : le corps fait foi */
            f.route("/exportationsBlTxt", new Reponse(200, "text/html; charset=UTF-8", txt, Map.of()));
            f.route("/BLVTxt", Reponse.html(tableau));
            TransportExtranet t = f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=x");
            assertArrayEquals(csv, t.lire("/BLVCSV", null, Attendu.FICHIER, "/ListeFactures").octets());
            assertArrayEquals(xls, t.lire("/BLVExcel", null, Attendu.FICHIER_HTML_ADMIS, null).octets());
            assertArrayEquals(txt, t.lire("/exportationsBlTxt", null, Attendu.FICHIER, null).octets());
            /* un Excel en tableau HTML est admis ; un texte attendu qui arrive en page HTML est refuse */
            assertEquals(tableau, new String(t.lire("/BLVTxt", null, Attendu.FICHIER_HTML_ADMIS, null).octets(),
                    StandardCharsets.UTF_8));
            assertEquals(ExtranetException.Nature.REPONSE_INATTENDUE,
                    assertThrows(ExtranetException.class, () -> t.lire("/BLVTxt", null, Attendu.FICHIER, null))
                            .nature());
        }
    }

    @Test
    void pageDErreurOuDeConnexionAuLieuDuFichier() throws Exception {
        String connexion = "<html><body><form action='/Login' method='post'>"
                + "<input name='login'><input type='password' name='pwd'></form></body></html>";
        try (FauxExtranet f = new FauxExtranet()) {
            f.route("/erreur", Reponse.html("<!DOCTYPE html><html><body>Erreur 500</body></html>"));
            f.route("/vide", new Reponse(200, "text/csv", new byte[0], Map.of()));
            f.route("/connexion", Reponse.html(connexion));
            TransportExtranet t = f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=x");
            assertEquals(ExtranetException.Nature.REPONSE_INATTENDUE,
                    assertThrows(ExtranetException.class, () -> t.lire("/erreur", null, Attendu.FICHIER, null))
                            .nature());
            assertEquals(ExtranetException.Nature.REPONSE_INATTENDUE,
                    assertThrows(ExtranetException.class, () -> t.lire("/vide", null, Attendu.FICHIER, null)).nature());
            assertEquals(ExtranetException.Nature.SESSION_EXPIREE, assertThrows(ExtranetException.class,
                    () -> t.lire("/connexion", null, Attendu.FICHIER_HTML_ADMIS, null)).nature());
        }
    }
}
