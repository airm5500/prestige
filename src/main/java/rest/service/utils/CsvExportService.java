/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package rest.service.utils;

import java.io.IOException;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.function.Function;
import javax.ejb.Stateless;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;

/**
 *
 * @author koben
 */
@Stateless
public class CsvExportService {

    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    /**
     * Crée un fichier CSV avec en-tête et données
     *
     * @param title
     *            Titre du rapport (ajouté en première ligne)
     * @param headers
     *            En-têtes des colonnes
     * @param data
     *            Liste des données
     * @param rowMapper
     *            Fonction pour mapper chaque élément vers un tableau de strings
     * @param <T>
     *            Type des données
     *
     * @return ByteArray du fichier CSV en UTF-8
     *
     * @throws java.io.IOException
     */
    public <T> byte[] createCsvReport(String title, String[] headers, List<T> data, Function<T, String[]> rowMapper)
            throws IOException {
        StringWriter writer = new StringWriter();

        CSVFormat csvFormat = CSVFormat.EXCEL.withHeader(headers).withDelimiter(';');

        try (CSVPrinter csvPrinter = new CSVPrinter(writer, csvFormat)) {
            // Ligne de titre
            csvPrinter.printComment(title);

            // Ligne de date d'export
            csvPrinter.printComment("Généré le: " + LocalDateTime.now().format(DATETIME_FORMATTER));

            // Données
            for (T item : data) {
                String[] row = rowMapper.apply(item);
                csvPrinter.printRecord((Object[]) row);
            }
        }

        return writer.toString().getBytes(StandardCharsets.UTF_8);
    }

    /**
     * Crée un fichier CSV simple avec données en tableau
     */
    public byte[] createSimpleCsvReport(String title, String[] headers, List<String[]> data) throws IOException {
        return createCsvReport(title, headers, data, row -> row);
    }

    /**
     * Ajoute le BOM UTF-8 pour Excel Windows
     */
    public byte[] addUtf8Bom(byte[] csvData) {
        byte[] bom = new byte[] { (byte) 0xEF, (byte) 0xBB, (byte) 0xBF };
        byte[] result = new byte[bom.length + csvData.length];
        System.arraycopy(bom, 0, result, 0, bom.length);
        System.arraycopy(csvData, 0, result, bom.length, csvData.length);
        return result;
    }
}
