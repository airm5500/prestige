package rest.service.impl;

import dal.enumeration.TypeLog;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.impl.journal.HistoriqueFiche;

/**
 * Retours du 23/11 : traces d'une fiche article.
 * <ul>
 * <li>{@link #historique} : onglet « Historique » de la fiche (proposition 2) ;</li>
 * <li>{@link #fichesInactives} : a la creation, les fiches desactivees ou supprimees qui ont deja le CIP ou l'EAN
 * saisi, avec la date et l'auteur de leur desactivation ou suppression (proposition 3).</li>
 * </ul>
 * Lecture seule : aucune ecriture en base.
 */
@Stateless
public class TracesFicheService {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private static final String NOM = "NULLIF(TRIM(CONCAT(IFNULL(u.str_FIRST_NAME,''),' ',IFNULL(u.str_LAST_NAME,''))),'')";

    /** CIP tel que l'enregistrement le range : 6 chiffres recoivent leur cle (familleManagement.generateCIP). */
    public static String cipEnregistre(String cip) {
        String c = StringUtils.trimToEmpty(cip);
        if (c.length() != 6 || !c.chars().allMatch(Character::isDigit)) {
            return c;
        }
        int s = 0;
        for (int i = 1; i <= 6; i++) {
            s += (c.charAt(i - 1) - '0') * (i + 1);
        }
        return c + (s % 11);
    }

    @SuppressWarnings("unchecked")
    public JSONObject historique(String id) {
        List<Object[]> f = em
                .createNativeQuery(
                        "SELECT f.int_CIP, f.str_NAME, f.dt_CREATED FROM t_famille f WHERE f.lg_FAMILLE_ID = ?1")
                .setParameter(1, id).getResultList();
        if (f.isEmpty()) {
            return new JSONObject().put("success", false).put("msg", "Article introuvable").put("data",
                    new JSONArray());
        }
        String cip = (String) f.get(0)[0];
        String nom = (String) f.get(0)[1];
        Date creeLe = (Date) f.get(0)[2];
        List<String> cips = new ArrayList<>();
        if (StringUtils.isNotBlank(cip)) {
            cips.add(cip.trim());
        }
        for (Object c : (List<Object>) em
                .createNativeQuery("SELECT DISTINCT TRIM(g.str_CODE_ARTICLE)"
                        + " FROM t_famille_grossiste g WHERE g.lg_FAMILLE_ID = ?1 AND g.str_CODE_ARTICLE IS NOT NULL")
                .setParameter(1, id).setMaxResults(20).getResultList()) {
            String s = StringUtils.trimToEmpty((String) c);
            if (!s.isEmpty() && !cips.contains(s)) {
                cips.add(s);
            }
        }
        Map<String, Integer> fichesParCip = new HashMap<>();
        if (!cips.isEmpty()) {
            for (Object[] r : (List<Object[]>) em
                    .createNativeQuery("SELECT TRIM(f.int_CIP), COUNT(*) FROM t_famille f WHERE TRIM(f.int_CIP) IN ?1"
                            + " GROUP BY TRIM(f.int_CIP)")
                    .setParameter(1, cips).getResultList()) {
                fichesParCip.put((String) r[0], ((Number) r[1]).intValue());
            }
        }
        List<String> refs = new ArrayList<>(cips);
        refs.add(0, id);
        List<HistoriqueFiche.Ligne> lignes = new ArrayList<>();
        for (Object[] r : (List<Object[]>) em.createNativeQuery("SELECT e.dt_CREATED, e.typeLog, e.str_DESCRIPTION,"
                + " e.str_DETAIL, e.str_TYPE_LOG, " + NOM + " FROM t_event_log e"
                + " LEFT JOIN t_user u ON u.lg_USER_ID = e.lg_USER_ID WHERE e.str_TYPE_LOG IN ?1 AND e.typeLog IN ?2"
                + " ORDER BY e.dt_CREATED DESC").setParameter(1, refs).setParameter(2, HistoriqueFiche.ordinaux())
                .setMaxResults(HistoriqueFiche.MAXI + 1).getResultList()) {
            int o = r[1] == null ? -1 : ((Number) r[1]).intValue();
            TypeLog t = o >= 0 && o < TypeLog.values().length ? TypeLog.values()[o] : null;
            lignes.add(new HistoriqueFiche.Ligne((Date) r[0], t, (String) r[2], (String) r[3], (String) r[4],
                    (String) r[5]));
        }
        boolean creationParId = false;
        for (HistoriqueFiche.Ligne l : lignes) {
            creationParId |= HistoriqueFiche.estCreation(id, l);
        }
        String auteur = "";
        if (!creationParId && creeLe != null) {
            auteur = StringUtils.trimToEmpty(CreateurArticle
                    .auteurs(em, Collections.singletonList(new CreateurArticle.Fiche(id, cip, nom, creeLe))).get(id));
        }
        JSONArray data = HistoriqueFiche.assembler(id, creeLe, fichesParCip, lignes, auteur);
        return new JSONObject().put("success", true).put("total", data.length()).put("data", data).put("complet",
                lignes.size() <= HistoriqueFiche.MAXI);
    }

    @SuppressWarnings("unchecked")
    public JSONObject fichesInactives(String cipSaisi, String eanSaisi) {
        String cip = cipEnregistre(cipSaisi);
        String ean = StringUtils.trimToEmpty(eanSaisi);
        JSONArray data = new JSONArray();
        if (cip.length() < 6 && ean.length() < 8) {
            return new JSONObject().put("success", true).put("data", data);
        }
        List<Object[]> fiches = em
                .createNativeQuery("SELECT f.lg_FAMILLE_ID, f.int_CIP, f.int_EAN13, f.str_NAME,"
                        + " f.str_STATUT FROM t_famille f WHERE f.str_STATUT IN ('delete', 'disable') AND ("
                        + " (?1 <> '' AND (TRIM(f.int_CIP) = ?1 OR EXISTS (SELECT 1 FROM t_famille_grossiste g"
                        + " WHERE g.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND TRIM(g.str_CODE_ARTICLE) = ?1)))"
                        + " OR (?2 <> '' AND TRIM(f.int_EAN13) = ?2)) ORDER BY f.dt_UPDATED DESC")
                .setParameter(1, cip.length() >= 6 ? cip : "").setParameter(2, ean.length() >= 8 ? ean : "")
                .setMaxResults(10).getResultList();
        SimpleDateFormat jj = new SimpleDateFormat("dd/MM/yyyy");
        for (Object[] r : fiches) {
            String id = (String) r[0];
            String sonCip = StringUtils.trimToEmpty((String) r[1]);
            String statut = (String) r[4];
            int type = "delete".equals(statut) ? TypeLog.SUPPRESSION_DE_PRODUIT.ordinal()
                    : TypeLog.DESACTIVATION_DE_PRODUIT.ordinal();
            List<String> refs = new ArrayList<>();
            refs.add(id);
            if (!sonCip.isEmpty()) {
                refs.add(sonCip);
            }
            List<Object[]> l = em.createNativeQuery("SELECT e.dt_CREATED, " + NOM + " FROM t_event_log e"
                    + " LEFT JOIN t_user u ON u.lg_USER_ID = e.lg_USER_ID WHERE e.str_TYPE_LOG IN ?1 AND e.typeLog = ?2"
                    + " ORDER BY e.dt_CREATED DESC").setParameter(1, refs).setParameter(2, type).setMaxResults(1)
                    .getResultList();
            String trace = l.isEmpty() ? "" : jj.format((Date) l.get(0)[0])
                    + (l.get(0)[1] == null ? "" : " par " + StringUtils.trimToEmpty((String) l.get(0)[1]));
            boolean parCip = cip.length() >= 6;
            data.put(new JSONObject().put("id", id).put("cip", sonCip)
                    .put("ean", StringUtils.trimToEmpty((String) r[2]))
                    .put("nom", StringUtils.trimToEmpty((String) r[3]))
                    .put("statut", "delete".equals(statut) ? "supprimée" : "désactivée").put("trace", trace)
                    .put("par", parCip && (cip.equals(sonCip) || !ean.equals(StringUtils.trimToEmpty((String) r[2])))
                            ? "CIP" : "EAN"));
        }
        return new JSONObject().put("success", true).put("data", data);
    }
}
