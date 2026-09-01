package rest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import commonTasks.dto.ProduitDetailleDTO;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import rest.service.utils.ReportExcelExportService;

/**
 * Intitules de l'export Excel de la liste des produits detailles.
 *
 * <p>
 * L'ecran et l'edition PDF disaient « Code CIP CH » et « Libellé Détail » ; l'export, lui, etait reste a « Identifiant
 * PP » et « Produit Principal » - des noms qui ne parlent qu'au developpeur, et qui ne correspondaient a rien de ce que
 * l'officine voit ailleurs. Les trois sorties portent desormais les memes intitules, et ce test relit le classeur
 * REELLEMENT produit plutot que la constante seule.
 */
class ExportListeProduitsDetaillesTest {

    private static ProduitDetailleDTO ligne() {
        ProduitDetailleDTO l = new ProduitDetailleDTO();
        l.setCipPP("3232018");
        l.setNomPP("DOLIPRANE 500MG COMPRIMES BOITE DE 16");
        l.setStockPP(124);
        l.setContenance(16);
        l.setCipPD("8081802");
        l.setNomPD("DOLIPRANE 500MG COMPRIME DETAIL");
        l.setStockPD(1984);
        return l;
    }

    /** Reproduit exactement l'appel de la ressource : memes intitules, meme remplissage des cellules. */
    private static byte[] classeur() throws Exception {
        List<ProduitDetailleDTO> lignes = new ArrayList<>();
        lignes.add(ligne());
        return new ReportExcelExportService().createExcelReport("LISTE DES PRODUITS DETAILLES",
                DetailsRessource.ENTETES_LISTE, lignes, (row, dto) -> {
                    int col = 0;
                    row.createCell(col++).setCellValue(dto.getCipPP());
                    row.createCell(col++).setCellValue(dto.getNomPP());
                    row.createCell(col++).setCellValue(dto.getStockPP());
                    row.createCell(col++).setCellValue(dto.getContenance());
                    row.createCell(col++).setCellValue(dto.getCipPD());
                    row.createCell(col++).setCellValue(dto.getNomPD());
                    row.createCell(col).setCellValue(dto.getStockPD());
                });
    }

    /** Ligne d'intitules du classeur produit : on la retrouve par sa premiere cellule. */
    private static List<String> intitulesLus() throws Exception {
        try (Workbook classeur = WorkbookFactory.create(new ByteArrayInputStream(classeur()))) {
            Sheet feuille = classeur.getSheetAt(0);
            for (int i = feuille.getFirstRowNum(); i <= feuille.getLastRowNum(); i++) {
                Row ligne = feuille.getRow(i);
                if (ligne == null || ligne.getCell(0) == null) {
                    continue;
                }
                if ("Code CIP CH".equals(ligne.getCell(0).getStringCellValue())) {
                    List<String> lus = new ArrayList<>();
                    for (int c = 0; c < DetailsRessource.ENTETES_LISTE.length; c++) {
                        lus.add(ligne.getCell(c) == null ? null : ligne.getCell(c).getStringCellValue());
                    }
                    return lus;
                }
            }
            return null;
        }
    }

    @Test
    @DisplayName("L'export porte les intitules revus en recette, accents compris")
    void intitulesDeLExport() throws Exception {
        List<String> lus = intitulesLus();
        assertNotNull(lus, "la ligne d'intitules doit figurer dans le classeur");
        assertEquals(Arrays.asList("Code CIP CH", "Libellé CH", "Stock CH", "Contenance", "Code CIP Détail",
                "Libellé Détail", "Stock Détail"), lus);
    }

    @Test
    @DisplayName("Les anciens intitules techniques ont disparu")
    void plusDIntitulesTechniques() {
        List<String> entetes = Arrays.asList(DetailsRessource.ENTETES_LISTE);
        for (String ancien : Arrays.asList("Identifiant PP", "Identifiant PD", "Produit Principal", "Produit Détail",
                "Code CIP DET")) {
            assertEquals(false, entetes.contains(ancien), "l'intitule « " + ancien + " » ne doit plus etre utilise");
        }
    }

    @Test
    @DisplayName("Les valeurs restent dans l'ordre des intitules")
    void valeursDansLOrdre() throws Exception {
        try (Workbook classeur = WorkbookFactory.create(new ByteArrayInputStream(classeur()))) {
            Sheet feuille = classeur.getSheetAt(0);
            Row donnees = null;
            boolean apresEntetes = false;
            for (int i = feuille.getFirstRowNum(); i <= feuille.getLastRowNum(); i++) {
                Row ligne = feuille.getRow(i);
                if (ligne == null || ligne.getCell(0) == null) {
                    continue;
                }
                if (apresEntetes) {
                    donnees = ligne;
                    break;
                }
                if ("Code CIP CH".equals(ligne.getCell(0).getStringCellValue())) {
                    apresEntetes = true;
                }
            }
            assertNotNull(donnees, "la ligne de donnees doit suivre les intitules");
            assertEquals("3232018", donnees.getCell(0).getStringCellValue(), "Code CIP CH");
            assertEquals("DOLIPRANE 500MG COMPRIMES BOITE DE 16", donnees.getCell(1).getStringCellValue(),
                    "Libellé CH");
            assertEquals(124d, donnees.getCell(2).getNumericCellValue(), 0.001, "Stock CH");
            assertEquals(16d, donnees.getCell(3).getNumericCellValue(), 0.001, "Contenance");
            assertEquals("8081802", donnees.getCell(4).getStringCellValue(), "Code CIP Détail");
            assertEquals("DOLIPRANE 500MG COMPRIME DETAIL", donnees.getCell(5).getStringCellValue(), "Libellé Détail");
            assertEquals(1984d, donnees.getCell(6).getNumericCellValue(), 0.001, "Stock Détail");
        }
    }
}
