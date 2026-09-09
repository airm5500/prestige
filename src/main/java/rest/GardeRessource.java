package rest;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.DefaultValue;
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

import commonTasks.dto.GardeCommandeDTO;
import commonTasks.dto.GardeKpiDTO;
import commonTasks.dto.GardeVendeurDTO;
import commonTasks.dto.GardeProduitDTO;
import commonTasks.dto.GardeTrancheDTO;
import dal.Garde;
import dal.TUser;
import rest.report.ReportUtil;
import rest.service.GardeService;
import rest.service.InventaireService;
import rest.service.SuggestionService;
import rest.service.impl.AnalyseGarde;
import rest.service.utils.ReportExcelExportService;
import util.Constant;

/**
 * Les gardes : periodes d'activite nommees, et les deux analyses qu'aucun ecran existant ne sait produire.
 *
 * <p>
 * La garde ne reconstruit pas les etats de gestion de l'officine. Le chiffre d'affaires par type de vente, les
 * reglements, les articles vendus sont deja affiches ailleurs : la garde leur transmet sa periode plutot que de
 * reconstruire des etats concurrents qui finiraient par diverger. Ce qui est calcule ici, et seulement ici, c'est la
 * repartition par tranche horaire et la classification ABC sur la fenetre horaire EXACTE de la garde.
 * </p>
 */
@Path("v1/gardes")
@Produces("application/json")
@Consumes("application/json")
public class GardeRessource {

    private static final Logger LOG = Logger.getLogger(GardeRessource.class.getName());

    private static final DateTimeFormatter SAISIE = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final DateTimeFormatter AFFICHE = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter JOUR = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter HEURE = DateTimeFormatter.ofPattern("HH:mm");

    private static final String[] ENTETES_ABC = { "Classe", "CIP", "Produit", "Quantité", "Stock", "Montant", "Marge",
            "Taux marge %", "Part %", "Cumul %" };
    // Retour du 08/09 : par tranche, le nombre de clients (ventes distinctes) et le chiffre d'affaires ;
    // la quantite d'unites n'y apporte rien.
    private static final String[] ENTETES_TRANCHES = { "Tranche", "Clients", "Chiffre d'affaires" };

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private GardeService gardeService;
    @EJB
    private ReportUtil reportUtil;
    @EJB
    private ReportExcelExportService reportExcelExportService;
    @EJB
    private InventaireService inventaireService;
    @EJB
    private SuggestionService suggestionService;

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    private static Response echec(String message) {
        return Response.ok().entity(new JSONObject().put("success", false).put("msg", message).toString()).build();
    }

    /**
     * Lit une date-heure saisie par l'ecran.
     *
     * <p>
     * Les deux formes sont acceptees, avec ou sans les secondes : l'ecran envoie « 2026-09-05 20:00 », un appel direct
     * a l'API ecrit naturellement la forme complete.
     * </p>
     */
    private static LocalDateTime instant(String valeur) {
        String brut = StringUtils.trimToEmpty(valeur);
        if (brut.isEmpty()) {
            return null;
        }
        try {
            return LocalDateTime.parse(brut, brut.length() > 16 ? AFFICHE : SAISIE);
        } catch (DateTimeParseException e) {
            try {
                return LocalDateTime.parse(brut.replace(' ', 'T'));
            } catch (DateTimeParseException ignore) {
                return null;
            }
        }
    }

    private static JSONObject json(Garde g) {
        return new JSONObject().put("id", g.getId()).put("libelle", StringUtils.defaultString(g.getLibelle()))
                .put("dateDebut", g.getDateDebut() != null ? g.getDateDebut().format(AFFICHE) : "")
                .put("dateFin", g.getDateFin() != null ? g.getDateFin().format(AFFICHE) : "")
                // Les ecrans qui ne connaissent que des dates ou des heures separees lisent ces
                // quatre champs sans avoir a decouper eux-memes la date-heure.
                .put("jourDebut", g.getDateDebut() != null ? g.getDateDebut().format(JOUR) : "")
                .put("heureDebut", g.getDateDebut() != null ? g.getDateDebut().format(HEURE) : "")
                .put("jourFin", g.getDateFin() != null ? g.getDateFin().format(JOUR) : "")
                .put("heureFin", g.getDateFin() != null ? g.getDateFin().format(HEURE) : "")
                .put("dureeMinutes", g.dureeMinutes()).put("duree", dureeLisible(g.dureeMinutes()));
    }

    /** « 12 h 30 » plutot que « 750 minutes » : c'est ainsi qu'on parle d'une garde. */
    private static String dureeLisible(long minutes) {
        if (minutes <= 0) {
            return "";
        }
        long heures = minutes / 60;
        long reste = minutes % 60;
        return reste == 0 ? heures + " h" : heures + " h " + String.format("%02d", reste);
    }

    /**
     * Les gardes, de la plus recente a la plus ancienne.
     *
     * @param annee
     *            filtre sur l'annee de debut (retour du 08/09) ; absent ou non numerique : toutes
     */
    @GET
    public Response lister(@QueryParam("annee") String annee) {
        Integer an = null;
        if (StringUtils.isNumeric(StringUtils.trimToEmpty(annee))) {
            an = Integer.valueOf(annee.trim());
        }
        JSONArray data = new JSONArray();
        for (Garde g : gardeService.lister(an)) {
            data.put(json(g));
        }
        return Response.ok()
                .entity(new JSONObject().put("success", true).put("total", data.length()).put("data", data).toString())
                .build();
    }

    /** Les annees pour lesquelles au moins une garde existe : alimente le filtre de l'ecran. */
    @GET
    @Path("annees")
    public Response annees() {
        JSONArray data = new JSONArray();
        for (Integer an : gardeService.annees()) {
            data.put(new JSONObject().put("annee", an).put("libelle", String.valueOf(an)));
        }
        return Response.ok()
                .entity(new JSONObject().put("success", true).put("total", data.length()).put("data", data).toString())
                .build();
    }

    /**
     * Suppression de plusieurs gardes cochees (retour du 08/09).
     *
     * @param ids
     *            identifiants separes par des virgules
     */
    @POST
    @Path("supprimer")
    @Consumes("application/x-www-form-urlencoded")
    public Response supprimerPlusieurs(@javax.ws.rs.FormParam("ids") String ids) {
        if (utilisateur() == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        List<String> liste = new ArrayList<>();
        for (String id : StringUtils.defaultString(ids).split(",")) {
            if (StringUtils.isNotBlank(id)) {
                liste.add(id.trim());
            }
        }
        if (liste.isEmpty()) {
            return echec("Cochez au moins une garde.");
        }
        try {
            int nombre = gardeService.supprimer(liste);
            if (nombre == 0) {
                return echec("Ces gardes n'existent plus.");
            }
            return Response.ok().entity(new JSONObject().put("success", true).put("total", nombre)
                    .put("msg", nombre + " garde(s) supprimée(s).").toString()).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "suppression de plusieurs gardes", e);
            return echec("Les gardes n'ont pas pu être supprimées.");
        }
    }

    @POST
    @Consumes("application/x-www-form-urlencoded")
    public Response enregistrer(@javax.ws.rs.FormParam("id") String id,
            @javax.ws.rs.FormParam("libelle") String libelle, @javax.ws.rs.FormParam("dateDebut") String dateDebut,
            @javax.ws.rs.FormParam("dateFin") String dateFin) {
        if (utilisateur() == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        LocalDateTime debut = instant(dateDebut);
        LocalDateTime fin = instant(dateFin);
        if (debut == null || fin == null) {
            return echec("Renseignez la date et l'heure de début et de fin.");
        }
        try {
            Garde garde = gardeService.enregistrer(id, libelle, debut, fin);
            return Response.ok().entity(new JSONObject().put("success", true).put("data", json(garde))
                    .put("msg", "Garde enregistrée.").toString()).build();
        } catch (rest.service.SaisieRefusee e) {
            // Saisie refusee : le message est deja redige pour l'utilisateur.
            return echec(e.getMessage());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "enregistrement d'une garde", e);
            return echec("La garde n'a pas pu être enregistrée.");
        }
    }

    @DELETE
    @Path("{id}")
    public Response supprimer(@PathParam("id") String id) {
        if (utilisateur() == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        try {
            // Supprimer une garde ne supprime aucune vente : seule la definition de la periode part.
            if (!gardeService.supprimer(id)) {
                return echec("Cette garde n'existe plus.");
            }
            return Response.ok().entity(new JSONObject().put("success", true).put("msg", "Garde supprimée.").toString())
                    .build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "suppression d'une garde", e);
            return echec("La garde n'a pas pu être supprimée.");
        }
    }

    private static JSONObject indicateursJson(AnalyseGarde.Indicateurs i) {
        return new JSONObject().put("ventes", i.getVentes()).put("lignes", i.getLignes())
                .put("produitsDistincts", i.getProduitsDistincts()).put("quantite", i.getQuantite())
                .put("montant", i.getMontant()).put("marge", i.getMarge()).put("tauxMarge", arrondi(i.getTauxMarge()))
                .put("dureeMinutes", i.getDureeMinutes()).put("montantParHeure", i.getMontantParHeure());
    }

    /**
     * Le rapport d'une garde : indicateurs, tranches horaires et classification ABC.
     *
     * @param heures
     *            largeur d'une tranche horaire
     * @param classe
     *            classe ABC affichee (A, B, C) ; vide : toutes
     * @param tri
     *            ordre des produits : montant (defaut), quantite ou marge
     * @param limite
     *            N premiers produits rendus ; zero ou negatif : tous
     */
    @GET
    @Path("{id}/rapport")
    public Response rapport(@PathParam("id") String id, @DefaultValue("2") @QueryParam("heures") int heures,
            @DefaultValue("") @QueryParam("classe") String classe,
            @DefaultValue("montant") @QueryParam("tri") String tri, @DefaultValue("0") @QueryParam("limite") int limite,
            // Retour des tests du 09/09 : filtres famille / rayon / grossiste et pagination des produits.
            @DefaultValue("") @QueryParam("famille") String famille,
            @DefaultValue("") @QueryParam("rayon") String rayon,
            @DefaultValue("") @QueryParam("grossiste") String grossiste,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("0") @QueryParam("limit") int limit,
            // Retour des tests du 09/09 : filtres numeriques combinables sur le stock, la quantite vendue, le % de
            // marge.
            @DefaultValue("") @QueryParam("stockOp") String stockOp,
            @DefaultValue("") @QueryParam("stockVal") String stockVal,
            @DefaultValue("") @QueryParam("qteOp") String qteOp, @DefaultValue("") @QueryParam("qteVal") String qteVal,
            @DefaultValue("") @QueryParam("margeOp") String margeOp,
            @DefaultValue("") @QueryParam("margeVal") String margeVal) {
        Garde garde = gardeService.parId(id);
        if (garde == null) {
            return echec("Cette garde n'existe plus.");
        }
        JSONArray tranches = new JSONArray();
        for (GardeTrancheDTO t : gardeService.tranches(garde, heures)) {
            tranches.put(trancheJson(t));
        }
        // Le classement est calcule une fois sur tous les produits ; le resume porte sur l'ensemble,
        // la liste rendue est la vue filtree et triee demandee par l'ecran.
        List<GardeProduitDTO> classement = gardeService.abc(garde);
        List<GardeProduitDTO> filtres = AnalyseGarde.filtrer(classement, classe, AnalyseGarde.TriProduits.depuis(tri),
                limite, famille, rayon, grossiste, criteres(stockOp, stockVal, qteOp, qteVal, margeOp, margeVal));
        // La page demandee (start / limit) ; sans limite, toute la vue filtree.
        int debut = Math.max(0, Math.min(start, filtres.size()));
        int fin = limit > 0 ? Math.min(filtres.size(), debut + limit) : filtres.size();
        JSONArray abc = new JSONArray();
        for (GardeProduitDTO p : filtres.subList(debut, fin)) {
            abc.put(produitJson(p));
        }
        return Response.ok()
                .entity(new JSONObject().put("success", true).put("garde", json(garde))
                        .put("indicateurs", indicateursJson(gardeService.indicateurs(garde))).put("tranches", tranches)
                        .put("kpi", kpiJson(gardeService.kpi(garde))).put("abc", abc).put("totalAbc", classement.size())
                        .put("totalFiltre", filtres.size()).put("resumeAbc", resumeAbc(classement)).toString())
                .build();
    }

    private static JSONObject trancheJson(GardeTrancheDTO t) {
        return new JSONObject().put("libelle", t.getLibelle()).put("heureDuJour", t.getHeureDuJour())
                .put("ventes", t.getVentes()).put("clients", t.getClients()).put("quantite", t.getQuantite())
                .put("montant", t.getMontant()).put("heuresCouvertes", t.getHeuresCouvertes())
                .put("clientsParHeure", arrondi(t.getClientsParHeure()));
    }

    /** Les indicateurs reels (H2), a plat : la grille de comparaison les lit tels quels. */
    private static JSONObject kpiJson(GardeKpiDTO k) {
        return new JSONObject().put("ventes", k.getVentes()).put("clients", k.getClients())
                .put("montant", k.getMontant()).put("marge", k.getMarge()).put("tauxMarge", arrondi(k.getTauxMarge()))
                .put("montantParHeure", k.getMontantParHeure()).put("dureeMinutes", k.getDureeMinutes())
                .put("rates", k.getRates()).put("clientsCredit", k.getClientsCredit())
                .put("montantCredit", k.getMontantCredit()).put("caEspeces", k.getCaEspeces())
                .put("caMobile", k.getCaMobile()).put("caCheque", k.getCaCheque()).put("caCarte", k.getCaCarte())
                .put("caDiffere", k.getCaDiffere()).put("caAutres", k.getCaAutres());
    }

    private static List<AnalyseGarde.CritereNumerique> criteres(String stockOp, String stockVal, String qteOp,
            String qteVal, String margeOp, String margeVal) {
        List<AnalyseGarde.CritereNumerique> liste = new ArrayList<>();
        liste.add(AnalyseGarde.CritereNumerique.depuis("stock", stockOp, stockVal));
        liste.add(AnalyseGarde.CritereNumerique.depuis("quantite", qteOp, qteVal));
        liste.add(AnalyseGarde.CritereNumerique.depuis("tauxMarge", margeOp, margeVal));
        return liste;
    }

    /** Les vendeurs en JSON, avec la part de chacun dans le chiffre total (retour des tests du 09/09). */
    private static JSONArray vendeursJson(List<GardeVendeurDTO> vendeurs) {
        long total = 0L;
        for (GardeVendeurDTO v : vendeurs) {
            total += v.getMontant();
        }
        JSONArray data = new JSONArray();
        for (GardeVendeurDTO v : vendeurs) {
            data.put(vendeurJson(v).put("part", total == 0 ? 0D : arrondi(v.getMontant() * 100D / total)));
        }
        return data;
    }

    private static JSONObject vendeurJson(GardeVendeurDTO v) {
        return new JSONObject().put("vendeurId", v.getVendeurId()).put("nom", v.getNom()).put("ventes", v.getVentes())
                .put("clients", v.getClients()).put("montant", v.getMontant()).put("marge", v.getMarge())
                .put("tauxMarge", arrondi(v.getTauxMarge()));
    }

    /** Les gardes designees par une liste d'identifiants separes par des virgules, sans les inconnues. */
    private List<Garde> gardesDepuis(String ids) {
        List<Garde> gardes = new ArrayList<>();
        for (String id : StringUtils.defaultString(ids).split(",")) {
            Garde g = gardeService.parId(StringUtils.trimToEmpty(id));
            if (g != null) {
                gardes.add(g);
            }
        }
        return gardes;
    }

    private static Response liste(JSONArray data, JSONObject complement) {
        JSONObject reponse = new JSONObject().put("success", true).put("total", data.length()).put("data", data);
        if (complement != null) {
            for (String cle : complement.keySet()) {
                reponse.put(cle, complement.get(cle));
            }
        }
        return Response.ok().entity(reponse.toString()).build();
    }

    /** Les vendeurs d'une garde (H3), du plus gros chiffre au plus petit. */
    @GET
    @Path("{id}/vendeurs")
    public Response vendeurs(@PathParam("id") String id) {
        Garde garde = gardeService.parId(id);
        if (garde == null) {
            return echec("Cette garde n'existe plus.");
        }
        return liste(vendeursJson(gardeService.vendeurs(garde)), null);
    }

    /** Les vendeurs sur plusieurs gardes cumulees (H3). */
    @GET
    @Path("vendeurs")
    public Response vendeursCumules(@DefaultValue("") @QueryParam("ids") String ids) {
        List<Garde> gardes = gardesDepuis(ids);
        return liste(vendeursJson(gardeService.vendeurs(gardes)), new JSONObject().put("gardes", gardes.size()));
    }

    /**
     * Les produits commandes pendant la garde et ce qui s'en est vendu (H3) : les non vendus en tete, et la proportion
     * en resume.
     */
    @GET
    @Path("{id}/commandes")
    public Response commandes(@PathParam("id") String id) {
        Garde garde = gardeService.parId(id);
        if (garde == null) {
            return echec("Cette garde n'existe plus.");
        }
        JSONArray data = new JSONArray();
        int nonVendus = 0;
        long quantiteCommandee = 0L;
        long quantiteNonVendue = 0L;
        List<GardeCommandeDTO> commandes = gardeService.commandes(garde);
        for (GardeCommandeDTO c : commandes) {
            data.put(new JSONObject().put("produitId", c.getProduitId()).put("cip", c.getCip())
                    .put("libelle", c.getLibelle()).put("quantiteCommandee", c.getQuantiteCommandee())
                    .put("quantiteVendue", c.getQuantiteVendue()).put("nonVendu", c.isNonVendu()));
            quantiteCommandee += c.getQuantiteCommandee();
            if (c.isNonVendu()) {
                nonVendus++;
                quantiteNonVendue += c.getQuantiteCommandee();
            }
        }
        JSONObject resume = new JSONObject().put("produitsCommandes", commandes.size())
                .put("produitsNonVendus", nonVendus)
                .put("proportionProduits", commandes.isEmpty() ? 0D : arrondi(nonVendus * 100D / commandes.size()))
                .put("quantiteCommandee", quantiteCommandee).put("quantiteNonVendue", quantiteNonVendue)
                .put("proportionQuantites",
                        quantiteCommandee > 0 ? arrondi(quantiteNonVendue * 100D / quantiteCommandee) : 0D);
        return liste(data, new JSONObject().put("resume", resume));
    }

    /**
     * Le suivi de l'activite sur l'HISTORIQUE (H3) : les tranches horaires cumulees sur plusieurs gardes, avec les
     * heures tenues additionnees. C'est ce qui dit, garde apres garde, a quelles heures il faut du monde.
     */
    @GET
    @Path("activite")
    public Response activite(@DefaultValue("") @QueryParam("ids") String ids,
            @DefaultValue("2") @QueryParam("heures") int heures) {
        List<Garde> gardes = gardesDepuis(ids);
        JSONArray data = new JSONArray();
        for (GardeTrancheDTO t : gardeService.tranches(gardes, heures)) {
            data.put(trancheJson(t));
        }
        return liste(data, new JSONObject().put("gardes", gardes.size()));
    }

    /** Les produits demandes par l'ecran, ou tous ceux vendus pendant la garde quand rien n'est coche. */
    private List<String> produitsVoulus(JSONObject corps, Garde garde) {
        List<String> produits = new ArrayList<>();
        JSONArray demandes = corps.optJSONArray("produits");
        if (demandes != null) {
            for (int i = 0; i < demandes.length(); i++) {
                String id = StringUtils.trimToEmpty(demandes.optString(i));
                if (!id.isEmpty() && !produits.contains(id)) {
                    produits.add(id);
                }
            }
        }
        if (produits.isEmpty()) {
            produits.addAll(gardeService.quantitesVendues(garde).keySet());
        }
        return produits;
    }

    private static JSONObject corpsJson(String corps) {
        try {
            return StringUtils.isBlank(corps) ? new JSONObject() : new JSONObject(corps);
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    /**
     * Un inventaire des produits vendus pendant la garde (H3) : ceux coches, ou tous. L'inventaire est cree par le
     * service d'inventaire habituel, avec le stock courant en quantite initiale, et se poursuit dans l'ecran des
     * inventaires.
     */
    @POST
    @Path("{id}/inventaire")
    public Response inventaire(@PathParam("id") String id, String corps) {
        if (utilisateur() == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        Garde garde = gardeService.parId(id);
        if (garde == null) {
            return echec("Cette garde n'existe plus.");
        }
        JSONObject json = corpsJson(corps);
        List<String> produits = produitsVoulus(json, garde);
        if (produits.isEmpty()) {
            return echec("Aucun produit vendu pendant cette garde : rien à inventorier.");
        }
        String nom = StringUtils.defaultIfBlank(json.optString("nom"),
                "INVENTAIRE GARDE " + StringUtils.defaultString(garde.getLibelle()));
        try {
            int nombre = inventaireService.create(new java.util.LinkedHashSet<>(produits), nom, nom + " - du "
                    + garde.getDateDebut().format(AFFICHE) + " au " + garde.getDateFin().format(AFFICHE));
            return Response.ok()
                    .entity(new JSONObject().put("success", true).put("count", nombre).put("nom", nom)
                            .put("msg", "Inventaire « " + nom + " » créé avec " + nombre + " produit(s).").toString())
                    .build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "inventaire depuis une garde", e);
            return echec("L'inventaire n'a pas pu être créé.");
        }
    }

    /**
     * Une suggestion de commande depuis la garde (H3) : les produits coches, ou tous ceux vendus, avec la quantite
     * vendue pendant la garde en quantite proposee. Elle suit ensuite le circuit habituel des suggestions.
     */
    @POST
    @Path("{id}/suggestion")
    public Response suggestion(@PathParam("id") String id, String corps) {
        TUser user = utilisateur();
        if (user == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        Garde garde = gardeService.parId(id);
        if (garde == null) {
            return echec("Cette garde n'existe plus.");
        }
        List<String> produits = produitsVoulus(corpsJson(corps), garde);
        java.util.Map<String, Long> vendues = gardeService.quantitesVendues(garde);
        java.util.Map<String, Long> quantites = new java.util.LinkedHashMap<>();
        for (String produit : produits) {
            Long q = vendues.get(produit);
            if (q != null && q > 0) {
                quantites.put(produit, q);
            }
        }
        if (quantites.isEmpty()) {
            return echec("Aucun produit vendu pendant cette garde : rien à suggérer.");
        }
        JSONObject resultat = suggestionService.makeSuggestionDepuisGarde(quantites, user);
        if (!resultat.optBoolean("success")) {
            return echec(resultat.optString("msg", "La suggestion n'a pas pu être créée."));
        }
        int count = resultat.optInt("count");
        int ignores = resultat.optInt("ignores");
        resultat.put("msg",
                count + " produit(s) envoyé(s) en suggestion (" + resultat.optInt("suggestions") + " suggestion(s))"
                        + (ignores > 0 ? ", " + ignores + " ignoré(s) : sans grossiste ou déconditionné." : "."));
        return Response.ok().entity(resultat.toString()).build();
    }

    private static JSONObject produitJson(GardeProduitDTO p) {
        return new JSONObject().put("produitId", p.getProduitId()).put("classe", p.getClasse()).put("cip", p.getCip())
                .put("libelle", p.getLibelle()).put("quantite", p.getQuantite()).put("montant", p.getMontant())
                .put("marge", p.getMarge()).put("tauxMarge", arrondi(p.getTauxMarge()))
                .put("part", arrondi(p.getPart())).put("cumulPart", arrondi(p.getCumulPart()))
                .put("stock", p.getStock());
    }

    /** Combien de produits dans chaque classe, et quelle part du chiffre ils representent. */
    private static JSONArray resumeAbc(List<GardeProduitDTO> produits) {
        JSONArray resume = new JSONArray();
        for (String classe : new String[] { "A", "B", "C" }) {
            int nombre = 0;
            long montant = 0L;
            long marge = 0L;
            double part = 0D;
            for (GardeProduitDTO p : produits) {
                if (classe.equals(p.getClasse())) {
                    nombre++;
                    montant += p.getMontant();
                    marge += p.getMarge();
                    part += p.getPart();
                }
            }
            resume.put(new JSONObject().put("classe", classe).put("produits", nombre).put("montant", montant)
                    .put("marge", marge).put("tauxMarge", montant > 0 ? arrondi(marge * 100D / montant) : 0D)
                    .put("part", arrondi(part)));
        }
        return resume;
    }

    private static double arrondi(double valeur) {
        return Math.round(valeur * 100D) / 100D;
    }

    /**
     * Comparaison de plusieurs gardes sur les memes indicateurs.
     *
     * <p>
     * Une seule garde ne fait pas une comparaison : la reponse porte alors ses chiffres bruts, sans ecart. C'est a
     * partir de deux que la colonne d'ecart a un sens.
     * </p>
     *
     * @param ids
     *            identifiants separes par des virgules ; vide prend les {@code nombre} dernieres gardes
     * @param nombre
     *            nombre de dernieres gardes prises quand aucun identifiant n'est donne
     */
    @GET
    @Path("comparaison")
    public Response comparaison(@DefaultValue("") @QueryParam("ids") String ids,
            @DefaultValue("3") @QueryParam("nombre") int nombre) {
        List<Garde> gardes = new ArrayList<>();
        if (StringUtils.isBlank(ids)) {
            // « N dernieres gardes ». La liste est deja triee de la plus recente a la plus
            // ancienne : les N premieres sont donc les N dernieres tenues.
            List<Garde> toutes = gardeService.lister();
            gardes.addAll(toutes.subList(0, Math.min(Math.max(1, nombre), toutes.size())));
        } else {
            for (String id : ids.split(",")) {
                Garde g = gardeService.parId(StringUtils.trimToEmpty(id));
                if (g != null) {
                    gardes.add(g);
                }
            }
        }
        // De la plus ancienne a la plus recente : les ecarts se lisent alors dans le sens du temps.
        gardes.sort(java.util.Comparator.comparing(Garde::getDateDebut));
        JSONArray data = new JSONArray();
        GardeKpiDTO precedente = null;
        for (Garde g : gardes) {
            // H2 : la comparaison porte sur les indicateurs REELS de la garde, a plat dans la ligne.
            GardeKpiDTO k = gardeService.kpi(g);
            JSONObject ligne = json(g);
            JSONObject kpi = kpiJson(k);
            for (String cle : kpi.keySet()) {
                ligne.put(cle, kpi.get(cle));
            }
            ligne.put("indicateurs", kpi);
            if (precedente != null) {
                // Taux d'evolution : le chiffre d'affaires de la garde rapporte a celui de la precedente.
                long evolution = k.getMontant() - precedente.getMontant();
                ligne.put("evolutionMontant", evolution);
                ligne.put("evolutionPourcentage",
                        precedente.getMontant() > 0 ? arrondi(evolution * 100D / precedente.getMontant()) : 0D);
                // Et l'ecart PAR HEURE, seule base comparable entre gardes de durees differentes.
                long ecart = k.getMontantParHeure() - precedente.getMontantParHeure();
                ligne.put("ecartParHeure", ecart);
                ligne.put("ecartPourcentage", precedente.getMontantParHeure() > 0
                        ? arrondi(ecart * 100D / precedente.getMontantParHeure()) : 0D);
            }
            data.put(ligne);
            precedente = k;
        }
        return Response.ok().entity(new JSONObject().put("success", true).put("total", data.length()).put("data", data)
                // Une seule garde ne fait pas une comparaison : ce sont ses chiffres bruts.
                // C'est a partir de deux que les ecarts ont un sens.
                .put("comparatif", data.length() >= 2).toString()).build();
    }

    @GET
    @Path("{id}/pdf")
    public Response imprimer(@PathParam("id") String id, @DefaultValue("2") @QueryParam("heures") int heures) {
        TUser user = utilisateur();
        if (user == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        Garde garde = gardeService.parId(id);
        if (garde == null) {
            return echec("Cette garde n'existe plus.");
        }
        AnalyseGarde.Indicateurs i = gardeService.indicateurs(garde);
        java.util.Map<String, Object> parametres = reportUtil.officineData(user);
        parametres.put("P_H_CLT_INFOS", "GARDE : " + StringUtils.defaultString(garde.getLibelle()));
        parametres.put("P_PERIODE", "Du " + garde.getDateDebut().format(AFFICHE) + " au "
                + garde.getDateFin().format(AFFICHE) + " (" + dureeLisible(garde.dureeMinutes()) + ")");
        parametres.put("P_INDICATEURS",
                i.getVentes() + " vente(s) - " + i.getLignes() + " ligne(s) - " + i.getProduitsDistincts()
                        + " produit(s) - " + i.getQuantite() + " unité(s) - " + i.getMontant() + " au total - "
                        + i.getMontantParHeure() + " par heure");
        String url = reportUtil.buildReport(parametres, "garde", lignesEtat(garde, heures));
        // buildReport rend l'URL attendue meme quand l'edition a echoue : on verifie que le PDF
        // existe avant d'annoncer un succes, sinon l'utilisateur ouvrirait un fichier absent.
        if (!reportUtil.editionEcrite(url)) {
            return echec("L'édition n'a pas pu être générée");
        }
        return Response.ok().entity(new JSONObject().put("success", true).put("url", url).put("msg", url).toString())
                .build();
    }

    /** Les tranches puis la classification, en une table unique groupee par section. */
    private List<commonTasks.dto.AnalyseOrdonnancierLigneDTO> lignesEtat(Garde garde, int heures) {
        List<commonTasks.dto.AnalyseOrdonnancierLigneDTO> lignes = new ArrayList<>();
        for (GardeTrancheDTO t : gardeService.tranches(garde, heures)) {
            commonTasks.dto.AnalyseOrdonnancierLigneDTO l = new commonTasks.dto.AnalyseOrdonnancierLigneDTO();
            l.setSection("Tranche horaire");
            l.setLibelle(t.getLibelle());
            l.setComplement(t.getClients() + " client(s)");
            l.setDelivrances(t.getVentes());
            l.setQuantite(t.getQuantite());
            l.setMontant(t.getMontant());
            lignes.add(l);
        }
        for (GardeProduitDTO p : gardeService.abc(garde)) {
            commonTasks.dto.AnalyseOrdonnancierLigneDTO l = new commonTasks.dto.AnalyseOrdonnancierLigneDTO();
            l.setSection("Classe " + (StringUtils.isBlank(p.getClasse()) ? "-" : p.getClasse()));
            l.setLibelle(p.getLibelle());
            l.setComplement(p.getCip() + " - " + arrondi(p.getCumulPart()) + " % cumulé");
            l.setDelivrances(p.getLignes());
            l.setQuantite(p.getQuantite());
            l.setMontant(p.getMontant());
            lignes.add(l);
        }
        return lignes;
    }

    @GET
    @Path("{id}/excel")
    @Produces("application/vnd.ms-excel")
    public Response exporter(@PathParam("id") String id, @DefaultValue("2") @QueryParam("heures") int heures,
            @DefaultValue("") @QueryParam("classe") String classe,
            @DefaultValue("montant") @QueryParam("tri") String tri, @DefaultValue("0") @QueryParam("limite") int limite,
            @DefaultValue("") @QueryParam("famille") String famille,
            @DefaultValue("") @QueryParam("rayon") String rayon,
            @DefaultValue("") @QueryParam("grossiste") String grossiste,
            @DefaultValue("") @QueryParam("stockOp") String stockOp,
            @DefaultValue("") @QueryParam("stockVal") String stockVal,
            @DefaultValue("") @QueryParam("qteOp") String qteOp, @DefaultValue("") @QueryParam("qteVal") String qteVal,
            @DefaultValue("") @QueryParam("margeOp") String margeOp,
            @DefaultValue("") @QueryParam("margeVal") String margeVal) throws IOException {
        Garde garde = gardeService.parId(id);
        if (garde == null) {
            return echec("Cette garde n'existe plus.");
        }
        // L'export rend ce que l'ecran affiche : meme classe, memes filtres, meme ordre, memes N premiers.
        List<GardeProduitDTO> abc = AnalyseGarde.filtrer(gardeService.abc(garde), classe,
                AnalyseGarde.TriProduits.depuis(tri), limite, famille, rayon, grossiste,
                criteres(stockOp, stockVal, qteOp, qteVal, margeOp, margeVal));
        String titre = "GARDE " + StringUtils.defaultString(garde.getLibelle()) + " - du "
                + garde.getDateDebut().format(AFFICHE) + " au " + garde.getDateFin().format(AFFICHE);
        byte[] data = reportExcelExportService.createExcelReport(titre, ENTETES_ABC, abc, (row, p) -> {
            int col = 0;
            row.createCell(col++).setCellValue(p.getClasse());
            row.createCell(col++).setCellValue(p.getCip());
            row.createCell(col++).setCellValue(p.getLibelle());
            row.createCell(col++).setCellValue(p.getQuantite());
            row.createCell(col++).setCellValue(p.getStock());
            row.createCell(col++).setCellValue(p.getMontant());
            row.createCell(col++).setCellValue(p.getMarge());
            row.createCell(col++).setCellValue(arrondi(p.getTauxMarge()));
            row.createCell(col++).setCellValue(arrondi(p.getPart()));
            row.createCell(col++).setCellValue(arrondi(p.getCumulPart()));
        });
        String nomFichier = "garde_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_H_mm_ss"))
                + ".xls";
        return Response.ok(data, "application/vnd.ms-excel").encoding("UTF-8")
                .header("content-disposition", "attachment; filename = " + nomFichier).build();
    }

    /** Les commandes non vendues de la garde (retour des tests du 09/09) en classeur Excel. */
    @GET
    @Path("{id}/commandes/excel")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response exporterCommandes(@PathParam("id") String id) throws IOException {
        Garde garde = gardeService.parId(id);
        if (garde == null) {
            return echec("Cette garde n'existe plus.");
        }
        List<GardeCommandeDTO> commandes = gardeService.commandes(garde);
        byte[] data = new rest.report.excel.ClasseurExcel<GardeCommandeDTO>("Commandes non vendues")
                .titre("GARDE " + StringUtils.defaultString(garde.getLibelle()) + " - COMMANDÉS NON VENDUS")
                .critere("Période",
                        "du " + garde.getDateDebut().format(AFFICHE) + " au " + garde.getDateFin().format(AFFICHE))
                .texte("CIP", GardeCommandeDTO::getCip).texte("Produit", GardeCommandeDTO::getLibelle)
                .nombre("Qté commandée", GardeCommandeDTO::getQuantiteCommandee)
                .nombre("Qté vendue", GardeCommandeDTO::getQuantiteVendue)
                .texte("Statut", c -> c.isNonVendu() ? "Non vendu" : "Vendu").construire(commandes);
        String nomFichier = "garde_commandes_"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_H_mm_ss")) + ".xlsx";
        return Response.ok(data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .header("content-disposition", "attachment; filename=" + nomFichier).build();
    }

    /** Les commandes non vendues de la garde en PDF, rendu en flux dans l'onglet ouvert par le clic. */
    @GET
    @Path("{id}/commandes/pdf")
    @Produces("application/pdf")
    public Response imprimerCommandes(@PathParam("id") String id) {
        TUser user = utilisateur();
        if (user == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        Garde garde = gardeService.parId(id);
        if (garde == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        List<GardeCommandeDTO> commandes = gardeService.commandes(garde);
        int nonVendus = 0;
        for (GardeCommandeDTO c : commandes) {
            if (c.isNonVendu()) {
                nonVendus++;
            }
        }
        java.util.Map<String, Object> parametres = reportUtil.officineData(user);
        parametres.put("P_GARDE", "GARDE : " + StringUtils.defaultString(garde.getLibelle()));
        parametres.put("P_PERIODE",
                "Du " + garde.getDateDebut().format(AFFICHE) + " au " + garde.getDateFin().format(AFFICHE));
        parametres.put("P_RESUME", commandes.size() + " produit(s) commandé(s) pendant la garde, dont " + nonVendus
                + " non vendu(s) (" + arrondi(commandes.isEmpty() ? 0D : nonVendus * 100D / commandes.size()) + " %)");
        String url = reportUtil.buildReport(parametres, "garde_commandes", commandes);
        java.io.File fichier = reportUtil.editionEcrite(url)
                ? new java.io.File(reportUtil.getReportDirectory(url.substring(url.lastIndexOf('/') + 1))) : null;
        if (fichier == null || !fichier.exists()) {
            return Response.ok(
                    "<html><head><meta charset=\"UTF-8\"></head><body style=\"font-family:Arial;padding:30px;\">"
                            + "<h3 style=\"color:#C00000;\">L'édition n'a pas pu être générée.</h3></body></html>",
                    "text/html;charset=UTF-8").build();
        }
        return Response.ok(fichier, "application/pdf")
                .header("Content-Disposition", "inline; filename=garde_commandes.pdf").build();
    }

    @GET
    @Path("{id}/tranches/excel")
    @Produces("application/vnd.ms-excel")
    public Response exporterTranches(@PathParam("id") String id, @DefaultValue("2") @QueryParam("heures") int heures)
            throws IOException {
        Garde garde = gardeService.parId(id);
        if (garde == null) {
            return echec("Cette garde n'existe plus.");
        }
        String titre = "GARDE " + StringUtils.defaultString(garde.getLibelle()) + " - répartition horaire";
        byte[] data = reportExcelExportService.createExcelReport(titre, ENTETES_TRANCHES,
                gardeService.tranches(garde, heures), (row, t) -> {
                    int col = 0;
                    row.createCell(col++).setCellValue(t.getLibelle());
                    row.createCell(col++).setCellValue(t.getClients());
                    row.createCell(col++).setCellValue(t.getMontant());
                });
        String nomFichier = "garde_tranches_"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_H_mm_ss")) + ".xls";
        return Response.ok(data, "application/vnd.ms-excel").encoding("UTF-8")
                .header("content-disposition", "attachment; filename = " + nomFichier).build();
    }
}
