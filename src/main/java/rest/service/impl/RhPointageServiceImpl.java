package rest.service.impl;

import commonTasks.dto.RhPresenceDTO;
import commonTasks.dto.RhTableauDTO;
import dal.TUser;
import java.io.ByteArrayInputStream;
import java.sql.Time;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.RhPointageService;
import rest.service.impl.rh.AnalysePresence;
import rest.service.impl.rh.ImportPointeuse;
import rest.service.impl.rh.RegleRh;
import util.FichierTabulaire;

/**
 * Pointage, presence et tableau RH (plan d'octobre, section 3, lot L11b). L'import se fait en trois etapes comme celui
 * des clients : lecture (le fichier est garde 15 minutes sous un jeton), controle sans ecriture, enregistrement.
 */
@Stateless
public class RhPointageServiceImpl implements RhPointageService {

    private static final Logger LOG = Logger.getLogger(RhPointageServiceImpl.class.getName());
    private static final DateTimeFormatter HM = DateTimeFormatter.ofPattern("HH:mm");
    private static final long DUREE_JETON_MS = 15 * 60_000L;
    /** Fichiers en cours d'import : jeton -> {expiration, nom, contenu}. */
    private static final Map<String, Object[]> FICHIERS = new ConcurrentHashMap<>();
    static final String PARAM_TOLERANCE = "KEY_RH_TOLERANCE_RETARD";
    static final String PARAM_JOURNEE_MAX = "KEY_RH_JOURNEE_MAX";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /* ------------------------------------------------------------------ modeles */

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject modeles() {
        JSONArray a = new JSONArray();
        for (Object[] l : (List<Object[]>) em
                .createNativeQuery("SELECT id, marque, col_badge, col_date, col_heure, col_sens,"
                        + " format_date, format_heure, entete, valeurs_entree, valeurs_sortie FROM t_pointage_modele ORDER BY marque")
                .getResultList()) {
            a.put(new JSONObject().put("id", l[0]).put("marque", l[1]).put("colBadge", n(l[2])).put("colDate", n(l[3]))
                    .put("colHeure", n(l[4])).put("colSens", n(l[5])).put("formatDate", l[6]).put("formatHeure", l[7])
                    .put("entete", vrai(l[8])).put("valeursEntree", t(l[9])).put("valeursSortie", t(l[10])));
        }
        return ok().put("data", a);
    }

    @Override
    public JSONObject enregistrerModele(JSONObject s) {
        String marque = StringUtils.trimToNull(s.optString("marque", null));
        if (marque == null) {
            return refus("La marque de la pointeuse est obligatoire.");
        }
        ImportPointeuse.Modele m = modeleDe(s);
        String erreur = ImportPointeuse.controler(m);
        if (erreur != null) {
            return refus(erreur);
        }
        String id = StringUtils.trimToNull(s.optString("id", null));
        if (premier("SELECT id FROM t_pointage_modele WHERE marque = ?1 AND id <> ?2", marque,
                StringUtils.defaultString(id)) != null) {
            return refus("Un modèle existe déjà pour la marque « " + marque + " ».");
        }
        if (id == null) {
            id = UUID.randomUUID().toString();
            em.createNativeQuery("INSERT INTO t_pointage_modele (id, marque) VALUES (?1, ?2)").setParameter(1, id)
                    .setParameter(2, marque).executeUpdate();
        }
        em.createNativeQuery("UPDATE t_pointage_modele SET marque = ?1, col_badge = ?2, col_date = ?3, col_heure = ?4,"
                + " col_sens = ?5, format_date = ?6, format_heure = ?7, entete = ?8, valeurs_entree = ?9, valeurs_sortie = ?10,"
                + " updated_at = NOW() WHERE id = ?11").setParameter(1, StringUtils.left(marque, 60))
                .setParameter(2, m.colBadge).setParameter(3, m.colDate).setParameter(4, m.colHeure)
                .setParameter(5, m.colSens).setParameter(6, m.formatDate).setParameter(7, m.formatHeure)
                .setParameter(8, m.entete ? 1 : 0).setParameter(9, StringUtils.left(s.optString("valeursEntree"), 200))
                .setParameter(10, StringUtils.left(s.optString("valeursSortie"), 200)).setParameter(11, id)
                .executeUpdate();
        return ok().put("id", id).put("message", "Modèle « " + marque + " » enregistré.");
    }

    private static ImportPointeuse.Modele modeleDe(JSONObject s) {
        ImportPointeuse.Modele m = new ImportPointeuse.Modele();
        m.colBadge = s.optInt("colBadge", 1);
        m.colDate = s.optInt("colDate", 2);
        m.colHeure = s.optInt("colHeure", 3);
        m.colSens = s.optInt("colSens", 0);
        m.formatDate = StringUtils.defaultIfBlank(s.optString("formatDate"), "dd/MM/yyyy").trim();
        m.formatHeure = StringUtils.defaultIfBlank(s.optString("formatHeure"), "HH:mm").trim();
        m.entete = s.optBoolean("entete", true);
        if (s.has("valeursEntree")) {
            m.valeursEntree = ImportPointeuse.Modele.valeurs(s.optString("valeursEntree"));
        }
        if (s.has("valeursSortie")) {
            m.valeursSortie = ImportPointeuse.Modele.valeurs(s.optString("valeursSortie"));
        }
        return m;
    }

    @SuppressWarnings("unchecked")
    private JSONObject modele(String id) {
        JSONArray a = modeles().getJSONArray("data");
        for (int i = 0; i < a.length(); i++) {
            if (a.getJSONObject(i).getString("id").equals(id)) {
                return a.getJSONObject(i);
            }
        }
        return null;
    }

    /* ------------------------------------------------------------------ import */

    @Override
    public JSONObject analyserImport(String nomFichier, byte[] contenu) {
        long maintenant = System.currentTimeMillis();
        FICHIERS.entrySet().removeIf(e -> (long) e.getValue()[0] < maintenant);
        FichierTabulaire f;
        try {
            f = FichierTabulaire.lire(nomFichier, new ByteArrayInputStream(contenu));
        } catch (Exception e) {
            return refus("Lecture du fichier impossible. Formats acceptés : CSV, TXT, XLS ou XLSX.");
        }
        if (f.getLignes().isEmpty()) {
            return refus("Le fichier est vide.");
        }
        String jeton = UUID.randomUUID().toString();
        FICHIERS.put(jeton, new Object[] { maintenant + DUREE_JETON_MS, nomFichier, contenu });
        JSONArray apercu = new JSONArray();
        for (int i = 0; i < Math.min(8, f.getLignes().size()); i++) {
            apercu.put(new JSONArray(f.getLignes().get(i)));
        }
        return ok().put("jeton", jeton).put("fichier", StringUtils.defaultString(nomFichier))
                .put("lignes", f.getLignes().size()).put("colonnes", f.nombreColonnes()).put("apercu", apercu);
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject importer(String jeton, String modeleId, boolean ecrire, TUser operateur) {
        Object[] fichier = jeton == null ? null : FICHIERS.get(jeton);
        if (fichier == null || (long) fichier[0] < System.currentTimeMillis()) {
            return refus("Le fichier n'est plus disponible : choisissez-le de nouveau.");
        }
        JSONObject jm = modele(StringUtils.defaultString(modeleId));
        if (jm == null) {
            return refus("Choisissez le modèle de la pointeuse.");
        }
        List<ImportPointeuse.Ligne> lignes;
        try {
            lignes = ImportPointeuse.lire(FichierTabulaire
                    .lire((String) fichier[1], new ByteArrayInputStream((byte[]) fichier[2])).getLignes(),
                    modeleDe(jm));
        } catch (Exception e) {
            return refus("Lecture du fichier impossible.");
        }
        Map<String, String[]> badges = new HashMap<>();
        for (Object[] e : (List<Object[]>) em.createNativeQuery(
                "SELECT badge, id, CONCAT(nom, ' ', COALESCE(prenoms,'')) FROM t_employe" + " WHERE badge IS NOT NULL")
                .getResultList()) {
            badges.put(String.valueOf(e[0]).trim().toUpperCase(), new String[] { (String) e[1], t(e[2]).trim() });
        }
        int retenues = 0, rejetees = 0, connues = 0;
        Set<String> vues = new HashSet<>();
        Set<String> inconnus = new java.util.TreeSet<>();
        JSONArray detail = new JSONArray();
        List<Object[]> aEcrire = new ArrayList<>();
        for (ImportPointeuse.Ligne l : lignes) {
            String statut, motif = null, employe = null;
            String[] e = badges.get(l.badge.trim().toUpperCase());
            if (!l.retenue()) {
                statut = "REJETEE";
                motif = l.erreur;
            } else if (e == null) {
                statut = "REJETEE";
                motif = "badge inconnu (" + l.badge + ")";
                inconnus.add(l.badge);
            } else {
                employe = e[1];
                String cle = e[0] + "|" + l.horodatage;
                if (!vues.add(cle)) {
                    statut = "DOUBLON";
                    motif = "ligne répétée dans le fichier";
                } else if (premier("SELECT id FROM t_pointage WHERE employe_id = ?1 AND horodatage = ?2", e[0],
                        Timestamp.valueOf(l.horodatage)) != null) {
                    statut = "CONNUE";
                    motif = "déjà enregistré";
                } else {
                    statut = "RETENUE";
                    aEcrire.add(new Object[] { e[0], l });
                }
            }
            if ("RETENUE".equals(statut)) {
                retenues++;
            } else if ("REJETEE".equals(statut)) {
                rejetees++;
            } else {
                connues++;
            }
            if (detail.length() < 300 || !"RETENUE".equals(statut)) {
                detail.put(new JSONObject().put("ligne", l.numero).put("badge", l.badge)
                        .put("employe", StringUtils.defaultString(employe))
                        .put("horodatage", l.horodatage == null ? "" : l.horodatage.toString().replace('T', ' '))
                        .put("sens", StringUtils.defaultString(l.sens)).put("statut", statut)
                        .put("motif", StringUtils.defaultString(motif)));
            }
        }
        JSONObject r = ok().put("lues", lignes.size()).put("retenues", retenues).put("rejetees", rejetees)
                .put("dejaConnues", connues).put("badgesInconnus", new JSONArray(inconnus)).put("detail", detail);
        if (!ecrire) {
            return r.put("message", "Contrôle : " + retenues + " pointage(s) à enregistrer, " + rejetees
                    + " rejeté(s), " + connues + " déjà connu(s) ou répété(s). Rien n'est encore enregistré.");
        }
        String lot = UUID.randomUUID().toString();
        int ecrits = 0;
        for (Object[] a : aEcrire) {
            ImportPointeuse.Ligne l = (ImportPointeuse.Ligne) a[1];
            ecrits += em
                    .createNativeQuery(
                            "INSERT IGNORE INTO t_pointage (id, employe_id, horodatage, sens, source, lot_id,"
                                    + " saisi_par, created_at) VALUES (?1, ?2, ?3, ?4, 'POINTEUSE', ?5, ?6, NOW())")
                    .setParameter(1, UUID.randomUUID().toString()).setParameter(2, a[0])
                    .setParameter(3, Timestamp.valueOf(l.horodatage)).setParameter(4, l.sens).setParameter(5, lot)
                    .setParameter(6, operateur == null ? null : operateur.getLgUSERID()).executeUpdate();
        }
        String rapport = "Lignes lues : " + lignes.size() + " ; enregistrées : " + ecrits + " ; rejetées : " + rejetees
                + " ; déjà connues ou répétées : " + connues
                + (inconnus.isEmpty() ? "" : " ; badges inconnus : " + String.join(", ", inconnus));
        em.createNativeQuery(
                "INSERT INTO t_pointage_lot (id, fichier, modele_id, marque, lignes_lues, retenues, rejetees,"
                        + " deja_connues, rapport, cree_par, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, NOW())")
                .setParameter(1, lot).setParameter(2, StringUtils.left((String) fichier[1], 200))
                .setParameter(3, modeleId).setParameter(4, StringUtils.left(jm.optString("marque"), 60))
                .setParameter(5, lignes.size()).setParameter(6, ecrits).setParameter(7, rejetees)
                .setParameter(8, connues).setParameter(9, rapport)
                .setParameter(10, operateur == null ? null : operateur.getLgUSERID()).executeUpdate();
        FICHIERS.remove(jeton);
        LOG.log(Level.INFO, "Import de pointeuse : {0}", rapport);
        return r.put("lot", lot).put("enregistres", ecrits).put("message", rapport);
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject lots(int limite) {
        JSONArray a = new JSONArray();
        for (Object[] l : (List<Object[]>) em
                .createNativeQuery("SELECT l.created_at, l.fichier, l.marque, l.lignes_lues, l.retenues,"
                        + " l.rejetees, l.deja_connues, l.rapport, TRIM(CONCAT(COALESCE(u.str_FIRST_NAME,''),' ',COALESCE(u.str_LAST_NAME,'')))"
                        + " FROM t_pointage_lot l LEFT JOIN t_user u ON u.lg_USER_ID = l.cree_par ORDER BY l.created_at DESC LIMIT "
                        + Math.max(1, Math.min(500, limite)))
                .getResultList()) {
            a.put(new JSONObject().put("date", t(l[0]).length() >= 16 ? t(l[0]).substring(0, 16) : t(l[0]))
                    .put("fichier", t(l[1])).put("marque", t(l[2])).put("lues", n(l[3])).put("retenues", n(l[4]))
                    .put("rejetees", n(l[5])).put("dejaConnues", n(l[6])).put("rapport", t(l[7])).put("par", t(l[8])));
        }
        return ok().put("data", a);
    }

    /* ------------------------------------------------------------------ manuel */

    @Override
    public JSONObject saisirPointage(JSONObject s, TUser operateur) {
        String employe = StringUtils.trimToNull(s.optString("employeId", null));
        String motif = StringUtils.trimToNull(s.optString("motif", null));
        String sens = StringUtils.upperCase(StringUtils.defaultIfBlank(s.optString("sens"), AnalysePresence.INCONNU));
        LocalTime h = RegleRh.heure(s.optString("heure"));
        LocalDate j;
        try {
            j = LocalDate.parse(s.optString("jour").substring(0, 10));
        } catch (RuntimeException e) {
            j = null;
        }
        if (employe == null || premier("SELECT id FROM t_employe WHERE id = ?1", employe) == null) {
            return refus("Employé introuvable.");
        }
        if (j == null || h == null) {
            return refus("Date et heure obligatoires.");
        }
        if (motif == null) {
            return refus("Le motif est obligatoire pour un pointage manuel.");
        }
        if (!AnalysePresence.ENTREE.equals(sens) && !AnalysePresence.SORTIE.equals(sens)) {
            sens = AnalysePresence.INCONNU;
        }
        LocalDateTime t = j.atTime(h);
        if (t.isAfter(LocalDateTime.now().plusMinutes(5))) {
            return refus("Un pointage ne peut pas être dans le futur.");
        }
        int n = em
                .createNativeQuery(
                        "INSERT IGNORE INTO t_pointage (id, employe_id, horodatage, sens, source, saisi_par, motif,"
                                + " created_at) VALUES (?1, ?2, ?3, ?4, 'MANUEL', ?5, ?6, NOW())")
                .setParameter(1, UUID.randomUUID().toString()).setParameter(2, employe)
                .setParameter(3, Timestamp.valueOf(t)).setParameter(4, sens)
                .setParameter(5, operateur == null ? null : operateur.getLgUSERID())
                .setParameter(6, StringUtils.left(motif, 250)).executeUpdate();
        return n == 0 ? refus("Un pointage existe déjà à cette heure pour cet employé.")
                : ok().put("message", "Pointage manuel enregistré.");
    }

    @Override
    public JSONObject supprimerPointage(String id) {
        int n = em.createNativeQuery("DELETE FROM t_pointage WHERE id = ?1 AND source = 'MANUEL'").setParameter(1, id)
                .executeUpdate();
        return n == 0 ? refus("Seul un pointage manuel peut être supprimé.")
                : ok().put("message", "Pointage supprimé.");
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject pointagesDuJour(LocalDate jour) {
        JSONArray a = new JSONArray();
        for (Object[] l : (List<Object[]>) em
                .createNativeQuery("SELECT p.id, p.employe_id, p.horodatage, p.sens, p.source, p.motif"
                        + " FROM t_pointage p WHERE p.horodatage >= ?1 AND p.horodatage < ?2 ORDER BY p.horodatage")
                .setParameter(1, Timestamp.valueOf(jour.atStartOfDay()))
                .setParameter(2, Timestamp.valueOf(jour.plusDays(1).atTime(12, 0))).getResultList()) {
            a.put(new JSONObject().put("id", l[0]).put("employeId", l[1]).put("horodatage", t(l[2]).substring(0, 16))
                    .put("sens", l[3]).put("source", l[4]).put("motif", t(l[5])));
        }
        return ok().put("data", a);
    }

    /* ------------------------------------------------------------------ presence */

    @Override
    @SuppressWarnings("unchecked")
    public List<RhPresenceDTO> presences(LocalDate du, LocalDate au, String employeId) {
        int tolerance = entier(PARAM_TOLERANCE, 5);
        int journeeMax = entier(PARAM_JOURNEE_MAX, 12) * 60;
        boolean un = StringUtils.isNotBlank(employeId);
        /* employes presents dans la periode */
        Query qe = em
                .createNativeQuery("SELECT id, matricule, CONCAT(nom, ' ', COALESCE(prenoms,'')), dt_entree, dt_sortie"
                        + " FROM t_employe WHERE (statut = 'ACTIF' OR id IN (SELECT employe_id FROM t_pointage WHERE horodatage >= ?1))"
                        + (un ? " AND id = ?2" : "") + " ORDER BY nom, prenoms")
                .setParameter(1, Timestamp.valueOf(du.atStartOfDay()));
        if (un) {
            qe.setParameter(2, employeId);
        }
        List<Object[]> employes = qe.getResultList();
        /* planning (veille comprise pour les gardes de nuit) */
        Map<String, AnalysePresence.Prevu> plan = new HashMap<>();
        for (Object[] p : (List<Object[]>) em
                .createNativeQuery("SELECT employe_id, jour, type, debut, fin, pause_minutes FROM t_planning"
                        + " WHERE jour BETWEEN ?1 AND ?2")
                .setParameter(1, java.sql.Date.valueOf(du.minusDays(1))).setParameter(2, java.sql.Date.valueOf(au))
                .getResultList()) {
            plan.put(p[0] + "|" + jour(p[1]),
                    new AnalysePresence.Prevu((String) p[2], heure(p[3]), heure(p[4]), (int) n(p[5])));
        }
        /* absences validees */
        Map<String, String> absences = new HashMap<>();
        for (Object[] a : (List<Object[]>) em
                .createNativeQuery("SELECT employe_id, type, debut, fin, demi_journee FROM t_absence"
                        + " WHERE statut = 'VALIDE' AND debut <= ?2 AND fin >= ?1")
                .setParameter(1, java.sql.Date.valueOf(du)).setParameter(2, java.sql.Date.valueOf(au))
                .getResultList()) {
            for (LocalDate d = LocalDate.parse(jour(a[2])); !d.isAfter(LocalDate.parse(jour(a[3]))); d = d
                    .plusDays(1)) {
                absences.put(a[0] + "|" + d,
                        a[1] + (t(a[4]).isEmpty() ? "" : " (" + (a[4].equals("MATIN") ? "matin" : "après-midi") + ")"));
            }
        }
        /* pointages, rattaches a leur journee */
        Map<String, List<AnalysePresence.Pointage>> pts = new HashMap<>();
        for (Object[] p : (List<Object[]>) em
                .createNativeQuery("SELECT employe_id, horodatage, sens FROM t_pointage"
                        + " WHERE horodatage >= ?1 AND horodatage < ?2")
                .setParameter(1, Timestamp.valueOf(du.atStartOfDay()))
                .setParameter(2, Timestamp.valueOf(au.plusDays(1).atTime(12, 0))).getResultList()) {
            LocalDateTime t = ((Timestamp) p[1]).toLocalDateTime();
            LocalDate j = AnalysePresence.rattachement(t, plan.get(p[0] + "|" + t.toLocalDate().minusDays(1)));
            if (j.isBefore(du) || j.isAfter(au)) {
                continue;
            }
            pts.computeIfAbsent(p[0] + "|" + j, k -> new ArrayList<>())
                    .add(new AnalysePresence.Pointage(t, (String) p[2]));
        }
        List<RhPresenceDTO> sortie = new ArrayList<>();
        for (Object[] e : employes) {
            LocalDate entree = e[3] == null ? null : LocalDate.parse(jour(e[3]));
            LocalDate sortieE = e[4] == null ? null : LocalDate.parse(jour(e[4]));
            for (LocalDate d = du; !d.isAfter(au); d = d.plusDays(1)) {
                if ((entree != null && d.isBefore(entree)) || (sortieE != null && d.isAfter(sortieE))) {
                    continue;
                }
                String cle = e[0] + "|" + d;
                AnalysePresence.Prevu prevu = plan.get(cle);
                List<AnalysePresence.Pointage> lp = pts.get(cle);
                String absence = absences.get(cle);
                if (prevu == null && lp == null && absence == null) {
                    continue;
                }
                AnalysePresence.Journee j = AnalysePresence.analyser(d, prevu, lp,
                        absence == null ? null : absence.split(" ")[0], tolerance, journeeMax);
                RhPresenceDTO x = new RhPresenceDTO();
                x.setEmployeId((String) e[0]);
                x.setMatricule((String) e[1]);
                x.setEmploye(t(e[2]).trim());
                x.setJour(d.toString());
                x.setPrevu(prevu == null ? "" : "REPOS".equals(prevu.type) ? "Repos"
                        : ("GARDE".equals(prevu.type) ? "Garde " : "") + prevu.debut + "-" + prevu.fin);
                x.setEntree(j.entree == null ? "" : j.entree.format(HM));
                x.setSortie(j.sortie == null ? "" : j.sortie.format(HM));
                x.setMinutesPrevues(j.prevu);
                x.setMinutesPresence(j.presence);
                x.setRetard(j.retard);
                x.setDepartAnticipe(j.departAnticipe);
                x.setHeuresSup(j.heuresSup);
                x.setAbsence(StringUtils.defaultString(absence));
                x.setAnomalies(String.join(",", j.anomalies));
                StringBuilder sb = new StringBuilder();
                for (AnalysePresence.Pointage p : j.retenus) {
                    sb.append(sb.length() == 0 ? "" : " ").append(p.t.format(HM))
                            .append(AnalysePresence.ENTREE.equals(p.sens) ? "↑" : "↓");
                }
                x.setPointages(sb.toString());
                sortie.add(x);
            }
        }
        return sortie;
    }

    @Override
    public List<RhTableauDTO> tableau(LocalDate du, LocalDate au, String employeId) {
        Map<String, RhTableauDTO> t = new LinkedHashMap<>();
        for (RhPresenceDTO p : presences(du, au, employeId)) {
            RhTableauDTO x = t.computeIfAbsent(p.getEmployeId(), k -> {
                RhTableauDTO n = new RhTableauDTO();
                n.setEmployeId(p.getEmployeId());
                n.setEmploye(p.getEmploye());
                n.setMatricule(p.getMatricule());
                return n;
            });
            List<String> an = StringUtils.isBlank(p.getAnomalies()) ? new ArrayList<>()
                    : java.util.Arrays.asList(p.getAnomalies().split(","));
            if (p.getMinutesPrevues() > 0) {
                x.setJoursPrevus(x.getJoursPrevus() + 1);
            }
            if (p.getMinutesPresence() > 0 || StringUtils.isNotBlank(p.getEntree())) {
                x.setJoursPresents(x.getJoursPresents() + 1);
            }
            if (StringUtils.isNotBlank(p.getAbsence())) {
                x.setJoursAbsenceJustifiee(x.getJoursAbsenceJustifiee() + (p.getAbsence().contains("(") ? 0.5 : 1));
            }
            if (an.contains("ABSENT")) {
                x.setAbsencesNonJustifiees(x.getAbsencesNonJustifiees() + 1);
            }
            if (p.getRetard() > 0) {
                x.setRetards(x.getRetards() + 1);
                x.setMinutesRetard(x.getMinutesRetard() + p.getRetard());
            }
            if (p.getDepartAnticipe() > 0) {
                x.setDepartsAnticipes(x.getDepartsAnticipes() + 1);
            }
            x.setMinutesPrevues(x.getMinutesPrevues() + p.getMinutesPrevues());
            x.setMinutesPresence(x.getMinutesPresence() + p.getMinutesPresence());
            x.setHeuresSup(x.getHeuresSup() + p.getHeuresSup());
            x.setAnomalies(x.getAnomalies() + (int) an.stream().filter(a -> !"ABSENT".equals(a)).count());
        }
        return new ArrayList<>(t.values());
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

    private int entier(String cle, int defaut) {
        try {
            String v = premier("SELECT str_VALUE FROM t_parameters WHERE str_KEY = ?1", cle);
            return v == null ? defaut : Integer.parseInt(v.trim());
        } catch (RuntimeException e) {
            return defaut;
        }
    }

    private static LocalTime heure(Object o) {
        return o instanceof Time ? ((Time) o).toLocalTime()
                : o == null ? null : RegleRh.heure(String.valueOf(o).substring(0, 5));
    }

    private static String jour(Object o) {
        return o == null ? "" : String.valueOf(o).substring(0, 10);
    }

    private static String t(Object o) {
        return o == null ? "" : String.valueOf(o);
    }

    private static long n(Object o) {
        return o instanceof Number ? ((Number) o).longValue() : 0;
    }

    private static boolean vrai(Object v) {
        return v instanceof Boolean ? (Boolean) v : v instanceof Number && ((Number) v).intValue() != 0;
    }

    private static JSONObject ok() {
        return new JSONObject().put("success", true);
    }

    private static JSONObject refus(String m) {
        return new JSONObject().put("success", false).put("message", m).put("msg", m);
    }
}
