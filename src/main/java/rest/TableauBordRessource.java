package rest;

import dal.TUser;
import java.time.LocalDate;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;
import javax.ejb.EJB;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import rest.service.TableauBordService;
import util.Constant;

/**
 * Nouveau tableau de bord (plan d'octobre, section 8, lot L8) : une route par carte, chargee seulement quand la carte
 * est affichee. Donnees du jour en cache court (1 minute), annees closes en cache long ; « Actualiser » passe
 * {@code frais=1} pour relire la base.
 */
@Path("v1/tableau-bord")
@Produces(MediaType.APPLICATION_JSON)
public class TableauBordRessource {

    private static final long COURT = 60_000L;
    private static final long LONG = 6 * 3_600_000L;
    private static final Map<String, Object[]> CACHE = new ConcurrentHashMap<>();

    @EJB
    private TableauBordService service;
    @Context
    private HttpServletRequest servletRequest;

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    private static Response deconnecte() {
        return Response.ok(new JSONObject().put("success", false).put("msg", Constant.DECONNECTED_MESSAGE).toString())
                .build();
    }

    private static LocalDate jour(String valeur) {
        try {
            return StringUtils.isBlank(valeur) ? LocalDate.now() : LocalDate.parse(valeur.trim());
        } catch (RuntimeException e) {
            return LocalDate.now();
        }
    }

    private Response cache(String cle, long duree, boolean frais, Supplier<JSONObject> lecture) {
        long maintenant = System.currentTimeMillis();
        Object[] e = CACHE.get(cle);
        if (!frais && e != null && (long) e[0] > maintenant) {
            return Response.ok((String) e[1]).build();
        }
        JSONObject o = lecture.get();
        String corps = o.put("success", !o.optBoolean("erreur", false)).toString();
        if (!o.optBoolean("erreur", false)) {
            CACHE.put(cle, new Object[] { maintenant + duree, corps });
        }
        return Response.ok(corps).build();
    }

    private String parametre(String cle, String defaut) {
        return service.parametre(cle, defaut);
    }

    private String emplacement(TUser u) {
        return u.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
    }

    /** Version affichee (NOUVEAU / ANCIEN) : l'ecran d'accueil la lit avant de construire le tableau de bord. */
    @GET
    @Path("version")
    public Response version() {
        if (utilisateur() == null) {
            return deconnecte();
        }
        String v = parametre("KEY_TABLEAU_BORD_VERSION", "NOUVEAU");
        return Response.ok(new JSONObject().put("success", true)
                .put("version", "ANCIEN".equalsIgnoreCase(v) ? "ANCIEN" : "NOUVEAU").toString()).build();
    }

    @GET
    @Path("tuiles")
    public Response tuiles(@QueryParam("date") String date, @DefaultValue("saisie") @QueryParam("achats") String achats,
            @DefaultValue("7") @QueryParam("rup") int rup, @DefaultValue("0") @QueryParam("frais") int frais) {
        TUser u = utilisateur();
        if (u == null) {
            return deconnecte();
        }
        LocalDate j = jour(date);
        boolean bl = "bl".equalsIgnoreCase(achats);
        return cache("tuiles|" + j + "|" + bl + "|" + rup + "|" + emplacement(u), COURT, frais == 1,
                () -> service.tuiles(j, bl, rup, emplacement(u)));
    }

    @GET
    @Path("evolution")
    public Response evolution(@QueryParam("annee") Integer annee, @DefaultValue("0") @QueryParam("frais") int frais) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        int courante = LocalDate.now().getYear();
        int a = annee == null || annee > courante || annee < courante - 2 ? courante : annee;
        return cache("evolution|" + a, a < courante ? LONG : COURT * 3, frais == 1, () -> service.evolution(a));
    }

    @GET
    @Path("valorisation")
    public Response valorisation(@DefaultValue("0") @QueryParam("frais") int frais) {
        TUser u = utilisateur();
        if (u == null) {
            return deconnecte();
        }
        return cache("valorisation|" + emplacement(u), COURT * 15, frais == 1,
                () -> service.valorisation(emplacement(u)));
    }

    @GET
    @Path("encaissements")
    public Response encaissements(@QueryParam("date") String date, @DefaultValue("0") @QueryParam("frais") int frais) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        LocalDate j = jour(date);
        String mm = parametre("KEY_TABLEAU_BORD_MOBILE_MONEY", "7,8,9,10,19,70,80");
        return cache("encaissements|" + j + "|" + mm, COURT, frais == 1, () -> service.encaissements(j, mm));
    }

    @GET
    @Path("mouvements")
    public Response mouvements(@QueryParam("date") String date, @DefaultValue("0") @QueryParam("frais") int frais) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        LocalDate j = jour(date);
        return cache("mouvements|" + j, COURT, frais == 1, () -> service.mouvements(j));
    }

    @GET
    @Path("alertes")
    public Response alertes(@DefaultValue("6") @QueryParam("per") int per,
            @DefaultValue("7") @QueryParam("rup") int rup, @DefaultValue("7") @QueryParam("ren") int ren,
            @DefaultValue("2") @QueryParam("sug") int sug, @DefaultValue("0") @QueryParam("frais") int frais) {
        TUser u = utilisateur();
        if (u == null) {
            return deconnecte();
        }
        return cache("alertes|" + per + "|" + rup + "|" + ren + "|" + sug + "|" + emplacement(u), COURT, frais == 1,
                () -> service.alertes(per, rup, ren, sug, emplacement(u)));
    }

    @GET
    @Path("alertes/liste")
    public Response alerteListe(@QueryParam("type") String type, @DefaultValue("6") @QueryParam("per") int per,
            @DefaultValue("7") @QueryParam("rup") int rup, @DefaultValue("500") @QueryParam("limite") int limite) {
        TUser u = utilisateur();
        if (u == null) {
            return deconnecte();
        }
        JSONObject o = service.alerteListe(StringUtils.defaultString(type), per, rup, emplacement(u), limite);
        return Response.ok(o.put("success", !o.optBoolean("erreur", false)).toString()).build();
    }

    @GET
    @Path("top-mois")
    public Response topMois(@QueryParam("date") String date, @DefaultValue("5") @QueryParam("limite") int limite,
            @DefaultValue("0") @QueryParam("frais") int frais) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        LocalDate j = jour(date);
        return cache("top-mois|" + j + "|" + limite, COURT * 3, frais == 1, () -> service.topMois(j, limite));
    }

    @GET
    @Path("top-jour")
    public Response topJour(@QueryParam("date") String date, @DefaultValue("5") @QueryParam("limite") int limite,
            @DefaultValue("0") @QueryParam("frais") int frais) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        LocalDate j = jour(date);
        return cache("top-jour|" + j + "|" + limite, COURT, frais == 1, () -> service.topJour(j, limite));
    }

    @GET
    @Path("grossistes")
    public Response grossistes(@QueryParam("date") String date, @DefaultValue("5") @QueryParam("limite") int limite,
            @DefaultValue("0") @QueryParam("frais") int frais) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        LocalDate j = jour(date);
        return cache("grossistes|" + j + "|" + limite, COURT * 2, frais == 1, () -> service.grossistes(j, limite));
    }

    @GET
    @Path("emplacements")
    public Response emplacements(@QueryParam("date") String date, @DefaultValue("5") @QueryParam("limite") int limite,
            @DefaultValue("emplacement") @QueryParam("axe") String axe,
            @DefaultValue("0") @QueryParam("frais") int frais) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        LocalDate j = jour(date);
        String a = "famille".equalsIgnoreCase(axe) ? "famille" : "emplacement";
        return cache("emplacements|" + a + "|" + j + "|" + limite, COURT * 3, frais == 1,
                () -> service.emplacements(j, limite, a));
    }

    @GET
    @Path("tiers-payants")
    public Response tiersPayants(@QueryParam("date") String date, @DefaultValue("5") @QueryParam("limite") int limite,
            @DefaultValue("0") @QueryParam("frais") int frais) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        LocalDate j = jour(date);
        return cache("tiers-payants|" + j + "|" + limite, COURT * 2, frais == 1, () -> service.tiersPayants(j, limite));
    }

    @GET
    @Path("frequentation")
    public Response frequentation(@QueryParam("date") String date, @DefaultValue("0") @QueryParam("frais") int frais) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        LocalDate j = jour(date);
        return cache("frequentation|" + j, COURT * 3, frais == 1, () -> service.frequentation(j));
    }
}
