/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import commonTasks.dto.LogDTO;
import dal.TEventLog;
import dal.TEventLog_;
import dal.TUser;
import dal.TUser_;
import dal.enumeration.TypeLog;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.LogService;
import util.Constant;

/**
 *
 * @author DICI
 */
@Stateless
public class LogServiceImpl implements LogService {

    private static final Logger LOG = Logger.getLogger(LogServiceImpl.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    public EntityManager getEntityManager() {
        return em;
    }

    @Override
    public void updateLogFile(TUser user, String ref, String desc, TypeLog typeLog, Object T) {
        try {
            TEventLog eventLog = new TEventLog(UUID.randomUUID().toString());
            eventLog.setLgUSERID(user);
            eventLog.setDtCREATED(new Date());
            eventLog.setDtUPDATED(eventLog.getDtCREATED());
            eventLog.setStrCREATEDBY(user.getStrLOGIN());
            eventLog.setStrSTATUT(Constant.STATUT_ENABLE);
            eventLog.setStrTABLECONCERN(T.getClass().getName());
            eventLog.setTypeLog(typeLog);
            eventLog.setStrDESCRIPTION(desc + " référence [" + ref + " ]");
            getEntityManager().persist(eventLog);

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);

        }
    }

    @Override
    public void updateItem(TUser user, String ref, String desc, TypeLog typeLog, Object t) {
        TEventLog eventLog = new TEventLog(UUID.randomUUID().toString());
        eventLog.setLgUSERID(user);
        eventLog.setDtCREATED(new Date());
        eventLog.setDtUPDATED(eventLog.getDtCREATED());
        eventLog.setStrCREATEDBY(user.getStrLOGIN());
        eventLog.setStrSTATUT(Constant.STATUT_ENABLE);
        eventLog.setStrTABLECONCERN(t.getClass().getName());
        eventLog.setTypeLog(typeLog);
        eventLog.setStrDESCRIPTION(desc + " référence [" + ref + " ]");
        eventLog.setStrTYPELOG(ref);
        this.getEntityManager().persist(eventLog);
    }

    Comparator<LogDTO> comparatorOrder = Comparator.comparing(LogDTO::getOrder);
    Comparator<LogDTO> comparatorDate = Comparator.comparing(LogDTO::getOperationDate);

    @Override
    public JSONObject filtres(String query) throws JSONException {
        List<LogDTO> l = Stream.of(TypeLog.values()).filter(TypeLog::isChecked)
                .map(x -> new LogDTO(x.ordinal(), x.getValue())).collect(Collectors.toList());
        if (query != null && !"".equals(query)) {
            List<LogDTO> newItem = l.stream().filter(x -> x.getStrDESCRIPTION().startsWith(query))
                    .sorted(comparatorOrder.reversed()).collect(Collectors.toList());
            newItem.add(new LogDTO(-1, "TOUS"));

            return new JSONObject().put("total", newItem.size()).put("data", new JSONArray(newItem));
        }
        l.add(new LogDTO(-1, "TOUS"));
        l.sort(comparatorOrder.reversed());
        return new JSONObject().put("total", l.size()).put("data", new JSONArray(l));
    }

    private long logs(String search, LocalDate dtStart, LocalDate dtEnd, String userId, int criteria) {
        return logs(search, dtStart, dtEnd, userId, criteria, null);
    }

    private long logs(String search, LocalDate dtStart, LocalDate dtEnd, String userId, int criteria, String poste) {
        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TEventLog> root = cq.from(TEventLog.class);
            cq.select(cb.count(root));
            List<Predicate> predicates = logs(cb, root, search, dtStart, dtEnd, userId, criteria, poste);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEntityManager().createQuery(cq);
            return (long) q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    /* echappe % _ \ pour qu'ils soient recherches litteralement dans le LIKE */
    private String escapeLike(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    private List<Predicate> logs(CriteriaBuilder cb, Root<TEventLog> root, String search, LocalDate dtStart,
            LocalDate dtEnd, String userId, int criteria, String poste) {
        List<Predicate> predicates = new ArrayList<>();
        /* retours du 10/10 : filtre par poste (nom ou adresse) */
        if (StringUtils.isNotBlank(poste)) {
            String p = "%" + escapeLike(poste.trim().toLowerCase()) + "%";
            predicates.add(cb.or(cb.like(cb.lower(root.<String> get("remoteHost")), p, '\\'),
                    cb.like(cb.lower(root.<String> get("remoteAddr")), p, '\\')));
        }
        Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TEventLog_.dtCREATED)),
                java.sql.Date.valueOf(dtStart), java.sql.Date.valueOf(dtEnd));
        predicates.add(btw);
        if (StringUtils.isNotBlank(search)) {
            // recherche "contient", insensible a la casse, saisie trimee (nom de produit ou CIP
            // au milieu de la description)
            String term = "%" + escapeLike(search.trim().toLowerCase()) + "%";
            predicates.add(cb.or(cb.like(cb.lower(root.get(TEventLog_.strDESCRIPTION)), term, '\\'),
                    cb.like(cb.lower(root.get(TEventLog_.strTYPELOG)), term, '\\')));
        }
        if (StringUtils.isNotEmpty(userId)) {
            predicates.add(cb.equal(root.get(TEventLog_.lgUSERID).get(TUser_.lgUSERID), userId));
        }
        // 0 est un ordinal valide (Deconditionnement) ; -1 = TOUS
        if (criteria >= 0 && criteria < TypeLog.values().length) {
            predicates.add(cb.equal(root.get(TEventLog_.typeLog), TypeLog.values()[criteria]));
        }
        return predicates;
    }

    @Override
    public List<LogDTO> logs(String search, LocalDate dtStart, LocalDate dtEnd, int start, int limit, boolean all,
            String userId, int criteria) {
        return logs(search, dtStart, dtEnd, start, limit, all, userId, criteria, null);
    }

    @Override
    public List<LogDTO> logs(String search, LocalDate dtStart, LocalDate dtEnd, int start, int limit, boolean all,
            String userId, int criteria, String poste) {
        try {

            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TEventLog> cq = cb.createQuery(TEventLog.class);
            Root<TEventLog> root = cq.from(TEventLog.class);
            cq.select(root).orderBy(cb.desc(root.get(TEventLog_.dtCREATED)));
            List<Predicate> predicates = logs(cb, root, search, dtStart, dtEnd, userId, criteria, poste);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<TEventLog> q = getEntityManager().createQuery(cq);
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }
            return q.getResultList().stream().map(LogDTO::new).sorted(comparatorDate.reversed())
                    .collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public JSONObject logs(String query, LocalDate dtStart, LocalDate dtEnd, int start, int limit, String userId,
            int criteria) throws JSONException {
        return logs(query, dtStart, dtEnd, start, limit, userId, criteria, null);
    }

    @Override
    public JSONObject logs(String query, LocalDate dtStart, LocalDate dtEnd, int start, int limit, String userId,
            int criteria, String poste) throws JSONException {
        long count = logs(query, dtStart, dtEnd, userId, criteria, poste);
        if (count == 0) {
            return new JSONObject().put("total", count).put("data", new JSONArray());
        }
        List<LogDTO> l = logs(query, dtStart, dtEnd, start, limit, false, userId, criteria, poste);
        return new JSONObject().put("total", count).put("data", new JSONArray(l));

    }

    /**
     * Export Excel du fichier journal (point 14). Il porte TOUTES les lignes correspondant aux criteres, et non la
     * seule page affichee : c'est la difference entre un export et une copie d'ecran. Les criteres sont rappeles en
     * tete du classeur pour que le fichier reste lisible une fois sorti de l'application.
     */
    @Override
    public byte[] exportExcel(String query, LocalDate dtStart, LocalDate dtEnd, String userId, int criteria)
            throws java.io.IOException {
        return exportExcel(query, dtStart, dtEnd, userId, criteria, null);
    }

    @Override
    public byte[] exportExcel(String query, LocalDate dtStart, LocalDate dtEnd, String userId, int criteria,
            String poste) throws java.io.IOException {
        List<LogDTO> lignes = logs(query, dtStart, dtEnd, 0, 0, true, userId, criteria, poste);
        java.time.format.DateTimeFormatter jour = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
        return new rest.report.excel.ClasseurExcel<LogDTO>("Fichier journal").titre("FICHIER JOURNAL")
                .critere("Période", dtStart.format(jour) + " au " + dtEnd.format(jour)).critere("Recherche", query)
                .critere("Opérateur", nomUtilisateur(userId)).critere("Poste", poste)
                .texte("Action", LogDTO::getTypeLog).dateHeure("Date et heure", LogDTO::getOperationDate)
                .texte("Opérateur", LogDTO::getUserFullName).texte("Description", LogDTO::getStrDESCRIPTION)
                .texte("Avant / après", LogDTO::getDetail).texte("Poste", LogDTO::getPoste)
                .texte("Adresse IP", LogDTO::getIp).texte("Application", LogDTO::getApplication).construire(lignes);
    }

    /** Nom lisible de l'operateur filtre, pour le rappel des criteres ; vide si aucun filtre. */
    private String nomUtilisateur(String userId) {
        if (userId == null || userId.trim().isEmpty()) {
            return "";
        }
        try {
            TUser u = getEntityManager().find(TUser.class, userId);
            return u == null ? "" : ((u.getStrFIRSTNAME() == null ? "" : u.getStrFIRSTNAME()) + " "
                    + (u.getStrLASTNAME() == null ? "" : u.getStrLASTNAME())).trim();
        } catch (Exception e) {
            return "";
        }
    }

    @Override
    public void updateItem(TUser user, String ref, String desc, TypeLog typeLog, Object T, Date date) {
        TEventLog eventLog = new TEventLog(UUID.randomUUID().toString());
        eventLog.setLgUSERID(user);
        eventLog.setDtCREATED(date);
        eventLog.setDtUPDATED(date);
        eventLog.setStrCREATEDBY(user.getStrLOGIN());
        eventLog.setStrSTATUT(Constant.STATUT_ENABLE);
        eventLog.setStrTABLECONCERN(T.getClass().getName());
        eventLog.setTypeLog(typeLog);
        eventLog.setStrDESCRIPTION(desc + " référence [" + ref + " ]");
        eventLog.setStrTYPELOG(ref);
        getEntityManager().persist(eventLog);
    }

    @Override
    public void updateLogFile(TUser user, String ref, String desc, TypeLog typeLog, Object T, String remoteHost,
            String remoteAddr) {
        try {
            TEventLog eventLog = new TEventLog(UUID.randomUUID().toString());
            eventLog.setLgUSERID(user);
            eventLog.setDtCREATED(new Date());
            eventLog.setDtUPDATED(eventLog.getDtCREATED());
            eventLog.setStrCREATEDBY(user.getStrLOGIN());
            eventLog.setStrSTATUT(Constant.STATUT_ENABLE);
            eventLog.setStrTABLECONCERN(T.getClass().getName());
            eventLog.setTypeLog(typeLog);
            eventLog.setStrDESCRIPTION(desc + " référence [" + ref + " ]");
            eventLog.setRemoteAddr(remoteAddr);
            eventLog.setRemoteHost(remoteHost);
            getEntityManager().persist(eventLog);

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);

        }
    }

    /* ------------------------------------------------------------ retours du 10/10 (journal) */

    @Override
    public void journaliser(TUser user, String ref, String desc, TypeLog typeLog, Object t, String detail) {
        TEventLog eventLog = new TEventLog(UUID.randomUUID().toString());
        eventLog.setLgUSERID(user);
        eventLog.setDtCREATED(new Date());
        eventLog.setDtUPDATED(eventLog.getDtCREATED());
        eventLog.setStrCREATEDBY(user.getStrLOGIN());
        eventLog.setStrSTATUT(Constant.STATUT_ENABLE);
        eventLog.setStrTABLECONCERN(StringUtils.left(t.getClass().getName(), 40));
        eventLog.setTypeLog(typeLog);
        eventLog.setStrDESCRIPTION(StringUtils.left(desc + " référence [" + ref + " ]", 2000));
        eventLog.setStrTYPELOG(ref);
        eventLog.setStrDETAIL(detail);
        getEntityManager().persist(eventLog);
    }

    private String parametre(String cle, String defaut) {
        try {
            Object v = getEntityManager().createNativeQuery("SELECT str_VALUE FROM t_parameters WHERE str_KEY = ?1")
                    .setParameter(1, cle).getSingleResult();
            return v == null || String.valueOf(v).trim().isEmpty() ? defaut : String.valueOf(v).trim();
        } catch (Exception e) {
            return defaut;
        }
    }

    private static java.time.LocalTime heure(String v) {
        try {
            return java.time.LocalTime.parse(v.length() == 4 ? "0" + v : v);
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject alertes(LocalDate dtStart, LocalDate dtEnd) {
        List<rest.service.impl.journal.AlertesJournal.Ligne> lignes = new ArrayList<>();
        for (Object[] r : (List<Object[]>) getEntityManager().createNativeQuery("SELECT l.dt_CREATED, l.lg_USER_ID,"
                + " TRIM(CONCAT(COALESCE(u.str_FIRST_NAME, ''), ' ', COALESCE(u.str_LAST_NAME, ''))), l.typeLog,"
                + " l.str_DESCRIPTION, COALESCE(l.remote_host, l.remote_addr) FROM t_event_log l"
                + " LEFT JOIN t_user u ON u.lg_USER_ID = l.lg_USER_ID WHERE l.dt_CREATED >= ?1 AND l.dt_CREATED < ?2"
                + " ORDER BY l.dt_CREATED").setParameter(1, java.sql.Date.valueOf(dtStart))
                .setParameter(2, java.sql.Date.valueOf(dtEnd.plusDays(1))).getResultList()) {
            int o = r[3] == null ? -1 : ((Number) r[3]).intValue();
            TypeLog t = o >= 0 && o < TypeLog.values().length ? TypeLog.values()[o] : null;
            lignes.add(new rest.service.impl.journal.AlertesJournal.Ligne(
                    new java.sql.Timestamp(((Date) r[0]).getTime()).toLocalDateTime(), (String) r[1], (String) r[2],
                    t == null ? "" : t.name(), t == null ? "" : t.getValue(), (String) r[4], (String) r[5]));
        }
        int seuil, minutes;
        try {
            seuil = Integer.parseInt(parametre("KEY_JOURNAL_ALERTE_ANNULATIONS", "3"));
            minutes = Integer.parseInt(parametre("KEY_JOURNAL_ALERTE_MINUTES", "30"));
        } catch (NumberFormatException e) {
            seuil = 3;
            minutes = 30;
        }
        return new rest.service.impl.journal.AlertesJournal(seuil, minutes,
                heure(parametre("KEY_JOURNAL_HEURE_DEBUT", "07:00")),
                heure(parametre("KEY_JOURNAL_HEURE_FIN", "21:00"))).analyser(lignes, 300).put("success", true);
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject postes() {
        JSONArray a = new JSONArray();
        for (Object p : (List<Object>) getEntityManager()
                .createNativeQuery("SELECT DISTINCT remote_host FROM t_event_log"
                        + " WHERE remote_host IS NOT NULL AND remote_host <> '' ORDER BY remote_host")
                .setMaxResults(500).getResultList()) {
            a.put(new JSONObject().put("poste", String.valueOf(p)));
        }
        return new JSONObject().put("success", true).put("data", a);
    }

    @Override
    public int purger() {
        int mois;
        try {
            mois = Integer.parseInt(parametre("KEY_JOURNAL_CONSERVATION_MOIS", "0"));
        } catch (NumberFormatException e) {
            mois = 0;
        }
        if (mois <= 0) {
            return 0;
        }
        /* au moins 3 mois : une valeur trop basse ne doit pas vider le journal par erreur */
        int n = getEntityManager().createNativeQuery("DELETE FROM t_event_log WHERE dt_CREATED < ?1")
                .setParameter(1, java.sql.Date.valueOf(LocalDate.now().minusMonths(Math.max(3, mois)))).executeUpdate();
        LOG.log(Level.INFO, "Journal : {0} ligne(s) de plus de {1} mois supprimee(s)",
                new Object[] { n, Math.max(3, mois) });
        return n;
    }

    @Override
    @javax.ejb.TransactionAttribute(javax.ejb.TransactionAttributeType.REQUIRES_NEW)
    public void journaliserSansRisque(TUser user, String ref, String desc, TypeLog typeLog, String table,
            String detail) {
        try {
            if (user == null) {
                return;
            }
            TEventLog eventLog = new TEventLog(UUID.randomUUID().toString());
            eventLog.setLgUSERID(getEntityManager().find(TUser.class, user.getLgUSERID()));
            eventLog.setDtCREATED(new Date());
            eventLog.setDtUPDATED(eventLog.getDtCREATED());
            eventLog.setStrCREATEDBY(user.getStrLOGIN());
            eventLog.setStrSTATUT(Constant.STATUT_ENABLE);
            eventLog.setStrTABLECONCERN(StringUtils.left(table, 40));
            eventLog.setTypeLog(typeLog);
            eventLog.setStrDESCRIPTION(StringUtils.left(desc + " référence [" + ref + " ]", 2000));
            eventLog.setStrTYPELOG(ref);
            eventLog.setStrDETAIL(detail);
            getEntityManager().persist(eventLog);
            getEntityManager().flush();
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Ligne de journal non ecrite (" + typeLog + ")", e);
        }
    }
}
