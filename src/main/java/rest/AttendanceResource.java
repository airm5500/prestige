package rest;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.Locale;

import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.POST;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;

import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

import dal.TUser;
import rest.service.SaisieRefusee;
import rest.service.attendance.AttendanceImportParser;
import rest.service.attendance.AttendanceService;
import util.Constant;

/** API du pointage mobile et de l'assistant d'import de pointeuse. */
@Path("v1/rh")
@Produces("application/json")
@Consumes("application/json")
public class AttendanceResource {

    @EJB
    private AttendanceService service;
    @Inject
    private HttpServletRequest request;

    @GET
    @Path("employes")
    public Response employees() {
        if (currentUser() == null) {
            return unauthorized();
        }
        return ok(new JSONObject().put("success", true).put("data", service.employees()));
    }

    @POST
    @Path("employes")
    public Response employee(String body) {
        TUser user = currentUser();
        if (user == null) {
            return unauthorized();
        }
        try {
            return ok(new JSONObject().put("success", true).put("data", service.saveEmployee(new JSONObject(body))));
        } catch (RuntimeException e) {
            return badRequest(e.getMessage());
        }
    }

    @POST
    @Path("absences")
    public Response absence(String body) {
        TUser user = currentUser();
        if (user == null) {
            return unauthorized();
        }
        try {
            return ok(new JSONObject().put("success", true)
                    .put("data", service.saveAbsence(new JSONObject(body), user.getLgUSERID())));
        } catch (RuntimeException e) {
            return badRequest(e.getMessage());
        }
    }

    @POST
    @Path("pointages")
    public Response pointage(String body) {
        if (currentUser() == null) {
            return unauthorized();
        }
        try {
            JSONObject input = new JSONObject(body);
            String id = service.recordMobile(input.optString("employeeReference"),
                    LocalDateTime.parse(input.getString("timestamp")), input.optString("type").toUpperCase(Locale.ROOT),
                    input.optString("eventId"), input.optString("deviceId", null),
                    upperOrNull(input.optString("verificationMethod", null)), decimal(input, "latitude"),
                    decimal(input, "longitude"));
            return ok(new JSONObject().put("success", true).put("id", id));
        } catch (SaisieRefusee | DateTimeParseException | org.json.JSONException e) {
            return badRequest(e.getMessage());
        }
    }

    @POST
    @Path("imports/analyser")
    public Response analyse(String body) {
        if (currentUser() == null) {
            return unauthorized();
        }
        try {
            JSONObject input = new JSONObject(body);
            AttendanceImportParser.Result result = parse(input);
            return ok(resultJson(result));
        } catch (org.json.JSONException e) {
            return badRequest("Configuration d'importation invalide : " + e.getMessage());
        }
    }

    @POST
    @Path("imports/confirmer")
    public Response confirmer(String body) {
        TUser user = currentUser();
        if (user == null) {
            return unauthorized();
        }
        try {
            JSONObject input = new JSONObject(body);
            AttendanceImportParser.Result result = parse(input);
            AttendanceService.ImportSummary summary = service.importRows(input.optString("fileName"), result,
                    user.getLgUSERID());
            return ok(new JSONObject().put("success", true).put("batchId", summary.batchId)
                    .put("imported", summary.imported));
        } catch (SaisieRefusee | org.json.JSONException e) {
            return badRequest(e.getMessage());
        }
    }

    private static AttendanceImportParser.Result parse(JSONObject input) {
        JSONObject mapping = input.getJSONObject("columns");
        AttendanceImportParser.Config config = new AttendanceImportParser.Config();
        String delimiter = input.optString("delimiter", ";");
        if (delimiter.length() != 1) {
            throw new SaisieRefusee("Le séparateur CSV doit contenir un seul caractère.");
        }
        config.delimiter = delimiter.charAt(0);
        config.employeeColumn = mapping.getString("employee");
        config.timestampColumn = mapping.getString("timestamp");
        config.typeColumn = StringUtils.trimToNull(mapping.optString("type", null));
        config.defaultType = input.optString("defaultType", "UNKNOWN");
        JSONArray formats = input.optJSONArray("dateFormats");
        if (formats != null) {
            for (int i = 0; i < formats.length(); i++) {
                config.dateFormats.add(formats.getString(i));
            }
        }
        JSONObject aliases = input.optJSONObject("typeAliases");
        if (aliases != null) {
            for (String key : aliases.keySet()) {
                config.typeAliases.put(key.toUpperCase(Locale.ROOT), aliases.getString(key).toUpperCase(Locale.ROOT));
            }
        }
        return AttendanceImportParser.parse(input.getString("csv"), config);
    }

    private static JSONObject resultJson(AttendanceImportParser.Result result) {
        JSONArray rows = new JSONArray();
        for (AttendanceImportParser.Row row : result.rows) {
            rows.put(new JSONObject().put("line", row.line).put("employeeReference", row.employeeReference)
                    .put("timestamp", row.timestamp == null ? JSONObject.NULL : row.timestamp.toString())
                    .put("type", row.type == null ? JSONObject.NULL : row.type).put("valid", row.isValid())
                    .put("errors", row.errors));
        }
        JSONArray issues = new JSONArray();
        for (AttendanceImportParser.Issue issue : result.issues) {
            issues.put(new JSONObject().put("line", issue.line).put("code", issue.code).put("message", issue.message));
        }
        return new JSONObject().put("success", true).put("canImport", result.canImport()).put("rows", rows)
                .put("issues", issues).put("total", rows.length());
    }

    private static BigDecimal decimal(JSONObject json, String name) {
        return json.has(name) && !json.isNull(name) ? new BigDecimal(json.get(name).toString()) : null;
    }

    private static String upperOrNull(String value) {
        return value == null ? null : value.toUpperCase(Locale.ROOT);
    }

    private static Response ok(JSONObject json) {
        return Response.ok(json.toString()).build();
    }

    private static Response badRequest(String message) {
        return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JSONObject().put("success", false).put("message", message).toString()).build();
    }

    private TUser currentUser() {
        return (TUser) request.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    private static Response unauthorized() {
        return Response.status(Response.Status.UNAUTHORIZED)
                .entity(new JSONObject().put("success", false).put("message", Constant.DECONNECTED_MESSAGE).toString())
                .build();
    }
}
