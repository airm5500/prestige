package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Lecture du fichier de reponse d'un grossiste.
 *
 * <p>
 * Le fichier vient d'un tiers : il arrive en CSV ou en classeur, avec ou sans ligne d'en-tete, des codes tantot avec
 * zeros de tete, des quantites tantot ecrites « 3 » tantot « 3.0 ». Une erreur de lecture ici se traduit par une
 * quantite fausse dans une commande, donc par une entree en stock fausse.
 */
class ReponseGrossisteLectureTest {

    private static List<String[]> lireCsv(String contenu) throws IOException {
        return ReponseGrossisteServiceImpl.lire("reponse.csv",
                new ByteArrayInputStream(contenu.getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    @DisplayName("CSV : une ligne par produit, six colonnes, la designation facultative")
    void csvSixColonnes() throws IOException {
        List<String[]> lignes = lireCsv("8043150;24;8017419;0;2335\n3400930000000;5;3400930000000;5;1200;DOLIPRANE\n");

        assertEquals(2, lignes.size());
        assertEquals("8043150", ReponseGrossisteServiceImpl.valeur(lignes.get(0), 0));
        assertEquals("8017419", ReponseGrossisteServiceImpl.valeur(lignes.get(0), 2));
        assertEquals("0", ReponseGrossisteServiceImpl.valeur(lignes.get(0), 3));
        // La ligne courte n'a pas de designation : on lit une chaine vide, pas une exception.
        assertEquals("", ReponseGrossisteServiceImpl.valeur(lignes.get(0), 5));
        assertEquals("DOLIPRANE", ReponseGrossisteServiceImpl.valeur(lignes.get(1), 5));
    }

    @Test
    @DisplayName("CSV : les lignes vides sont ignorees, les colonnes vides conservees")
    void csvLignesVides() throws IOException {
        List<String[]> lignes = lireCsv("8043150;24;;3;2335\n\n   \n8017419;1;;1;500\n");

        assertEquals(2, lignes.size());
        // Un CIP de reponse vide reste une colonne vide, il ne decale pas la quantite recue.
        assertEquals("", ReponseGrossisteServiceImpl.valeur(lignes.get(0), 2));
        assertEquals("3", ReponseGrossisteServiceImpl.valeur(lignes.get(0), 3));
    }

    @Test
    @DisplayName("CSV : le format convenu n'a pas d'en-tete, mais une en-tete presente est ecartee")
    void csvEnteteToleree() throws IOException {
        List<String[]> sansEntete = lireCsv("8043150;24;8017419;0;2335\n");
        assertEquals(1, sansEntete.size(), "aucune ligne perdue quand il n'y a pas d'en-tete");

        List<String[]> avecEntete = lireCsv("CIP;QTE;CIP REPONSE;QTE RECUE;PA\n8043150;24;8017419;0;2335\n");
        assertEquals(1, avecEntete.size(), "l'en-tete est ecartee");
        assertEquals("8043150", ReponseGrossisteServiceImpl.valeur(avecEntete.get(0), 0));
    }

    @Test
    @DisplayName("Classeur Excel : les nombres ne trainent pas de « .0 »")
    void excelNombresEntiers() throws IOException {
        byte[] classeur;
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream sortie = new ByteArrayOutputStream()) {
            Sheet feuille = wb.createSheet("reponse");
            Row ligne = feuille.createRow(0);
            ligne.createCell(0).setCellValue(8043150d);
            ligne.createCell(1).setCellValue(24d);
            ligne.createCell(2).setCellValue(8017419d);
            ligne.createCell(3).setCellValue(0d);
            ligne.createCell(4).setCellValue(2335d);
            wb.write(sortie);
            classeur = sortie.toByteArray();
        }

        List<String[]> lignes = ReponseGrossisteServiceImpl.lire("reponse.xlsx", new ByteArrayInputStream(classeur));

        assertEquals(1, lignes.size());
        assertEquals("8043150", ReponseGrossisteServiceImpl.valeur(lignes.get(0), 0),
                "un CIP lu « 8043150.0 » ne se rattacherait a aucun produit");
        assertEquals("24", ReponseGrossisteServiceImpl.valeur(lignes.get(0), 1));
        assertEquals("0", ReponseGrossisteServiceImpl.valeur(lignes.get(0), 3));
    }

    @Test
    @DisplayName("Codes : espaces et zeros de tete ne font pas deux produits differents")
    void normalisationDesCodes() {
        assertEquals(ReponseGrossisteServiceImpl.normaliser("8010185"),
                ReponseGrossisteServiceImpl.normaliser("08010185"));
        assertEquals(ReponseGrossisteServiceImpl.normaliser("8010185"),
                ReponseGrossisteServiceImpl.normaliser(" 80 10185 "));
        assertEquals("0", ReponseGrossisteServiceImpl.normaliser("0"), "un code « 0 » ne se vide pas");
        assertEquals("", ReponseGrossisteServiceImpl.normaliser(null));
        // Deux produits distincts restent distincts.
        assertTrue(!ReponseGrossisteServiceImpl.normaliser("8043150")
                .equals(ReponseGrossisteServiceImpl.normaliser("8017419")));
    }

    @Test
    @DisplayName("Quantites : entier, decimal, virgule francaise, et illisible")
    void lectureDesQuantites() {
        assertEquals(Integer.valueOf(24), ReponseGrossisteServiceImpl.entier("24"));
        assertEquals(Integer.valueOf(0), ReponseGrossisteServiceImpl.entier("0"));
        assertEquals(Integer.valueOf(3), ReponseGrossisteServiceImpl.entier("3.0"));
        assertEquals(Integer.valueOf(3), ReponseGrossisteServiceImpl.entier("3,0"));
        assertEquals(Integer.valueOf(2335), ReponseGrossisteServiceImpl.entier("2 335"));
        assertNull(ReponseGrossisteServiceImpl.entier(""));
        assertNull(ReponseGrossisteServiceImpl.entier("QTE"));
    }
}
