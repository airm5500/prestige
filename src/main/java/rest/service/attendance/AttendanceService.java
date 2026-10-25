package rest.service.attendance;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.NoResultException;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;

import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

import rest.service.SaisieRefusee;

/** Ecriture transactionnelle des pointages mobiles et des imports contrôlés. */
@Stateless
public class AttendanceService {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Conserve les heures réelles de connexion, indépendamment du dernier accès stocké sur l'utilisateur. */
    public void login(String userId, String sessionToken) {
        if (StringUtils.isBlank(userId) || StringUtils.isBlank(sessionToken)) {
            return;
        }
        @SuppressWarnings("unchecked")
        java.util.List<String> employees = em
                .createNativeQuery("SELECT id FROM employee_profile WHERE user_id=?1 AND active=1 LIMIT 1")
                .setParameter(1, userId).getResultList();
        if (!employees.isEmpty()) {
            em.createNativeQuery("INSERT IGNORE INTO employee_session"
                    + " (id,employee_id,user_id,login_at,session_token) VALUES (?1,?2,?3,NOW(),?4)")
                    .setParameter(1, UUID.randomUUID().toString()).setParameter(2, employees.get(0))
                    .setParameter(3, userId).setParameter(4, sessionToken).executeUpdate();
        }
    }

    public void logout(String sessionToken) {
        if (StringUtils.isNotBlank(sessionToken)) {
            em.createNativeQuery("UPDATE employee_session SET logout_at=NOW()"
                    + " WHERE session_token=?1 AND logout_at IS NULL").setParameter(1, sessionToken).executeUpdate();
        }
    }

    public JSONObject saveEmployee(JSONObject input) {
        String number = StringUtils.trimToEmpty(input.optString("employeeNumber"));
        String firstName = StringUtils.trimToEmpty(input.optString("firstName"));
        String lastName = StringUtils.trimToEmpty(input.optString("lastName"));
        if (number.isEmpty() || firstName.isEmpty() || lastName.isEmpty()) {
            throw new SaisieRefusee("Le matricule, le nom et le prénom sont obligatoires.");
        }
        String id = UUID.randomUUID().toString();
        em.createNativeQuery("INSERT INTO employee_profile"
                + " (id,user_id,employee_number,badge_number,first_name,last_name,phone,email,hire_date,active,created_at)"
                + " VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,1,NOW())")
                .setParameter(1, id).setParameter(2, nullIfBlank(input.optString("userId", null)))
                .setParameter(3, number).setParameter(4, nullIfBlank(input.optString("badgeNumber", null)))
                .setParameter(5, firstName).setParameter(6, lastName)
                .setParameter(7, nullIfBlank(input.optString("phone", null)))
                .setParameter(8, nullIfBlank(input.optString("email", null)))
                .setParameter(9, input.has("hireDate") ? java.sql.Date.valueOf(input.getString("hireDate")) : null)
                .executeUpdate();
        return new JSONObject().put("id", id).put("employeeNumber", number).put("firstName", firstName)
                .put("lastName", lastName);
    }

    public JSONObject saveAbsence(JSONObject input, String createdBy) {
        String employeeId = employeeId(input.optString("employeeReference"));
        String type = input.optString("type").toUpperCase(java.util.Locale.ROOT);
        if (!"LEAVE".equals(type) && !"REST".equals(type)) {
            throw new SaisieRefusee("Le type d'absence doit être LEAVE ou REST.");
        }
        java.sql.Date start = java.sql.Date.valueOf(input.getString("startDate"));
        java.sql.Date end = java.sql.Date.valueOf(input.getString("endDate"));
        if (end.before(start)) {
            throw new SaisieRefusee("La fin de l'absence doit suivre son début.");
        }
        String id = UUID.randomUUID().toString();
        em.createNativeQuery("INSERT INTO employee_absence"
                + " (id,employee_id,absence_type,start_date,end_date,status,note,created_by,created_at)"
                + " VALUES (?1,?2,?3,?4,?5,?6,?7,?8,NOW())").setParameter(1, id)
                .setParameter(2, employeeId).setParameter(3, type).setParameter(4, start).setParameter(5, end)
                .setParameter(6, input.optString("status", "APPROVED"))
                .setParameter(7, nullIfBlank(input.optString("note", null))).setParameter(8, createdBy).executeUpdate();
        return new JSONObject().put("id", id).put("type", type).put("startDate", start.toString())
                .put("endDate", end.toString());
    }

    public JSONArray employees() {
        @SuppressWarnings("unchecked")
        java.util.List<Object[]> values = em.createNativeQuery("SELECT id,employee_number,badge_number,first_name,"
                + "last_name,active FROM employee_profile ORDER BY last_name,first_name").getResultList();
        JSONArray result = new JSONArray();
        for (Object[] value : values) {
            result.put(new JSONObject().put("id", value[0]).put("employeeNumber", value[1])
                    .put("badgeNumber", value[2] == null ? JSONObject.NULL : value[2]).put("firstName", value[3])
                    .put("lastName", value[4]).put("active", ((Number) value[5]).intValue() == 1));
        }
        return result;
    }

    private static String nullIfBlank(String value) {
        return StringUtils.trimToNull(value);
    }

    public String recordMobile(String employeeReference, LocalDateTime timestamp, String type, String eventId,
            String deviceId, String verificationMethod, BigDecimal latitude, BigDecimal longitude) {
        if (StringUtils.isBlank(eventId)) {
            throw new SaisieRefusee("L'identifiant unique du pointage mobile est obligatoire.");
        }
        String existing = existingEvent("MOBILE", eventId);
        if (existing != null) {
            return existing; // Synchronisation mobile rejouable, sans pointage en double.
        }
        String employeeId = employeeId(employeeReference);
        validateEvent(timestamp, type, verificationMethod);
        return insertEvent(employeeId, timestamp, type, "MOBILE", eventId, deviceId, verificationMethod, latitude,
                longitude, null);
    }

    public ImportSummary importRows(String fileName, AttendanceImportParser.Result parsed, String importedBy) {
        if (parsed == null || !parsed.canImport()) {
            throw new SaisieRefusee("Corrigez toutes les anomalies avant de confirmer l'importation.");
        }
        Map<String, String> employees = new HashMap<>();
        for (AttendanceImportParser.Row row : parsed.rows) {
            employees.put(row.employeeReference, employeeId(row.employeeReference));
        }
        String batchId = UUID.randomUUID().toString();
        em.createNativeQuery("INSERT INTO attendance_import_batch"
                + " (id,file_name,imported_rows,rejected_rows,imported_by,created_at) VALUES (?1,?2,?3,0,?4,NOW())")
                .setParameter(1, batchId).setParameter(2, StringUtils.abbreviate(fileName, 255))
                .setParameter(3, parsed.rows.size()).setParameter(4, importedBy).executeUpdate();
        int imported = 0;
        for (AttendanceImportParser.Row row : parsed.rows) {
            String sourceId = batchId + ":" + row.line;
            insertEvent(employees.get(row.employeeReference), row.timestamp, row.type, "DEVICE", sourceId, null,
                    null, null, null, batchId);
            imported++;
        }
        return new ImportSummary(batchId, imported);
    }

    private void validateEvent(LocalDateTime timestamp, String type, String verificationMethod) {
        if (timestamp == null || timestamp.isAfter(LocalDateTime.now().plusMinutes(5))) {
            throw new SaisieRefusee("La date du pointage est absente ou située dans le futur.");
        }
        if (!"CHECK_IN".equals(type) && !"CHECK_OUT".equals(type)) {
            throw new SaisieRefusee("Le type doit être CHECK_IN ou CHECK_OUT.");
        }
        if (verificationMethod != null && !"BADGE".equals(verificationMethod)
                && !"BIOMETRIC".equals(verificationMethod) && !"MANUAL".equals(verificationMethod)) {
            throw new SaisieRefusee("Méthode de vérification inconnue.");
        }
    }

    private String employeeId(String reference) {
        if (StringUtils.isBlank(reference)) {
            throw new SaisieRefusee("Le matricule ou le badge de l'employé est obligatoire.");
        }
        try {
            return (String) em.createNativeQuery("SELECT id FROM employee_profile"
                    + " WHERE active=1 AND (employee_number=?1 OR badge_number=?1) LIMIT 1")
                    .setParameter(1, reference.trim()).getSingleResult();
        } catch (NoResultException e) {
            throw new SaisieRefusee("Employé introuvable pour le matricule ou badge « " + reference + " ».");
        }
    }

    private String existingEvent(String source, String sourceEventId) {
        try {
            return (String) em.createNativeQuery(
                    "SELECT id FROM attendance_event WHERE source=?1 AND source_event_id=?2 LIMIT 1")
                    .setParameter(1, source).setParameter(2, sourceEventId).getSingleResult();
        } catch (NoResultException e) {
            return null;
        }
    }

    private String insertEvent(String employeeId, LocalDateTime timestamp, String type, String source,
            String sourceEventId, String deviceId, String method, BigDecimal latitude, BigDecimal longitude,
            String batchId) {
        validateEvent(timestamp, type, method);
        String id = UUID.randomUUID().toString();
        Query query = em.createNativeQuery("INSERT INTO attendance_event"
                + " (id,employee_id,event_time,event_type,source,source_event_id,device_id,verification_method,"
                + "latitude,longitude,import_batch_id,created_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,NOW())");
        query.setParameter(1, id).setParameter(2, employeeId).setParameter(3, Timestamp.valueOf(timestamp))
                .setParameter(4, type).setParameter(5, source).setParameter(6, sourceEventId)
                .setParameter(7, deviceId).setParameter(8, method).setParameter(9, latitude)
                .setParameter(10, longitude).setParameter(11, batchId).executeUpdate();
        return id;
    }

    public static final class ImportSummary {
        public final String batchId;
        public final int imported;

        ImportSummary(String batchId, int imported) {
            this.batchId = batchId;
            this.imported = imported;
        }
    }
}
