package rest.service.impl;

import dal.TUser;
import java.sql.Time;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.servlet.http.HttpServletRequest;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.RhService;
import rest.service.impl.rh.RegleRh;

/**
 * Ressources humaines, socle (plan d'octobre, section 3, lot L11a) : employes, planning par semaine, conges et
 * absences, connexions au logiciel. Requetes natives sur les tables RH (aucune entite JPA ajoutee).
 */
@Stateless
public class RhServiceImpl implements RhService {

    private static final Logger LOG = Logger.getLogger(RhServiceImpl.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /* ------------------------------------------------------------------ employes */

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject employes(String recherche, boolean inactifs) {
        StringBuilder sql = new StringBuilder(
                "SELECT e.id, e.matricule, e.badge, e.nom, e.prenoms, e.poste, e.telephone,"
                        + " e.dt_entree, e.dt_sortie, e.statut, e.lg_USER_ID, u.str_LOGIN"
                        + " FROM t_employe e LEFT JOIN t_user u ON u.lg_USER_ID = e.lg_USER_ID WHERE 1 = 1");
        if (!inactifs) {
            sql.append(" AND e.statut = 'ACTIF'");
        }
        boolean r = StringUtils.isNotBlank(recherche);
        if (r) {
            sql.append(" AND CONCAT_WS(' ', e.matricule, e.badge, e.nom, e.prenoms, e.poste) LIKE ?1");
        }
        Query q = em.createNativeQuery(sql.append(" ORDER BY e.nom, e.prenoms").toString());
        if (r) {
            q.setParameter(1, "%" + recherche.trim() + "%");
        }
        JSONArray a = new JSONArray();
        for (Object[] l : (List<Object[]>) q.getResultList()) {
            a.put(new JSONObject().put("id", l[0]).put("matricule", l[1]).put("badge", t(l[2])).put("nom", l[3])
                    .put("prenoms", t(l[4])).put("poste", t(l[5])).put("telephone", t(l[6])).put("dtEntree", jour(l[7]))
                    .put("dtSortie", jour(l[8])).put("statut", l[9]).put("userId", t(l[10])).put("login", t(l[11])));
        }
        return ok().put("data", a).put("total", a.length());
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject synchroniserUtilisateurs() {
        List<Object[]> libres = em
                .createNativeQuery("SELECT u.lg_USER_ID, u.str_LOGIN, u.str_FIRST_NAME, u.str_LAST_NAME,"
                        + " u.str_FUNCTION, u.str_PHONE, DATE(u.dt_CREATED) FROM t_user u WHERE u.str_STATUT = 'enable'"
                        + " AND u.str_LOGIN <> 'admin' AND NOT EXISTS (SELECT 1 FROM t_employe e WHERE e.lg_USER_ID = u.lg_USER_ID)")
                .getResultList();
        int crees = 0;
        for (Object[] u : libres) {
            String login = StringUtils.left(StringUtils.trimToEmpty((String) u[1]), 26);
            String matricule = login;
            for (int i = 2; premier("SELECT id FROM t_employe WHERE matricule = ?1 AND id <> ?2", matricule,
                    "") != null; i++) {
                matricule = login + "-" + i;
            }
            String nom = StringUtils.defaultIfBlank(StringUtils.trimToNull((String) u[2]), login);
            em.createNativeQuery(
                    "INSERT INTO t_employe (id, matricule, nom, prenoms, poste, telephone, dt_entree, statut,"
                            + " lg_USER_ID, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'ACTIF', ?8, NOW(), NOW())")
                    .setParameter(1, UUID.randomUUID().toString()).setParameter(2, matricule)
                    .setParameter(3, StringUtils.left(nom, 80))
                    .setParameter(4, StringUtils.left(StringUtils.trimToNull((String) u[3]), 120))
                    .setParameter(5, StringUtils.left(StringUtils.trimToNull((String) u[4]), 80))
                    .setParameter(6, StringUtils.left(StringUtils.trimToNull((String) u[5]), 30)).setParameter(7, u[6])
                    .setParameter(8, u[0]).executeUpdate();
            crees++;
        }
        return new JSONObject().put("success", true).put("crees", crees);
    }

    @Override
    public JSONObject enregistrerEmploye(JSONObject s, TUser operateur) {
        String id = StringUtils.trimToNull(s.optString("id", null));
        String matricule = StringUtils.trimToNull(s.optString("matricule", null));
        String badge = StringUtils.trimToNull(s.optString("badge", null));
        String nom = StringUtils.trimToNull(s.optString("nom", null));
        String userId = StringUtils.trimToNull(s.optString("userId", null));
        String statut = "INACTIF".equalsIgnoreCase(s.optString("statut")) ? "INACTIF" : "ACTIF";
        if (matricule == null || nom == null) {
            return refus("Matricule et nom sont obligatoires.");
        }
        /* Controle de saisie (07/10) : texte plus long que la colonne (erreur interne) ou date illisible (ignoree). */
        String saisie = util.ControleSaisie.premier(util.ControleSaisie.longueur("Le matricule", matricule, 30),
                util.ControleSaisie.longueur("Le badge", badge, 40), util.ControleSaisie.longueur("Le nom", nom, 80),
                util.ControleSaisie.longueur("Les prénoms", s.optString("prenoms", null), 120),
                util.ControleSaisie.longueur("Le poste", s.optString("poste", null), 80),
                util.ControleSaisie.longueur("Le téléphone", s.optString("telephone", null), 30),
                util.ControleSaisie.date("La date d'entrée", s.optString("dtEntree", null)),
                util.ControleSaisie.date("La date de sortie", s.optString("dtSortie", null)));
        if (saisie != null) {
            return refus(saisie);
        }
        LocalDate entree = date(s.optString("dtEntree", null)), sortie = date(s.optString("dtSortie", null));
        if (entree != null && sortie != null && sortie.isBefore(entree)) {
            return refus("La date de sortie est avant la date d'entrée.");
        }
        String doublon = premier(
                "SELECT CONCAT(nom, ' ', COALESCE(prenoms,'')) FROM t_employe WHERE matricule = ?1 AND id <> ?2",
                matricule, StringUtils.defaultString(id));
        if (doublon != null) {
            return refus("Matricule déjà porté par " + doublon.trim() + ".");
        }
        if (badge != null && (doublon = premier(
                "SELECT CONCAT(nom, ' ', COALESCE(prenoms,'')) FROM t_employe" + " WHERE badge = ?1 AND id <> ?2",
                badge, StringUtils.defaultString(id))) != null) {
            return refus("Badge déjà porté par " + doublon.trim() + ".");
        }
        if (userId != null && (doublon = premier(
                "SELECT CONCAT(nom, ' ', COALESCE(prenoms,'')) FROM t_employe" + " WHERE lg_USER_ID = ?1 AND id <> ?2",
                userId, StringUtils.defaultString(id))) != null) {
            return refus("Cet utilisateur est déjà lié à " + doublon.trim() + ".");
        }
        boolean nouveau = id == null;
        /* retours du 10/10 : un employe se cree uniquement a partir d'un utilisateur existant */
        if (nouveau
                && (userId == null || premier("SELECT lg_USER_ID FROM t_user WHERE lg_USER_ID = ?1", userId) == null)) {
            return refus("Un employé se crée à partir d'un utilisateur existant : choisissez l'utilisateur.");
        }
        if (nouveau) {
            id = UUID.randomUUID().toString();
            em.createNativeQuery(
                    "INSERT INTO t_employe (id, matricule, nom, statut, created_at) VALUES (?1, ?2, ?3, ?4, NOW())")
                    .setParameter(1, id).setParameter(2, matricule).setParameter(3, nom).setParameter(4, statut)
                    .executeUpdate();
        }
        int n = em.createNativeQuery(
                "UPDATE t_employe SET matricule = ?1, badge = ?2, nom = ?3, prenoms = ?4, poste = ?5,"
                        + " telephone = ?6, dt_entree = ?7, dt_sortie = ?8, statut = ?9, lg_USER_ID = ?10, updated_at = NOW() WHERE id = ?11")
                .setParameter(1, matricule).setParameter(2, badge).setParameter(3, nom)
                .setParameter(4, StringUtils.trimToNull(s.optString("prenoms", null)))
                .setParameter(5, StringUtils.trimToNull(s.optString("poste", null)))
                .setParameter(6, StringUtils.trimToNull(s.optString("telephone", null)))
                .setParameter(7, entree == null ? null : java.sql.Date.valueOf(entree))
                .setParameter(8, sortie == null ? null : java.sql.Date.valueOf(sortie)).setParameter(9, statut)
                .setParameter(10, userId).setParameter(11, id).executeUpdate();
        if (n == 0) {
            return refus("Employé introuvable.");
        }
        return ok().put("id", id).put("message", nouveau ? "Employé créé." : "Employé enregistré.");
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject utilisateursLibres(String employeId) {
        List<Object[]> r = em.createNativeQuery("SELECT u.lg_USER_ID, u.str_LOGIN,"
                + " TRIM(CONCAT(COALESCE(u.str_FIRST_NAME,''),' ',COALESCE(u.str_LAST_NAME,''))),"
                + " u.str_FIRST_NAME, u.str_LAST_NAME, u.str_FUNCTION, u.str_PHONE FROM t_user u"
                + " WHERE u.str_STATUT = 'enable' AND NOT EXISTS (SELECT 1 FROM t_employe e WHERE e.lg_USER_ID = u.lg_USER_ID"
                + " AND e.id <> ?1) ORDER BY u.str_LOGIN").setParameter(1, StringUtils.defaultString(employeId))
                .getResultList();
        JSONArray a = new JSONArray();
        for (Object[] l : r) {
            /* retours du 10/10 : la fiche employe se pre-remplit avec l'utilisateur choisi (comme le rattachement) */
            a.put(new JSONObject().put("id", l[0]).put("libelle", l[1] + (t(l[2]).isEmpty() ? "" : " — " + l[2]))
                    .put("login", t(l[1])).put("nom", t(l[3]).isEmpty() ? t(l[1]) : t(l[3])).put("prenoms", t(l[4]))
                    .put("poste", t(l[5])).put("telephone", t(l[6])));
        }
        return ok().put("data", a);
    }

    /* ------------------------------------------------------------------ planning */

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject planning(LocalDate jour) {
        LocalDate lundi = RegleRh.lundi(jour == null ? LocalDate.now() : jour);
        LocalDate dimanche = lundi.plusDays(6);
        Map<String, JSONObject> lignes = new LinkedHashMap<>();
        /* employes presents dans la semaine (entres avant dimanche, sortis apres lundi) */
        for (Object[] e : (List<Object[]>) em
                .createNativeQuery("SELECT id, matricule, nom, prenoms, poste FROM t_employe"
                        + " WHERE statut = 'ACTIF' AND (dt_entree IS NULL OR dt_entree <= ?2) AND (dt_sortie IS NULL OR dt_sortie >= ?1)"
                        + " ORDER BY nom, prenoms")
                .setParameter(1, java.sql.Date.valueOf(lundi)).setParameter(2, java.sql.Date.valueOf(dimanche))
                .getResultList()) {
            lignes.put((String) e[0], new JSONObject().put("employeId", e[0]).put("matricule", e[1])
                    .put("employe", (t(e[2]) + " " + t(e[3])).trim()).put("poste", t(e[4])).put("minutes", 0));
        }
        for (Object[] p : (List<Object[]>) em
                .createNativeQuery("SELECT employe_id, jour, type, debut, fin, pause_minutes, commentaire"
                        + " FROM t_planning WHERE jour BETWEEN ?1 AND ?2")
                .setParameter(1, java.sql.Date.valueOf(lundi)).setParameter(2, java.sql.Date.valueOf(dimanche))
                .getResultList()) {
            JSONObject l = lignes.get((String) p[0]);
            if (l == null) {
                continue;
            }
            LocalDate j = LocalDate.parse(jour(p[1]));
            LocalTime d = heure(p[3]), f = heure(p[4]);
            int pause = (int) n(p[5]);
            int m = "REPOS".equals(p[2]) ? 0 : RegleRh.minutes(d, f, pause);
            l.put("j" + (j.getDayOfWeek().getValue() - 1),
                    new JSONObject().put("type", p[2]).put("debut", d == null ? "" : d.toString())
                            .put("fin", f == null ? "" : f.toString()).put("pause", pause).put("commentaire", t(p[6]))
                            .put("minutes", m));
            l.put("minutes", l.getInt("minutes") + m);
        }
        /* absences validees de la semaine, pour les afficher dans le planning */
        for (Object[] a : (List<Object[]>) em
                .createNativeQuery("SELECT employe_id, type, debut, fin, demi_journee FROM t_absence"
                        + " WHERE statut = 'VALIDE' AND debut <= ?2 AND fin >= ?1")
                .setParameter(1, java.sql.Date.valueOf(lundi)).setParameter(2, java.sql.Date.valueOf(dimanche))
                .getResultList()) {
            JSONObject l = lignes.get((String) a[0]);
            if (l == null) {
                continue;
            }
            LocalDate d = LocalDate.parse(jour(a[2])), f = LocalDate.parse(jour(a[3]));
            for (int i = 0; i < 7; i++) {
                LocalDate j = lundi.plusDays(i);
                if (!j.isBefore(d) && !j.isAfter(f)) {
                    l.put("a" + i, a[1] + (t(a[4]).isEmpty() ? "" : " " + a[4]));
                }
            }
        }
        JSONArray jours = new JSONArray();
        for (int i = 0; i < 7; i++) {
            jours.put(lundi.plusDays(i).toString());
        }
        return ok().put("lundi", lundi.toString()).put("jours", jours).put("data", new JSONArray(lignes.values()));
    }

    @Override
    public JSONObject enregistrerPlanning(JSONArray cases, TUser operateur) {
        if (cases == null || cases.length() == 0) {
            return refus("Rien à enregistrer.");
        }
        int faits = 0;
        for (int i = 0; i < cases.length(); i++) {
            JSONObject c = cases.getJSONObject(i);
            String employe = c.optString("employeId");
            LocalDate j = date(c.optString("jour", null));
            if (StringUtils.isBlank(employe) || j == null) {
                return refus("Case incomplète (employé ou jour).");
            }
            String type = StringUtils.upperCase(StringUtils.trimToEmpty(c.optString("type")));
            if (type.isEmpty()) {
                faits += em.createNativeQuery("DELETE FROM t_planning WHERE employe_id = ?1 AND jour = ?2")
                        .setParameter(1, employe).setParameter(2, java.sql.Date.valueOf(j)).executeUpdate();
                continue;
            }
            int pause = c.optInt("pause", 0);
            String erreur = RegleRh.controlerPlanning(type, c.optString("debut"), c.optString("fin"), pause);
            if (erreur != null) {
                return refus(j + " : " + erreur);
            }
            LocalTime d = "REPOS".equals(type) ? null : RegleRh.heure(c.optString("debut"));
            LocalTime f = "REPOS".equals(type) ? null : RegleRh.heure(c.optString("fin"));
            faits += ecrireCase(employe, j, type, d, f, "REPOS".equals(type) ? 0 : pause,
                    StringUtils.left(StringUtils.trimToNull(c.optString("commentaire", null)), 200), operateur);
        }
        return ok().put("modifies", faits).put("message", "Planning enregistré.");
    }

    private int ecrireCase(String employe, LocalDate j, String type, LocalTime d, LocalTime f, int pause,
            String commentaire, TUser operateur) {
        return em.createNativeQuery(
                "INSERT INTO t_planning (id, employe_id, jour, type, debut, fin, pause_minutes, commentaire,"
                        + " updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, NOW(), ?9) ON DUPLICATE KEY UPDATE"
                        + " type = VALUES(type), debut = VALUES(debut), fin = VALUES(fin), pause_minutes = VALUES(pause_minutes),"
                        + " commentaire = VALUES(commentaire), updated_at = NOW(), updated_by = VALUES(updated_by)")
                .setParameter(1, UUID.randomUUID().toString()).setParameter(2, employe)
                .setParameter(3, java.sql.Date.valueOf(j)).setParameter(4, type)
                .setParameter(5, d == null ? null : Time.valueOf(d)).setParameter(6, f == null ? null : Time.valueOf(f))
                .setParameter(7, pause).setParameter(8, commentaire)
                .setParameter(9, operateur == null ? null : operateur.getLgUSERID()).executeUpdate() > 0 ? 1 : 0;
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject copierSemaine(LocalDate source, LocalDate cible, boolean remplacer, TUser operateur) {
        LocalDate ls = RegleRh.lundi(source), lc = RegleRh.lundi(cible);
        if (ls.equals(lc)) {
            return refus("La semaine source et la semaine cible sont identiques.");
        }
        long decalage = java.time.temporal.ChronoUnit.DAYS.between(ls, lc);
        int copies = 0, gardees = 0;
        for (Object[] p : (List<Object[]>) em
                .createNativeQuery("SELECT p.employe_id, p.jour, p.type, p.debut, p.fin,"
                        + " p.pause_minutes, p.commentaire FROM t_planning p JOIN t_employe e ON e.id = p.employe_id"
                        + " WHERE e.statut = 'ACTIF' AND p.jour BETWEEN ?1 AND ?2")
                .setParameter(1, java.sql.Date.valueOf(ls)).setParameter(2, java.sql.Date.valueOf(ls.plusDays(6)))
                .getResultList()) {
            LocalDate j = LocalDate.parse(jour(p[1])).plusDays(decalage);
            if (!remplacer && premier("SELECT id FROM t_planning WHERE employe_id = ?1 AND jour = ?2", p[0],
                    java.sql.Date.valueOf(j)) != null) {
                gardees++;
                continue;
            }
            copies += ecrireCase((String) p[0], j, (String) p[2], heure(p[3]), heure(p[4]), (int) n(p[5]),
                    (String) p[6], operateur);
        }
        return ok().put("copies", copies).put("gardees", gardees).put("message", copies + " case(s) copiée(s)"
                + (gardees > 0 ? ", " + gardees + " case(s) déjà saisie(s) gardée(s)" : "") + ".");
    }

    /* ------------------------------------------------------------------ absences */

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject absences(LocalDate du, LocalDate au, String employeId, String statut) {
        StringBuilder sql = new StringBuilder(
                "SELECT a.id, a.employe_id, CONCAT(e.nom, ' ', COALESCE(e.prenoms,'')), a.type,"
                        + " a.debut, a.fin, a.demi_journee, a.motif, a.statut, a.created_at,"
                        + " TRIM(CONCAT(COALESCE(ud.str_FIRST_NAME,''),' ',COALESCE(ud.str_LAST_NAME,''))),"
                        + " TRIM(CONCAT(COALESCE(uv.str_FIRST_NAME,''),' ',COALESCE(uv.str_LAST_NAME,''))), a.dt_validation"
                        + " FROM t_absence a JOIN t_employe e ON e.id = a.employe_id LEFT JOIN t_user ud ON ud.lg_USER_ID = a.demande_par"
                        + " LEFT JOIN t_user uv ON uv.lg_USER_ID = a.valide_par WHERE a.debut <= ?2 AND a.fin >= ?1");
        List<Object> params = new ArrayList<>();
        params.add(java.sql.Date.valueOf(du));
        params.add(java.sql.Date.valueOf(au));
        if (StringUtils.isNotBlank(employeId)) {
            params.add(employeId);
            sql.append(" AND a.employe_id = ?").append(params.size());
        }
        if (StringUtils.isNotBlank(statut)) {
            params.add(statut.trim().toUpperCase());
            sql.append(" AND a.statut = ?").append(params.size());
        }
        Query q = em.createNativeQuery(sql.append(" ORDER BY a.debut, e.nom").toString());
        for (int i = 0; i < params.size(); i++) {
            q.setParameter(i + 1, params.get(i));
        }
        JSONArray a = new JSONArray();
        for (Object[] l : (List<Object[]>) q.getResultList()) {
            LocalDate d = LocalDate.parse(jour(l[4])), f = LocalDate.parse(jour(l[5]));
            a.put(new JSONObject().put("id", l[0]).put("employeId", l[1]).put("employe", t(l[2]).trim())
                    .put("type", l[3]).put("debut", d.toString()).put("fin", f.toString()).put("demiJournee", t(l[6]))
                    .put("motif", t(l[7])).put("statut", l[8])
                    .put("demandeLe", t(l[9]).length() >= 16 ? t(l[9]).substring(0, 16) : t(l[9]))
                    .put("demandePar", t(l[10])).put("decidePar", t(l[11])).put("jours", RegleRh.jours(d, f, t(l[6]))));
        }
        return ok().put("data", a).put("total", a.length());
    }

    @Override
    public JSONObject enregistrerAbsence(JSONObject s, TUser operateur) {
        String id = StringUtils.trimToNull(s.optString("id", null));
        String employe = StringUtils.trimToNull(s.optString("employeId", null));
        String type = StringUtils.upperCase(StringUtils.trimToEmpty(s.optString("type")));
        LocalDate d = date(s.optString("debut", null)), f = date(s.optString("fin", null));
        String demi = StringUtils.trimToNull(s.optString("demiJournee", null));
        String motifTropLong = util.ControleSaisie.longueur("Le motif", s.optString("motif", null), 250);
        if (motifTropLong != null) {
            return refus(motifTropLong);
        }
        if (employe == null || premier("SELECT id FROM t_employe WHERE id = ?1", employe) == null) {
            return refus("Employé introuvable.");
        }
        String erreur = RegleRh.controlerAbsence(type, d, f, demi);
        if (erreur != null) {
            return refus(erreur);
        }
        String conflit = premier(
                "SELECT CONCAT(type, ' du ', DATE_FORMAT(debut, '%d/%m/%Y'), ' au ', DATE_FORMAT(fin, '%d/%m/%Y'))"
                        + " FROM t_absence WHERE employe_id = ?1 AND statut <> 'REFUSE' AND id <> ?2 AND debut <= ?4 AND fin >= ?3",
                employe, StringUtils.defaultString(id), java.sql.Date.valueOf(d), java.sql.Date.valueOf(f));
        if (conflit != null) {
            return refus("Chevauche une absence déjà saisie : " + conflit + ".");
        }
        if (id == null) {
            id = UUID.randomUUID().toString();
            em.createNativeQuery(
                    "INSERT INTO t_absence (id, employe_id, type, debut, fin, demi_journee, motif, statut, demande_par,"
                            + " created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'DEMANDE', ?8, NOW())")
                    .setParameter(1, id).setParameter(2, employe).setParameter(3, type)
                    .setParameter(4, java.sql.Date.valueOf(d)).setParameter(5, java.sql.Date.valueOf(f))
                    .setParameter(6, demi)
                    .setParameter(7, StringUtils.left(StringUtils.trimToNull(s.optString("motif", null)), 250))
                    .setParameter(8, operateur == null ? null : operateur.getLgUSERID()).executeUpdate();
            return ok().put("id", id).put("message", "Demande enregistrée : elle attend d'être validée.");
        }
        int n = em
                .createNativeQuery(
                        "UPDATE t_absence SET employe_id = ?1, type = ?2, debut = ?3, fin = ?4, demi_journee = ?5,"
                                + " motif = ?6 WHERE id = ?7 AND statut = 'DEMANDE'")
                .setParameter(1, employe).setParameter(2, type).setParameter(3, java.sql.Date.valueOf(d))
                .setParameter(4, java.sql.Date.valueOf(f)).setParameter(5, demi)
                .setParameter(6, StringUtils.left(StringUtils.trimToNull(s.optString("motif", null)), 250))
                .setParameter(7, id).executeUpdate();
        return n == 0 ? refus("Seule une demande non encore décidée peut être modifiée.")
                : ok().put("id", id).put("message", "Demande modifiée.");
    }

    @Override
    public JSONObject deciderAbsence(String id, String statut, TUser operateur) {
        String s = StringUtils.upperCase(StringUtils.trimToEmpty(statut));
        if (!"VALIDE".equals(s) && !"REFUSE".equals(s)) {
            return refus("Décision inconnue.");
        }
        int n = em
                .createNativeQuery(
                        "UPDATE t_absence SET statut = ?1, valide_par = ?2, dt_validation = NOW() WHERE id = ?3")
                .setParameter(1, s).setParameter(2, operateur == null ? null : operateur.getLgUSERID())
                .setParameter(3, id).executeUpdate();
        return n == 0 ? refus("Absence introuvable.")
                : ok().put("message", "VALIDE".equals(s) ? "Absence validée." : "Absence refusée.");
    }

    @Override
    public JSONObject supprimerAbsence(String id, TUser operateur, boolean valideur) {
        int n = em
                .createNativeQuery("DELETE FROM t_absence WHERE id = ?1" + (valideur ? "" : " AND statut = 'DEMANDE'"))
                .setParameter(1, id).executeUpdate();
        return n == 0 ? refus(valideur ? "Absence introuvable." : "Seule une demande non décidée peut être supprimée.")
                : ok().put("message", "Absence supprimée.");
    }

    @Override
    public int absencesADecider() {
        return (int) n(
                em.createNativeQuery("SELECT COUNT(*) FROM t_absence WHERE statut = 'DEMANDE'").getSingleResult());
    }

    /* ------------------------------------------------------------------ connexions */

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject sessions(LocalDate du, LocalDate au, String userId) {
        StringBuilder sql = new StringBuilder("SELECT s.debut, s.fin, s.fin_par, s.poste, s.ip, u.str_LOGIN,"
                + " TRIM(CONCAT(COALESCE(u.str_FIRST_NAME,''),' ',COALESCE(u.str_LAST_NAME,''))),"
                + " TIMESTAMPDIFF(MINUTE, s.debut, COALESCE(s.fin, NOW()))"
                + " FROM t_session_utilisateur s JOIN t_user u ON u.lg_USER_ID = s.lg_USER_ID WHERE s.debut >= ?1 AND s.debut < ?2");
        if (StringUtils.isNotBlank(userId)) {
            sql.append(" AND s.lg_USER_ID = ?3");
        }
        Query q = em.createNativeQuery(sql.append(" ORDER BY s.debut DESC LIMIT 2000").toString())
                .setParameter(1, java.sql.Date.valueOf(du)).setParameter(2, java.sql.Date.valueOf(au.plusDays(1)));
        if (StringUtils.isNotBlank(userId)) {
            q.setParameter(3, userId);
        }
        JSONArray a = new JSONArray();
        for (Object[] l : (List<Object[]>) q.getResultList()) {
            a.put(new JSONObject().put("debut", horodatage(l[0])).put("fin", horodatage(l[1])).put("finPar", t(l[2]))
                    .put("poste", t(l[3])).put("ip", t(l[4])).put("login", t(l[5])).put("utilisateur", t(l[6]))
                    .put("minutes", n(l[7])).put("ouverte", l[1] == null));
        }
        return ok().put("data", a).put("total", a.length());
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void ouvrirSession(TUser user, HttpServletRequest request, String poste) {
        try {
            String ip = request == null ? null : request.getRemoteAddr();
            String http = request == null ? null : request.getSession(true).getId();
            /*
             * le navigateur ferme sans deconnexion laisse une session ouverte : la nouvelle connexion du meme
             * utilisateur depuis la meme adresse la clot
             */
            em.createNativeQuery("UPDATE t_session_utilisateur SET fin = NOW(), fin_par = 'NOUVELLE_CONNEXION'"
                    + " WHERE lg_USER_ID = ?1 AND fin IS NULL AND COALESCE(ip, '') = COALESCE(?2, '')")
                    .setParameter(1, user.getLgUSERID()).setParameter(2, ip).executeUpdate();
            em.createNativeQuery("INSERT INTO t_session_utilisateur (id, lg_USER_ID, session_http, debut, poste, ip)"
                    + " VALUES (?1, ?2, ?3, NOW(), ?4, ?5)").setParameter(1, UUID.randomUUID().toString())
                    .setParameter(2, user.getLgUSERID()).setParameter(3, http)
                    .setParameter(4, StringUtils.left(poste, 100)).setParameter(5, ip).executeUpdate();
        } catch (Exception e) {
            LOG.log(Level.WARNING, "journal des connexions (ouverture)", e);
        }
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void fermerSession(String sessionHttp, String finPar) {
        if (StringUtils.isBlank(sessionHttp)) {
            return;
        }
        try {
            em.createNativeQuery(
                    "UPDATE t_session_utilisateur SET fin = NOW(), fin_par = ?1 WHERE session_http = ?2 AND fin IS NULL")
                    .setParameter(1, finPar).setParameter(2, sessionHttp).executeUpdate();
        } catch (Exception e) {
            LOG.log(Level.WARNING, "journal des connexions (fermeture)", e);
        }
    }

    /* ------------------------------------------------------------------ outils */

    @SuppressWarnings("unchecked")
    private String premier(String sql, Object... p) {
        Query q = em.createNativeQuery(sql);
        for (int i = 0; i < p.length; i++) {
            q.setParameter(i + 1, p[i]);
        }
        List<Object> r = q.setMaxResults(1).getResultList();
        return r.isEmpty() || r.get(0) == null ? null : String.valueOf(r.get(0));
    }

    private static LocalTime heure(Object o) {
        if (o instanceof Time) {
            return ((Time) o).toLocalTime();
        }
        return o == null ? null : RegleRh
                .heure(String.valueOf(o).length() >= 5 ? String.valueOf(o).substring(0, 5) : String.valueOf(o));
    }

    private static String jour(Object o) {
        return o == null ? "" : String.valueOf(o).substring(0, 10);
    }

    private static String horodatage(Object o) {
        return o == null ? "" : String.valueOf(o).substring(0, Math.min(19, String.valueOf(o).length()));
    }

    private static LocalDate date(String s) {
        try {
            return StringUtils.isBlank(s) ? null : LocalDate.parse(s.trim().substring(0, 10));
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static String t(Object o) {
        return o == null ? "" : String.valueOf(o);
    }

    private static long n(Object o) {
        return o instanceof Number ? ((Number) o).longValue() : 0;
    }

    private static JSONObject ok() {
        return new JSONObject().put("success", true);
    }

    private static JSONObject refus(String m) {
        return new JSONObject().put("success", false).put("message", m).put("msg", m);
    }
}
