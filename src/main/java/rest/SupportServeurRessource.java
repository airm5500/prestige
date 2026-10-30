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
import rest.service.impl.serveur.CauseArret;
import rest.service.impl.serveur.ConfigPayara;
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
 * <li>POST reglages/mariadb : application a chaud (SET GLOBAL) des reglages de MariaDB, super administrateur.</li>
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
            }
        }
        c.payara = ConfigPayara.lire(xml);
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
                    .put("asadmin", c.payara.lu ? ConfigPayara.script(c.payaraReglages) : "")
                    .put("mariadb", StringUtils.defaultString(c.variables.get("version"))).put("serveur", c.serveur)
                    .put("mariadbLocale", c.mariadbLocale).put("superAdmin", superAdmin());
            if (c.mariadbLocale && superAdmin()) {
                ApplicationMariadb.Droits d = droitsMariadb(c);
                o.put("droitsMariadb", new JSONObject().put("ok", d.ok).put("message", d.message));
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
