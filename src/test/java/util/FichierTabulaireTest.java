package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Lecture d'un fichier tabulaire en gardant toutes ses colonnes : c'est ce qui permet a l'operateur de designer
 * lui-meme la colonne du nom, des prenoms et du telephone, au lieu de subir un ordre figé dans le code.
 */
public class FichierTabulaireTest {

    private static FichierTabulaire lire(String contenu) throws Exception {
        return FichierTabulaire.lire("clients.csv", new ByteArrayInputStream(contenu.getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    public void unFichierPointVirguleEstLuAvecToutesSesColonnes() throws Exception {
        FichierTabulaire f = lire("NOM;PRENOMS;TELEPHONE\nKOFFI;Jean Marc;0708473750\n");
        assertEquals(2, f.getLignes().size());
        assertEquals(3, f.nombreColonnes());
        assertEquals(';', f.getSeparateur());
        assertEquals(Arrays.asList("KOFFI", "Jean Marc", "0708473750"), f.getLignes().get(1));
    }

    @Test
    public void leSeparateurEstDetecteEtNonImpose() throws Exception {
        assertEquals('\t', lire("NOM\tPRENOMS\tTEL\nA\tB\t0708473750\n").getSeparateur());
        assertEquals(',', lire("NOM,PRENOMS,TEL\nA,B,0708473750\n").getSeparateur());
        assertEquals('|', lire("NOM|PRENOMS|TEL\nA|B|0708473750\n").getSeparateur());
    }

    @Test
    public void lesGuillemetsProtegentUnSeparateurDansUnChamp() throws Exception {
        FichierTabulaire f = lire("NOM;PRENOMS;TEL\n\"KOFFI;KONE\";Jean;0708473750\n");
        assertEquals(Arrays.asList("KOFFI;KONE", "Jean", "0708473750"), f.getLignes().get(1));
    }

    @Test
    public void unGuillemetDoubleVautUnGuillemetLitteral() {
        assertEquals(Arrays.asList("dit \"Jean\"", "B"), FichierTabulaire.decouper("\"dit \"\"Jean\"\"\";B", ';'));
    }

    @Test
    public void leMarqueurDOrdreDesOctetsDExcelNeCollePasAuPremierEntete() throws Exception {
        // Un CSV enregistre par Excel commence par ce marqueur : sans le retirer, le premier en-tete
        // ne serait plus reconnu par l'operateur dans la liste des colonnes.
        FichierTabulaire f = lire("﻿NOM;PRENOMS;TEL\nA;B;0708473750\n");
        assertEquals("NOM", f.getLignes().get(0).get(0));
    }

    @Test
    public void lesLignesVidesSontEcartees() throws Exception {
        FichierTabulaire f = lire("NOM;PRENOMS;TEL\n\n   \nA;B;0708473750\n\n");
        assertEquals(2, f.getLignes().size());
    }

    @Test
    public void uneCelluleAbsenteVautChaineVideEtNonUneErreur() {
        List<String> ligne = Arrays.asList("KOFFI");
        assertEquals("KOFFI", FichierTabulaire.cellule(ligne, 0));
        assertEquals("", FichierTabulaire.cellule(ligne, 5));
        assertEquals("", FichierTabulaire.cellule(ligne, -1));
        assertEquals("", FichierTabulaire.cellule(null, 0));
    }

    @Test
    public void lesLignesIrregulieresNEmpechentPasLaLecture() throws Exception {
        FichierTabulaire f = lire("A;B;C\nX;Y\nZ;W;V;U\n");
        assertEquals(3, f.getLignes().size());
        assertEquals(4, f.nombreColonnes());
    }

    @Test
    public void unFichierAUneSeuleColonneResteLisible() throws Exception {
        FichierTabulaire f = lire("0708473750\n0501020304\n");
        assertEquals(2, f.getLignes().size());
        assertEquals(1, f.nombreColonnes());
        assertEquals("0708473750", f.getLignes().get(0).get(0));
    }

    @Test
    public void leSeparateurLePlusRegulierLEmporte() {
        // Une virgule dans un libelle ne doit pas faire prendre la virgule pour le separateur.
        assertEquals(';', FichierTabulaire.detecterSeparateur(
                Arrays.asList("NOM;PRENOMS;TEL", "KOFFI, dit Jean;Marc;0708473750", "YAO;Awa;0501020304")));
    }

    @Test
    public void unClasseurEstLuSansPerdreLeZeroDeTeteDunNumero() throws Exception {
        // Un numero saisi dans un tableur ressort en nombre : il ne doit devenir ni « 7.0847375E9 »
        // ni « 708473750 ». Le fichier est construit ici, puis relu comme le fera l'import.
        java.io.ByteArrayOutputStream sortie = new java.io.ByteArrayOutputStream();
        try (org.apache.poi.ss.usermodel.Workbook wb = new org.apache.poi.hssf.usermodel.HSSFWorkbook()) {
            org.apache.poi.ss.usermodel.Sheet feuille = wb.createSheet("clients");
            org.apache.poi.ss.usermodel.Row entete = feuille.createRow(0);
            entete.createCell(0).setCellValue("NOM");
            entete.createCell(1).setCellValue("PRENOMS");
            entete.createCell(2).setCellValue("TEL");
            org.apache.poi.ss.usermodel.Row ligne = feuille.createRow(1);
            ligne.createCell(0).setCellValue("KOFFI");
            ligne.createCell(1).setCellValue("Jean");
            ligne.createCell(2).setCellValue(708473750d);
            wb.write(sortie);
        }
        FichierTabulaire f = FichierTabulaire.lire("clients.xls", new ByteArrayInputStream(sortie.toByteArray()));
        assertEquals(2, f.getLignes().size());
        assertEquals("708473750", f.getLignes().get(1).get(2));
        // Le zero de tete perdu par le tableur est rattrape par le controle du numero, qui accepte
        // la forme a neuf chiffres precedee de son indicatif implicite.
        assertTrue(f.getLignes().get(1).get(2).length() == 9);
    }
}
