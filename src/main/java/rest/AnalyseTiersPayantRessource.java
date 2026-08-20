package rest;

import dal.TUser;
import java.util.List;
import javax.ejb.EJB;
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
import rest.service.AnalyseTiersPayantService;
import rest.service.dto.AnalyseTiersPayantDTO;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 * Analyse des tiers payants : quantite, chiffre d'affaires et marge par tiers payant et par produit, sur une periode.
 *
 * @author koben
 */
@Path("v1/analyse-tierspayant")
@Produces("application/json")
public class AnalyseTiersPayantRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private AnalyseTiersPayantService analyseTiersPayantService;

    @GET
    @Path("tiers-payants")
    public Response parTiersPayant(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @QueryParam("query") String recherche) {
        if (utilisateur() == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        return reponse(analyseTiersPayantService.parTiersPayant(dtStart, dtEnd, recherche));
    }

    @GET
    @Path("produits")
    public Response parProduit(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @QueryParam("tiersPayantId") String tiersPayantId, @QueryParam("query") String recherche) {
        if (utilisateur() == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        return reponse(analyseTiersPayantService.parProduit(dtStart, dtEnd, tiersPayantId, recherche));
    }

    /**
     * Export CSV de l'analyse, dans le meme format que celui affiche a l'ecran. Le point-virgule est le separateur
     * attendu par les tableurs configures en francais.
     */
    @GET
    @Path("csv")
    @Produces("text/csv")
    public Response csv(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @QueryParam("tiersPayantId") String tiersPayantId, @QueryParam("query") String recherche,
            @QueryParam("niveau") String niveau) {
        if (utilisateur() == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        boolean parProduit = "PRODUIT".equalsIgnoreCase(niveau);
        List<AnalyseTiersPayantDTO> lignes = parProduit
                ? analyseTiersPayantService.parProduit(dtStart, dtEnd, tiersPayantId, recherche)
                : analyseTiersPayantService.parTiersPayant(dtStart, dtEnd, recherche);
        String contenu = csv(lignes, parProduit);
        return Response.ok(contenu)
                .header("Content-Disposition",
                        "attachment; filename=\"analyse_tiers_payants" + (parProduit ? "_produits" : "") + ".csv\"")
                .build();
    }

    static String csv(List<AnalyseTiersPayantDTO> lignes, boolean parProduit) {
        StringBuilder sb = new StringBuilder();
        if (parProduit) {
            sb.append("CIP;DESIGNATION;QUANTITE;CA TTC;CA HT;ACHAT;MARGE;MARGE/CA HT (%)\n");
        } else {
            sb.append("TIERS PAYANT;VENTES;QUANTITE;CA TTC;PART TIERS PAYANT;PART CLIENT;CA HT;ACHAT;MARGE;"
                    + "MARGE/CA HT (%)\n");
        }
        for (AnalyseTiersPayantDTO l : lignes) {
            if (parProduit) {
                sb.append(champ(l.getCip())).append(';').append(champ(l.getDesignation())).append(';')
                        .append(l.getQuantite()).append(';').append(l.getCaTtc()).append(';').append(l.getCaHt())
                        .append(';').append(l.getMontantAchat()).append(';').append(l.getMarge()).append(';')
                        .append(nombre(l.getTauxMarge())).append('\n');
            } else {
                sb.append(champ(l.getTiersPayant())).append(';').append(l.getNbVentes()).append(';')
                        .append(l.getQuantite()).append(';').append(l.getCaTtc()).append(';')
                        .append(l.getPartTiersPayant()).append(';').append(l.getPartClient()).append(';')
                        .append(l.getCaHt()).append(';').append(l.getMontantAchat()).append(';').append(l.getMarge())
                        .append(';').append(nombre(l.getTauxMarge())).append('\n');
            }
        }
        return sb.toString();
    }

    /** Un libelle contenant le separateur ou un guillemet casserait les colonnes du tableur. */
    static String champ(String valeur) {
        String v = valeur == null ? "" : valeur;
        if (v.indexOf(';') < 0 && v.indexOf('"') < 0 && v.indexOf('\n') < 0) {
            return v;
        }
        return '"' + v.replace("\"", "\"\"") + '"';
    }

    /** Virgule decimale : c'est ce qu'attend un tableur configure en francais. */
    static String nombre(double valeur) {
        return String.valueOf(valeur).replace('.', ',');
    }

    private Response reponse(List<AnalyseTiersPayantDTO> lignes) {
        JSONObject json = new JSONObject().put("total", lignes.size()).put("data", new JSONArray(lignes));
        return Response.ok().entity(json.toString()).build();
    }

    private TUser utilisateur() {
        HttpSession session = servletRequest.getSession();
        return (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    }
}
