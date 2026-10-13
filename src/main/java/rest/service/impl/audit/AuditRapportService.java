package rest.service.impl.audit;

import dal.TUser;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * AUDIT & RAPPROCHEMENTS, onglet Rapports : conservation des analyses lancees (table t_audit_rapport), liste,
 * relecture, comparaison, editions PDF et Excel. Seule la table des rapports est ecrite.
 */
@Stateless
public class AuditRapportService {

    private static final DateTimeFormatter JJ_HH = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter JJ = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    public String enregistrer(JSONObject resultat, TUser u) {
        String id = UUID.randomUUID().toString();
        String auteur = u == null ? "" : (nz(u.getStrFIRSTNAME()) + " " + nz(u.getStrLASTNAME())).trim();
        em.createNativeQuery(
                "INSERT INTO t_audit_rapport (id, created_at, lg_USER_ID, auteur, debut, fin, sections_en_ecart,"
                        + " resume, contenu) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)")
                .setParameter(1, id).setParameter(2, Timestamp.valueOf(LocalDateTime.now()))
                .setParameter(3, u == null ? null : u.getLgUSERID()).setParameter(4, auteur)
                .setParameter(5, java.sql.Date.valueOf(resultat.getString("debut")))
                .setParameter(6, java.sql.Date.valueOf(resultat.getString("fin")))
                .setParameter(7, resultat.optInt("sectionsEnEcart"))
                .setParameter(8, AuditRapports.resume(resultat).toString()).setParameter(9, resultat.toString())
                .executeUpdate();
        return id;
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }

    @SuppressWarnings("unchecked")
    public JSONArray liste(int limite) {
        List<Object[]> r = em.createNativeQuery("SELECT id, created_at, auteur, debut, fin, sections_en_ecart, resume"
                + " FROM t_audit_rapport ORDER BY created_at DESC").setMaxResults(limite).getResultList();
        JSONArray l = new JSONArray();
        for (Object[] o : r) {
            l.put(new JSONObject().put("id", o[0]).put("date", dateHeure(o[1])).put("auteur", nz((String) o[2]))
                    .put("periode", "billetage du " + jour(o[3]) + " au " + jour(o[4]))
                    .put("sectionsEnEcart", ((Number) o[5]).intValue())
                    .put("resume", o[6] == null ? new JSONObject() : new JSONObject((String) o[6])));
        }
        return l;
    }

    /** Le rapport tel qu'enregistre, complete de sa date et de son auteur ; null s'il n'existe pas. */
    @SuppressWarnings("unchecked")
    public JSONObject lire(String id) {
        List<Object[]> r = em.createNativeQuery("SELECT contenu, created_at, auteur FROM t_audit_rapport WHERE id = ?1")
                .setParameter(1, id).getResultList();
        if (r.isEmpty()) {
            return null;
        }
        Object contenu = r.get(0)[0];
        return new JSONObject(contenu instanceof String ? (String) contenu : String.valueOf(contenu)).put("id", id)
                .put("date", dateHeure(r.get(0)[1])).put("auteur", nz((String) r.get(0)[2]));
    }

    /** Compare deux rapports ; l'ordre est retabli (A = le plus ancien). */
    public JSONObject comparer(String id1, String id2) {
        JSONObject x = lire(id1), y = lire(id2);
        if (x == null || y == null) {
            return null;
        }
        boolean ordre = dateCreation(id1).compareTo(dateCreation(id2)) <= 0;
        JSONObject a = ordre ? x : y, b = ordre ? y : x;
        return AuditRapports.comparer(a, b).put("a", a.optString("date") + " (" + a.optString("auteur") + ")").put("b",
                b.optString("date") + " (" + b.optString("auteur") + ")");
    }

    private Timestamp dateCreation(String id) {
        Object o = em.createNativeQuery("SELECT created_at FROM t_audit_rapport WHERE id = ?1").setParameter(1, id)
                .getSingleResult();
        return o instanceof Timestamp ? (Timestamp) o : Timestamp.valueOf(String.valueOf(o));
    }

    public String pharmacie() {
        List<?> r = em.createNativeQuery("SELECT str_NOM_COMPLET FROM t_officine LIMIT 1").getResultList();
        return r.isEmpty() || r.get(0) == null ? "" : String.valueOf(r.get(0)).trim();
    }

    public static String entete(JSONObject r) {
        return "Rapport du " + r.optString("date")
                + (r.optString("auteur").isEmpty() ? "" : " par " + r.optString("auteur")) + "  —  billetage du "
                + LocalDate.parse(r.optString("debut")).format(JJ) + " au "
                + LocalDate.parse(r.optString("fin")).format(JJ);
    }

    public byte[] pdf(JSONObject r) throws com.itextpdf.text.DocumentException {
        return rest.report.pdf.AuditPdf.rapport(pharmacie(), entete(r), r, AuditRapports.COLONNES);
    }

    /** Excel : une feuille de synthese, puis une feuille par controle en ecart, avec toutes ses lignes. */
    public byte[] excel(JSONObject r) throws IOException {
        try (Workbook wb = new HSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            CellStyle gras = wb.createCellStyle();
            Font f = wb.createFont();
            f.setBold(true);
            gras.setFont(f);
            Sheet s = wb.createSheet("Synthèse");
            int n = 0;
            s.createRow(n++).createCell(0).setCellValue("Audit & rapprochements — " + pharmacie());
            s.createRow(n++).createCell(0).setCellValue(entete(r));
            n++;
            entetes(s.createRow(n++), gras, "Contrôle", "Écarts", "Ce que signifie un écart");
            JSONArray sections = r.optJSONArray("sections");
            for (int i = 0; sections != null && i < sections.length(); i++) {
                JSONObject x = sections.getJSONObject(i);
                Row row = s.createRow(n++);
                row.createCell(0).setCellValue(x.optString("titre"));
                row.createCell(1).setCellValue(x.optInt("nb"));
                row.createCell(2).setCellValue(x.has("erreur") ? x.optString("erreur") : x.optString("explication"));
            }
            for (int c = 0; c < 3; c++) {
                s.autoSizeColumn(c);
            }
            for (int i = 0; sections != null && i < sections.length(); i++) {
                JSONObject x = sections.getJSONObject(i);
                String[][] cols = AuditRapports.colonnes(x.optString("code"));
                JSONArray lignes = x.optJSONArray("lignes");
                if (x.optInt("nb") == 0 || lignes == null || cols.length == 0) {
                    continue;
                }
                Sheet d = wb.createSheet(nomFeuille(x.optString("titre")));
                String[] titres = new String[cols.length];
                for (int c = 0; c < cols.length; c++) {
                    titres[c] = cols[c][1];
                }
                entetes(d.createRow(0), gras, titres);
                for (int k = 0; k < lignes.length(); k++) {
                    JSONObject l = lignes.getJSONObject(k);
                    Row row = d.createRow(k + 1);
                    for (int c = 0; c < cols.length; c++) {
                        Cell cell = row.createCell(c);
                        if ("1".equals(cols[c][2]) && l.has(cols[c][0])) {
                            cell.setCellValue(l.optLong(cols[c][0]));
                        } else {
                            cell.setCellValue(l.optString(cols[c][0]));
                        }
                    }
                }
                for (int c = 0; c < cols.length; c++) {
                    d.autoSizeColumn(c);
                }
            }
            wb.write(out);
            return out.toByteArray();
        }
    }

    private static void entetes(Row row, CellStyle style, String... titres) {
        for (int i = 0; i < titres.length; i++) {
            Cell c = row.createCell(i);
            c.setCellValue(titres[i]);
            c.setCellStyle(style);
        }
    }

    /** Nom de feuille Excel : 31 caracteres au plus, sans / \ ? * [ ] : */
    static String nomFeuille(String titre) {
        String t = titre.replaceAll("[/\\\\?*\\[\\]:]", " ").trim();
        return t.length() > 31 ? t.substring(0, 31) : t;
    }

    private static String dateHeure(Object o) {
        if (o instanceof Timestamp) {
            return ((Timestamp) o).toLocalDateTime().format(JJ_HH);
        }
        if (o instanceof LocalDateTime) {
            return ((LocalDateTime) o).format(JJ_HH);
        }
        return String.valueOf(o);
    }

    private static String jour(Object o) {
        if (o instanceof java.sql.Date) {
            return ((java.sql.Date) o).toLocalDate().format(JJ);
        }
        if (o instanceof LocalDate) {
            return ((LocalDate) o).format(JJ);
        }
        return String.valueOf(o);
    }
}
