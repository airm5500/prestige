package rest;

import dal.TPrivilege;
import dal.TUser;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.EJBException;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.SmsService;
import rest.service.WhatsAppService;
import rest.service.impl.campagne.CampagneService;
import rest.service.impl.campagne.CampagneService.Cible;
import rest.service.impl.campagne.CampagneService.Filtres;
import rest.service.impl.campagne.Campagnes;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;

/**
 * CAMPAGNES SMS / WHATSAPP (besoins du 11/10, lot 4). Droit P_SM_CAMPAGNES, verifie a chaque appel. Les messages sont
 * prepares et valides dans une transaction, PUIS envoyes en tache de fond (comme les rappels de traitement). Aucun
 * jeton ni texte de message dans les journaux.
 */
@Path("v1/campagnes")
@Produces("application/json")
@Consumes("application/json")
public class CampagneRessource {

    static final String DROIT = "P_SM_CAMPAGNES";
    private static final Logger LOG = Logger.getLogger(CampagneRessource.class.getName());

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private CampagneService service;
    @EJB
    private SmsService smsService;
    @EJB
    private WhatsAppService whatsAppService;

    private TUser utilisateur() {
        HttpSession s = servletRequest.getSession(false);
        Object u = s == null ? null : s.getAttribute(commonparameter.AIRTIME_USER);
        return u instanceof TUser ? (TUser) u : null;
    }

    @SuppressWarnings("unchecked")
    private boolean droit(String nom) {
        HttpSession s = servletRequest.getSession(false);
        return s != null && CommonUtils
                .hasAuthorityByName((List<TPrivilege>) s.getAttribute(commonparameter.USER_LIST_PRIVILEGE), nom);
    }

    private Response controle() {
        if (utilisateur() == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        return droit(DROIT) ? null : echec("Votre profil ne donne pas accès aux campagnes.");
    }

    private static Response ok(JSONObject o) {
        return Response.ok(o.put("success", o.optBoolean("success", true)).toString()).build();
    }

    private static Response echec(String msg) {
        return Response.ok(new JSONObject().put("success", false).put("message", msg).toString()).build();
    }

    private static JSONObject corps(String c) {
        try {
            return new JSONObject(StringUtils.defaultIfBlank(c, "{}"));
        } catch (org.json.JSONException e) {
            return new JSONObject();
        }
    }

    /** Message d'une erreur metier (IllegalArgumentException, eventuellement enveloppee par le conteneur). */
    private static String metier(Exception e) {
        Throwable t = e;
        while (t instanceof EJBException && t.getCause() != null) {
            t = t.getCause();
        }
        return t instanceof IllegalArgumentException ? t.getMessage() : null;
    }

    private Response erreur(String quoi, Exception e) {
        String m = metier(e);
        if (m != null) {
            return echec(m);
        }
        LOG.log(Level.SEVERE, "Campagnes : " + quoi, e);
        return echec("Opération impossible : erreur du serveur.");
    }

    /** Envoi en tache de fond des notifications preparees, par le canal choisi. */
    private void expedier(JSONObject o) {
        String c = Campagnes.canal(o.optString("canal"));
        JSONArray n = o.optJSONArray("notifications");
        for (int i = 0; n != null && i < n.length(); i++) {
            if ("SMS".equals(c)) {
                smsService.sendSMSByNotificationIdAsync(n.getString(i));
            } else {
                whatsAppService.envoyerNotificationAsync(n.getString(i), "SMS_WHATSAPP".equals(c));
            }
        }
    }

    /* ------------------------------------------------------------------------------------------------ contexte */

    @GET
    @Path("contexte")
    public Response contexte() {
        Response r = controle();
        if (r != null) {
            return r;
        }
        JSONArray categories = new JSONArray();
        for (Campagnes.Categorie c : Campagnes.Categorie.values()) {
            categories.put(new JSONObject().put("code", c.name()).put("libelle", c.libelle));
        }
        String[] o = service.officine();
        return ok(new JSONObject().put("rappels", droit("P_SM_RAPPELS_HABITUDE")).put("categories", categories)
                .put("officine", o[0]).put("parametres", service.parametres())
                .put("aujourdhui", LocalDate.now().toString()).put("longueurMax", Campagnes.LONGUEUR_MAX)
                .put("propositions", service.compteurPropositions()));
    }

    /* ------------------------------------------------------------------------------------------------ population */

    @POST
    @Path("population")
    public Response population(String c) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        Filtres f = Filtres.depuis(corps(c));
        if (f.categorie == null) {
            return echec("Catégorie de campagne inconnue.");
        }
        JSONArray a = new JSONArray();
        int joignables = 0;
        for (Cible x : service.population(f)) {
            a.put(x.json());
            joignables += x.motif == null ? 1 : 0;
        }
        return ok(new JSONObject().put("data", a).put("total", a.length()).put("joignables", joignables));
    }

    /** Apercu du message pour un destinataire (le client donne, sinon le premier joignable). */
    @POST
    @Path("apercu")
    public Response apercu(String c) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        JSONObject o = corps(c);
        try {
            Filtres f = Filtres.depuis(o);
            String texte = StringUtils.trimToNull(o.optString("message", null));
            String modele = texte != null ? texte : service.contenuModele(o.optString("modeleId"), f.canal);
            String fete = f.feteCode == null ? "" : StringUtils.defaultString(service.libelleFete(f.feteCode));
            String clientId = StringUtils.trimToNull(o.optString("clientId", null));
            Filtres un = new Filtres();
            un.categorie = f.categorie;
            un.jour = f.jour;
            un.canal = f.canal;
            un.clientIds = clientId == null ? f.clientIds : java.util.Collections.singletonList(clientId);
            Cible exemple = null;
            if (un.clientIds != null && !un.clientIds.isEmpty()) {
                un.categorie = null;
                List<Cible> l = service.population(un);
                exemple = l.isEmpty() ? null : l.get(0);
            }
            if (exemple == null) {
                exemple = new Cible();
                exemple.prenom = "Awa";
                exemple.nom = "KOUASSI";
                exemple.age = 35;
            }
            String t = CampagneService.message(modele, exemple, service.officine(), fete);
            return ok(new JSONObject().put("texte", t).put("client", exemple.nomComplet()).put("longueur", t.length())
                    .put("sms", (t.length() + 159) / 160).put("contenu", modele));
        } catch (Exception e) {
            return erreur("aperçu", e);
        }
    }

    /* ------------------------------------------------------------------------------------------------ envoi */

    @POST
    @Path("envoyer")
    public Response envoyer(String c) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        JSONObject o = corps(c);
        try {
            JSONObject res = service.envoyer(Filtres.depuis(o), o.optString("modeleId", null),
                    o.optString("message", null), utilisateur().getLgUSERID());
            expedier(res);
            return ok(res);
        } catch (Exception e) {
            return erreur("envoi", e);
        }
    }

    /* ------------------------------------------------------------------------------------------------ propositions */

    @GET
    @Path("propositions")
    public Response propositions() {
        Response r = controle();
        if (r != null) {
            return r;
        }
        JSONArray a = service.propositions();
        return ok(new JSONObject().put("data", a).put("total", a.length()).put("messages",
                service.compteurPropositions()));
    }

    /** Preparation a la demande des propositions du jour (meme calcul que la tache du matin, sans envoi). */
    @POST
    @Path("propositions/generer")
    public Response generer(@QueryParam("jour") String jour) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        try {
            LocalDate j = StringUtils.isBlank(jour) ? LocalDate.now() : LocalDate.parse(jour.trim());
            return ok(service.genererPropositions(j, true));
        } catch (java.time.format.DateTimeParseException e) {
            return echec("Date invalide.");
        } catch (Exception e) {
            return erreur("propositions", e);
        }
    }

    @POST
    @Path("propositions/{id}/envoyer")
    public Response envoyerProposition(@PathParam("id") String id, String c) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        JSONObject o = corps(c);
        List<String> decoches = new ArrayList<>();
        JSONArray d = o.optJSONArray("decoches");
        for (int i = 0; d != null && i < d.length(); i++) {
            decoches.add(d.optString(i));
        }
        try {
            JSONObject res = service.envoyerProposition(id, decoches, o.optString("canal", null),
                    o.optString("modeleId", null), utilisateur().getLgUSERID());
            expedier(res);
            return ok(res);
        } catch (Exception e) {
            return erreur("envoi d'une proposition", e);
        }
    }

    @POST
    @Path("propositions/{id}/abandonner")
    public Response abandonner(@PathParam("id") String id) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        try {
            service.abandonner(id, utilisateur().getLgUSERID());
            return ok(new JSONObject().put("message", "Proposition abandonnée : rien n'a été envoyé."));
        } catch (Exception e) {
            return erreur("abandon", e);
        }
    }

    /* ------------------------------------------------------------------------------------------------ journal */

    @GET
    @Path("journal")
    public Response journal(@QueryParam("limit") Integer limit) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        JSONArray a = service.journal(limit == null ? 200 : limit);
        return ok(new JSONObject().put("data", a).put("total", a.length()));
    }

    /* ------------------------------------------------------------------------------------------------ fetes */

    @GET
    @Path("fetes")
    public Response fetes(@QueryParam("annee") Integer annee) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        int a = annee == null || annee < 2000 || annee > 2100 ? LocalDate.now().getYear() : annee;
        JSONArray l = service.fetes(a);
        return ok(new JSONObject().put("data", l).put("total", l.length()).put("annee", a));
    }

    @POST
    @Path("fetes/date")
    public Response dateFete(String c) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        JSONObject o = corps(c);
        try {
            String d = StringUtils.trimToNull(o.optString("date", null));
            service.saisirDateFete(o.optString("code"), o.optInt("annee"),
                    d == null ? null : LocalDate.parse(d.substring(0, Math.min(10, d.length()))),
                    utilisateur().getLgUSERID());
            return ok(new JSONObject().put("message", "Date enregistrée."));
        } catch (java.time.format.DateTimeParseException e) {
            return echec("Date invalide.");
        } catch (Exception e) {
            return erreur("date de fête", e);
        }
    }

    @POST
    @Path("fetes/actif")
    public Response activerFete(String c) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        JSONObject o = corps(c);
        try {
            service.activerFete(o.optString("code"), o.optBoolean("actif"), utilisateur().getLgUSERID());
            return ok(new JSONObject().put("message", "Enregistré."));
        } catch (Exception e) {
            return erreur("fête", e);
        }
    }

    /* ------------------------------------------------------------------------------------------------ parametres */

    @GET
    @Path("parametres")
    public Response parametres() {
        Response r = controle();
        if (r != null) {
            return r;
        }
        return ok(new JSONObject().put("data", service.parametres()));
    }

    @POST
    @Path("parametres")
    public Response enregistrerParametres(String c) {
        Response r = controle();
        if (r != null) {
            return r;
        }
        try {
            service.enregistrerParametres(corps(c));
            return ok(new JSONObject().put("data", service.parametres()).put("message", "Paramètres enregistrés."));
        } catch (Exception e) {
            return erreur("paramètres", e);
        }
    }
}
