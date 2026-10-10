package etiquetagepro;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.StringReader;
import java.math.BigDecimal;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.FormulaEvaluator;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;

/**
 * Etiquettage Pro : lecture d'un fichier CSV ou Excel (.xlsx, .xls) en {@link Tableau}.
 * <ul>
 * <li>le format est reconnu au contenu (classeur Excel ou texte), pas seulement a l'extension ;</li>
 * <li>CSV : encodage UTF-8 (avec ou sans BOM), sinon Windows-1252 (export Excel francais) ; separateur reconnu parmi «
 * ; », « , », tabulation et « | » (celui qui decoupe les premieres lignes de la facon la plus reguliere) ;</li>
 * <li>Excel : la feuille demandee, sinon la premiere ; une cellule est lue comme elle s'affiche, sauf les grands
 * nombres (CIP, EAN) rendus en entier (jamais « 3,40094E+12 ») et les dates rendues en jj/mm/aaaa ;</li>
 * <li>les lignes entierement vides sont ignorees ; au-dela de {@link #MAX_LIGNES} lignes, le reste est ignore (et
 * compte).</li>
 * </ul>
 */
public final class LecteurTableau {

    public static final int MAX_LIGNES = 20000;
    public static final int MAX_COLONNES = 100;
    private static final Charset CP1252 = Charset.forName("windows-1252");

    private LecteurTableau() {
    }

    /**
     * @param nom
     *            nom du fichier (extension indicative)
     * @param contenu
     *            octets du fichier
     * @param feuille
     *            feuille Excel a lire (null : la premiere)
     * @param avecTitres
     *            la premiere ligne porte les titres des colonnes
     */
    public static Tableau lire(String nom, byte[] contenu, String feuille, boolean avecTitres) throws IOException {
        if (contenu == null || contenu.length == 0) {
            throw new IOException("Le fichier est vide.");
        }
        if (estClasseur(contenu)) {
            return lireExcel(contenu, feuille, avecTitres);
        }
        String n = nom == null ? "" : nom.toLowerCase(Locale.ROOT);
        if (n.endsWith(".xlsx") || n.endsWith(".xls")) {
            throw new IOException("Ce fichier Excel est illisible (classeur protege ou endommage ?).");
        }
        return lireCsv(contenu, avecTitres);
    }

    /** Classeur Excel : .xlsx (archive zip « PK ») ou .xls (OLE2 D0 CF 11 E0). */
    static boolean estClasseur(byte[] b) {
        return b.length >= 4 && ((b[0] == 'P' && b[1] == 'K' && b[2] == 3 && b[3] == 4)
                || ((b[0] & 0xFF) == 0xD0 && (b[1] & 0xFF) == 0xCF && (b[2] & 0xFF) == 0x11 && (b[3] & 0xFF) == 0xE0));
    }

    /* ------------------------------------------------------------------ CSV */

    static Tableau lireCsv(byte[] contenu, boolean avecTitres) throws IOException {
        String encodage = "UTF-8";
        String texte;
        int debut = contenu.length >= 3 && (contenu[0] & 0xFF) == 0xEF && (contenu[1] & 0xFF) == 0xBB
                && (contenu[2] & 0xFF) == 0xBF ? 3 : 0;
        try {
            texte = StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(contenu, debut, contenu.length - debut)).toString();
        } catch (CharacterCodingException e) {
            texte = new String(contenu, CP1252);
            encodage = "Windows-1252";
        }
        char sep = separateur(texte);
        List<List<String>> brutes = new ArrayList<>();
        int ignorees = 0;
        CSVFormat format = CSVFormat.DEFAULT.withDelimiter(sep).withIgnoreSurroundingSpaces(false)
                .withAllowMissingColumnNames();
        try (CSVParser p = new CSVParser(new StringReader(texte), format)) {
            for (CSVRecord r : p) {
                List<String> l = new ArrayList<>();
                r.forEach(v -> l.add(v == null ? "" : v.trim()));
                if (vide(l)) {
                    continue;
                }
                if (brutes.size() >= MAX_LIGNES + (avecTitres ? 1 : 0)) {
                    ignorees++;
                    continue;
                }
                brutes.add(l);
            }
        } catch (IllegalStateException | java.io.UncheckedIOException e) {
            throw new IOException("Fichier CSV illisible : " + e.getMessage());
        }
        return construire(brutes, avecTitres).csv(sep == '\t' ? "tabulation" : String.valueOf(sep), encodage)
                .ignorees(ignorees);
    }

    /**
     * Separateur des premieres lignes : celui qui donne le meme nombre de colonnes (au moins 2) sur le plus de lignes,
     * hors guillemets ; a egalite l'ordre « ; » , « , » , tabulation , « | ». Une seule colonne : « ; ».
     */
    static char separateur(String texte) {
        String[] lignes = texte.split("\r\n|\n|\r", 21);
        char meilleur = ';';
        int meilleurScore = 0;
        for (char c : new char[] { ';', ',', '\t', '|' }) {
            java.util.Map<Integer, Integer> frequences = new java.util.HashMap<>();
            for (int i = 0; i < Math.min(20, lignes.length); i++) {
                if (lignes[i].trim().isEmpty()) {
                    continue;
                }
                int n = compter(lignes[i], c);
                if (n > 0) {
                    frequences.merge(n, 1, Integer::sum);
                }
            }
            int score = frequences.values().stream().max(Integer::compare).orElse(0);
            if (score > meilleurScore) {
                meilleurScore = score;
                meilleur = c;
            }
        }
        return meilleur;
    }

    private static int compter(String ligne, char c) {
        int n = 0;
        boolean guillemets = false;
        for (int i = 0; i < ligne.length(); i++) {
            char x = ligne.charAt(i);
            if (x == '"') {
                guillemets = !guillemets;
            } else if (x == c && !guillemets) {
                n++;
            }
        }
        return n;
    }

    /* ---------------------------------------------------------------- Excel */

    static Tableau lireExcel(byte[] contenu, String feuille, boolean avecTitres) throws IOException {
        try (Workbook wb = WorkbookFactory.create(new ByteArrayInputStream(contenu))) {
            List<String> noms = new ArrayList<>();
            for (int i = 0; i < wb.getNumberOfSheets(); i++) {
                noms.add(wb.getSheetName(i));
            }
            if (noms.isEmpty()) {
                throw new IOException("Le classeur ne contient aucune feuille.");
            }
            Sheet s = feuille != null && wb.getSheet(feuille) != null ? wb.getSheet(feuille) : wb.getSheetAt(0);
            DataFormatter formateur = new DataFormatter(Locale.FRANCE);
            FormulaEvaluator calcul = wb.getCreationHelper().createFormulaEvaluator();
            List<List<String>> brutes = new ArrayList<>();
            int ignorees = 0;
            for (Row r : s) {
                List<String> l = new ArrayList<>();
                int dernier = Math.min(r.getLastCellNum(), MAX_COLONNES);
                for (int c = 0; c < dernier; c++) {
                    l.add(texte(r.getCell(c), formateur, calcul));
                }
                if (vide(l)) {
                    continue;
                }
                if (brutes.size() >= MAX_LIGNES + (avecTitres ? 1 : 0)) {
                    ignorees++;
                    continue;
                }
                brutes.add(l);
            }
            return construire(brutes, avecTitres).classeur(noms, s.getSheetName()).ignorees(ignorees);
        } catch (IOException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new IOException("Classeur Excel illisible : " + e.getMessage());
        }
    }

    static String texte(Cell cell, DataFormatter formateur, FormulaEvaluator calcul) {
        if (cell == null) {
            return "";
        }
        CellType type = cell.getCellType();
        if (type == CellType.FORMULA) {
            try {
                type = calcul.evaluateFormulaCell(cell);
            } catch (RuntimeException e) {
                type = cell.getCachedFormulaResultType();
            }
        }
        if (type == CellType.NUMERIC) {
            if (DateUtil.isCellDateFormatted(cell)) {
                return new SimpleDateFormat("dd/MM/yyyy").format(cell.getDateCellValue());
            }
            double v = cell.getNumericCellValue();
            /* grands entiers (CIP, EAN) : en entier, jamais en notation scientifique */
            if (v == Math.rint(v) && Math.abs(v) >= 1e6) {
                return new BigDecimal(v).toPlainString();
            }
        }
        try {
            return formateur.formatCellValue(cell, calcul).trim();
        } catch (RuntimeException e) {
            return "";
        }
    }

    /* --------------------------------------------------------------- commun */

    private static boolean vide(List<String> l) {
        return l.stream().allMatch(v -> v == null || v.trim().isEmpty());
    }

    private static Tableau construire(List<List<String>> brutes, boolean avecTitres) {
        int largeur = 0;
        for (List<String> l : brutes) {
            largeur = Math.max(largeur, l.size());
        }
        largeur = Math.min(largeur, MAX_COLONNES);
        List<String> colonnes = new ArrayList<>();
        List<String> titres = avecTitres && !brutes.isEmpty() ? brutes.get(0) : new ArrayList<>();
        java.util.Set<String> vus = new java.util.HashSet<>();
        for (int i = 0; i < largeur; i++) {
            String t = i < titres.size() ? titres.get(i).trim() : "";
            if (t.isEmpty()) {
                t = "Colonne " + (i + 1);
            }
            /* titres en double : « Prix », « Prix (2) » */
            String unique = t;
            for (int k = 2; !vus.add(Correspondance.normaliser(unique)); k++) {
                unique = t + " (" + k + ")";
            }
            colonnes.add(unique);
        }
        return new Tableau(colonnes, avecTitres && !brutes.isEmpty() ? brutes.subList(1, brutes.size()) : brutes);
    }
}
