package rest.service.impl.serveur;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * EXPERIENCE UTILISATEUR (RUM) : enregistrement des lots envoyes par les navigateurs (regroupes par minute) et
 * syntheses pour l'ecran Stabilite du serveur et l'outil Prestige Veille.
 */
@Stateless
@TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
public class RumService {

    static final int JOURS = 14;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /**
     * Lots du navigateur : [{type, cle, nombre, totalMs, maxMs, echecs, minute (epoch ms)}]. La cle est normalisee ici
     * (on ne se fie pas au navigateur) ; une minute hors des 24 dernieres heures est ramenee a maintenant.
     *
     * @return nombre de lots retenus
     */
    /** Regroupement des mesures en base (minutes) : 5 fois moins de lignes qu'a la minute, courbes inchangees. */
    static final int PAS_MINUTES = 5;

    /** Derniere purge des mesures de plus de JOURS jours : une fois par heure, et non a chaque envoi. */
    private static volatile long dernierePurge;

    /** Debut de la tranche de PAS_MINUTES minutes contenant ce moment. */
    static LocalDateTime tranche(LocalDateTime t) {
        LocalDateTime m = t.truncatedTo(ChronoUnit.MINUTES);
        return m.minusMinutes(m.getMinute() % PAS_MINUTES);
    }

    /**
     * Enregistrement si le parametre SUPPORT_RUM_ACTIF ne vaut pas 0, lu dans la MEME transaction que l'ecriture : une
     * seule connexion empruntee au pool par envoi (chaque emprunt coute 7 echanges avec la base).
     *
     * @return nombre de lots retenus, ou -1 si l'envoi est arrete
     */
    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public int enregistrerSiActif(String poste, String utilisateur, JSONArray lots) {
        @SuppressWarnings("unchecked")
        List<Object> v = em.createNativeQuery("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'SUPPORT_RUM_ACTIF'")
                .getResultList();
        if (!v.isEmpty() && v.get(0) != null && "0".equals(String.valueOf(v.get(0)).trim())) {
            return -1;
        }
        return enregistrer(poste, utilisateur, lots);
    }

    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public int enregistrer(String poste, String utilisateur, JSONArray lots) {
        /*
         * Retour du 14/10 (cout sur l'exploitation) : les lots sont regroupes par tranche de 5 minutes puis ecrits en
         * UNE requete (une ecriture par mesure avant : 20 mesures = 116 allers-retours avec la base centrale).
         */
        LocalDateTime maintenant = LocalDateTime.now().truncatedTo(ChronoUnit.MINUTES);
        java.util.Map<String, long[]> cumul = new java.util.LinkedHashMap<>();
        java.util.Map<String, Object[]> cles = new java.util.HashMap<>();
        int n = 0;
        for (int i = 0; lots != null && i < lots.length() && i < Rum.MAX_LOTS; i++) {
            JSONObject l = lots.optJSONObject(i);
            Rum.Type type = l == null ? null : Rum.type(l.optString("type"));
            if (type == null) {
                continue;
            }
            String cle = type == Rum.Type.API ? Rum.cleApi(l.optString("methode"), l.optString("cle"))
                    : Rum.cleSimple(l.optString("cle"));
            if (cle.isEmpty()) {
                continue;
            }
            int nombre = Math.max(1, Math.min(Rum.MAX_NOMBRE, l.optInt("nombre", 1)));
            long max = Rum.duree(l.optLong("maxMs", 0));
            long total = Math.max(0, Math.min(l.optLong("totalMs", 0), max * nombre));
            int echecs = Math.max(0, Math.min(nombre, l.optInt("echecs", 0)));
            LocalDateTime minute = maintenant;
            long t = l.optLong("minute", 0);
            if (t > 0) {
                LocalDateTime m = new Timestamp(t).toLocalDateTime().truncatedTo(ChronoUnit.MINUTES);
                if (!m.isAfter(maintenant) && m.isAfter(maintenant.minusHours(24))) {
                    minute = m;
                }
            }
            minute = tranche(minute);
            String k = minute + "|" + type.name() + "|" + cle;
            long[] c = cumul.computeIfAbsent(k, x -> new long[4]);
            c[0] += nombre;
            c[1] += total;
            c[2] = Math.max(c[2], max);
            c[3] += echecs;
            cles.putIfAbsent(k, new Object[] { Timestamp.valueOf(minute), type.name(), cle });
            n++;
        }
        if (!cumul.isEmpty()) {
            StringBuilder sql = new StringBuilder(
                    "INSERT INTO t_rum (minute, poste, utilisateur, type, cle, nombre, total_ms, max_ms, echecs) VALUES ");
            List<Object> p = new java.util.ArrayList<>();
            for (java.util.Map.Entry<String, long[]> e : cumul.entrySet()) {
                Object[] c = cles.get(e.getKey());
                long[] v = e.getValue();
                sql.append(p.isEmpty() ? "(" : ", (");
                for (int j = 1; j <= 9; j++) {
                    sql.append(j == 1 ? "" : ", ").append('?').append(p.size() + j);
                }
                sql.append(')');
                p.add(c[0]);
                p.add(StringUtils.left(poste, 80));
                p.add(StringUtils.left(utilisateur, 40));
                p.add(c[1]);
                p.add(c[2]);
                p.add((int) v[0]);
                p.add(v[1]);
                p.add(v[2]);
                p.add((int) v[3]);
            }
            sql.append(
                    " ON DUPLICATE KEY UPDATE nombre = nombre + VALUES(nombre), total_ms = total_ms + VALUES(total_ms),"
                            + " max_ms = GREATEST(max_ms, VALUES(max_ms)), echecs = echecs + VALUES(echecs)");
            Query q = em.createNativeQuery(sql.toString());
            for (int i = 0; i < p.size(); i++) {
                q.setParameter(i + 1, p.get(i));
            }
            q.executeUpdate();
        }
        long now = System.currentTimeMillis();
        if (now - dernierePurge > 3_600_000L) {
            dernierePurge = now;
            em.createNativeQuery("DELETE FROM t_rum WHERE minute < ?1 LIMIT 5000")
                    .setParameter(1, Timestamp.valueOf(LocalDateTime.now().minusDays(JOURS))).executeUpdate();
        }
        return n;
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> lignes(String sql, Object... p) {
        Query q = em.createNativeQuery(sql);
        for (int i = 0; i < p.length; i++) {
            q.setParameter(i + 1, p[i]);
        }
        return q.getResultList();
    }

    private static long l(Object o) {
        return o instanceof Number ? ((Number) o).longValue() : 0L;
    }

    /** Classement par type sur la periode : cle, nombre, moyenne, maximum, echecs (les plus lents d'abord). */
    private JSONArray classement(String type, Timestamp depuis, String poste, String ordre, int limite) {
        JSONArray a = new JSONArray();
        for (Object[] r : lignes(
                "SELECT cle, SUM(nombre), SUM(total_ms), MAX(max_ms), SUM(echecs), COUNT(DISTINCT poste)"
                        + " FROM t_rum WHERE type = ?1 AND minute >= ?2 AND (?3 = '' OR poste = ?3) GROUP BY cle ORDER BY "
                        + ordre + " LIMIT " + limite,
                type, depuis, StringUtils.defaultString(poste))) {
            long n = l(r[1]);
            a.put(new JSONObject().put("cle", String.valueOf(r[0])).put("nombre", n)
                    .put("moyenneMs", n == 0 ? 0 : l(r[2]) / n).put("maxMs", l(r[3])).put("echecs", l(r[4]))
                    .put("postes", l(r[5])));
        }
        return a;
    }

    /** Synthese sur les dernieres heures, tous postes ou un poste. */
    public JSONObject synthese(int heures, String poste) {
        Timestamp depuis = Timestamp.valueOf(LocalDateTime.now().minusHours(Math.max(1, Math.min(24 * JOURS, heures))));
        String p = StringUtils.defaultString(poste);
        JSONObject o = new JSONObject();
        o.put("ecrans", classement("ECRAN", depuis, p, "SUM(total_ms) / SUM(nombre) DESC", 30));
        o.put("apis", classement("API", depuis, p, "SUM(total_ms) / SUM(nombre) DESC", 30));
        o.put("apisEchecs", classement("API", depuis, p, "SUM(echecs) DESC", 15));
        o.put("erreurs", classement("ERREUR", depuis, p, "SUM(nombre) DESC", 20));
        JSONArray postes = new JSONArray();
        for (Object[] r : lignes(
                "SELECT poste, COUNT(DISTINCT utilisateur), SUM(CASE WHEN type = 'API' THEN nombre ELSE 0 END),"
                        + " SUM(CASE WHEN type = 'API' THEN total_ms ELSE 0 END), SUM(CASE WHEN type = 'API' THEN echecs ELSE 0 END),"
                        + " SUM(CASE WHEN type = 'ERREUR' THEN nombre ELSE 0 END), SUM(CASE WHEN type = 'ECRAN' THEN nombre ELSE 0 END),"
                        + " SUM(CASE WHEN type = 'ECRAN' THEN total_ms ELSE 0 END), MAX(minute)"
                        + " FROM t_rum WHERE minute >= ?1 GROUP BY poste ORDER BY poste",
                depuis)) {
            long api = l(r[2]), ecr = l(r[6]);
            postes.put(new JSONObject().put("poste", String.valueOf(r[0])).put("utilisateurs", l(r[1]))
                    .put("appels", api).put("appelMoyenMs", api == 0 ? 0 : l(r[3]) / api).put("echecs", l(r[4]))
                    .put("erreursJs", l(r[5])).put("ecrans", ecr).put("ecranMoyenMs", ecr == 0 ? 0 : l(r[7]) / ecr)
                    .put("derniereActivite", String.valueOf(r[8]).substring(0, 16)));
        }
        o.put("postes", postes);
        JSONArray serie = new JSONArray();
        String pas = heures <= 6 ? "%Y-%m-%d %H:%i" : "%Y-%m-%d %H:00";
        for (Object[] r : lignes("SELECT DATE_FORMAT(minute, '" + pas + "') AS t,"
                + " SUM(CASE WHEN type = 'API' THEN nombre ELSE 0 END), SUM(CASE WHEN type = 'API' THEN total_ms ELSE 0 END),"
                + " SUM(CASE WHEN type = 'ECRAN' THEN nombre ELSE 0 END), SUM(CASE WHEN type = 'ECRAN' THEN total_ms ELSE 0 END),"
                + " SUM(CASE WHEN type = 'API' THEN echecs ELSE 0 END) + SUM(CASE WHEN type = 'ERREUR' THEN nombre ELSE 0 END)"
                + " FROM t_rum WHERE minute >= ?1 AND (?2 = '' OR poste = ?2) GROUP BY t ORDER BY t", depuis, p)) {
            long api = l(r[1]), ecr = l(r[3]);
            serie.put(new JSONObject().put("t", String.valueOf(r[0])).put("appels", api)
                    .put("appelMoyenMs", api == 0 ? 0 : l(r[2]) / api).put("ecrans", ecr)
                    .put("ecranMoyenMs", ecr == 0 ? 0 : l(r[4]) / ecr).put("erreurs", l(r[5])));
        }
        o.put("serie", serie);
        return o;
    }
}
