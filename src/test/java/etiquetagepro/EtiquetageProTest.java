package etiquetagepro;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.itextpdf.text.pdf.PdfReader;
import com.itextpdf.text.pdf.parser.PdfTextExtractor;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import rest.report.pdf.Gs1;
import rest.report.pdf.LabelSheetPdf;

/** Etiquetage Pro : lecture des fichiers, correspondance des zones, controle des lignes, etiquettes et PDF. */
class EtiquetageProTest {

    private static String eanValide() {
        String base = "340093000000";
        int somme = 0;
        for (int i = base.length() - 1, poids = 3; i >= 0; i--, poids = 4 - poids) {
            somme += (base.charAt(i) - '0') * poids;
        }
        return base + ((10 - somme % 10) % 10);
    }

    /* ------------------------------------------------------------- CSV */

    @Test
    void csvPointVirguleUtf8AvecBomEtGuillemets() throws Exception {
        String csv = "﻿CIP;Libellé;Prix\r\n8476972;\"DOLIPRANE; 1000\";1 500\r\n\r\n1234567;ÉPHÉDRINE;250\r\n";
        Tableau t = LecteurTableau.lire("a.csv", csv.getBytes(StandardCharsets.UTF_8), null, true);
        assertEquals(Arrays.asList("CIP", "Libellé", "Prix"), t.getColonnes());
        assertEquals(2, t.getLignes().size(), "ligne vide ignoree");
        assertEquals("DOLIPRANE; 1000", t.getLignes().get(0).get(1));
        assertEquals("ÉPHÉDRINE", t.getLignes().get(1).get(1));
        assertEquals(";", t.getSeparateur());
        assertEquals("UTF-8", t.getEncodage());
    }

    @Test
    void csvVirguleEtWindows1252() throws Exception {
        String csv = "Code,Désignation,PV\n111,Crème à l'arnica,900\n222,Sérum,1200\n";
        Tableau t = LecteurTableau.lire("b.csv", csv.getBytes(Charset.forName("windows-1252")), null, true);
        assertEquals(",", t.getSeparateur());
        assertEquals("Windows-1252", t.getEncodage());
        assertEquals("Crème à l'arnica", t.getLignes().get(0).get(1));
        assertEquals("Désignation", t.getColonnes().get(1));
    }

    @Test
    void csvTabulationSansTitresEtTitresEnDouble() throws Exception {
        Tableau t = LecteurTableau.lire("c.txt", "1\tA\t10\n2\tB\t20\n".getBytes(StandardCharsets.UTF_8), null, false);
        assertEquals("tabulation", t.getSeparateur());
        assertEquals(Arrays.asList("Colonne 1", "Colonne 2", "Colonne 3"), t.getColonnes());
        assertEquals(2, t.getLignes().size());
        Tableau d = LecteurTableau.lire("d.csv", "Prix;Prix;;X\n1;2;3;4\n".getBytes(StandardCharsets.UTF_8), null,
                true);
        assertEquals(Arrays.asList("Prix", "Prix (2)", "Colonne 3", "X"), d.getColonnes());
    }

    @Test
    void csvLignesInegalesCompletees() throws Exception {
        Tableau t = LecteurTableau.lire("e.csv", "A;B;C\n1\n2;3;4;5\n".getBytes(StandardCharsets.UTF_8), null, true);
        /* une cellule au-dela des titres n'est pas perdue : colonne « Colonne 4 » */
        assertEquals(Arrays.asList("A", "B", "C", "Colonne 4"), t.getColonnes());
        assertEquals(Arrays.asList("1", "", "", ""), t.getLignes().get(0));
        assertEquals(Arrays.asList("2", "3", "4", "5"), t.getLignes().get(1));
    }

    @Test
    void fichierVideRefuse() {
        assertThrows(java.io.IOException.class, () -> LecteurTableau.lire("v.csv", new byte[0], null, true));
        assertThrows(java.io.IOException.class,
                () -> LecteurTableau.lire("faux.xlsx", "pas un classeur".getBytes(StandardCharsets.UTF_8), null, true));
    }

    /* ----------------------------------------------------------- Excel */

    @Test
    void excelGrandsNombresDatesEtFeuilles() throws Exception {
        byte[] octets;
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream o = new ByteArrayOutputStream()) {
            wb.createSheet("Notes");
            Sheet s = wb.createSheet("Produits");
            Row h = s.createRow(0);
            h.createCell(0).setCellValue("EAN");
            h.createCell(1).setCellValue("Nom");
            h.createCell(2).setCellValue("Péremption");
            h.createCell(3).setCellValue("Prix");
            Row r = s.createRow(1);
            r.createCell(0).setCellValue(3400930000007d);
            r.createCell(1).setCellValue("PRODUIT X");
            CellStyle date = wb.createCellStyle();
            date.setDataFormat(wb.getCreationHelper().createDataFormat().getFormat("dd/mm/yyyy"));
            r.createCell(2).setCellValue(java.sql.Date.valueOf(LocalDate.of(2027, 3, 31)));
            r.getCell(2).setCellStyle(date);
            r.createCell(3).setCellFormula("1000+500");
            s.createRow(3).createCell(1).setCellValue("APRES UNE LIGNE VIDE");
            wb.write(o);
            octets = o.toByteArray();
        }
        Tableau t = LecteurTableau.lire("p.xlsx", octets, "Produits", true);
        assertEquals(Arrays.asList("Notes", "Produits"), t.getFeuilles());
        assertEquals("Produits", t.getFeuille());
        assertEquals("3400930000007", t.getLignes().get(0).get(0), "jamais en notation scientifique");
        assertEquals("31/03/2027", t.getLignes().get(0).get(2));
        assertEquals("1500", t.getLignes().get(0).get(3), "formule calculee");
        assertEquals(2, t.getLignes().size());
        /* sans feuille : la premiere (vide) */
        assertEquals(0, LecteurTableau.lire("p.xlsx", octets, null, true).getLignes().size());
    }

    @Test
    void excelAncienFormatXls() throws Exception {
        byte[] octets;
        try (org.apache.poi.hssf.usermodel.HSSFWorkbook wb = new org.apache.poi.hssf.usermodel.HSSFWorkbook();
                ByteArrayOutputStream o = new ByteArrayOutputStream()) {
            Sheet s = wb.createSheet("Feuil1");
            s.createRow(0).createCell(0).setCellValue("CIP");
            s.getRow(0).createCell(1).setCellValue("Prix");
            s.createRow(1).createCell(0).setCellValue(8476972d);
            s.getRow(1).createCell(1).setCellValue(1500.5d);
            wb.write(o);
            octets = o.toByteArray();
        }
        Tableau t = LecteurTableau.lire("ancien.xls", octets, null, true);
        assertEquals(Arrays.asList("CIP", "Prix"), t.getColonnes());
        assertEquals("8476972", t.getLignes().get(0).get(0));
        assertEquals("1500,5", t.getLignes().get(0).get(1));
    }

    /* ---------------------------------------------------- correspondance */

    private static Tableau tableau() {
        List<List<String>> l = new ArrayList<>();
        l.add(Arrays.asList("8476972", "DOLIPRANE 1000", "1 500", "LABOREX", "A12", "03/2027", "2", "R1"));
        l.add(Arrays.asList("", "SANS CIP", "100", "", "", "", "", ""));
        l.add(Arrays.asList("1234567", "PRIX FAUX", "abc", "", "", "31/02/2027", "x", ""));
        return new Tableau(
                Arrays.asList("Code produit", "Libellé", "PV", "Fournisseur", "N° lot", "Exp", "Qté", "Rayon"), l);
    }

    @Test
    void propositionParTitres() {
        Correspondance c = Correspondance.proposer(tableau());
        assertEquals("{Code produit}", c.getSource(Zone.CIP));
        assertEquals("{Libellé}", c.getSource(Zone.DESIGNATION));
        assertEquals("{PV}", c.getSource(Zone.PRIX));
        assertEquals("{Fournisseur}", c.getSource(Zone.GROSSISTE));
        assertEquals("{N° lot}", c.getSource(Zone.LOT));
        assertEquals("{Exp}", c.getSource(Zone.PEREMPTION));
        assertEquals("{Qté}", c.getSource(Zone.NOMBRE));
        assertEquals("{Rayon}", c.getSource(Zone.MENTION));
        assertNull(c.getSource(Zone.EAN));
    }

    @Test
    void appliquerControleEtNumerote() {
        Correspondance c = Correspondance.proposer(tableau());
        List<LigneEtiquette> l = c.appliquer(tableau(), true);
        assertEquals(3, l.size());
        assertEquals(2, l.get(0).getNumero(), "numero de ligne du fichier, titres compris");
        assertTrue(l.get(0).imprimable(), l.get(0).getErreurs().toString());
        assertEquals(new BigDecimal("1500"), l.get(0).getPrix());
        assertEquals(LocalDate.of(2027, 3, 31), l.get(0).getPeremption());
        assertEquals(2, l.get(0).getNombre());
        assertEquals(Arrays.asList("CIP manquant"), l.get(1).getErreurs());
        assertFalse(l.get(2).imprimable());
        assertEquals(3, l.get(2).getErreurs().size(), l.get(2).getErreurs().toString());
        assertEquals(2, MoteurEtiquettes.total(l), "seules les lignes sans erreur comptent");
    }

    @Test
    void texteFixeModeleEtZoneAjoutee() {
        Correspondance c = Correspondance.proposer(tableau()).source(Zone.GROSSISTE, "COPHARMED")
                .ajouter("Emplacement", "Rayon {Rayon}").source(Zone.MENTION, "{Emplacement} / lot {N° lot}");
        LigneEtiquette l = c.appliquer(tableau(), true).get(0);
        assertEquals("COPHARMED", l.valeur(Zone.GROSSISTE), "zone absente du fichier : texte fixe");
        assertEquals("Rayon R1 / lot A12", l.valeur(Zone.MENTION));
        assertEquals("Rayon R1", l.getAjoutees().get("Emplacement"));
        /* toutes les references vides : zone vide (pas « Rayon » seul) ; une seule renseignee : le modele s'applique */
        LigneEtiquette vide = c.appliquer(tableau(), true).get(1);
        assertEquals("", vide.getAjoutees().get("Emplacement"));
        assertEquals("", vide.valeur(Zone.MENTION));
        assertEquals("", c.appliquer(tableau(), true).get(2).valeur(Zone.MENTION));
        Correspondance partielle = Correspondance.proposer(tableau()).source(Zone.MENTION, "{Rayon} / {Exp}");
        assertEquals("R1 / 03/2027", partielle.appliquer(tableau(), true).get(0).valeur(Zone.MENTION));
        assertEquals(Arrays.asList("Inconnue"),
                Correspondance.proposer(tableau()).source(Zone.DATE, "{Inconnue}").referencesInconnues(tableau()));
    }

    @Test
    void zonesObligatoiresChoisies() {
        Correspondance c = Correspondance.proposer(tableau()).obligatoire(Zone.PRIX, true)
                .obligatoire(Zone.DESIGNATION, false).obligatoire(Zone.CIP, false);
        assertTrue(c.getObligatoires().contains(Zone.CIP), "le CIP reste obligatoire");
        assertTrue(c.getObligatoires().contains(Zone.PRIX));
        assertFalse(c.getObligatoires().contains(Zone.DESIGNATION));
        LigneEtiquette l = new LigneEtiquette(1).valeur(Zone.CIP, "123").valider(c.getObligatoires());
        assertEquals(Arrays.asList("Prix manquant"), l.getErreurs());
    }

    /* ------------------------------------------------------------ valeurs */

    @Test
    void prixEcritsLibrement() {
        assertEquals(new BigDecimal("1500"), LigneEtiquette.lirePrix("1 500"));
        assertEquals(new BigDecimal("1500"), LigneEtiquette.lirePrix("1500 F"));
        assertEquals(new BigDecimal("1500"), LigneEtiquette.lirePrix("1.500"));
        assertEquals(new BigDecimal("1500"), LigneEtiquette.lirePrix("1 500 FCFA"));
        assertEquals(new BigDecimal("1500.50"), LigneEtiquette.lirePrix("1 500,50"));
        assertEquals(new BigDecimal("12.5"), LigneEtiquette.lirePrix("12,5 €"));
        assertEquals(new BigDecimal("1234567"), LigneEtiquette.lirePrix("1,234,567"));
        assertNull(LigneEtiquette.lirePrix("abc"));
        assertEquals("1 500 CFA", MoteurEtiquettes.prixAffiche(new BigDecimal("1500"), "CFA"));
        assertEquals("1 234 567", MoteurEtiquettes.prixAffiche(new BigDecimal("1234567.00"), ""));
        assertEquals("12,50 EUR", MoteurEtiquettes.prixAffiche(new BigDecimal("12.5"), "EUR"));
        assertEquals("0,05 EUR", MoteurEtiquettes.prixAffiche(new BigDecimal("0.05"), "EUR"));
    }

    @Test
    void datesEcritesLibrement() {
        assertEquals(LocalDate.of(2027, 3, 31), LigneEtiquette.lireDate("31/03/2027"));
        assertEquals(LocalDate.of(2027, 3, 31), LigneEtiquette.lireDate("31-03-27"));
        assertEquals(LocalDate.of(2027, 3, 31), LigneEtiquette.lireDate("2027-03-31"));
        assertEquals(LocalDate.of(2027, 2, 28), LigneEtiquette.lireDate("02/2027"));
        assertEquals(LocalDate.of(2028, 2, 29), LigneEtiquette.lireDate("2/28"));
        assertEquals(LocalDate.of(2023, 3, 15), LigneEtiquette.lireDate("45000"));
        assertNull(LigneEtiquette.lireDate("31/02/2027"), "date impossible refusee, jamais transformee");
        assertNull(LigneEtiquette.lireDate("demain"));
    }

    @Test
    void controlesDeLigne() {
        Set<Zone> obl = EnumSet.of(Zone.CIP);
        assertEquals(1, new LigneEtiquette(1).valeur(Zone.CIP, "12 34").valider(obl).getErreurs().size());
        LigneEtiquette l = new LigneEtiquette(1).valeur(Zone.CIP, "123").valeur(Zone.EAN, "123")
                .valeur(Zone.PEREMPTION, "01/01/2020").valeur(Zone.NOMBRE, "0").valider(obl);
        assertTrue(l.imprimable());
        assertEquals(3, l.getAvertissements().size(), l.getAvertissements().toString());
        assertEquals(0, l.getNombre());
        assertFalse(new LigneEtiquette(1).valeur(Zone.CIP, "1").valeur(Zone.NOMBRE, "1000").valider(obl).imprimable());
        assertFalse(new LigneEtiquette(1).valeur(Zone.CIP, "1").valeur(Zone.NOMBRE, "1,5").valider(obl).imprimable());
        assertFalse(new LigneEtiquette(1).valeur(Zone.CIP, "1").valeur(Zone.PRIX, "-5").valider(obl).imprimable());
    }

    /* --------------------------------------------------- etiquettes / PDF */

    private static List<LigneEtiquette> lignes() {
        Set<Zone> obl = EnumSet.of(Zone.CIP);
        List<LigneEtiquette> l = new ArrayList<>();
        l.add(new LigneEtiquette(1).valeur(Zone.CIP, "8476972").valeur(Zone.DESIGNATION, "DOLIPRANE")
                .valeur(Zone.PRIX, "1500").valeur(Zone.GROSSISTE, "LABOREX").valeur(Zone.LOT, "A12")
                .valeur(Zone.PEREMPTION, "31/03/2027").valeur(Zone.EAN, eanValide()).valeur(Zone.NOMBRE, "3")
                .valeur(Zone.MENTION, "RAYON 4").valider(obl));
        l.add(new LigneEtiquette(2).valeur(Zone.DESIGNATION, "EN ERREUR").valider(obl));
        l.add(new LigneEtiquette(3).valeur(Zone.CIP, "1234567").valeur(Zone.PRIX, "250").valider(obl));
        return l;
    }

    @Test
    void codeBarresStandard() {
        List<LabelSheetPdf.LabelData> e = MoteurEtiquettes.etiquettes(lignes(),
                new OptionsImpression().officine("PHARMA TEST").dateParDefaut("10/10/2026"), RegistreCodes.AUCUN);
        assertEquals(4, e.size(), "3 + 1, la ligne en erreur n'est pas imprimee");
        assertEquals(LabelSheetPdf.CODE_BARRES, e.get(0).getCode());
        assertNull(e.get(0).getGs1());
        assertEquals("RAYON 4", e.get(0).getMention());
        assertNull(e.get(3).getMention());
    }

    @Test
    void codes2DAvecGs1EtCodesUniques() {
        Set<String> donnes = new HashSet<>();
        RegistreCodes registre = cip -> "C" + donnes.size() + (donnes.add(cip + donnes.size()) ? "" : "");
        for (String type : new String[] { "QR", "DATAMATRIX" }) {
            List<LabelSheetPdf.LabelData> e = MoteurEtiquettes.etiquettes(lignes(),
                    new OptionsImpression().typeCode(type), registre);
            assertEquals(type, e.get(0).getCode());
            Gs1.Contenu c = Gs1.lire(e.get(0).getGs1());
            assertEquals("A12", c.lot);
            assertEquals(LocalDate.of(2027, 3, 31), c.peremption);
            assertEquals("8476972", c.cip);
            assertEquals("0" + eanValide(), c.gtin);
            assertEquals(4, e.stream().map(LabelSheetPdf.LabelData::getCodeUnique).distinct().count(),
                    "un code different par etiquette");
            /* sans EAN ni peremption : CIP seul dans le code */
            assertEquals("1234567", Gs1.lire(e.get(3).getGs1()).cip);
        }
    }

    @Test
    void pdfImprimeEtPlancheLibre() throws Exception {
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        OptionsImpression opt = new OptionsImpression().officine("PHARMA TEST").modele("PERSONNALISE")
                .reglage("KEY_ETIQUETTE_NB_COLONNES", "3").reglage("KEY_ETIQUETTE_NB_LIGNES", "8")
                .reglage("KEY_ETIQUETTE_LARGEUR_MM", "63.5").reglage("KEY_ETIQUETTE_HAUTEUR_MM", "33.9")
                .reglage("AUTRE", "ignore").positionDepart(23);
        assertEquals(24, opt.planche(null).perPage());
        MoteurEtiquettes.pdf(o, lignes(), opt, RegistreCodes.AUCUN, k -> null);
        PdfReader r = new PdfReader(o.toByteArray());
        assertEquals(2, r.getNumberOfPages(), "position 23 sur 24 : 2 etiquettes page 1, 2 page 2");
        String texte = PdfTextExtractor.getTextFromPage(r, 1) + PdfTextExtractor.getTextFromPage(r, 2);
        assertTrue(texte.contains("PHARMA TEST"), texte);
        assertTrue(texte.contains("1 500 CFA"), texte);
        assertTrue(texte.contains("RAYON 4"), texte);
        assertFalse(texte.contains("EN ERREUR"), texte);
        /* la configuration sert a defaut des reglages de l'ecran */
        assertEquals(65, new OptionsImpression().planche(k -> null).perPage());
        assertEquals(10, new OptionsImpression().modele("PERSONNALISE").planche(
                k -> "KEY_ETIQUETTE_NB_COLONNES".equals(k) ? "2" : "KEY_ETIQUETTE_NB_LIGNES".equals(k) ? "5" : null)
                .perPage());
    }

    @Test
    void rienAImprimerOuTropDEtiquettes() {
        List<LigneEtiquette> erreurs = new ArrayList<>();
        erreurs.add(new LigneEtiquette(1).valider(EnumSet.of(Zone.CIP)));
        assertThrows(IllegalArgumentException.class, () -> MoteurEtiquettes.pdf(new ByteArrayOutputStream(), erreurs,
                new OptionsImpression(), RegistreCodes.AUCUN, null));
        List<LigneEtiquette> trop = new ArrayList<>();
        for (int i = 0; i < 21; i++) {
            trop.add(new LigneEtiquette(i).valeur(Zone.CIP, "1").valeur(Zone.NOMBRE, "999")
                    .valider(EnumSet.of(Zone.CIP)));
        }
        assertThrows(IllegalArgumentException.class,
                () -> MoteurEtiquettes.etiquettes(trop, new OptionsImpression(), RegistreCodes.AUCUN));
    }
}
