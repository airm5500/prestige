package util;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Lecture d'un fichier tabulaire (CSV, texte, XLS, XLSX) en gardant TOUTES ses colonnes.
 *
 * <p>
 * Les imports historiques lisaient les colonnes par leur position, figee dans le code : un fichier dont les colonnes
 * etaient dans un autre ordre etait soit refuse, soit - pire - importe de travers. Cette classe se contente de rendre
 * le contenu tel qu'il est ; c'est l'appelant qui dit ensuite quelle colonne porte quoi.
 * </p>
 */
public final class FichierTabulaire {

    /** Separateurs essayes pour un fichier texte, du plus courant au moins courant. */
    private static final char[] SEPARATEURS = { ';', '\t', ',', '|' };

    private static final int LIGNES_ECHANTILLON = 20;

    private final List<List<String>> lignes;
    private final char separateur;

    private FichierTabulaire(List<List<String>> lignes, char separateur) {
        this.lignes = lignes;
        this.separateur = separateur;
    }

    public List<List<String>> getLignes() {
        return lignes;
    }

    /** Separateur retenu pour un fichier texte ; vaut 0 pour un classeur. */
    public char getSeparateur() {
        return separateur;
    }

    /** Nombre de colonnes du fichier : celui de la ligne la plus large, pour ne perdre aucune colonne. */
    public int nombreColonnes() {
        int max = 0;
        for (List<String> ligne : lignes) {
            max = Math.max(max, ligne.size());
        }
        return max;
    }

    /** Valeur d'une cellule, chaine vide quand la ligne est plus courte que la colonne demandee. */
    public static String cellule(List<String> ligne, int colonne) {
        if (ligne == null || colonne < 0 || colonne >= ligne.size()) {
            return "";
        }
        String v = ligne.get(colonne);
        return v == null ? "" : v.trim();
    }

    public static FichierTabulaire lire(String nomFichier, InputStream contenu) throws IOException {
        String nom = nomFichier == null ? "" : nomFichier.toLowerCase();
        if (nom.endsWith(".xls") || nom.endsWith(".xlsx")) {
            return new FichierTabulaire(lireClasseur(contenu), (char) 0);
        }
        return lireTexte(contenu);
    }

    private static List<List<String>> lireClasseur(InputStream contenu) throws IOException {
        List<List<String>> out = new ArrayList<>();
        try (org.apache.poi.ss.usermodel.Workbook wb = org.apache.poi.ss.usermodel.WorkbookFactory.create(contenu)) {
            org.apache.poi.ss.usermodel.Sheet feuille = wb.getSheetAt(0);
            for (org.apache.poi.ss.usermodel.Row row : feuille) {
                List<String> ligne = new ArrayList<>();
                int derniere = row.getLastCellNum();
                for (int c = 0; c < derniere; c++) {
                    ligne.add(celluleTexte(row.getCell(c)));
                }
                if (!estVide(ligne)) {
                    out.add(ligne);
                }
            }
        } catch (IOException e) {
            throw e;
        } catch (Exception e) {
            throw new IOException("Classeur illisible", e);
        }
        return out;
    }

    private static FichierTabulaire lireTexte(InputStream contenu) throws IOException {
        List<String> brutes = new ArrayList<>();
        try (BufferedReader lecteur = new BufferedReader(new InputStreamReader(contenu, StandardCharsets.UTF_8))) {
            String ligne;
            while ((ligne = lecteur.readLine()) != null) {
                // Le marqueur d'ordre des octets d'un CSV produit par Excel se retrouverait sinon
                // collé au premier en-tête, qui ne serait alors plus reconnu.
                if (brutes.isEmpty() && ligne.startsWith("﻿")) {
                    ligne = ligne.substring(1);
                }
                if (!ligne.trim().isEmpty()) {
                    brutes.add(ligne);
                }
            }
        }
        char separateur = detecterSeparateur(brutes);
        List<List<String>> out = new ArrayList<>();
        for (String ligne : brutes) {
            out.add(decouper(ligne, separateur));
        }
        return new FichierTabulaire(out, separateur);
    }

    /**
     * Separateur le plus probable : celui qui decoupe le plus de colonnes de facon REGULIERE sur les premieres lignes.
     * Un fichier dont chaque ligne aurait un nombre de colonnes different signalerait un mauvais choix.
     */
    static char detecterSeparateur(List<String> brutes) {
        char meilleur = ';';
        int meilleurScore = -1;
        int aExaminer = Math.min(LIGNES_ECHANTILLON, brutes.size());
        for (char candidat : SEPARATEURS) {
            int colonnesPremiere = -1;
            boolean regulier = true;
            int total = 0;
            for (int i = 0; i < aExaminer; i++) {
                int colonnes = decouper(brutes.get(i), candidat).size();
                if (colonnesPremiere < 0) {
                    colonnesPremiere = colonnes;
                } else if (colonnes != colonnesPremiere) {
                    regulier = false;
                }
                total += colonnes;
            }
            if (aExaminer == 0 || colonnesPremiere <= 1) {
                continue;
            }
            int score = colonnesPremiere * 100 + (regulier ? 50 : 0) + total;
            if (score > meilleurScore) {
                meilleurScore = score;
                meilleur = candidat;
            }
        }
        return meilleur;
    }

    /** Decoupage tolerant aux guillemets d'encadrement, y compris quand ils contiennent le separateur. */
    static List<String> decouper(String ligne, char separateur) {
        List<String> champs = new ArrayList<>();
        StringBuilder courant = new StringBuilder();
        boolean entreGuillemets = false;
        for (int i = 0; i < ligne.length(); i++) {
            char c = ligne.charAt(i);
            if (c == '"') {
                // Deux guillemets consecutifs dans un champ encadre valent un guillemet litteral.
                if (entreGuillemets && i + 1 < ligne.length() && ligne.charAt(i + 1) == '"') {
                    courant.append('"');
                    i++;
                } else {
                    entreGuillemets = !entreGuillemets;
                }
            } else if (c == separateur && !entreGuillemets) {
                champs.add(courant.toString().trim());
                courant.setLength(0);
            } else {
                courant.append(c);
            }
        }
        champs.add(courant.toString().trim());
        return champs;
    }

    private static boolean estVide(List<String> ligne) {
        for (String v : ligne) {
            if (v != null && !v.trim().isEmpty()) {
                return false;
            }
        }
        return true;
    }

    private static String celluleTexte(org.apache.poi.ss.usermodel.Cell cellule) {
        if (cellule == null) {
            return "";
        }
        try {
            switch (cellule.getCellType()) {
            case STRING:
                return cellule.getStringCellValue().trim();
            case NUMERIC:
                double v = cellule.getNumericCellValue();
                // Un numero de telephone saisi dans un classeur ressort en nombre : il ne doit pas
                // devenir « 7.08473750E9 », et il ne doit pas perdre son zero de tete non plus.
                if (v == Math.rint(v) && !Double.isInfinite(v)) {
                    return new java.math.BigDecimal(v).toBigInteger().toString();
                }
                return String.valueOf(v);
            case BOOLEAN:
                return String.valueOf(cellule.getBooleanCellValue());
            case FORMULA:
                return cellule.getCellFormula();
            default:
                return "";
            }
        } catch (Exception e) {
            return "";
        }
    }

    private FichierTabulaire() {
        this(new ArrayList<>(), ';');
    }
}
