package rest.report.excel;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.function.Function;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.CreationHelper;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

/**
 * Construction d'un classeur Excel a partir d'une liste d'objets.
 *
 * <p>
 * Les exports demandes par le cahier des charges partagent les memes exigences : en-tetes comprehensibles, resultat
 * complet et non la seule page affichee, nombres conserves comme nombres et dates comme dates. Les ecrire une fois par
 * ecran menait a autant de variantes ; ils passent donc tous par ici.
 *
 * <p>
 * Chaque colonne est decrite par un libelle, un type et la facon d'aller chercher la valeur dans la ligne. Une valeur
 * absente laisse la cellule vide plutot que d'ecrire « null ».
 *
 * @param <T>
 *            le type d'une ligne du tableau
 */
public final class ClasseurExcel<T> {

    /** Nature d'une colonne : elle decide du format de la cellule, pas seulement de son apparence. */
    public enum Type {
        /** Chaine de caracteres. */
        TEXTE,
        /** Nombre entier ou decimal : reste exploitable par les calculs d'Excel. */
        NOMBRE,
        /** Date seule, affichee jj/mm/aaaa et triable comme une date. */
        DATE,
        /** Date et heure. */
        DATE_HEURE
    }

    /** Une colonne du tableau : son titre, sa nature, et comment lire sa valeur sur une ligne. */
    public static final class Colonne<T> {
        private final String titre;
        private final Type type;
        private final Function<T, Object> valeur;

        public Colonne(String titre, Type type, Function<T, Object> valeur) {
            this.titre = titre;
            this.type = type;
            this.valeur = valeur;
        }
    }

    private final String nomFeuille;
    private final List<Colonne<T>> colonnes = new ArrayList<>();
    private final List<String> criteres = new ArrayList<>();
    private String titre;

    public ClasseurExcel(String nomFeuille) {
        this.nomFeuille = nomFeuille == null || nomFeuille.isBlank() ? "Export" : nomFeuille;
    }

    /** Titre porte en premiere ligne du classeur. Facultatif. */
    public ClasseurExcel<T> titre(String valeur) {
        this.titre = valeur;
        return this;
    }

    /**
     * Critere de selection rappele sous le titre : periode, recherche, filtres retenus. Ce qui est exporte doit pouvoir
     * se relire hors de l'application sans deviner d'ou vient le contenu.
     */
    public ClasseurExcel<T> critere(String libelle, Object valeur) {
        String texte = valeur == null ? "" : String.valueOf(valeur).trim();
        if (!texte.isEmpty()) {
            criteres.add(libelle + " : " + texte);
        }
        return this;
    }

    public ClasseurExcel<T> texte(String titreColonne, Function<T, Object> valeur) {
        return colonne(titreColonne, Type.TEXTE, valeur);
    }

    public ClasseurExcel<T> nombre(String titreColonne, Function<T, Object> valeur) {
        return colonne(titreColonne, Type.NOMBRE, valeur);
    }

    public ClasseurExcel<T> date(String titreColonne, Function<T, Object> valeur) {
        return colonne(titreColonne, Type.DATE, valeur);
    }

    public ClasseurExcel<T> dateHeure(String titreColonne, Function<T, Object> valeur) {
        return colonne(titreColonne, Type.DATE_HEURE, valeur);
    }

    public ClasseurExcel<T> colonne(String titreColonne, Type type, Function<T, Object> valeur) {
        colonnes.add(new Colonne<>(titreColonne, type, valeur));
        return this;
    }

    /**
     * Rend le classeur. Les lignes sont ecrites dans l'ordre recu : c'est a l'appelant de fournir la liste deja filtree
     * et triee comme l'ecran, l'export devant refleter ce que l'utilisateur a sous les yeux.
     */
    public byte[] construire(List<T> lignes) throws IOException {
        try (Workbook classeur = new XSSFWorkbook(); ByteArrayOutputStream sortie = new ByteArrayOutputStream()) {
            Sheet feuille = classeur.createSheet(nomFeuille);
            CreationHelper aide = classeur.getCreationHelper();

            CellStyle styleTitre = classeur.createCellStyle();
            Font policeTitre = classeur.createFont();
            policeTitre.setBold(true);
            policeTitre.setFontHeightInPoints((short) 12);
            styleTitre.setFont(policeTitre);

            CellStyle styleEntete = classeur.createCellStyle();
            Font policeEntete = classeur.createFont();
            policeEntete.setBold(true);
            styleEntete.setFont(policeEntete);
            styleEntete.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            styleEntete.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            CellStyle styleDate = classeur.createCellStyle();
            styleDate.setDataFormat(aide.createDataFormat().getFormat("dd/mm/yyyy"));
            CellStyle styleDateHeure = classeur.createCellStyle();
            styleDateHeure.setDataFormat(aide.createDataFormat().getFormat("dd/mm/yyyy hh:mm"));

            int rang = 0;
            if (titre != null && !titre.isBlank()) {
                Cell cellule = feuille.createRow(rang++).createCell(0);
                cellule.setCellValue(titre);
                cellule.setCellStyle(styleTitre);
            }
            for (String critere : criteres) {
                feuille.createRow(rang++).createCell(0).setCellValue(critere);
            }
            if (rang > 0) {
                rang++;
            }

            Row entete = feuille.createRow(rang++);
            for (int i = 0; i < colonnes.size(); i++) {
                Cell cellule = entete.createCell(i);
                cellule.setCellValue(colonnes.get(i).titre);
                cellule.setCellStyle(styleEntete);
            }

            List<T> contenu = lignes == null ? List.of() : lignes;
            if (contenu.isEmpty()) {
                // Un classeur vide laisse l'utilisateur devant une feuille muette : on lui dit
                // explicitement qu'aucune ligne ne correspond aux criteres rappeles au-dessus.
                feuille.createRow(rang).createCell(0)
                        .setCellValue("Aucune donnée ne correspond aux critères de sélection.");
            }
            for (T ligne : contenu) {
                Row row = feuille.createRow(rang++);
                for (int i = 0; i < colonnes.size(); i++) {
                    ecrire(row.createCell(i), colonnes.get(i), ligne, styleDate, styleDateHeure);
                }
            }

            for (int i = 0; i < colonnes.size(); i++) {
                feuille.autoSizeColumn(i);
                // autoSizeColumn colle au contenu : quelques dixiemes de caractere de marge
                // evitent les libelles ras-bord, et une largeur maximale evite qu'une longue
                // description ne pousse toutes les autres colonnes hors de l'ecran.
                int largeur = Math.min(feuille.getColumnWidth(i) + 512, 60 * 256);
                feuille.setColumnWidth(i, largeur);
            }

            classeur.write(sortie);
            return sortie.toByteArray();
        }
    }

    private void ecrire(Cell cellule, Colonne<T> colonne, T ligne, CellStyle styleDate, CellStyle styleDateHeure) {
        Object valeur;
        try {
            valeur = colonne.valeur.apply(ligne);
        } catch (RuntimeException e) {
            // Une ligne mal formee ne doit pas faire echouer tout l'export.
            valeur = null;
        }
        if (valeur == null) {
            return;
        }
        switch (colonne.type) {
        case NOMBRE:
            if (valeur instanceof Number) {
                cellule.setCellValue(((Number) valeur).doubleValue());
            } else {
                String texte = String.valueOf(valeur).trim().replace(" ", "").replace(",", ".");
                try {
                    cellule.setCellValue(Double.parseDouble(texte));
                } catch (NumberFormatException e) {
                    cellule.setCellValue(String.valueOf(valeur));
                }
            }
            break;
        case DATE:
        case DATE_HEURE:
            Date date = enDate(valeur);
            if (date == null) {
                cellule.setCellValue(String.valueOf(valeur));
            } else {
                cellule.setCellValue(date);
                cellule.setCellStyle(colonne.type == Type.DATE ? styleDate : styleDateHeure);
            }
            break;
        default:
            cellule.setCellValue(String.valueOf(valeur));
            break;
        }
    }

    /** Les dates arrivent selon les ecrans en Date, LocalDate ou LocalDateTime. */
    private static Date enDate(Object valeur) {
        if (valeur instanceof Date) {
            return (Date) valeur;
        }
        if (valeur instanceof LocalDate) {
            return Date.from(((LocalDate) valeur).atStartOfDay(ZoneId.systemDefault()).toInstant());
        }
        if (valeur instanceof LocalDateTime) {
            return Date.from(((LocalDateTime) valeur).atZone(ZoneId.systemDefault()).toInstant());
        }
        return null;
    }
}
