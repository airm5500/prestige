package rest;

import dal.TUser;
import java.util.List;
import java.util.Map;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.posos.PososDemande;
import rest.service.posos.PososResultat;
import rest.service.posos.PososService;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 * Analyse Posos (evolution 5, point 9).
 *
 * <p>
 * Le navigateur n'appelle jamais Posos : il parle a ces deux services, authentifies comme le reste de l'application.
 * Aucun identifiant Posos ne transite par le navigateur, et le statut n'en expose aucun - il rend l'adresse, les
 * chemins, l'identifiant masque et des booleans.
 */
@Path("v1/posos")
@Produces("application/json")
@Consumes("application/json")
public class PososRessource {

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private PososService pososService;

    @EJB
    private rest.service.impl.SubstitutionService substitutionService;

    /** Au plus autant de produits proposes par alerte : au-dela, l'ecran devient une liste de catalogue. */
    private static final int PRODUITS_PROPOSES_MAX = 8;

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(commonparameter.AIRTIME_USER);
    }

    private static Response deconnecte() {
        return Response.ok()
                .entity(new JSONObject().put("success", false).put("message", Constant.DECONNECTED_MESSAGE).toString())
                .build();
    }

    /**
     * Etat de la passerelle. Ne rend jamais de secret : l'identifiant est masque, le secret n'apparait que comme un
     * booleen « renseigne ou non ».
     */
    @GET
    @Path("status")
    public Response statut() {
        if (utilisateur() == null) {
            return deconnecte();
        }
        Map<String, Object> etat = pososService.statut();
        JSONObject json = new JSONObject();
        json.put("success", true);
        etat.forEach(json::put);
        return Response.ok().entity(json.toString()).build();
    }

    /**
     * Analyse. Deux formes acceptees : une liste de produits envoyee par l'ecran, ou l'identifiant d'une vente dont les
     * produits sont relus en base - la seconde est preferable, le navigateur pouvant se tromper de produit.
     */
    @POST
    @Path("analyse")
    public Response analyse(String corps) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        JSONObject entree;
        try {
            entree = new JSONObject(corps == null ? "{}" : corps);
        } catch (Exception e) {
            return Response.ok()
                    .entity(new JSONObject().put("success", false).put("message", "Demande illisible.").toString())
                    .build();
        }
        PososDemande.Contexte contexte = contexte(entree.optJSONObject("contexte"));
        String venteId = entree.optString("venteId", null);
        PososResultat resultat;
        JSONArray analyses = null;
        JSONObject contexteOrdonnance = null;
        if (venteId != null && !venteId.trim().isEmpty()) {
            // La vente est reconnue par son identifiant ou par sa reference, et ses produits sont relus en base.
            java.util.List<PososDemande.Produit> deLaVente = pososService.produitsDeLaVente(venteId.trim());
            /*
             * La reference peut aussi etre un N° d'ORDONNANCE client (ORD-AAAAMM-0001) : les deux menus sont lies. Ses
             * produits sont relus avec leur posologie, et son contexte clinique sert quand l'ecran n'en donne aucun.
             */
            PososDemande.Contexte deLOrdonnance = null;
            if (deLaVente.isEmpty()) {
                deLaVente = pososService.produitsDeLOrdonnance(venteId.trim());
                deLOrdonnance = deLaVente.isEmpty() ? null : pososService.contexteDeLOrdonnance(venteId.trim());
                if (deLOrdonnance != null && PososService.estVide(contexte)) {
                    contexte = deLOrdonnance;
                }
            }
            analyses = enJson(deLaVente);
            resultat = deLOrdonnance != null ? pososService.analyserProduits(deLaVente, contexte)
                    : pososService.analyserVente(venteId.trim(), contexte);
            if (deLOrdonnance != null) {
                contexteOrdonnance = new JSONObject()
                        .put("age", deLOrdonnance.getAge() == null ? JSONObject.NULL : deLOrdonnance.getAge())
                        .put("sexe", deLOrdonnance.getSexe() == null ? "" : deLOrdonnance.getSexe())
                        .put("grossesse", Boolean.TRUE.equals(deLOrdonnance.getGrossesse()))
                        .put("allaitement", Boolean.TRUE.equals(deLOrdonnance.getAllaitement()))
                        .put("insuffisanceRenale", Boolean.TRUE.equals(deLOrdonnance.getInsuffisanceRenale()))
                        .put("insuffisanceHepatique", Boolean.TRUE.equals(deLOrdonnance.getInsuffisanceHepatique()));
            }
        } else {
            PososDemande demande = new PososDemande();
            demande.setContexte(contexte);
            demande.setProduits(produits(entree.optJSONArray("produits")));
            resultat = pososService.analyser(demande);
        }
        JSONObject sortie = enJson(resultat);
        ajouterEquivalents(sortie, resultat);
        if (analyses != null) {
            // L'ecran montre ce qui a REELLEMENT ete envoye : sinon on ne sait pas ce qui a ete analyse.
            sortie.put("venteProduits", analyses);
        }
        if (contexteOrdonnance != null) {
            sortie.put("contexteOrdonnance", contexteOrdonnance);
        }
        return Response.ok().entity(sortie.toString()).build();
    }

    /**
     * Equivalents en rayon (23/09) : quand une alerte recommande une DCI (« preferer le paracetamol »), on joint les
     * produits du catalogue qui l'ont EXACTEMENT, avec stock et prix, sur l'emplacement de l'operateur.
     */
    private void ajouterEquivalents(JSONObject sortie, PososResultat resultat) {
        JSONArray alertes = sortie.optJSONArray("alertes");
        if (alertes == null) {
            return;
        }
        TUser operateur = utilisateur();
        String emplacement = operateur == null || operateur.getLgEMPLACEMENTID() == null ? null
                : operateur.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        java.util.Map<String, JSONArray> dejaCherches = new java.util.HashMap<>();
        for (int i = 0; i < alertes.length() && i < resultat.getAlertes().size(); i++) {
            List<String> dcis = resultat.getAlertes().get(i).getProposer();
            JSONArray equivalents = new JSONArray();
            for (String dci : dcis) {
                JSONArray trouves = dejaCherches.computeIfAbsent(dci,
                        d -> substitutionService.produitsDeDci(d, emplacement, PRODUITS_PROPOSES_MAX));
                for (int k = 0; k < trouves.length(); k++) {
                    equivalents.put(trouves.getJSONObject(k));
                }
            }
            alertes.getJSONObject(i).put("proposer", new JSONArray(dcis)).put("equivalents", equivalents)
                    .put("aRemplacer", new JSONArray(resultat.getAlertes().get(i).getARemplacer()));
        }
    }

    private static java.util.List<PososDemande.Produit> produits(JSONArray tableau) {
        java.util.List<PososDemande.Produit> produits = new java.util.ArrayList<>();
        if (tableau == null) {
            return produits;
        }
        for (int i = 0; i < tableau.length(); i++) {
            JSONObject o = tableau.optJSONObject(i);
            String nom = o != null ? o.optString("nom", null) : tableau.optString(i, null);
            if (nom == null || nom.trim().isEmpty()) {
                continue;
            }
            PososDemande.Produit p = new PososDemande.Produit();
            p.setNom(nom.trim());
            if (o != null) {
                if (o.has("quantite") && !o.isNull("quantite")) {
                    p.setQuantite(o.optInt("quantite"));
                }
                String posologie = o.optString("posologie", null);
                if (posologie != null && !posologie.trim().isEmpty()) {
                    p.setPosologie(posologie.trim());
                }
                String cip = o.optString("cip", null);
                if (cip != null && !cip.trim().isEmpty()) {
                    p.setCip(cip.trim());
                }
            }
            produits.add(p);
        }
        return produits;
    }

    private static PososDemande.Contexte contexte(JSONObject o) {
        if (o == null) {
            return null;
        }
        PososDemande.Contexte c = new PososDemande.Contexte();
        if (o.has("age") && !o.isNull("age")) {
            c.setAge(o.optInt("age"));
        }
        String sexe = o.optString("sexe", null);
        if (sexe != null && !sexe.trim().isEmpty()) {
            c.setSexe(sexe.trim());
        }
        if (o.has("grossesse")) {
            c.setGrossesse(o.optBoolean("grossesse"));
        }
        if (o.has("allaitement")) {
            c.setAllaitement(o.optBoolean("allaitement"));
        }
        if (o.has("insuffisanceRenale")) {
            c.setInsuffisanceRenale(o.optBoolean("insuffisanceRenale"));
        }
        if (o.has("insuffisanceHepatique")) {
            c.setInsuffisanceHepatique(o.optBoolean("insuffisanceHepatique"));
        }
        return c;
    }

    private static JSONArray enJson(java.util.List<PososDemande.Produit> produits) {
        JSONArray tableau = new JSONArray();
        for (PososDemande.Produit p : produits) {
            tableau.put(new JSONObject().put("nom", p.getNom() == null ? "" : p.getNom())
                    .put("cip", p.getCip() == null ? "" : p.getCip())
                    .put("quantite", p.getQuantite() == null ? 0 : p.getQuantite().intValue())
                    .put("posologie", p.getPosologie() == null ? "" : p.getPosologie()));
        }
        return tableau;
    }

    private static JSONObject enJson(PososResultat resultat) {
        JSONObject json = new JSONObject();
        json.put("success", true);
        json.put("disponible", resultat.isDisponible());
        json.put("message", resultat.getMessage() == null ? "" : resultat.getMessage());
        json.put("nombreMajeures", resultat.nombreMajeures());
        JSONArray alertes = new JSONArray();
        List<PososResultat.Alerte> liste = resultat.getAlertes();
        for (PososResultat.Alerte a : liste) {
            JSONObject o = new JSONObject();
            o.put("type", a.getType() == null ? "" : a.getType());
            o.put("gravite", a.getGravite() == null ? "" : a.getGravite());
            o.put("libelle", a.getLibelle() == null ? "" : a.getLibelle());
            o.put("recommandation", a.getRecommandation() == null ? "" : a.getRecommandation());
            o.put("majeure", a.estMajeure());
            o.put("produits", new JSONArray(a.getProduits()));
            alertes.put(o);
        }
        json.put("alertes", alertes);
        json.put("total", alertes.length());
        json.put("produitsNonReconnus", new JSONArray(resultat.getProduitsNonReconnus()));
        json.put("demonstration", resultat.isDemonstration());
        json.put("avertissement", resultat.getAvertissement() == null ? "" : resultat.getAvertissement());
        return json;
    }
}
