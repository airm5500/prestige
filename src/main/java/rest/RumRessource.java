package rest;

import dal.TUser;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.lang.management.ManagementFactory;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.HeaderParam;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.SupportEventService;
import rest.service.impl.serveur.MesureServeur;
import rest.service.impl.serveur.RumService;
import rest.service.impl.serveur.ServeurVieService;
import toolkits.parameters.commonparameter;

/**
 * Retour du 14/10.
 * <ul>
 * <li>POST v1/support/rum : mesures d'experience utilisateur envoyees par le navigateur (session requise, tout
 * utilisateur connecte) ; le poste est celui de CE serveur Payara (un par poste), l'utilisateur celui de la session ;
 * SUPPORT_RUM_ACTIF=0 arrete l'envoi (la reponse le dit au navigateur) ;</li>
 * <li>GET v1/support/veille : etat du serveur pour l'outil externe Prestige Veille, SANS session mais avec le jeton
 * partage (en-tete X-Veille-Jeton, compare en temps constant) ; jeton vide en base = point ferme. Aucune donnee de
 * vente ni de client : memoire, fils, processeur, pool, base, experience utilisateur des 5 dernieres minutes.</li>
 * </ul>
 */
@Path("v1/support")
@Produces("application/json")
@Consumes("application/json")
public class RumRessource {

    private static final Logger LOG = Logger.getLogger(RumRessource.class.getName());

    @Inject
    private HttpServletRequest servletRequest;
    @Inject
    private config.AppConfig appConfig;
    @EJB
    private RumService rumService;
    @EJB
    private ServeurVieService vie;
    @EJB
    private SupportEventService supportEventService;
    @EJB
    private job.PoolReparation poolReparation;
    @EJB
    private job.SupportWatchdog watchdog;

    private String poste() {
        return job.PosteLocal.identifiant(appConfig == null || appConfig.isServerMode());
    }

    private String parametre(String cle, String defaut) {
        try {
            return StringUtils.defaultIfBlank(supportEventService.getParameter(cle), defaut).trim();
        } catch (Exception e) {
            return defaut;
        }
    }

    @POST
    @Path("rum")
    public Response rum(String corps) {
        HttpSession s = servletRequest.getSession(false);
        Object u = s == null ? null : s.getAttribute(commonparameter.AIRTIME_USER);
        if (!(u instanceof TUser)) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        boolean actif = true;
        int n = 0;
        try {
            JSONObject o = new JSONObject(StringUtils.defaultIfBlank(corps, "{}"));
            n = rumService.enregistrerSiActif(poste(), StringUtils.defaultString(((TUser) u).getStrLOGIN()),
                    o.optJSONArray("lots"));
            actif = n >= 0;
            n = Math.max(0, n);
        } catch (Exception e) {
            LOG.log(Level.FINE, "mesures RUM refusees", e);
        }
        return Response.ok(new JSONObject().put("success", true).put("actif", actif).put("retenus", n).toString())
                .build();
    }

    static boolean memeJeton(String attendu, String recu) {
        if (StringUtils.isBlank(attendu) || recu == null) {
            return false;
        }
        return MessageDigest.isEqual(attendu.trim().getBytes(StandardCharsets.UTF_8),
                recu.trim().getBytes(StandardCharsets.UTF_8));
    }

    @GET
    @Path("veille")
    public Response veille(@HeaderParam("X-Veille-Jeton") String jeton) {
        if (!memeJeton(parametre("SUPPORT_VEILLE_JETON", ""), jeton)) {
            return Response.status(Response.Status.FORBIDDEN).entity(new JSONObject().put("success", false)
                    .put("message", "Jeton de veille absent ou invalide.").toString()).build();
        }
        ServeurVieService.Mesure m = MesureServeur.releve();
        JSONObject o = new JSONObject().put("success", true).put("poste", poste())
                .put("demarre", ManagementFactory.getRuntimeMXBean().getStartTime()).put("memoireMo", m.memoireMo)
                .put("memoireMaxMo", m.memoireMaxMo).put("fils", m.fils).put("filsHttp", m.filsHttpActifs)
                .put("gcMs", m.gcMs).put("cpuServeur", m.cpuServeurPct == null ? JSONObject.NULL : m.cpuServeurPct)
                .put("cpuMachine", m.cpuMachinePct == null ? JSONObject.NULL : m.cpuMachinePct)
                .put("ramLibreMo", m.ramLibreMo).put("ramTotaleMo", m.ramTotaleMo)
                .put("poolMs", poolReparation.tempsReponseMs()).put("pool", new JSONObject(poolReparation.etat()));
        try {
            o.put("bddConnexions", vie.statutMariadb("Threads_connected"))
                    .put("bddPic", vie.statutMariadb("Max_used_connections"))
                    .put("bddUptime", vie.statutMariadb("Uptime"));
            JSONObject rum = rumService.synthese(1, "");
            JSONArray serie = rum.optJSONArray("serie");
            o.put("rum", serie == null ? new JSONArray() : serie);
        } catch (Exception e) {
            o.put("bddErreur", e.getClass().getSimpleName());
        }
        rest.service.impl.serveur.CauseArret.Diagnostic c = watchdog.getDerniereCause();
        if (c != null) {
            o.put("derniereCause", c.code.libelle);
        }
        return Response.ok(o.toString()).build();
    }
}
