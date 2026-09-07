package rest;

import dal.TUser;
import java.util.List;
import java.util.Map;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.report.ReportUtil;
import rest.service.AnalyseTiersPayantService;
import rest.service.SuggestionService;
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
    @EJB
    private ReportUtil reportUtil;

    @EJB
    private SuggestionService suggestionService;

    @GET
    @Path("tiers-payants")
    public Response parTiersPayant(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @QueryParam("query") String recherche, @QueryParam("tri") String tri,
            @QueryParam("groupeId") String groupeId) {
        if (utilisateur() == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        return reponse(analyseTiersPayantService.parTiersPayant(dtStart, dtEnd, recherche, tri, groupeId));
    }

    @GET
    @Path("produits")
    public Response parProduit(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @QueryParam("tiersPayantId") String tiersPayantId, @QueryParam("query") String recherche,
            @QueryParam("tri") String tri, @QueryParam("groupeId") String groupeId) {
        if (utilisateur() == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        return reponse(analyseTiersPayantService.parProduit(dtStart, dtEnd, tiersPayantId, recherche, tri, groupeId));
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
            @QueryParam("niveau") String niveau, @QueryParam("tri") String tri,
            @QueryParam("groupeId") String groupeId) {
        if (utilisateur() == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        boolean parProduit = "PRODUIT".equalsIgnoreCase(niveau);
        List<AnalyseTiersPayantDTO> lignes = parProduit
                ? analyseTiersPayantService.parProduit(dtStart, dtEnd, tiersPayantId, recherche, tri, groupeId)
                : analyseTiersPayantService.parTiersPayant(dtStart, dtEnd, recherche, tri, groupeId);
        String contenu = csv(lignes, parProduit);
        return Response.ok(contenu)
                .header("Content-Disposition",
                        "attachment; filename=\"analyse_tiers_payants" + (parProduit ? "_produits" : "") + ".csv\"")
                .build();
    }

    /**
     * Export Excel de l'analyse affichee (point 5). Le CSV existant est conserve : certains postes l'ouvrent
     * directement dans un tableur configure en francais. Le classeur, lui, garde les montants comme des nombres et
     * reste exploitable par les calculs.
     */
    @GET
    @Path("excel")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response excel(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @QueryParam("tiersPayantId") String tiersPayantId, @QueryParam("query") String recherche,
            @QueryParam("niveau") String niveau, @QueryParam("tri") String tri, @QueryParam("groupeId") String groupeId)
            throws java.io.IOException {
        if (utilisateur() == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        boolean parProduit = "PRODUIT".equalsIgnoreCase(niveau);
        List<AnalyseTiersPayantDTO> lignes = parProduit
                ? analyseTiersPayantService.parProduit(dtStart, dtEnd, tiersPayantId, recherche, tri, groupeId)
                : analyseTiersPayantService.parTiersPayant(dtStart, dtEnd, recherche, tri, groupeId);
        String[] periode = analyseTiersPayantService.periodeRetenue(dtStart, dtEnd);
        rest.report.excel.ClasseurExcel<AnalyseTiersPayantDTO> classeur = new rest.report.excel.ClasseurExcel<AnalyseTiersPayantDTO>(
                parProduit ? "Par produit" : "Par tiers payant")
                        .titre(parProduit ? "ANALYSE TIERS PAYANTS - DÉTAIL PAR PRODUIT"
                                : "ANALYSE TIERS PAYANTS - SYNTHÈSE PAR TIERS PAYANT")
                        .critere("Période", periode[0] + " au " + periode[1]).critere("Recherche", recherche)
                        .critere("Tiers payant", parProduit ? nomTiersPayant(dtStart, dtEnd, tiersPayantId) : "");
        if (parProduit) {
            classeur.texte("CIP", AnalyseTiersPayantDTO::getCip).texte("Désignation",
                    AnalyseTiersPayantDTO::getDesignation);
        } else {
            classeur.texte("Tiers payant", AnalyseTiersPayantDTO::getTiersPayant);
        }
        classeur.nombre("Nb ventes", AnalyseTiersPayantDTO::getNbVentes)
                .nombre("Quantité", AnalyseTiersPayantDTO::getQuantite)
                .nombre("CA TTC", AnalyseTiersPayantDTO::getCaTtc).nombre("CA HT", AnalyseTiersPayantDTO::getCaHt)
                .nombre("Montant achat", AnalyseTiersPayantDTO::getMontantAchat)
                .nombre("Marge", AnalyseTiersPayantDTO::getMarge);
        if (!parProduit) {
            classeur.nombre("Part tiers payant", AnalyseTiersPayantDTO::getPartTiersPayant);
        }
        byte[] contenu = classeur.construire(lignes);
        return rest.report.excel.NomFichierExport.reponse(contenu,
                parProduit ? "analyse_tiers_payants_produits" : "analyse_tiers_payants");
    }

    /**
     * Cree une suggestion de commande a partir des produits du resultat COURANT (point 5) : la liste filtree au moment
     * du clic, et non l'ensemble des produits. Rend le nombre de produits reellement integres, que l'ecran affiche en
     * confirmation.
     *
     * <p>
     * Un produit sans grossiste par defaut ne peut pas etre commande : il est ecarte, et l'ecart entre le resultat
     * affiche et le nombre integre est signale a l'utilisateur.
     */
    @GET
    @Path("suggestion")
    public Response suggestion(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @QueryParam("tiersPayantId") String tiersPayantId, @QueryParam("query") String recherche,
            @QueryParam("tri") String tri, @QueryParam("groupeId") String groupeId) throws JSONException {
        TUser user = utilisateur();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        List<AnalyseTiersPayantDTO> lignes = analyseTiersPayantService.parProduit(dtStart, dtEnd, tiersPayantId,
                recherche, tri, groupeId);
        if (lignes.isEmpty()) {
            return Response.ok().entity(new JSONObject().put("success", false)
                    .put("msg", "Aucun produit dans le résultat courant : la suggestion n'a pas été créée.").toString())
                    .build();
        }
        java.util.Set<String> produitIds = new java.util.LinkedHashSet<>();
        lignes.forEach(l -> {
            if (StringUtils.isNotBlank(l.getProduitId())) {
                produitIds.add(l.getProduitId());
            }
        });
        List<commonTasks.dto.ArticleDTO> articles = new java.util.ArrayList<>();
        for (String id : produitIds) {
            dal.TFamille famille = analyseTiersPayantService.produit(id);
            if (famille == null || famille.getLgGROSSISTEID() == null) {
                continue;
            }
            commonTasks.dto.ArticleDTO article = new commonTasks.dto.ArticleDTO();
            article.setId(famille.getLgFAMILLEID());
            article.setGrossisteId(famille.getLgGROSSISTEID().getLgGROSSISTEID());
            articles.add(article);
        }
        if (articles.isEmpty()) {
            return Response.ok()
                    .entity(new JSONObject().put("success", false)
                            .put("msg",
                                    "Aucun des " + produitIds.size()
                                            + " produits du résultat n'a de grossiste par défaut : "
                                            + "la suggestion n'a pas été créée.")
                            .toString())
                    .build();
        }
        JSONObject resultat = suggestionService.makeSuggestionFromArticleInvendus(articles, user);
        resultat.put("produitsDuResultat", produitIds.size());
        resultat.put("produitsCommandables", articles.size());
        return Response.ok().entity(resultat.toString()).build();
    }

    /**
     * Edition PDF de l'analyse affichee, dans le meme decoupage que l'ecran : un etat par niveau. Les modeles
     * analyse_tiers_payant.jrxml et analyse_tiers_payant_produit.jrxml sont embarques dans l'application, il n'y a rien
     * a deposer dans le repertoire des rapports de l'officine.
     *
     * @return l'URL du PDF genere, que l'ecran ouvre dans un onglet.
     */
    @GET
    @Path("print")
    public Response imprimer(@QueryParam("dtStart") String dtStart, @QueryParam("dtEnd") String dtEnd,
            @QueryParam("tiersPayantId") String tiersPayantId, @QueryParam("query") String recherche,
            @QueryParam("niveau") String niveau, @QueryParam("tri") String tri,
            @QueryParam("groupeId") String groupeId) {
        TUser user = utilisateur();
        if (user == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        boolean parProduit = "PRODUIT".equalsIgnoreCase(niveau);
        List<AnalyseTiersPayantDTO> lignes = parProduit
                ? analyseTiersPayantService.parProduit(dtStart, dtEnd, tiersPayantId, recherche, tri, groupeId)
                : analyseTiersPayantService.parTiersPayant(dtStart, dtEnd, recherche, tri, groupeId);

        Map<String, Object> parametres = reportUtil.officineData(user);
        // Mise en forme des nombres : 1.234,56, la convention deja utilisee par les ecrans
        // (Ext.util.Format.thousandSeparator = '.'). Sans locale explicite, JasperReports suit celle du
        // serveur et ecrit « 307,440 », qui se lit 307,44 sur un etat francophone.
        // La locale francaise n'irait pas : son separateur de milliers est l'espace insecable, que
        // l'export PDF laisse tomber — les montants sortaient collos, « 307440 ». Verifie sur le banc.
        parametres.put(net.sf.jasperreports.engine.JRParameter.REPORT_LOCALE, java.util.Locale.GERMANY);
        parametres.put("P_H_CLT_INFOS", parProduit ? "ANALYSE TIERS PAYANTS - DETAIL PAR PRODUIT"
                : "ANALYSE TIERS PAYANTS - SYNTHESE PAR TIERS PAYANT");
        parametres.put("P_PERIODE", sousTitre(analyseTiersPayantService.periodeRetenue(dtStart, dtEnd),
                parProduit ? nomTiersPayant(dtStart, dtEnd, tiersPayantId) : "", recherche, lignes.size()));
        String url = reportUtil.buildReport(parametres,
                parProduit ? "analyse_tiers_payant_produit" : "analyse_tiers_payant", lignes);
        // buildReport journalise ses echecs mais rend l'URL dans tous les cas : sans ce controle, un modele
        // illisible ou un repertoire d'etats mal configure ouvrirait un onglet vide, sans rien expliquer.
        if (!fichierProduit(url)) {
            return Response.ok().entity(
                    ResultFactory.getFailResult("Le PDF n'a pas pu être généré. Vérifiez le journal du serveur."))
                    .build();
        }
        return Response.ok().entity(ResultFactory.getSuccessResultMsg(url)).build();
    }

    /** Le fichier annonce par l'URL existe-t-il reellement sur le disque ? */
    private boolean fichierProduit(String url) {
        if (StringUtils.isBlank(url)) {
            return false;
        }
        String nom = url.substring(url.lastIndexOf('/') + 1);
        return new java.io.File(reportUtil.getReportDirectory(nom)).isFile();
    }

    /**
     * Sous-titre de l'etat : il doit permettre de savoir, papier en main, ce qui a ete demande — sans quoi deux
     * impressions de periodes differentes sont impossibles a distinguer.
     */
    static String sousTitre(String[] periode, String tiersPayant, String recherche, int nbLignes) {
        StringBuilder sb = new StringBuilder("Du ").append(jour(periode[0])).append(" au ").append(jour(periode[1]));
        if (StringUtils.isNotBlank(tiersPayant)) {
            sb.append("   |   Tiers payant : ").append(tiersPayant.trim());
        }
        if (StringUtils.isNotBlank(recherche)) {
            sb.append("   |   Filtre : ").append(recherche.trim());
        }
        sb.append("   |   ").append(nbLignes).append(nbLignes > 1 ? " lignes" : " ligne");
        return sb.toString();
    }

    /** aaaa-mm-jj vers jj/mm/aaaa : la date se lit comme sur l'ecran. */
    private static String jour(String iso) {
        if (iso == null || iso.length() != 10) {
            return StringUtils.trimToEmpty(iso);
        }
        return iso.substring(8, 10) + "/" + iso.substring(5, 7) + "/" + iso.substring(0, 4);
    }

    /**
     * Nom du tiers payant retenu pour l'etat produit. Les lignes produits ne le portent pas : on le relit dans la liste
     * des tiers payants de LA MEME periode — la relire sur une autre periode ramenerait une liste ou le tiers payant
     * demande n'apparait pas, et l'etat afficherait son identifiant technique. Sans identifiant, l'etat couvre tous les
     * tiers payants.
     */
    private String nomTiersPayant(String dtStart, String dtEnd, String tiersPayantId) {
        if (StringUtils.isBlank(tiersPayantId)) {
            return "tous";
        }
        // On ne cherche qu'un libelle dans la liste : ni l'ordre ni le filtre de groupe n'ont
        // d'importance ici, le tiers payant est deja designe par son identifiant.
        for (AnalyseTiersPayantDTO ligne : analyseTiersPayantService.parTiersPayant(dtStart, dtEnd, null, null, null)) {
            if (tiersPayantId.equals(ligne.getTiersPayantId())) {
                return ligne.getTiersPayant();
            }
        }
        return tiersPayantId;
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
