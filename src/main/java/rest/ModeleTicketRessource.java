package rest;

import dal.TPrivilege;
import dal.TUser;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.imageio.ImageIO;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.ticket.ConversionTicket;
import rest.service.ticket.ExemplesTicket;
import rest.service.ticket.ModeleTicket;
import rest.service.ticket.ModeleTicketService;
import rest.service.ticket.ReglagesTicket;
import rest.service.ticket.RenduTicket;
import rest.service.ticket.TicketDocument;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;

/**
 * Menu « Modeles de ticket » (demande du 02/11) : reglages de chaque ticket de caisse, apercu dessine par le meme code
 * que l'impression, disposition des blocs controlee par le serveur (rien ne deborde, le pied reste en place ; le nom de
 * l'officine se regle comme les autres blocs), largeur du papier de chaque imprimante. Lecture pour tout utilisateur
 * connecte ; modification reservee au droit P_SM_MODELES_TICKET.
 */
@Path("v1/modeles-ticket")
@Produces("application/json")
@Consumes("application/json")
public class ModeleTicketRessource {

    private static final Logger LOG = Logger.getLogger(ModeleTicketRessource.class.getName());
    static final String DROIT = "P_SM_MODELES_TICKET";
    /** Echelle de l'apercu : 2 pixels par point. */
    static final double ECHELLE = 2;

    @EJB
    private ModeleTicketService service;

    @Context
    private HttpServletRequest servletRequest;

    private TUser connecte() {
        HttpSession s = servletRequest.getSession(false);
        Object u = s == null ? null : s.getAttribute(Constant.AIRTIME_USER);
        return u instanceof TUser ? (TUser) u : null;
    }

    @SuppressWarnings("unchecked")
    private boolean peutModifier() {
        HttpSession s = servletRequest.getSession(false);
        return s != null && CommonUtils
                .hasAuthorityByName((List<TPrivilege>) s.getAttribute(commonparameter.USER_LIST_PRIVILEGE), DROIT);
    }

    private static Response json(JSONObject j) {
        return Response.ok().entity(j.toString()).build();
    }

    private static Response refus(String msg) {
        return json(new JSONObject().put("success", false).put("msg", msg));
    }

    @GET
    public Response lire(@QueryParam("largeur") int largeur) {
        if (connecte() == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        int mm = ModeleTicketService.largeurValide(largeur == 0 ? 80 : largeur);
        JSONArray tickets = new JSONArray();
        for (Map.Entry<ModeleTicket, ReglagesTicket> e : service.tous(mm).entrySet()) {
            tickets.put(new JSONObject().put("ticket", e.getKey().name()).put("libelle", e.getKey().libelle())
                    .put("groupe", e.getKey().groupe()).put("nouveauDisponible", e.getKey().nouveauDisponible())
                    .put("reglages", e.getValue().json())
                    // retour du 05/11 : « Rétablir la disposition par défaut » reprend celle du ticket
                    .put("defaut", new ReglagesTicket(e.getKey()).json()));
        }
        JSONArray imprimantes = new JSONArray();
        for (Object[] i : service.imprimantes()) {
            imprimantes.put(new JSONObject().put("id", i[0]).put("nom", i[1]).put("largeur", i[2]));
        }
        JSONArray blocs = new JSONArray();
        for (String b : TicketDocument.ORDRE) {
            blocs.put(new JSONObject().put("id", b).put("libelle", TicketDocument.libelle(b)).put("fixe",
                    TicketDocument.FIXES.contains(b)));
        }
        return json(new JSONObject().put("success", true).put("largeur", mm).put("droit", peutModifier())
                .put("tickets", tickets).put("imprimantes", imprimantes).put("blocs", blocs)
                .put("ecartTailleMax", ReglagesTicket.ECART_TAILLE_MAX).put("largeurMin", ReglagesTicket.LARGEUR_MIN)
                .put("margeMax", ReglagesTicket.MARGE_MAX).put("polices", new JSONArray(ReglagesTicket.POLICES))
                .put("blocsCommuns", new JSONArray(ReglagesTicket.BLOCS_COMMUNS)));
    }

    /** Reglages recus de l'ecran, lus et bornes comme ceux de la base. */
    private static ReglagesTicket reglagesRecus(JSONObject corps, ModeleTicket t) {
        return ReglagesTicket.depuis(t, corps.optJSONObject("reglages"));
    }

    /**
     * Apercu de l'exemple du ticket avec les reglages en cours (non enregistres) : image, zone de chaque bloc pour le
     * deplacement a la souris, problemes bloquants et avertissements.
     */
    @POST
    @Path("apercu")
    public Response apercu(String texte) {
        if (connecte() == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        JSONObject corps = new JSONObject(texte == null || texte.isEmpty() ? "{}" : texte);
        ModeleTicket t = ModeleTicket.depuis(corps.optString("ticket"));
        if (t == null) {
            return refus("Ticket inconnu.");
        }
        int mm = ModeleTicketService.largeurValide(corps.optInt("largeur", 80));
        try {
            return json(rendu(t, mm, reglagesRecus(corps, t)).put("success", true));
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Aperçu du modèle de ticket " + t, e);
            return refus("Aperçu impossible : " + e.getMessage());
        }
    }

    private static JSONObject rendu(ModeleTicket t, int mm, ReglagesTicket r) throws java.io.IOException {
        List<String> avertissements = new ArrayList<>();
        List<String> bloquants = RenduTicket.controler(r, avertissements);
        RenduTicket.Resultat[] res = new RenduTicket.Resultat[1];
        java.awt.image.BufferedImage img = RenduTicket
                .apercu(ConversionTicket.convertir(ExemplesTicket.exemple(t, mm), r), r, mm, ECHELLE, res);
        for (String d : res[0].debordements) {
            bloquants.add("« " + d + " » dépasse de la largeur du papier.");
        }
        ByteArrayOutputStream png = new ByteArrayOutputStream();
        ImageIO.write(img, "png", png);
        JSONObject zones = new JSONObject();
        res[0].zones.forEach((id, z) -> zones.put(id, new JSONArray().put(z[0]).put(z[1])));
        JSONArray ordre = new JSONArray();
        RenduTicket.ordre(r).forEach(ordre::put);
        return new JSONObject().put("image", Base64.getEncoder().encodeToString(png.toByteArray()))
                .put("largeurImage", img.getWidth()).put("hauteurImage", img.getHeight()).put("echelle", ECHELLE)
                .put("zones", zones).put("ordre", ordre).put("bloquants", new JSONArray(bloquants))
                // plan du 06/11 point 1 : tailles dessinees du code-barres et de la date, reglees a part
                .put("pied",
                        new JSONObject().put("codeBarres", res[0].hauteurCodeBarres)
                                .put("policeDate", res[0].policeDate).put("dateDessous", res[0].dateSousCodeBarres))
                .put("avertissements", new JSONArray(avertissements));
    }

    @PUT
    public Response enregistrer(String texte) {
        TUser u = connecte();
        if (u == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        if (!peutModifier()) {
            return refus("Modification réservée aux utilisateurs qui ont le droit « Modèles de ticket ».");
        }
        JSONObject corps = new JSONObject(texte == null || texte.isEmpty() ? "{}" : texte);
        ModeleTicket t = ModeleTicket.depuis(corps.optString("ticket"));
        if (t == null) {
            return refus("Ticket inconnu.");
        }
        int mm = ModeleTicketService.largeurValide(corps.optInt("largeur", 80));
        ReglagesTicket r = reglagesRecus(corps, t);
        try {
            JSONObject rendu = rendu(t, mm, r);
            JSONArray bloquants = rendu.getJSONArray("bloquants");
            if (bloquants.length() > 0) {
                return json(new JSONObject().put("success", false).put("bloquants", bloquants).put("msg",
                        "Disposition refusée : " + bloquants.getString(0)));
            }
            int autres = service.enregistrerAvecCommuns(r, mm, u.getStrLOGIN());
            return json(new JSONObject().put("success", true)
                    .put("msg",
                            "Modèle « " + t.libelle() + " » (" + mm + " mm) enregistré"
                                    + (autres > 0 ? " ; réglages communs reportés sur " + autres + " autre"
                                            + (autres > 1 ? "s tickets" : " ticket") : "")
                                    + ".")
                    .put("autres", autres).put("reglages", r.json()));
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Enregistrement du modèle de ticket " + t, e);
            return refus("Enregistrement impossible : " + e.getMessage());
        }
    }

    /** Retour du 05/11 : fichier des reglages de tous les tickets (80 et 58 mm), a importer sur un autre poste. */
    @GET
    @Path("export")
    public Response exporter() {
        if (connecte() == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        return Response.ok().entity(service.exporter().toString(2))
                .header("Content-Disposition", "attachment; filename=\"modeles-ticket.json\"").build();
    }

    /**
     * Retour du 05/11 : reprend un fichier exporte. Chaque ticket est controle comme a l'enregistrement ; un seul
     * ticket refuse et rien n'est ecrit.
     */
    @POST
    @Path("import")
    public Response importer(String texte) {
        TUser u = connecte();
        if (u == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        if (!peutModifier()) {
            return refus("Modification réservée aux utilisateurs qui ont le droit « Modèles de ticket ».");
        }
        JSONObject fichier;
        try {
            fichier = new JSONObject(texte == null || texte.isEmpty() ? "{}" : texte);
        } catch (RuntimeException e) {
            return refus("Fichier illisible : ce n'est pas un export des modèles de ticket.");
        }
        JSONObject largeurs = fichier.optJSONObject("largeurs");
        if (!ModeleTicketService.FORMAT_EXPORT.equals(fichier.optString("format")) || largeurs == null) {
            return refus("Fichier illisible : ce n'est pas un export des modèles de ticket.");
        }
        List<Object[]> lus = new ArrayList<>();
        try {
            for (String l : largeurs.keySet()) {
                int mm = ModeleTicketService.largeurValide(Integer.parseInt(l));
                JSONObject tickets = largeurs.getJSONObject(l);
                for (String nom : tickets.keySet()) {
                    ModeleTicket t = ModeleTicket.depuis(nom);
                    if (t == null) {
                        continue;
                    }
                    ReglagesTicket r = ReglagesTicket.depuis(t, tickets.getJSONObject(nom));
                    JSONArray bloquants = rendu(t, mm, r).getJSONArray("bloquants");
                    if (bloquants.length() > 0) {
                        return refus(
                                "Import refusé (« " + t.libelle() + " », " + mm + " mm) : " + bloquants.getString(0));
                    }
                    lus.add(new Object[] { r, mm });
                }
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Import des modèles de ticket", e);
            return refus("Import impossible : " + e.getMessage());
        }
        for (Object[] o : lus) {
            service.enregistrer((ReglagesTicket) o[0], (Integer) o[1], u.getStrLOGIN());
        }
        return json(new JSONObject().put("success", true).put("importes", lus.size()).put("msg", lus.size() + " réglage"
                + (lus.size() > 1 ? "s" : "") + " de ticket importé" + (lus.size() > 1 ? "s" : "") + "."));
    }

    @POST
    @Path("ancien-partout")
    public Response ancienPartout() {
        TUser u = connecte();
        if (u == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        if (!peutModifier()) {
            return refus("Modification réservée aux utilisateurs qui ont le droit « Modèles de ticket ».");
        }
        service.ancienPartout(u.getStrLOGIN());
        return json(new JSONObject().put("success", true).put("msg",
                "Ancien modèle rétabli pour tous les tickets, sur toutes les caisses."));
    }

    @PUT
    @Path("imprimante")
    public Response largeurImprimante(String texte) {
        if (connecte() == null) {
            return refus(Constant.DECONNECTED_MESSAGE);
        }
        if (!peutModifier()) {
            return refus("Modification réservée aux utilisateurs qui ont le droit « Modèles de ticket ».");
        }
        JSONObject corps = new JSONObject(texte == null || texte.isEmpty() ? "{}" : texte);
        int mm = corps.optInt("largeur", 0);
        if (mm != 58 && mm != 80) {
            return refus("Largeur possible : 80 ou 58 mm.");
        }
        if (!service.changerLargeur(corps.optString("id"), mm)) {
            return refus("Imprimante introuvable.");
        }
        return json(new JSONObject().put("success", true).put("msg", "Largeur du papier : " + mm + " mm."));
    }
}
