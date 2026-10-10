package rest.service.attendance;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;

import org.junit.jupiter.api.Test;

class AttendanceImportParserTest {

    @Test
    void mapsVendorColumnsAndAliases() {
        AttendanceImportParser.Config config = config();
        config.typeAliases.put("E", "ENTREE");
        config.typeAliases.put("S", "SORTIE");
        AttendanceImportParser.Result result = AttendanceImportParser
                .parse("Badge;Jour;Sens\nB-12;05/10/2026 08:01;E\nB-12;05/10/2026 17:32;S", config);

        assertTrue(result.canImport());
        assertEquals(2, result.rows.size());
        assertEquals("CHECK_IN", result.rows.get(0).type);
        assertEquals("CHECK_OUT", result.rows.get(1).type);
    }

    @Test
    void reportsAllBadRowsBeforeImport() {
        AttendanceImportParser.Config config = config();
        AttendanceImportParser.Result result = AttendanceImportParser
                .parse("Badge;Jour;Sens\n;date impossible;X", config);

        assertFalse(result.canImport());
        assertEquals(3, result.rows.get(0).errors.size());
        assertEquals(3, result.issues.size());
    }

    @Test
    void rejectsMissingMappedColumn() {
        AttendanceImportParser.Result result = AttendanceImportParser.parse("Badge;Autre\nB-1;x", config());

        assertFalse(result.canImport());
        assertEquals("MISSING_COLUMN", result.issues.get(0).code);
    }

    private static AttendanceImportParser.Config config() {
        AttendanceImportParser.Config config = new AttendanceImportParser.Config();
        config.employeeColumn = "Badge";
        config.timestampColumn = "Jour";
        config.typeColumn = "Sens";
        config.dateFormats = Arrays.asList("dd/MM/yyyy HH:mm");
        return config;
    }
}
