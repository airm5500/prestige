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
 * <li>POST postes : nombre de postes qui dimensionne les reglages.</li>
 * </ul>
 * Lecture seule sur la configuration : rien n'est modifie dans Payara ni MariaDB.
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

    @GET
    @Path("reglages")
    public Response reglages() {
        Response r = controle();
        if (r != null) {
            return r;
        }
        try {
            int postes = postes();
            String racine = System.getProperty("com.sun.aas.instanceRoot");
            String xml = "";
            if (racine != null) {
                java.nio.file.Path domaine = Paths.get(racine, "config", "domain.xml");
                if (Files.isRegularFile(domaine)) {
                    xml = new String(Files.readAllBytes(domaine), StandardCharsets.UTF_8);
                }
            }
            ConfigPayara payara = ConfigPayara.lire(xml);
            long ram = MesureServeur.ramMachine();
            Map<String, String> variables = vie.variablesMariadb();
            boolean serveur = appConfig == null || appConfig.isServerMode();
            boolean mariadbLocale = !payara.lu || payara.poolUrl.isEmpty()
                    || ConfigPayara.locale(ConfigPayara.hoteBase(payara.poolUrl), watchdog.getHote());
            List<Reglage> l = new ArrayList<>();
            for (Reglage x : ReglagesServeur.comparer(ram, Runtime.getRuntime().availableProcessors(),
                    Runtime.getRuntime().maxMemory(), variables, postes, payara.lu ? payara.poolMax : -1, serveur,
                    mariadbLocale)) {
                /* la memoire du serveur Java est traitee avec les options de Payara (-Xms et -Xmx ensemble) */
                if (!(payara.lu && "Xmx".equals(x.cle))) {
                    l.add(x);
                }
            }
            List<Reglage> lp = payara.lu
                    ? payara.comparer(ManagementFactory.getRuntimeMXBean().getInputArguments(),
                            ReglagesServeur.heapConseille(ram), serveur, mariadbLocale,
                            barres(watchdog.getStorageBase().resolve("dumps")), barres(watchdog.dossierLogs()))
                    : new ArrayList<>();
            l.addAll(lp);
            JSONArray a = new JSONArray();
            for (Reglage x : l) {
                a.put(json(x));
            }
            return ok(new JSONObject().put("data", a).put("postes", postes).put("ram", ReglagesServeur.taille(ram))
                    .put("processeurs", Runtime.getRuntime().availableProcessors()).put("payaraLu", payara.lu)
                    .put("myIni", ReglagesServeur.blocMyIni(l)).put("asadmin", payara.lu ? ConfigPayara.script(lp) : "")
                    .put("mariadb", StringUtils.defaultString(variables.get("version"))).put("serveur", serveur)
                    .put("mariadbLocale", mariadbLocale));
        } catch (Exception e) {
            LOG.log(Level.WARNING, "reglages du serveur", e);
            return echec("Lecture des réglages impossible : " + e.getClass().getSimpleName());
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
