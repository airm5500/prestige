package rest;

import dal.TUser;
import dal.enumeration.TypeLog;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.inject.Inject;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.LogService;
import util.ContexteRequete;

/**
 * Demande mobile 56 (25/10) : le serveur garde le nom de l'appareil (X-Poste), rattache a son empreinte, pour le
 * retrouver apres une desinstallation de l'application. Empreinte = SHA-256(ANDROID_ID + ":" + paquet) en hexadecimal :
 * ni secret, ni droit ; l'identifiant en clair n'est jamais envoye.
 * <ul>
 * <li>GET v1/appareil/nom?empreinte= : SANS session (premier lancement, avant la connexion) ; 30 lectures par minute et
 * par adresse (429 au-dela) ; 200 {nom} ou {nom: null} si l'empreinte est inconnue ; 400 si l'empreinte n'a pas 64
 * caracteres hexadecimaux ;</li>
 * <li>PUT v1/appareil/nom {empreinte, nom} : session requise (tout utilisateur connecte), 401 sinon ; nom nettoye comme
 * X-Poste (ContexteRequete) ; nom vide 400 ; enregistre ou remplace ; 200 {nom tel qu'enregistre}. Journal :
 * utilisateur, nom, date, 8 premiers caracteres de l'empreinte seulement.</li>
 * </ul>
 */
@Path("v1/appareil")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Stateless
public class AppareilRessource {

    private static final Pattern EMPREINTE = Pattern.compile("[0-9a-fA-F]{64}");
    private static final int LECTURES_PAR_MINUTE = 30;
    private static final long MINUTE = 60_000L;
    /* lectures sans session, par adresse ; en memoire (un redemarrage remet a zero, ce qui suffit pour freiner) */
    private static final Map<String, Deque<Long>> LECTURES = new ConcurrentHashMap<>();

    @Inject
    private HttpServletRequest servletRequest;
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private LogService logService;

    @GET
    @Path("nom")
    public Response lire(@QueryParam("empreinte") String empreinte) {
        if (!accepterLecture(servletRequest.getRemoteAddr(), System.currentTimeMillis())) {
            return reponse(429, new JSONObject().put("success", false).put("code", "TROP_DE_DEMANDES").put("msg",
                    "Trop de demandes : réessayez dans une minute."));
        }
        if (empreinte == null || !EMPREINTE.matcher(empreinte).matches()) {
            return invalide("Empreinte invalide : 64 caractères hexadécimaux attendus.");
        }
        @SuppressWarnings("unchecked")
        List<Object> l = em.createNativeQuery("SELECT nom FROM t_appareil_nom WHERE empreinte = ?1")
                .setParameter(1, empreinte.toLowerCase()).getResultList();
        return reponse(200, new JSONObject().put("success", true).put("nom", l.isEmpty() ? JSONObject.NULL : l.get(0)));
    }

    @PUT
    @Path("nom")
    public Response enregistrer(String corps) {
        TUser u = Droits.utilisateur(servletRequest);
        if (u == null) {
            return reponse(401, new JSONObject().put("success", false).put("code", "SESSION"));
        }
        JSONObject in;
        try {
            in = corps == null || corps.isBlank() ? new JSONObject() : new JSONObject(corps);
        } catch (JSONException e) {
            return invalide("Corps JSON attendu : {empreinte, nom}.");
        }
        String empreinte = in.optString("empreinte", "");
        if (!EMPREINTE.matcher(empreinte).matches()) {
            return invalide("Empreinte invalide : 64 caractères hexadécimaux attendus.");
        }
        String nom = ContexteRequete.nomPoste(in.optString("nom", null));
        if (nom == null) {
            return invalide("Nom de l'appareil vide.");
        }
        empreinte = empreinte.toLowerCase();
        em.createNativeQuery("INSERT INTO t_appareil_nom (empreinte, nom, maj, lg_USER_ID) VALUES (?1, ?2, NOW(), ?3)"
                + " ON DUPLICATE KEY UPDATE nom = VALUES(nom), maj = VALUES(maj), lg_USER_ID = VALUES(lg_USER_ID)")
                .setParameter(1, empreinte).setParameter(2, nom).setParameter(3, u.getLgUSERID()).executeUpdate();
        logService.updateLogFile(
                u, empreinte.substring(0, 8), "Nom d'appareil « " + nom + " » enregistré par " + u.getStrFIRSTNAME()
                        + " " + u.getStrLASTNAME() + " (empreinte " + empreinte.substring(0, 8) + "…)",
                TypeLog.NOM_APPAREIL, u);
        return reponse(200, new JSONObject().put("success", true).put("nom", nom));
    }

    /** Vrai si la lecture est acceptee (et alors comptee) : 30 par minute et par adresse. */
    static boolean accepterLecture(String adresse, long maintenant) {
        String cle = adresse == null ? "" : adresse;
        Deque<Long> d = LECTURES.computeIfAbsent(cle, k -> new ArrayDeque<>());
        synchronized (d) {
            while (!d.isEmpty() && d.peekFirst() <= maintenant - MINUTE) {
                d.pollFirst();
            }
            if (d.size() >= LECTURES_PAR_MINUTE) {
                return false;
            }
            d.addLast(maintenant);
        }
        if (LECTURES.size() > 10_000) {
            Iterator<Map.Entry<String, Deque<Long>>> it = LECTURES.entrySet().iterator();
            while (it.hasNext()) {
                Deque<Long> x = it.next().getValue();
                synchronized (x) {
                    if (x.isEmpty() || x.peekLast() <= maintenant - MINUTE) {
                        it.remove();
                    }
                }
            }
        }
        return true;
    }

    private static Response invalide(String msg) {
        return reponse(400, new JSONObject().put("success", false).put("code", "INVALIDE").put("msg", msg));
    }

    private static Response reponse(int statut, JSONObject o) {
        return Response.status(statut).entity(o.toString()).build();
    }
}
