package rest.service.attendance;

import java.io.IOException;
import java.io.StringReader;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.commons.lang3.StringUtils;

/** Analyse un export de pointeuse sans supposer l'ordre ni le nom de ses colonnes. */
public final class AttendanceImportParser {

    private static final int MAX_ROWS = 10000;

    private AttendanceImportParser() {
    }

    public static Result parse(String content, Config config) {
        if (StringUtils.isBlank(content)) {
            return Result.fatal("Le fichier CSV est vide.");
        }
        if (config == null) {
            return Result.fatal("La configuration des colonnes est obligatoire.");
        }
        List<String> formats = config.dateFormats.isEmpty()
                ? Arrays.asList("yyyy-MM-dd HH:mm:ss", "dd/MM/yyyy HH:mm:ss", "dd/MM/yyyy HH:mm")
                : config.dateFormats;
        CSVFormat format = CSVFormat.DEFAULT.withDelimiter(config.delimiter).withTrim()
                .withIgnoreEmptyLines().withFirstRecordAsHeader();
        List<Row> rows = new ArrayList<>();
        List<Issue> issues = new ArrayList<>();
        try (CSVParser parser = format.parse(new StringReader(stripBom(content)))) {
            validateColumns(parser.getHeaderMap(), config, issues);
            if (!issues.isEmpty()) {
                return new Result(rows, issues);
            }
            for (CSVRecord record : parser) {
                if (rows.size() >= MAX_ROWS) {
                    issues.add(new Issue(0, "FILE_TOO_LARGE", "Le fichier dépasse " + MAX_ROWS + " lignes."));
                    break;
                }
                long line = record.getRecordNumber() + 1;
                String employee = value(record, config.employeeColumn);
                String date = value(record, config.timestampColumn);
                String rawType = config.typeColumn == null ? config.defaultType : value(record, config.typeColumn);
                String type = normalizeType(rawType, config.typeAliases);
                LocalDateTime timestamp = parseDate(date, formats);
                List<String> errors = new ArrayList<>();
                if (StringUtils.isBlank(employee)) {
                    errors.add("Matricule ou badge absent");
                }
                if (timestamp == null) {
                    errors.add("Date/heure invalide : " + date);
                }
                if (type == null) {
                    errors.add("Type de pointage inconnu : " + rawType);
                }
                Row row = new Row(line, employee, timestamp, type, errors);
                rows.add(row);
                for (String error : errors) {
                    issues.add(new Issue(line, "INVALID_ROW", error));
                }
            }
        } catch (IllegalArgumentException | IOException e) {
            issues.add(new Issue(0, "INVALID_CSV", "Le CSV ne peut pas être lu : " + e.getMessage()));
        }
        return new Result(rows, issues);
    }

    private static void validateColumns(Map<String, Integer> headers, Config config, List<Issue> issues) {
        for (String name : Arrays.asList(config.employeeColumn, config.timestampColumn)) {
            if (StringUtils.isBlank(name) || !headers.containsKey(name)) {
                issues.add(new Issue(1, "MISSING_COLUMN", "Colonne obligatoire introuvable : " + name));
            }
        }
        if (config.typeColumn != null && !headers.containsKey(config.typeColumn)) {
            issues.add(new Issue(1, "MISSING_COLUMN", "Colonne de type introuvable : " + config.typeColumn));
        }
    }

    private static String value(CSVRecord record, String column) {
        return column == null ? null : StringUtils.trimToEmpty(record.get(column));
    }

    private static LocalDateTime parseDate(String value, List<String> formats) {
        for (String pattern : formats) {
            try {
                return LocalDateTime.parse(value, DateTimeFormatter.ofPattern(pattern));
            } catch (DateTimeParseException | IllegalArgumentException ignored) {
                // Le correcteur essaie tous les formats declares avant de rejeter la ligne.
            }
        }
        return null;
    }

    private static String normalizeType(String value, Map<String, String> aliases) {
        String key = StringUtils.upperCase(StringUtils.trimToEmpty(value), Locale.ROOT);
        String mapped = aliases.getOrDefault(key, key);
        if (Arrays.asList("IN", "ENTREE", "ARRIVEE", "CHECK_IN").contains(mapped)) {
            return "CHECK_IN";
        }
        if (Arrays.asList("OUT", "SORTIE", "DEPART", "CHECK_OUT").contains(mapped)) {
            return "CHECK_OUT";
        }
        return null;
    }

    private static String stripBom(String value) {
        return value.startsWith("\uFEFF") ? value.substring(1) : value;
    }

    public static final class Config {
        public char delimiter = ';';
        public String employeeColumn;
        public String timestampColumn;
        public String typeColumn;
        public String defaultType = "UNKNOWN";
        public List<String> dateFormats = new ArrayList<>();
        public Map<String, String> typeAliases = new LinkedHashMap<>();
    }

    public static final class Row {
        public final long line;
        public final String employeeReference;
        public final LocalDateTime timestamp;
        public final String type;
        public final List<String> errors;

        Row(long line, String employeeReference, LocalDateTime timestamp, String type, List<String> errors) {
            this.line = line;
            this.employeeReference = employeeReference;
            this.timestamp = timestamp;
            this.type = type;
            this.errors = Collections.unmodifiableList(errors);
        }

        public boolean isValid() {
            return errors.isEmpty();
        }
    }

    public static final class Issue {
        public final long line;
        public final String code;
        public final String message;

        Issue(long line, String code, String message) {
            this.line = line;
            this.code = code;
            this.message = message;
        }
    }

    public static final class Result {
        public final List<Row> rows;
        public final List<Issue> issues;

        Result(List<Row> rows, List<Issue> issues) {
            this.rows = Collections.unmodifiableList(rows);
            this.issues = Collections.unmodifiableList(issues);
        }

        static Result fatal(String message) {
            return new Result(Collections.emptyList(), Collections.singletonList(new Issue(0, "INVALID_FILE", message)));
        }

        public boolean canImport() {
            return !rows.isEmpty() && issues.isEmpty();
        }
    }
}
