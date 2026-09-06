package rest.report.excel;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.util.List;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

/**
 * Les exigences transversales du cahier des charges portent sur la forme du fichier produit : en-tetes comprehensibles,
 * nombres restes des nombres, dates restees des dates, et un message clair quand il n'y a rien a exporter. Ce sont ces
 * points-la qui sont verifies ici.
 */
class ClasseurExcelTest {

    private static final class Ligne {
        private final String libelle;
        private final int quantite;
        private final LocalDate date;

        Ligne(String libelle, int quantite, LocalDate date) {
            this.libelle = libelle;
            this.quantite = quantite;
            this.date = date;
        }
    }

    private ClasseurExcel<Ligne> modele() {
        return new ClasseurExcel<Ligne>("Journal").titre("Fichier journal").critere("Période", "du 01/01 au 31/01")
                .texte("Libellé", l -> l.libelle).nombre("Quantité", l -> l.quantite).date("Date", l -> l.date);
    }

    private Sheet feuille(byte[] contenu) throws Exception {
        Workbook classeur = new XSSFWorkbook(new ByteArrayInputStream(contenu));
        return classeur.getSheetAt(0);
    }

    private Cell trouver(Sheet feuille, String entete, int decalageLigne) {
        for (int r = 0; r <= feuille.getLastRowNum(); r++) {
            if (feuille.getRow(r) == null) {
                continue;
            }
            for (int c = 0; c < feuille.getRow(r).getLastCellNum(); c++) {
                Cell cellule = feuille.getRow(r).getCell(c);
                if (cellule != null && cellule.getCellType() == CellType.STRING
                        && entete.equals(cellule.getStringCellValue())) {
                    return feuille.getRow(r + decalageLigne).getCell(c);
                }
            }
        }
        return null;
    }

    @Test
    void leTitreEtLesCriteresSontRappelesEnTeteDuFichier() throws Exception {
        Sheet feuille = feuille(modele().construire(List.of(new Ligne("Connexion", 1, LocalDate.of(2026, 1, 15)))));
        assertEquals("Fichier journal", feuille.getRow(0).getCell(0).getStringCellValue());
        assertEquals("Période : du 01/01 au 31/01", feuille.getRow(1).getCell(0).getStringCellValue());
    }

    @Test
    void unNombreResteUnNombre() throws Exception {
        Sheet feuille = feuille(modele().construire(List.of(new Ligne("Connexion", 42, LocalDate.of(2026, 1, 15)))));
        Cell cellule = trouver(feuille, "Quantité", 1);
        assertEquals(CellType.NUMERIC, cellule.getCellType());
        assertEquals(42d, cellule.getNumericCellValue());
    }

    @Test
    void uneDateResteUneDate() throws Exception {
        Sheet feuille = feuille(modele().construire(List.of(new Ligne("Connexion", 1, LocalDate.of(2026, 1, 15)))));
        Cell cellule = trouver(feuille, "Date", 1);
        assertEquals(CellType.NUMERIC, cellule.getCellType());
        assertTrue(DateUtil.isCellDateFormatted(cellule));
    }

    @Test
    void unNombreEcritEnTexteAvecSeparateurEstConverti() throws Exception {
        ClasseurExcel<String> classeur = new ClasseurExcel<String>("T").nombre("Montant", v -> v);
        Sheet feuille = feuille(classeur.construire(List.of("12 500,50")));
        Cell cellule = trouver(feuille, "Montant", 1);
        assertEquals(CellType.NUMERIC, cellule.getCellType());
        assertEquals(12500.5d, cellule.getNumericCellValue());
    }

    @Test
    void uneValeurAbsenteLaisseLaCelluleVideEtNonLeMotNull() throws Exception {
        ClasseurExcel<String> classeur = new ClasseurExcel<String>("T").texte("Libellé", v -> null);
        Sheet feuille = feuille(classeur.construire(List.of("x")));
        Cell cellule = trouver(feuille, "Libellé", 1);
        assertEquals(CellType.BLANK, cellule.getCellType());
    }

    @Test
    void unResultatVidePorteUnMessageExplicite() throws Exception {
        Sheet feuille = feuille(modele().construire(List.of()));
        boolean trouve = false;
        for (int r = 0; r <= feuille.getLastRowNum(); r++) {
            Cell cellule = feuille.getRow(r) == null ? null : feuille.getRow(r).getCell(0);
            if (cellule != null && cellule.getCellType() == CellType.STRING
                    && cellule.getStringCellValue().startsWith("Aucune donnée")) {
                trouve = true;
            }
        }
        assertTrue(trouve, "le classeur vide doit porter un message explicite");
    }

    @Test
    void unCritereVideNEstPasRappele() throws Exception {
        ClasseurExcel<String> classeur = new ClasseurExcel<String>("T").titre("Titre").critere("Recherche", "")
                .critere("Utilisateur", null).texte("Libellé", v -> v);
        Sheet feuille = feuille(classeur.construire(List.of("x")));
        assertEquals("Titre", feuille.getRow(0).getCell(0).getStringCellValue());
        // ligne 1 vide (separation), ligne 2 en-tete : aucun critere ne s'est intercale
        assertEquals("Libellé", feuille.getRow(2).getCell(0).getStringCellValue());
    }

    @Test
    void uneLigneQuiFaitEchouerLaLectureNInterromptPasLExport() throws Exception {
        ClasseurExcel<String> classeur = new ClasseurExcel<String>("T").texte("Libellé", v -> {
            throw new IllegalStateException("donnée illisible");
        }).nombre("Rang", v -> v.length());
        Sheet feuille = feuille(classeur.construire(List.of("abc")));
        assertEquals(CellType.BLANK, trouver(feuille, "Libellé", 1).getCellType());
        assertEquals(3d, trouver(feuille, "Rang", 1).getNumericCellValue());
    }
}
