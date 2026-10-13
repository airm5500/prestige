package rest.service.impl.audit;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class AuditAnalyseServiceTest {

    @Test
    void seulesLesLecturesSontRejouees() {
        assertTrue(AuditAnalyseService.selectSeul("SELECT a FROM t"));
        assertTrue(AuditAnalyseService.selectSeul("  select a from t where b = 1"));
        assertTrue(AuditAnalyseService.selectSeul("WITH x AS (SELECT 1) SELECT * FROM x"));
        assertFalse(AuditAnalyseService.selectSeul("DELETE FROM t"));
        assertFalse(AuditAnalyseService.selectSeul("UPDATE t SET a = 1"));
        assertFalse(AuditAnalyseService.selectSeul("SELECT 1; DELETE FROM t"));
        assertFalse(AuditAnalyseService.selectSeul(null));
    }
}
