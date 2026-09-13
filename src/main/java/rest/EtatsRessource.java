package rest;

import java.util.List;

import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;

import org.json.JSONArray;
import org.json.JSONObject;

import rest.report.InventaireEtats;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 * Inventaire des etats d'impression installes sur la machine.
 *
 * <p>
 * Un etat reference par le code mais absent du serveur ne se voit qu'au moment ou l'utilisateur clique et recoit un
 * 404. Ce point d'entree repond d'un coup, sur la machine ou l'application tourne : ce qui est en place, ce qui manque,
 * et donc quelle edition tombera en panne avant que quiconque l'essaie.
 * </p>
 */
@Path("v1/etats")
@Produces("application/json")
public class EtatsRessource {

    @Inject
    private HttpServletRequest servletRequest;

    @GET
    @Path("inventaire")
    public Response inventaire(@QueryParam("manquants") Boolean manquantsSeulement) {
        HttpSession hs = servletRequest.getSession();
        if (hs.getAttribute(commonparameter.AIRTIME_USER) == null) {
            return Response.ok().entity(
                    new JSONObject().put("success", false).put("message", Constant.DECONNECTED_MESSAGE).toString())
                    .build();
        }
        List<InventaireEtats.Etat> etats = InventaireEtats.inventaire();
        boolean filtrer = Boolean.TRUE.equals(manquantsSeulement);
        JSONArray lignes = new JSONArray();
        int absents = 0, prefixes = 0;
        for (InventaireEtats.Etat etat : etats) {
            if ("ABSENT".equals(etat.getOrigine())) {
                absents++;
            } else if ("PREFIXE".equals(etat.getOrigine())) {
                prefixes++;
            }
            if (!filtrer || "ABSENT".equals(etat.getOrigine())) {
                lignes.put(new JSONObject().put("nom", etat.getNom()).put("origine", etat.getOrigine())
                        .put("disponible", etat.isDisponible()));
            }
        }
        return Response.ok().entity(new JSONObject().put("success", true).put("total", etats.size())
                .put("absents", absents).put("prefixes", prefixes)
                .put("repertoire", String.valueOf(toolkits.utils.jdom.scr_report_file)).put("data", lignes).toString())
                .build();
    }
}
