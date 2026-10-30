package rest;

import dal.TPrivilege;
import dal.TUser;
import java.lang.management.ManagementFactory;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.SupportEventService;
import rest.service.impl.serveur.ApplicationMariadb;
import rest.service.impl.serveur.ApplicationPayara;
import rest.service.impl.serveur.CauseArret;
import rest.service.impl.serveur.ConfigPayara;
import rest.service.impl.serveur.FichierMyIni;
import rest.service.impl.serveur.MesureServeur;
import rest.service.impl.serveur.ReglagesServeur;
import rest.service.impl.serveur.ReglagesServeur.Reglage;
import rest.service.impl.serveur.ServeurVieService;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;

/**
 * STABILITE DU SERVEUR (besoins du 11/10, lot 4), Centre de support. Droit P_SM_SUPPORT_SERVEUR.
 * <ul>
 * <li>GET etat : releve en cours (memoire, fils, processeur, base) et derniere cause d'arret ;</li>
 * <li>GET historique : demarrages et arrets (propre / brutal, cause, conseil) ;</li>
 * <li>GET mesures?heures= : releves toutes les 2 minutes ;</li>
 * <li>GET reglages : reglages en place et conseilles pour la machine (MariaDB, Payara), bloc my.ini et script asadmin
 * ;</li>
 * <li>POST postes : nombre de postes qui dimensionne les reglages ;</li>
 * <li>POST reglages/mariadb : application a chaud (SET GLOBAL) des reglages de MariaDB, super administrateur ;</li>
 * <li>POST reglages/myini : ecriture des memes reglages dans my.ini (sauvegarde avant), super administrateur ;</li>
 * <li>POST reglages/payara : commandes asadmin lancees detachees puis redemarrage du domaine, verifiees au retour,
 * super administrateur.</li>
 * </ul>
 * Seules les routes d'application modifient la configuration : liste fermee de reglages, trace au journal des
 * evenements.
 */
@Path("v1/support/serveur")
@Produces("application/json")
@Consumes("application/json")
public class SupportServeurRessource {

    static final String DROIT = "P_SM_SUPPORT_SERVEUR";
    private static final Logger LOG = Logger.getLogger(SupportServeurRessource.class.getName());

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private ServeurVieService vie;
    @EJB
    private job.SupportWatchdog watchdog;
    @EJB
    private SupportEventService supportEventService;
    @Inject
    private config.AppConfig appConfig;
    @EJB
    private job.PoolReparation poolReparation;

    @SuppressWarnings("unchecked")
    private Response controle() {
        HttpSession s = servletRequest.getSession(false);
        if (s == null || !(s.getAttribute(commonparameter.AIRTIME_USER) instanceof TUser)) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        if (!CommonUtils.hasAuthorityByName((List<TPrivilege>) s.getAttribute(commonparameter.USER_LIST_PRIVILEGE),
                DROIT)) {
            return echec("Votre profil ne donne pas accès à la stabilité du serveur.");
        }
        return null;
    }

    private static Response echec(String m) {
        return Response.ok(new JSONObject().put("success", false).put("message", m).toString()).build();
    }

    private static Response ok(JSONObject o) {
        return Response.ok(o.put("success", true).toString()).build();
    }

    private static Object n(Object o) {
        return o == null ? JSONObject.NULL : o;
    }

    @GET
    @Path("etat")
    public Response etat() {
        Response r = controle();
        if (r != null) {
            return r;
        }
        ServeurVieService.Mesure m = MesureServeur.releve();
        long demarrage = ManagementFactory.getRuntimeMXBean().getStartTime();
        Duration d = Duration.ofMillis(System.currentTimeMillis() - demarrage);
        JSONObject o = new JSONObject().put("hote", watchdog.getHote())
                .put("depuis", d.toDays() + " j " + d.toHoursPart() + " h " + d.toMinutesPart() + " min")
                .put("java", System.getProperty("java.version"))
                .put("processeurs", Runtime.getRuntime().availableProcessors()).put("memoireMo", n(m.memoireMo))
                .put("memoireMaxMo", n(m.memoireMaxMo)).put("fils", n(m.fils)).put("filsHttp", n(m.filsHttpActifs))
                .put("cpuServeur", n(m.cpuServeurPct)).put("cpuMachine", n(m.cpuMachinePct))
                .put("ramLibreMo", n(m.ramLibreMo)).put("ramTotaleMo", n(m.ramTotaleMo))
                .put("bddConnexions", n(vie.statutMariadb("Threads_connected")))
                .put("bddActives", n(vie.statutMariadb("Threads_running")))
                .put("bddInterblocages", n(vie.statutMariadb("Innodb_deadlocks")))
                .put("bddUptime", n(vie.statutMariadb("Uptime"))).put("poolMs", poolReparation.tempsReponseMs())
                .put("pool", new JSONObject(poolReparation.etat()))
                .put("role", appConfig == null || appConfig.isServerMode() ? "Serveur" : "Caisse");
        CauseArret.Diagnostic c = watchdog.getDerniereCause();
        if (c != null) {
            o.put("derniereCause", new JSONObject().put("libelle", c.code.libelle).put("explication", c.explication)
                    .put("conseil", c.conseil).put("niveau", c.code.niveau));
        }
        return ok(o);
    }

    @EJB
    private rest.service.impl.serveur.RumService rumService;

    /** Experience utilisateur (RUM) : ecrans et appels les plus lents, erreurs, par poste, evolution. */
    @GET
    @Path("rum")
    public Response rum(@QueryParam("heures") Integer heures, @QueryParam("poste") String poste) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        return ok(rumService.synthese(heures == null ? 24 : heures, poste).put("heures", heures == null ? 24 : heures));
    }

    @GET
    @Path("historique")
    public Response historique(@QueryParam("limit") Integer limit) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        JSONArray a = vie.historique(limit == null ? 100 : limit);
        return ok(new JSONObject().put("data", a).put("total", a.length()));
    }

    @GET
    @Path("mesures")
    public Response mesures(@QueryParam("heures") Integer heures) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        JSONArray a = vie.mesures(heures == null ? 24 : heures);
        return ok(new JSONObject().put("data", a).put("total", a.length()));
    }

    private int postes() {
        try {
            return Math.max(1, Math.min(200, Integer.parseInt(StringUtils
                    .defaultIfBlank(supportEventService.getParameter("SUPPORT_SERVEUR_POSTES"), "10").trim())));
        } catch (NumberFormatException e) {
            return 10;
        }
    }

    private static String barres(java.nio.file.Path p) {
        return p == null ? "" : p.toAbsolutePath().toString().replace('\\', '/');
    }

    private static JSONObject json(Reglage x) {
        return new JSONObject().put("domaine", x.domaine).put("cle", x.cle).put("libelle", x.libelle)
                .put("actuel", StringUtils.defaultString(x.actuel))
                .put("conseille", StringUtils.defaultString(x.conseille)).put("niveau", x.niveau.name())
                .put("explication", StringUtils.defaultString(x.explication))
                .put("ligne", StringUtils.defaultString(x.ligne));
    }

    /** Reglages en place et conseilles (MariaDB, Payara) : base commune de la lecture et de l'application. */
    private static final class Calcul {
        int postes;
        long ram;
        ConfigPayara payara;
        Map<String, String> variables;
        boolean serveur, mariadbLocale;
        List<Reglage> tous = new ArrayList<>(), payaraReglages = new ArrayList<>();
        String xml = "";
        ApplicationPayara.Domaine domaine;
    }

    private Calcul calcul() throws java.io.IOException {
        Calcul c = new Calcul();
        c.postes = postes();
        String racine = System.getProperty("com.sun.aas.instanceRoot");
        String xml = "";
        if (racine != null) {
            java.nio.file.Path domaine = Paths.get(racine, "config", "domain.xml");
            if (Files.isRegularFile(domaine)) {
                xml = new String(Files.readAllBytes(domaine), StandardCharsets.UTF_8);
                c.xml = xml;
            }
        }
        c.payara = ConfigPayara.lire(xml);
        c.domaine = ApplicationPayara.domaine(StringUtils.defaultString(racine, "domain1"), xml);
        c.ram = MesureServeur.ramMachine();
        c.variables = vie.variablesMariadb();
        c.serveur = appConfig == null || appConfig.isServerMode();
        c.mariadbLocale = !c.payara.lu || c.payara.poolUrl.isEmpty()
                || ConfigPayara.locale(ConfigPayara.hoteBase(c.payara.poolUrl), watchdog.getHote());
        for (Reglage x : ReglagesServeur.comparer(c.ram, Runtime.getRuntime().availableProcessors(),
                Runtime.getRuntime().maxMemory(), c.variables, c.postes, c.payara.lu ? c.payara.poolMax : -1, c.serveur,
                c.mariadbLocale)) {
            /* la memoire du serveur Java est traitee avec les options de Payara (-Xms et -Xmx ensemble) */
            if (!(c.payara.lu && "Xmx".equals(x.cle))) {
                c.tous.add(x);
            }
        }
        if (c.payara.lu) {
            c.payaraReglages = c.payara.comparer(ManagementFactory.getRuntimeMXBean().getInputArguments(),
                    ReglagesServeur.heapConseille(c.ram), c.serveur, c.mariadbLocale,
                    barres(watchdog.getStorageBase().resolve("dumps")), barres(watchdog.dossierLogs()));
        }
        c.tous.addAll(c.payaraReglages);
        return c;
    }

    /** Droits du compte de l'application pour SET GLOBAL ; message si on ne sait pas les lire. */
    private ApplicationMariadb.Droits droitsMariadb(Calcul c) {
        try {
            return ApplicationMariadb.droits(vie.droitsCompte(), c.variables.get("version"), vie.compteBase());
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "droits du compte MariaDB", e);
            return ApplicationMariadb.droits(new ArrayList<>(), c.variables.get("version"), "?");
        }
    }

    @GET
    @Path("reglages")
    public Response reglages() {
        Response r = controle();
        if (r != null) {
            return r;
        }
        try {
            Calcul c = calcul();
            List<Reglage> l = c.tous;
            JSONArray a = new JSONArray();
            for (Reglage x : l) {
                a.put(json(x));
            }
            JSONObject o = new JSONObject().put("data", a).put("postes", c.postes)
                    .put("ram", ReglagesServeur.taille(c.ram))
                    .put("processeurs", Runtime.getRuntime().availableProcessors()).put("payaraLu", c.payara.lu)
                    .put("myIni", ReglagesServeur.blocMyIni(l))
                    .put("asadmin", c.payara.lu ? ConfigPayara.script(c.payaraReglages, c.domaine.nom) : "")
                    .put("mariadb", StringUtils.defaultString(c.variables.get("version"))).put("serveur", c.serveur)
                    .put("mariadbLocale", c.mariadbLocale).put("superAdmin", superAdmin());
            if (c.mariadbLocale && superAdmin()) {
                ApplicationMariadb.Droits d = droitsMariadb(c);
                o.put("droitsMariadb", new JSONObject().put("ok", d.ok).put("message", d.message));
                o.put("fichierMyIni", etatMyIni(c));
            }
            if (c.payara.lu && superAdmin()) {
                o.put("payara", retourPayara(c));
            }
            return ok(o);
        } catch (Exception e) {
            LOG.log(Level.WARNING, "reglages du serveur", e);
            return echec("Lecture des réglages impossible : " + e.getClass().getSimpleName());
        }
    }

    @EJB
    private rest.service.LogService logService;

    private TUser utilisateur() {
        HttpSession s = servletRequest.getSession(false);
        Object u = s == null ? null : s.getAttribute(commonparameter.AIRTIME_USER);
        return u instanceof TUser ? (TUser) u : null;
    }

    private boolean superAdmin() {
        return bll.userManagement.user.estSuperAdmin(utilisateur());
    }

    /** Application des reglages : droit de l'ecran ET super administrateur. */
    private Response controleApplication() {
        Response r = controle();
        if (r != null) {
            return r;
        }
        return superAdmin() ? null : echec("Réservé au super administrateur.");
    }

    private static String cause(Throwable e) {
        Throwable t = e;
        while (t.getCause() != null && t.getCause() != t) {
            t = t.getCause();
        }
        return StringUtils.defaultIfBlank(t.getMessage(), t.getClass().getSimpleName());
    }

    /**
     * Application A CHAUD des reglages de MariaDB a ajuster (SET GLOBAL), liste fermee : corps {cles: [...]} pour en
     * choisir une partie (toutes sinon). Les reglages fixes au demarrage sont laisses a my.ini. Chaque reglage, avant
     * puis apres, est trace au journal des evenements.
     */
    @POST
    @Path("reglages/mariadb")
    public Response appliquerMariadb(String corps) {
        Response r = controleApplication();
        if (r != null) {
            return r;
        }
        try {
            JSONObject in = new JSONObject(StringUtils.defaultIfBlank(corps, "{}"));
            java.util.Set<String> choix = null;
            if (in.has("cles")) {
                choix = new java.util.HashSet<>();
                JSONArray cles = in.getJSONArray("cles");
                for (int i = 0; i < cles.length(); i++) {
                    choix.add(cles.optString(i));
                }
            }
            Calcul c = calcul();
            if (!c.mariadbLocale) {
                return echec("MariaDB n'est pas sur cette machine : ses réglages se font sur le serveur de base.");
            }
            ApplicationMariadb.Droits d = droitsMariadb(c);
            if (!d.ok) {
                return ok(new JSONObject().put("success", false).put("droits", false).put("message", d.message));
            }
            List<ApplicationMariadb.Action> actions = ApplicationMariadb.preparer(c.tous, c.variables, choix);
            if (actions.isEmpty()) {
                return echec("Aucun réglage de MariaDB à ajuster.");
            }
            for (ApplicationMariadb.Action a : actions) {
                if (a.etat != ApplicationMariadb.Etat.A_FAIRE) {
                    continue;
                }
                try {
                    vie.appliquerVariable(a.cle, a.valeur);
                    a.etat = ApplicationMariadb.Etat.APPLIQUE;
                    a.apres = ApplicationMariadb.lisible(a.cle, vie.variableMariadb(a.cle));
                } catch (RuntimeException e) {
                    a.etat = ApplicationMariadb.Etat.ECHEC;
                    a.message = cause(e);
                }
            }
            TUser u = utilisateur();
            String detail = ApplicationMariadb.journal(actions);
            logService.journaliserSansRisque(u, "MARIADB",
                    "Réglages de MariaDB appliqués à chaud depuis le Centre de support par " + u.getStrLOGIN(),
                    dal.enumeration.TypeLog.REGLAGE_SERVEUR, "mariadb", detail);
            JSONArray a = new JSONArray();
            boolean redimension = false;
            for (ApplicationMariadb.Action x : actions) {
                redimension |= x.long_ && x.etat == ApplicationMariadb.Etat.APPLIQUE;
                a.put(new JSONObject().put("cle", x.cle).put("libelle", x.libelle).put("avant", x.avant)
                        .put("apres", StringUtils.defaultString(x.apres)).put("conseille", x.valeurLisible())
                        .put("etat", x.etat.name()).put("message", StringUtils.defaultString(x.message))
                        .put("refus", StringUtils.defaultString(x.refus))
                        .put("avertissement", StringUtils.defaultString(x.avertissement)));
            }
            return ok(new JSONObject().put("data", a).put("redimensionnement", redimension
                    ? StringUtils.defaultString(vie.statutTexteMariadb("Innodb_buffer_pool_resize_status")) : ""));
        } catch (Exception e) {
            LOG.log(Level.WARNING, "application des reglages de MariaDB", e);
            return echec("Application impossible : " + e.getClass().getSimpleName());
        }
    }

    /** Une seule ecriture de my.ini a la fois. */
    private static final Object VERROU_MY_INI = new Object();

    private static java.nio.file.Path cheminMyIni(Calcul c) {
        String d = c.variables.get("datadir");
        return StringUtils.isBlank(d) ? null : FichierMyIni.chemin(d);
    }

    /** my.ini : chemin, structure comprise ou non, lignes a changer (lecture seule). */
    private static JSONObject etatMyIni(Calcul c) {
        JSONObject o = new JSONObject();
        java.nio.file.Path p = cheminMyIni(c);
        if (p == null || !Files.isRegularFile(p)) {
            return o.put("chemin", p == null ? "" : p.toString()).put("refus",
                    "my.ini introuvable dans le dossier des données de MariaDB" + (p == null ? "" : " (" + p + ")")
                            + " : bloc à reporter à la main.");
        }
        try {
            String t = new String(Files.readAllBytes(p), StandardCharsets.ISO_8859_1);
            FichierMyIni.Resultat r = FichierMyIni.appliquer(t, FichierMyIni.valeurs(c.tous, c.variables, t));
            return o.put("chemin", p.toString()).put("refus", StringUtils.defaultString(r.refus)).put("changements",
                    r.refus == null ? r.changements.size() : 0);
        } catch (java.io.IOException e) {
            return o.put("chemin", p.toString()).put("refus", "my.ini illisible : " + e.getMessage());
        }
    }

    /**
     * Ecriture DURABLE des reglages conseilles de MariaDB dans my.ini (dossier des donnees, MariaDB sur cette machine
     * seulement) : cles de la liste fermee, fichier sauvegarde avant, refus si sa structure n'est pas comprise. MariaDB
     * n'est jamais redemarre : les valeurs prennent effet a son prochain demarrage.
     */
    @POST
    @Path("reglages/myini")
    public Response ecrireMyIni() {
        Response r = controleApplication();
        if (r != null) {
            return r;
        }
        try {
            Calcul c = calcul();
            if (!c.mariadbLocale) {
                return echec("MariaDB n'est pas sur cette machine : son my.ini se modifie sur le serveur de base.");
            }
            java.nio.file.Path p = cheminMyIni(c);
            if (p == null) {
                return echec("Dossier des données de MariaDB inconnu : bloc à reporter à la main.");
            }
            FichierMyIni.Ecriture e;
            synchronized (VERROU_MY_INI) {
                String t = Files.isRegularFile(p) ? new String(Files.readAllBytes(p), StandardCharsets.ISO_8859_1) : "";
                e = FichierMyIni.ecrire(p, FichierMyIni.valeurs(c.tous, c.variables, t), java.time.LocalDateTime.now()
                        .format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss")));
            }
            TUser u = utilisateur();
            boolean ecrit = e.refus == null && e.sauvegarde != null;
            if (ecrit || e.refus != null) {
                logService.journaliserSansRisque(u, "MY_INI",
                        (ecrit ? "my.ini modifié" : "my.ini non modifié (refus)") + " depuis le Centre de support par "
                                + u.getStrLOGIN(),
                        dal.enumeration.TypeLog.REGLAGE_SERVEUR, "my.ini", FichierMyIni.journal(e));
            }
            if (e.refus != null) {
                return ok(new JSONObject().put("success", false).put("message", e.refus).put("chemin", p.toString()));
            }
            JSONArray a = new JSONArray();
            for (FichierMyIni.Changement x : e.resultat.changements) {
                a.put(new JSONObject().put("cle", x.cle).put("libelle", x.cle)
                        .put("avant", x.avant == null ? "absent" : x.avant).put("apres", x.apres)
                        .put("conseille", x.apres).put("etat", "APPLIQUE"));
            }
            return ok(new JSONObject().put("data", a).put("chemin", p.toString())
                    .put("sauvegarde", e.sauvegarde == null ? "" : e.sauvegarde.toString()).put("message",
                            ecrit ? "Pris en compte au prochain redémarrage de MariaDB (Prestige ne le redémarre pas)."
                                    : "my.ini contient déjà les réglages conseillés."));
        } catch (Exception e) {
            LOG.log(Level.WARNING, "ecriture de my.ini", e);
            return echec("Écriture impossible : " + e.getClass().getSimpleName());
        }
    }

    /* ------------------------------------------------------------ Payara : script asadmin lance detache */

    private static final boolean WINDOWS = System.getProperty("os.name", "").toLowerCase(java.util.Locale.ROOT)
            .contains("win");
    /** Au-dela, une application lancee sans redemarrage constate est consideree en echec. */
    private static final long ATTENTE_MAX_MS = 10 * 60 * 1000L;

    /** Dossier des scripts, journaux et etats de CE domaine (le stockage est commun aux domaines du poste). */
    private java.nio.file.Path dossierPayara(Calcul c) throws java.io.IOException {
        java.nio.file.Path d = watchdog.getStorageBase().resolve("reglages-payara").resolve(c.domaine.nom);
        Files.createDirectories(d);
        return d;
    }

    private static String asadmin() {
        String r = System.getProperty("com.sun.aas.installRoot");
        if (r == null) {
            return null;
        }
        java.nio.file.Path p = Paths.get(r, "bin", WINDOWS ? "asadmin.bat" : "asadmin");
        return Files.isRegularFile(p) ? p.toAbsolutePath().toString() : null;
    }

    /** Lance un programme sans entree (aucune question possible), {code, sortie} ; code -1 si le delai est depasse. */
    private static Object[] executer(List<String> commande, int secondes) throws Exception {
        java.nio.file.Path sortie = Files.createTempFile("prestige-asadmin", ".txt");
        try {
            Process p = new ProcessBuilder(commande).redirectErrorStream(true)
                    .redirectInput(ProcessBuilder.Redirect.from(new java.io.File(WINDOWS ? "NUL" : "/dev/null")))
                    .redirectOutput(sortie.toFile()).start();
            boolean fini = p.waitFor(secondes, java.util.concurrent.TimeUnit.SECONDS);
            if (!fini) {
                p.destroyForcibly();
            }
            return new Object[] { fini ? p.exitValue() : -1,
                    new String(Files.readAllBytes(sortie), StandardCharsets.ISO_8859_1) };
        } finally {
            Files.deleteIfExists(sortie);
        }
    }

    private static String fin(java.nio.file.Path f, int lignes) {
        try {
            List<String> l = Files.readAllLines(f, StandardCharsets.ISO_8859_1);
            return String.join("\n", l.subList(Math.max(0, l.size() - lignes), l.size()));
        } catch (java.io.IOException e) {
            return "";
        }
    }

    private static JSONObject lireJson(java.nio.file.Path f) throws java.io.IOException {
        return new JSONObject(new String(Files.readAllBytes(f), StandardCharsets.UTF_8));
    }

    private static void ecrireJson(java.nio.file.Path f, JSONObject o) throws java.io.IOException {
        Files.write(f, o.toString(1).getBytes(StandardCharsets.UTF_8));
    }

    private static java.util.Set<String> choix(JSONObject in) {
        if (!in.has("cles")) {
            return null;
        }
        java.util.Set<String> s = new java.util.HashSet<>();
        JSONArray a = in.getJSONArray("cles");
        for (int i = 0; i < a.length(); i++) {
            s.add(a.optString(i));
        }
        return s;
    }

    /**
     * Retour d'une application de Payara : apres le redemarrage du domaine, les reglages relus sont compares a ceux
     * attendus (une fois, trace au journal) ; dernier resultat garde pour l'ecran.
     */
    private JSONObject retourPayara(Calcul c) {
        JSONObject o = new JSONObject().put("domaine", c.domaine.nom).put("lancement", WINDOWS && asadmin() != null);
        try {
            java.nio.file.Path d = dossierPayara(c), att = d.resolve("en-attente.json"),
                    der = d.resolve("dernier-resultat.json");
            if (Files.isRegularFile(att)) {
                JSONObject a = lireJson(att);
                long lance = a.getLong("horodatage");
                java.nio.file.Path journal = Paths.get(a.getString("journal"));
                if (ManagementFactory.getRuntimeMXBean().getStartTime() > lance) {
                    Map<String, String> attendu = new java.util.LinkedHashMap<>();
                    JSONObject at = a.getJSONObject("attendu"), av = a.getJSONObject("avant");
                    for (String k : at.keySet()) {
                        attendu.put(k, at.getString(k));
                    }
                    JSONArray l = new JSONArray();
                    StringBuilder detail = new StringBuilder(
                            "Lancé le " + a.getString("lance") + " par " + a.getString("login") + "\n");
                    int pris = 0;
                    for (ApplicationPayara.Verification v : ApplicationPayara.verifier(attendu, c.payaraReglages)) {
                        pris += v.pris ? 1 : 0;
                        l.put(new JSONObject().put("cle", v.cle).put("libelle", v.libelle)
                                .put("avant", av.optString(v.cle, "?")).put("attendu", v.attendu)
                                .put("actuel", v.actuel).put("pris", v.pris));
                        detail.append(v.cle).append(" : ").append(av.optString(v.cle, "?")).append(" -> ")
                                .append(v.actuel).append(v.pris ? "" : " (non pris, attendu " + v.attendu + ")")
                                .append('\n');
                    }
                    JSONObject res = new JSONObject().put("lance", a.getString("lance"))
                            .put("verifie", java.time.LocalDateTime.now().withNano(0).toString().replace('T', ' '))
                            .put("login", a.getString("login")).put("reglages", l).put("pris", pris)
                            .put("total", l.length()).put("sauvegarde", a.optString("sauvegarde"))
                            .put("journal", pris == l.length() ? "" : fin(journal, 15));
                    ecrireJson(der, res);
                    Files.delete(att);
                    TUser u = utilisateur();
                    logService.journaliserSansRisque(u, "PAYARA",
                            "Réglages de Payara vérifiés après le redémarrage : " + pris + " / " + l.length() + " pris",
                            dal.enumeration.TypeLog.REGLAGE_SERVEUR, "payara", detail.toString());
                } else {
                    boolean perime = System.currentTimeMillis() - lance > ATTENTE_MAX_MS;
                    o.put("enCours", new JSONObject().put("lance", a.getString("lance")).put("perime", perime)
                            .put("journal", perime ? fin(journal, 15) : ""));
                    if (perime) {
                        Files.move(att, d.resolve("sans-redemarrage-" + lance + ".json"));
                    }
                }
            }
            if (Files.isRegularFile(der)) {
                o.put("dernier", lireJson(der));
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "retour des reglages de Payara", e);
        }
        return o;
    }

    private static Response aCopier(String message, String script) {
        return ok(new JSONObject().put("success", false).put("aCopier", true).put("message", message).put("script",
                script));
    }

    /**
     * Application des reglages de Payara : commandes asadmin de la liste fermee (corps {cles: [...]} pour en choisir
     * une partie), domain.xml sauvegarde, script lance dans un processus detache qui redemarre le domaine en cours ;
     * verification au retour ({@link #retourPayara}). Si asadmin demande un mot de passe ou ne peut pas etre lance par
     * le compte du service, rien n'est change et le script reste a copier.
     */
    @POST
    @Path("reglages/payara")
    public Response appliquerPayara(String corps) {
        Response r = controleApplication();
        if (r != null) {
            return r;
        }
        try {
            Calcul c = calcul();
            if (!c.payara.lu) {
                return echec("Configuration de Payara illisible.");
            }
            List<ApplicationPayara.Commande> commandes = ApplicationPayara.commandes(c.payaraReglages,
                    choix(new JSONObject(StringUtils.defaultIfBlank(corps, "{}"))));
            String script = ConfigPayara.script(c.payaraReglages, c.domaine.nom);
            if (commandes.isEmpty()) {
                return echec("Aucun réglage de Payara à appliquer par Prestige.");
            }
            java.nio.file.Path d = dossierPayara(c), att = d.resolve("en-attente.json");
            if (Files.isRegularFile(att)
                    && System.currentTimeMillis() - lireJson(att).getLong("horodatage") < ATTENTE_MAX_MS) {
                return echec("Une application est déjà en cours : Payara va redémarrer.");
            }
            String asadmin = asadmin();
            if (asadmin == null || !WINDOWS) {
                return aCopier("Lancement automatique d'asadmin impossible sur ce poste : script à copier.", script);
            }
            /* asadmin repond-il sans mot de passe, et le compte du service peut-il le lancer ? */
            Object[] essai;
            try {
                essai = executer(java.util.Arrays.asList(asadmin, "--interactive=false", "--port",
                        String.valueOf(c.domaine.portAdmin), "get",
                        "configs.config.server-config.thread-pools.thread-pool.http-thread-pool.max-thread-pool-size"),
                        120);
            } catch (java.io.IOException e) {
                return aCopier("Le compte du service Windows ne peut pas lancer asadmin (" + e.getMessage()
                        + ") : script à copier.", script);
            }
            if ((Integer) essai[0] != 0) {
                String s = (String) essai[1];
                return aCopier(ApplicationPayara.motDePasseDemande(s)
                        ? "asadmin demande un mot de passe d'administration : script à lancer à la main."
                        : "asadmin ne répond pas (" + StringUtils.abbreviate(s.trim(), 200) + ") : script à copier.",
                        script);
            }
            String horo = java.time.LocalDateTime.now()
                    .format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"));
            java.nio.file.Path xml = Paths.get(System.getProperty("com.sun.aas.instanceRoot"), "config", "domain.xml"),
                    sauvegarde = xml.resolveSibling("domain.xml.avant-prestige-" + horo);
            Files.copy(xml, sauvegarde, java.nio.file.StandardCopyOption.COPY_ATTRIBUTES);
            java.nio.file.Path bat = d.resolve("appliquer-" + horo + ".bat"),
                    journal = d.resolve("appliquer-" + horo + ".log");
            Files.write(bat, ApplicationPayara.script(commandes, c.domaine, asadmin, journal.toString())
                    .getBytes(StandardCharsets.ISO_8859_1));
            Map<String, String> attendu = ApplicationPayara.attendu(commandes, c.payaraReglages);
            JSONObject avant = new JSONObject(), at = new JSONObject();
            StringBuilder detail = new StringBuilder("Sauvegarde : " + sauvegarde + "\nScript : " + bat + "\n");
            for (Reglage x : c.payaraReglages) {
                if (attendu.containsKey(x.cle)) {
                    avant.put(x.cle, x.actuel);
                    at.put(x.cle, attendu.get(x.cle));
                    detail.append(x.cle).append(" : ").append(x.actuel).append(" -> ").append(attendu.get(x.cle))
                            .append(" (après le redémarrage)\n");
                }
            }
            TUser u = utilisateur();
            long maintenant = System.currentTimeMillis();
            ecrireJson(att,
                    new JSONObject().put("horodatage", maintenant)
                            .put("lance", java.time.LocalDateTime.now().withNano(0).toString().replace('T', ' '))
                            .put("login", u.getStrLOGIN()).put("attendu", at).put("avant", avant)
                            .put("journal", journal.toString()).put("sauvegarde", sauvegarde.toString()));
            /* processus cree par WMI : hors de l'arbre de Payara, il survit a son arret */
            String ps = "$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine = "
                    + "'cmd.exe /c \"" + bat.toAbsolutePath().toString().replace("'", "''") + "\"'}; $r.ReturnValue";
            Object[] lancement = executer(
                    java.util.Arrays.asList("powershell.exe", "-NoProfile", "-NonInteractive", "-EncodedCommand",
                            java.util.Base64.getEncoder().encodeToString(ps.getBytes(StandardCharsets.UTF_16LE))),
                    60);
            if ((Integer) lancement[0] != 0 || !"0".equals(((String) lancement[1]).trim())) {
                Files.deleteIfExists(att);
                return aCopier(
                        "Le script n'a pas pu être lancé en arrière-plan ("
                                + StringUtils.abbreviate(((String) lancement[1]).trim(), 200) + ") : script à copier.",
                        script);
            }
            logService.journaliserSansRisque(u, "PAYARA",
                    "Réglages de Payara lancés depuis le Centre de support par " + u.getStrLOGIN()
                            + " (redémarrage du domaine " + c.domaine.nom + ")",
                    dal.enumeration.TypeLog.REGLAGE_SERVEUR, "payara", detail.toString());
            return ok(
                    new JSONObject().put("lance", true).put("domaine", c.domaine.nom).put("reglages", at.length())
                            .put("message", "Payara applique " + at.length()
                                    + " réglage(s) puis redémarre (environ une minute)."
                                    + " Reconnectez-vous ensuite et rouvrez cet onglet : la vérification s'affiche."));
        } catch (Exception e) {
            LOG.log(Level.WARNING, "application des reglages de Payara", e);
            return echec("Application impossible : " + e.getClass().getSimpleName());
        }
    }

    @POST
    @Path("postes")
    public Response postes(String corps) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        int p = new JSONObject(StringUtils.defaultIfBlank(corps, "{}")).optInt("postes", -1);
        if (p < 1 || p > 200) {
            return echec("Nombre de postes entre 1 et 200.");
        }
        vie.enregistrerParametre("SUPPORT_SERVEUR_POSTES", String.valueOf(p));
        return ok(new JSONObject().put("postes", p));
    }

    /** Prestige Veille : le jeton est-il renseigne ? (sa valeur n'est jamais relue). */
    @GET
    @Path("veille-jeton")
    public Response veilleJeton() {
        Response r = controle();
        if (r != null) {
            return r;
        }
        return ok(new JSONObject().put("configure",
                StringUtils.isNotBlank(supportEventService.getParameter("SUPPORT_VEILLE_JETON"))));
    }

    /**
     * Prestige Veille : nouveau jeton (aleatoire, 32 octets), renvoye UNE fois pour etre colle dans les reglages de la
     * veille ; l'ancien cesse aussitot de fonctionner. La valeur n'est ni journalisee ni relisible.
     */
    @POST
    @Path("veille-jeton")
    public Response genererVeilleJeton() {
        Response r = controle();
        if (r != null) {
            return r;
        }
        byte[] b = new byte[32];
        new java.security.SecureRandom().nextBytes(b);
        String jeton = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(b);
        vie.enregistrerParametre("SUPPORT_VEILLE_JETON", jeton);
        LOG.info(() -> "Jeton de Prestige Veille renouvele par "
                + ((TUser) servletRequest.getSession(false).getAttribute(commonparameter.AIRTIME_USER)).getStrLOGIN());
        return ok(new JSONObject().put("jeton", jeton));
    }
}
