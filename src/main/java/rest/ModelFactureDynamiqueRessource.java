package rest;

import com.itextpdf.text.Document;
import com.itextpdf.text.Element;
import com.itextpdf.text.Font;
import com.itextpdf.text.FontFactory;
import com.itextpdf.text.PageSize;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.BaseColor;
import com.itextpdf.text.Phrase;
import com.itextpdf.text.Rectangle;
import com.itextpdf.text.pdf.ColumnText;
import com.itextpdf.text.pdf.PdfContentByte;
import com.itextpdf.text.pdf.PdfPCell;
import com.itextpdf.text.pdf.PdfPageEventHelper;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;
import dal.ModelFactureDynamique;
import dal.ModelFactureDynamiqueColonne;
import dal.TFacture;
import dal.TFamille;
import dal.TFactureDetail;
import dal.TOfficine;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TPreenregistrementDetail;
import dal.TModelFacture;
import dal.TTiersPayant;
import dal.TUser;
import dal.dataManager;
import java.io.ByteArrayOutputStream;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.inject.Inject;
import javax.persistence.EntityManager;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.FormParam;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import rest.report.JrxmlFactureBuilder;
import org.json.JSONArray;
import org.json.JSONObject;
import toolkits.parameters.commonparameter;
import toolkits.utils.conversion;
import toolkits.utils.date;

/**
 * Createur de modeles de facture dynamiques : l'utilisateur definit lui-meme les colonnes a afficher (parmi toutes les
 * informations disponibles d'un dossier), leur libelle, leur ordre et le tri, puis rattache des tiers payants au
 * modele. L'edition PDF est generee en Java (iText) sans fichier Jasper : les tiers payants non rattaches gardent le
 * circuit Jasper historique inchange.
 */
@Path("v1/model-facture-dynamique")
@Produces("application/json")
@Consumes("application/json")
public class ModelFactureDynamiqueRessource {

    private static final Logger LOG = Logger.getLogger(ModelFactureDynamiqueRessource.class.getName());

    /** Registre des colonnes disponibles : code -> [libelle par defaut, colonne numerique totalisee]. */
    private static final Map<String, Object[]> COLONNES_DISPONIBLES = new LinkedHashMap<>();

    static {
        COLONNES_DISPONIBLES.put("NUMERO", new Object[] { "N°", false });
        COLONNES_DISPONIBLES.put("DATE_BON", new Object[] { "Date", false });
        COLONNES_DISPONIBLES.put("REF_BON", new Object[] { "N° Bon", false });
        COLONNES_DISPONIBLES.put("NOM_CLIENT", new Object[] { "Nom", false });
        COLONNES_DISPONIBLES.put("PRENOM_CLIENT", new Object[] { "Prénom(s)", false });
        COLONNES_DISPONIBLES.put("NOM_COMPLET", new Object[] { "Nom et prénom(s)", false });
        COLONNES_DISPONIBLES.put("MATRICULE", new Object[] { "Matricule", false });
        COLONNES_DISPONIBLES.put("REF_VENTE", new Object[] { "Réf. vente", false });
        COLONNES_DISPONIBLES.put("TAUX", new Object[] { "Taux (%)", false });
        COLONNES_DISPONIBLES.put("MONTANT_BRUT", new Object[] { "Montant brut", true });
        COLONNES_DISPONIBLES.put("REMISE", new Object[] { "Remise", true });
        COLONNES_DISPONIBLES.put("PART_CLIENT", new Object[] { "Part client", true });
        // « Part TP » et non « Part tiers payant » : le libelle long forcait sa colonne a etre
        // large pour son seul entete, au detriment du nom du client juste a cote.
        COLONNES_DISPONIBLES.put("PART_TIERS_PAYANT", new Object[] { "Part TP", true });
    }

    /** Registre des colonnes disponibles pour le DETAIL DES PRODUITS d'un bon (lignes de vente). */
    private static final Map<String, Object[]> COLONNES_PRODUIT_DISPONIBLES = new LinkedHashMap<>();

    static {
        COLONNES_PRODUIT_DISPONIBLES.put("PROD_CIP", new Object[] { "CIP", false });
        COLONNES_PRODUIT_DISPONIBLES.put("PROD_DESIGNATION", new Object[] { "Désignation", false });
        COLONNES_PRODUIT_DISPONIBLES.put("PROD_QUANTITE", new Object[] { "Quantité", false });
        COLONNES_PRODUIT_DISPONIBLES.put("PROD_PRIX_UNITAIRE", new Object[] { "Prix unitaire", true });
        COLONNES_PRODUIT_DISPONIBLES.put("PROD_MONTANT", new Object[] { "Montant", true });
        COLONNES_PRODUIT_DISPONIBLES.put("PROD_REMISE", new Object[] { "Remise", true });
    }

    @Inject
    private HttpServletRequest servletRequest;

    private TUser utilisateurSession() {
        return (TUser) servletRequest.getSession().getAttribute(commonparameter.AIRTIME_USER);
    }

    private Response reponseJson(JSONObject json) {
        return Response.ok().entity(json.toString()).build();
    }

    private Response reponseDeconnecte() {
        return reponseJson(new JSONObject().put("success", "0").put("errors", util.Constant.DECONNECTED_MESSAGE)
                .put("data", new JSONArray()).put("total", 0));
    }

    /** Colonnes proposees au choix dans le createur de modeles. */
    @GET
    @Path("colonnes")
    public Response colonnes() {
        JSONArray data = new JSONArray();
        for (Map.Entry<String, Object[]> e : COLONNES_DISPONIBLES.entrySet()) {
            data.put(new JSONObject().put("champ", e.getKey()).put("libelle", (String) e.getValue()[0]).put("numerique",
                    (Boolean) e.getValue()[1]));
        }
        JSONArray produit = new JSONArray();
        for (Map.Entry<String, Object[]> e : COLONNES_PRODUIT_DISPONIBLES.entrySet()) {
            produit.put(new JSONObject().put("champ", e.getKey()).put("libelle", (String) e.getValue()[0])
                    .put("numerique", (Boolean) e.getValue()[1]));
        }
        return reponseJson(new JSONObject().put("data", data).put("total", data.length()).put("produit", produit));
    }

    /** Liste des modeles dynamiques avec leurs colonnes et le nombre de tiers payants rattaches. */
    @GET
    @Path("list")
    public Response list(@DefaultValue("") @QueryParam("query") String query) {
        if (utilisateurSession() == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        try {
            odm.initEntityManager();
            EntityManager em = odm.getEm();
            List<ModelFactureDynamique> modeles = em.createQuery(
                    "SELECT m FROM ModelFactureDynamique m WHERE m.statut = 'enable' AND m.nom LIKE ?1 ORDER BY m.nom",
                    ModelFactureDynamique.class).setParameter(1, StringUtils.defaultString(query) + "%")
                    .getResultList();
            JSONArray data = new JSONArray();
            for (ModelFactureDynamique m : modeles) {
                Long nbTp = em.createQuery(
                        "SELECT COUNT(t) FROM TTiersPayant t WHERE t.lgMODELFACTUREID.modelFactureDynamiqueId = ?1",
                        Long.class).setParameter(1, m.getId()).getSingleResult();
                JSONArray cols = new JSONArray();
                for (ModelFactureDynamiqueColonne c : m.getColonnesBon()) {
                    cols.put(new JSONObject().put("champ", c.getChamp()).put("libelle", c.getLibelle()).put("ordre",
                            c.getOrdre()));
                }
                JSONArray colsProduit = new JSONArray();
                for (ModelFactureDynamiqueColonne c : m.getColonnesProduit()) {
                    colsProduit.put(new JSONObject().put("champ", c.getChamp()).put("libelle", c.getLibelle())
                            .put("ordre", c.getOrdre()));
                }
                data.put(new JSONObject().put("id", m.getId()).put("nom", m.getNom())
                        .put("description", StringUtils.defaultString(m.getDescription()))
                        .put("modeTri", m.getModeTri()).put("afficherEntete", m.isAfficherEntete())
                        .put("afficherPiedPage", m.isAfficherPiedPage())
                        .put("detaillerProduits", m.isDetaillerProduits())
                        .put("taillePolice", m.taillePoliceEffective()).put("nbBonsParPage", m.bonsParPageEffectif())
                        .put("colonnes", cols).put("colonnesProduit", colsProduit).put("nbColonnes", cols.length())
                        .put("nbTiersPayants", nbTp));
            }
            return reponseJson(new JSONObject().put("data", data).put("total", data.length()));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "liste modeles dynamiques", e);
            return reponseJson(new JSONObject().put("data", new JSONArray()).put("total", 0));
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Creation / modification d'un modele (id vide = creation) avec ses colonnes (tableau JSON). */

    /**
     * Cree ou met a jour la ligne de t_model_facture representant ce modele dynamique : c'est elle qui apparait dans le
     * champ "Code.Edit.Bordereau" de la fiche tiers payant et qui porte l'affectation. La valeur (str_VALUE) est unique
     * car la fiche tiers payant resout le modele par cette colonne.
     */
    private void synchroniserModelFacture(EntityManager em, ModelFactureDynamique modele) {
        List<TModelFacture> existants = em
                .createQuery("SELECT m FROM TModelFacture m WHERE m.modelFactureDynamiqueId = ?1", TModelFacture.class)
                .setParameter(1, modele.getId()).getResultList();
        String libelle = "Modèle dynamique : " + modele.getNom();
        if (existants.isEmpty()) {
            Long maxId = 0L;
            try {
                List<TModelFacture> tous = em.createQuery("SELECT m FROM TModelFacture m", TModelFacture.class)
                        .getResultList();
                for (TModelFacture m : tous) {
                    try {
                        maxId = Math.max(maxId, Long.parseLong(m.getLgMODELFACTUREID().trim()));
                    } catch (NumberFormatException ignore) {
                    }
                }
            } catch (Exception ignore) {
            }
            TModelFacture ligne = new TModelFacture();
            ligne.setLgMODELFACTUREID(String.valueOf(maxId + 1));
            ligne.setStrVALUE("DYN" + modele.getId());
            ligne.setStrDESCRIPTION(libelle);
            ligne.setStrSTATUT(commonparameter.statut_enable);
            ligne.setDtCREATED(new Date());
            ligne.setDtUPDATED(new Date());
            ligne.setModelFactureDynamiqueId(modele.getId());
            // Colonnes NOT NULL sans valeur par defaut en base : elles designent un fichier
            // Jasper, sans objet pour un modele dynamique dont la mise en page est construite
            // par le moteur. Sans ces valeurs, l'enregistrement echoue en base.
            ligne.setNomFichier("");
            ligne.setNomFichierRemiseTierspayant("");
            em.persist(ligne);
        } else {
            TModelFacture ligne = existants.get(0);
            ligne.setStrDESCRIPTION(libelle);
            ligne.setDtUPDATED(new Date());
            em.merge(ligne);
        }
    }

    /** Ligne t_model_facture representant un modele dynamique, ou null. */
    private TModelFacture modelFactureDe(EntityManager em, int modelId) {
        List<TModelFacture> existants = em
                .createQuery("SELECT m FROM TModelFacture m WHERE m.modelFactureDynamiqueId = ?1", TModelFacture.class)
                .setParameter(1, modelId).getResultList();
        return existants.isEmpty() ? null : existants.get(0);
    }

    @POST
    @Path("save")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response save(@DefaultValue("") @FormParam("id") String idParam,
            @DefaultValue("") @FormParam("nom") String nom,
            @DefaultValue("") @FormParam("description") String description,
            @DefaultValue("TIERS_PAYANT") @FormParam("modeTri") String modeTri,
            @DefaultValue("true") @FormParam("afficherEntete") boolean afficherEntete,
            @DefaultValue("true") @FormParam("afficherPiedPage") boolean afficherPiedPage,
            @DefaultValue("false") @FormParam("detaillerProduits") boolean detaillerProduits,
            @DefaultValue("8") @FormParam("taillePolice") int taillePolice,
            @DefaultValue("0") @FormParam("nbBonsParPage") int nbBonsParPage,
            @DefaultValue("[]") @FormParam("colonnes") String colonnesParam,
            @DefaultValue("[]") @FormParam("colonnesProduit") String colonnesProduitParam) {
        if (utilisateurSession() == null) {
            return reponseDeconnecte();
        }
        if (StringUtils.isBlank(nom)) {
            return reponseJson(new JSONObject().put("success", "0").put("errors", "Le nom du modèle est obligatoire"));
        }
        JSONArray colonnes = new JSONArray(colonnesParam);
        if (colonnes.length() == 0) {
            return reponseJson(
                    new JSONObject().put("success", "0").put("errors", "Choisissez au moins une colonne à afficher"));
        }
        for (int i = 0; i < colonnes.length(); i++) {
            String champ = colonnes.getJSONObject(i).optString("champ");
            if (!COLONNES_DISPONIBLES.containsKey(champ)) {
                return reponseJson(new JSONObject().put("success", "0").put("errors", "Colonne inconnue : " + champ));
            }
        }
        JSONArray colonnesProduit = new JSONArray(colonnesProduitParam);
        for (int i = 0; i < colonnesProduit.length(); i++) {
            String champ = colonnesProduit.getJSONObject(i).optString("champ");
            if (!COLONNES_PRODUIT_DISPONIBLES.containsKey(champ)) {
                return reponseJson(
                        new JSONObject().put("success", "0").put("errors", "Colonne produit inconnue : " + champ));
            }
        }
        if (detaillerProduits && colonnesProduit.length() == 0) {
            return reponseJson(new JSONObject().put("success", "0").put("errors",
                    "Le détail des produits est activé : choisissez au moins une colonne de produit à afficher"));
        }
        dataManager odm = new dataManager();
        try {
            odm.initEntityManager();
            EntityManager em = odm.getEm();
            em.getTransaction().begin();
            ModelFactureDynamique modele;
            if (StringUtils.isNotBlank(idParam)) {
                modele = em.find(ModelFactureDynamique.class, Integer.valueOf(idParam));
                if (modele == null) {
                    em.getTransaction().rollback();
                    return reponseJson(new JSONObject().put("success", "0").put("errors", "Modèle introuvable"));
                }
                modele.setDtUpdated(new Date());
                modele.getColonnes().clear();
            } else {
                modele = new ModelFactureDynamique();
                modele.setDtCreated(new Date());
            }
            modele.setNom(nom.trim());
            modele.setDescription(StringUtils.trimToNull(description));
            modele.setModeTri(normaliserModeTri(modeTri));
            modele.setAfficherEntete(afficherEntete);
            modele.setAfficherPiedPage(afficherPiedPage);
            modele.setDetaillerProduits(detaillerProduits);
            // Une taille hors bornes revient a la valeur d'origine : taillePoliceEffective() s'en charge
            modele.setTaillePolice(taillePolice);
            // Un nombre hors bornes revient a « automatique » : bonsParPageEffectif() s'en charge
            modele.setNbBonsParPage(nbBonsParPage);
            for (int i = 0; i < colonnes.length(); i++) {
                JSONObject o = colonnes.getJSONObject(i);
                ModelFactureDynamiqueColonne col = new ModelFactureDynamiqueColonne();
                col.setModele(modele);
                col.setNiveau(ModelFactureDynamiqueColonne.NIVEAU_BON);
                col.setChamp(o.getString("champ"));
                String libelle = StringUtils.trimToNull(o.optString("libelle"));
                col.setLibelle(libelle != null ? libelle : (String) COLONNES_DISPONIBLES.get(o.getString("champ"))[0]);
                col.setOrdre(o.optInt("ordre", i));
                modele.getColonnes().add(col);
            }
            // Les colonnes de produit ne sont conservees que si le detail est active : desactiver
            // l'option remet le modele exactement dans son etat "une ligne par bon".
            if (detaillerProduits) {
                for (int i = 0; i < colonnesProduit.length(); i++) {
                    JSONObject o = colonnesProduit.getJSONObject(i);
                    ModelFactureDynamiqueColonne col = new ModelFactureDynamiqueColonne();
                    col.setModele(modele);
                    col.setNiveau(ModelFactureDynamiqueColonne.NIVEAU_PRODUIT);
                    col.setChamp(o.getString("champ"));
                    String libelle = StringUtils.trimToNull(o.optString("libelle"));
                    col.setLibelle(libelle != null ? libelle
                            : (String) COLONNES_PRODUIT_DISPONIBLES.get(o.getString("champ"))[0]);
                    col.setOrdre(o.optInt("ordre", i));
                    modele.getColonnes().add(col);
                }
            }
            if (modele.getId() == null) {
                em.persist(modele);
            } else {
                em.merge(modele);
            }
            em.flush();
            // Le modele doit apparaitre dans la liste des modeles de facture de la fiche tiers
            // payant : on tient a jour la ligne t_model_facture qui le represente.
            synchroniserModelFacture(em, modele);
            em.getTransaction().commit();
            return reponseJson(new JSONObject().put("success", "1").put("errors", "Modèle enregistré"));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "sauvegarde modele dynamique", e);
            return reponseJson(
                    new JSONObject().put("success", "0").put("errors", "Impossible d'enregistrer le modèle"));
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Suppression d'un modele : les tiers payants rattaches retournent au circuit Jasper historique. */
    @POST
    @Path("delete")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response delete(@FormParam("id") int id) {
        if (utilisateurSession() == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        try {
            odm.initEntityManager();
            EntityManager em = odm.getEm();
            em.getTransaction().begin();
            ModelFactureDynamique modele = em.find(ModelFactureDynamique.class, id);
            if (modele == null) {
                em.getTransaction().rollback();
                return reponseJson(new JSONObject().put("success", "0").put("errors", "Modèle introuvable"));
            }
            TModelFacture ligne = modelFactureDe(em, id);
            if (ligne != null) {
                // Un modele encore affecte ne se supprime pas : les tiers payants concernes
                // basculeraient sans preavis sur le modele standard, et leurs prochaines factures
                // partiraient chez l'organisme dans une presentation qu'il n'attend pas. On refuse,
                // en NOMMANT les tiers payants a retirer d'abord.
                List<TTiersPayant> rattaches = em.createQuery(
                        "SELECT t FROM TTiersPayant t WHERE t.lgMODELFACTUREID = ?1 " + "ORDER BY t.strFULLNAME",
                        TTiersPayant.class).setParameter(1, ligne).getResultList();
                if (!rattaches.isEmpty()) {
                    em.getTransaction().rollback();
                    StringBuilder noms = new StringBuilder();
                    for (int i = 0; i < rattaches.size() && i < 5; i++) {
                        noms.append(i > 0 ? ", " : "")
                                .append(StringUtils.defaultString(rattaches.get(i).getStrFULLNAME()));
                    }
                    if (rattaches.size() > 5) {
                        noms.append("... et ").append(rattaches.size() - 5).append(" autre(s)");
                    }
                    return reponseJson(new JSONObject().put("success", "0").put("errors",
                            "Suppression impossible : ce modèle est encore affecté à " + rattaches.size()
                                    + " tiers payant(s) (" + noms + "). Retirez-les du modèle avant de le supprimer."));
                }
                em.remove(em.contains(ligne) ? ligne : em.merge(ligne));
            }
            em.remove(modele);
            em.getTransaction().commit();
            return reponseJson(new JSONObject().put("success", "1").put("errors", "Modèle supprimé"));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "suppression modele dynamique", e);
            return reponseJson(new JSONObject().put("success", "0").put("errors", "Impossible de supprimer le modèle"));
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Tiers payants rattaches a un modele. */
    @GET
    @Path("tiers-payants")
    public Response tiersPayants(@QueryParam("modelId") int modelId) {
        if (utilisateurSession() == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        try {
            odm.initEntityManager();
            List<TTiersPayant> tps = odm.getEm().createQuery(
                    "SELECT t FROM TTiersPayant t WHERE t.lgMODELFACTUREID.modelFactureDynamiqueId = ?1 ORDER BY t.strFULLNAME",
                    TTiersPayant.class).setParameter(1, modelId).getResultList();
            JSONArray data = new JSONArray();
            for (TTiersPayant tp : tps) {
                data.put(new JSONObject().put("lg_TIERS_PAYANT_ID", tp.getLgTIERSPAYANTID()).put("str_FULLNAME",
                        tp.getStrFULLNAME()));
            }
            return reponseJson(new JSONObject().put("data", data).put("total", data.length()));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "tiers payants du modele", e);
            return reponseJson(new JSONObject().put("data", new JSONArray()).put("total", 0));
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Rattache (modelId > 0) ou detache (modelId vide) un tiers payant d'un modele dynamique. */
    @POST
    @Path("assigner")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response assigner(@FormParam("lg_TIERS_PAYANT_ID") String tiersPayantId,
            @DefaultValue("") @FormParam("modelId") String modelIdParam) {
        if (utilisateurSession() == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        try {
            odm.initEntityManager();
            EntityManager em = odm.getEm();
            TTiersPayant tp = em.find(TTiersPayant.class, StringUtils.defaultString(tiersPayantId));
            if (tp == null) {
                return reponseJson(new JSONObject().put("success", "0").put("errors", "Tiers payant introuvable"));
            }
            Integer modelId = null;
            if (StringUtils.isNotBlank(modelIdParam)) {
                modelId = Integer.valueOf(modelIdParam);
                if (em.find(ModelFactureDynamique.class, modelId) == null) {
                    return reponseJson(new JSONObject().put("success", "0").put("errors", "Modèle introuvable"));
                }
            }
            em.getTransaction().begin();
            // L'affectation passe par le modele de facture de la fiche tiers payant (un seul
            // endroit d'affectation, comme pour les modeles Jasper historiques).
            // modelId est NULL au detachement (bouton "retirer") : le tester avant de le comparer,
            // sinon Java le deballe et leve un NullPointerException - la transaction restait alors
            // ouverte et le retrait n'a jamais fonctionne.
            if (modelId != null && modelId > 0) {
                TModelFacture ligne = modelFactureDe(em, modelId);
                if (ligne == null) {
                    em.getTransaction().rollback();
                    return reponseJson(new JSONObject().put("success", "0").put("errors",
                            "Modèle introuvable dans la liste des modèles de facture"));
                }
                tp.setLgMODELFACTUREID(ligne);
            } else {
                // retrait : retour au modele de facture standard
                TModelFacture standard = em.find(TModelFacture.class, commonparameter.PROCESS_SUCCESS);
                if (standard == null) {
                    em.getTransaction().rollback();
                    return reponseJson(new JSONObject().put("success", "0").put("errors",
                            "Retrait impossible : le modèle de facture standard (n° 1) est introuvable "
                                    + "dans la liste des modèles de facture."));
                }
                tp.setLgMODELFACTUREID(standard);
            }
            em.merge(tp);
            em.getTransaction().commit();
            return reponseJson(new JSONObject().put("success", "1").put("errors",
                    modelId != null && modelId > 0 ? "Tiers payant rattaché au modèle"
                            : "Tiers payant retiré du modèle : il revient au modèle de facture standard."));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "assignation modele dynamique", e);
            return reponseJson(new JSONObject().put("success", "0").put("errors", "Opération impossible"));
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Edition PDF d'une facture selon le modele dynamique du tiers payant. */
    @GET
    @Path("pdf/{factureId}")
    @Produces("application/pdf")
    public Response pdf(@PathParam("factureId") String factureId) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        dataManager odm = new dataManager();
        try {
            odm.initEntityManager();
            EntityManager em = odm.getEm();
            TFacture facture = em.find(TFacture.class, factureId);
            if (facture == null) {
                return Response.status(Response.Status.NOT_FOUND).build();
            }
            TTiersPayant tiersPayant = em.find(TTiersPayant.class, facture.getStrCUSTOMER());
            // Le modele dynamique est porte par le modele de facture affecte au tiers payant
            // (fiche tiers payant, champ "Code.Edit.Bordereau")
            Integer idModeleDyn = tiersPayant != null && tiersPayant.getLgMODELFACTUREID() != null
                    ? tiersPayant.getLgMODELFACTUREID().getModelFactureDynamiqueId() : null;
            ModelFactureDynamique modele = idModeleDyn != null ? em.find(ModelFactureDynamique.class, idModeleDyn)
                    : null;
            if (modele == null) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("Aucun modèle de facture dynamique pour ce tiers payant").type("text/plain").build();
            }
            byte[] pdf = genererPdf(em, facture, tiersPayant, modele);
            // Nom de fichier : Facture_<tiers payant>_<numero>.pdf. Sans le nom de l'organisme, un
            // dossier de factures editees dans la journee ne se relit pas.
            String nomFichier = nomFichierFacture(
                    tiersPayant != null
                            ? StringUtils.defaultIfBlank(tiersPayant.getStrNAME(), tiersPayant.getStrFULLNAME()) : null,
                    facture.getStrCODEFACTURE());
            return Response.ok(pdf, "application/pdf")
                    .header("Content-Disposition", "inline; filename=\"" + nomFichier + "\"").build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "pdf modele dynamique", e);
            return Response.serverError().entity("Erreur lors de la génération de la facture").type("text/plain")
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Export du modele au format JasperReports (.jrxml).
     *
     * Le fichier produit reprend la presentation du modele de reference de l'officine (en-tete, bandeau de colonnes
     * gris, lignes encadrees, pied de page numerote, bloc de synthese) et embarque sa requete SQL : il peut donc etre
     * ouvert et retouche dans Jaspersoft Studio, puis depose dans le dossier des etats du serveur.
     */
    @GET
    @Path("jrxml/{id}")
    @Produces(MediaType.APPLICATION_XML)
    public Response exporterJrxml(@PathParam("id") int id) {
        if (utilisateurSession() == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        dataManager odm = new dataManager();
        try {
            odm.initEntityManager();
            ModelFactureDynamique modele = odm.getEm().find(ModelFactureDynamique.class, id);
            if (modele == null) {
                return Response.status(Response.Status.NOT_FOUND).entity("Modèle introuvable").type("text/plain")
                        .build();
            }
            String xml = JrxmlFactureBuilder.construire(modele, modele.isAfficherEntete(), modele.isAfficherPiedPage());
            return Response.ok(xml, MediaType.APPLICATION_XML).header("Content-Disposition",
                    "attachment; filename=" + JrxmlFactureBuilder.nomRapport(modele) + ".jrxml").build();
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).type("text/plain").build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "export jrxml modele dynamique", e);
            return Response.serverError().entity("Impossible de générer le fichier de mise en page").type("text/plain")
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    // =============================================================================================
    // Generation PDF (iText) : memes donnees que le bordereau historique (TFactureDetail +
    // TPreenregistrementCompteClientTiersPayent), colonnes/libelles/ordre/tri pilotes par le modele.
    // =============================================================================================

    private static class LigneFacture {
        TFactureDetail detail;
        TPreenregistrementCompteClientTiersPayent dossier;
    }

    /*
     * Palette du modele 0202, celle des etats retravailles pour l'officine. Le PDF produit par le createur de modeles
     * doit se presenter comme eux : bandeau de colonnes bleu marine, lignes alternees, filet fin sous chaque ligne,
     * bloc de totaux sur fond bleu pale. Les valeurs sont copiees telles quelles depuis rp_facture_0202.jrxml pour que
     * les deux se ressemblent vraiment, et non « a peu pres ».
     */
    /** Bandeau des colonnes et filets structurants. */
    private static final BaseColor MARINE = new BaseColor(30, 58, 95);
    /** Fond d'une ligne sur deux. */
    private static final BaseColor ZEBRE = new BaseColor(242, 246, 250);
    /** Filet fin sous chaque ligne de donnees. */
    private static final BaseColor FILET = new BaseColor(214, 222, 232);
    /** Fond du bloc de totaux. */
    private static final BaseColor FOND_TOTAL = new BaseColor(221, 230, 240);
    /** Fond du sous-tableau des produits. */
    private static final BaseColor FOND_PRODUIT = new BaseColor(247, 249, 252);
    /** Filet vert-bleu qui borde a gauche le cartouche de la facture. */
    private static final BaseColor SARCELLE = new BaseColor(72, 169, 166);
    /** Fond du cartouche de la facture. */
    private static final BaseColor FOND_CARTOUCHE = new BaseColor(237, 242, 248);
    /** Gris-bleu des mentions secondaires de l'en-tete. */
    private static final BaseColor ENCRE_DOUCE = new BaseColor(90, 107, 125);
    /** Marge haute du modele de reference : l'en-tete repete commence juste en dessous. */
    private static final float MARGE_HAUTE = 20f;

    private byte[] genererPdf(EntityManager em, TFacture facture, TTiersPayant tiersPayant,
            ModelFactureDynamique modele) throws Exception {
        List<TFactureDetail> details = em
                .createQuery("SELECT t FROM TFactureDetail t WHERE t.lgFACTUREID.lgFACTUREID = ?1",
                        TFactureDetail.class)
                .setParameter(1, facture.getLgFACTUREID()).getResultList();
        List<LigneFacture> lignes = new ArrayList<>();
        for (TFactureDetail d : details) {
            TPreenregistrementCompteClientTiersPayent p = em.find(TPreenregistrementCompteClientTiersPayent.class,
                    d.getStrREF());
            if (p == null) {
                continue;
            }
            LigneFacture l = new LigneFacture();
            l.detail = d;
            l.dossier = p;
            lignes.add(l);
        }
        lignes.sort(comparateur(modeTriEffectif(modele, tiersPayant)));

        List<ModelFactureDynamiqueColonne> colonnes = modele.getColonnesBon();
        List<ModelFactureDynamiqueColonne> colonnesProduit = modele.isDetaillerProduits() ? modele.getColonnesProduit()
                : new ArrayList<>();

        TOfficine officine = em.find(TOfficine.class, "1");

        // Polices calquees sur le modele de reference de l'officine (rp_facture) : titre en grand,
        // bandeau de colonnes en 7 gras, lignes en 8.
        Font fontInstitution = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, MARINE);
        Font fontSousTitre = FontFactory.getFont(FontFactory.HELVETICA, 8, ENCRE_DOUCE);
        Font fontEnteteColonne = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7, BaseColor.WHITE);
        Font fontCellule = FontFactory.getFont(FontFactory.HELVETICA, 8);
        Font fontTotal = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, MARINE);
        Font fontBloc = FontFactory.getFont(FontFactory.HELVETICA, 8);
        Font fontBlocGras = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8);
        Font fontSignature = FontFactory.getFont(FontFactory.COURIER_BOLD, 8);
        fontSignature.setStyle(Font.UNDERLINE);
        BaseColor gris = new BaseColor(204, 204, 204);

        /*
         * L'en-tete est peint sur CHAQUE page, et non ajoute une seule fois au fil du document. Une facture qui tient
         * sur cinq pages doit rappeler sur chacune de quelle officine elle vient, quel est son numero et a quel
         * organisme elle s'adresse : la page 2 arrivait jusqu'ici avec le seul bandeau des colonnes.
         */
        PdfPTable entete = modele.isAfficherEntete()
                ? construireEntete(facture, tiersPayant, officine, fontInstitution, fontSousTitre) : null;
        float hauteurEntete = 0f;
        if (entete != null) {
            entete.setTotalWidth(PageSize.A4.getWidth() - 10);
            entete.setLockedWidth(true);
            hauteurEntete = entete.getTotalHeight();
        }

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        // Marges du modele de reference : 5 pt lateralement, 20 pt en bas. En haut, la place de
        // l'en-tete repete, plus les 20 pt du modele.
        Document document = new Document(PageSize.A4, 5, 5, MARGE_HAUTE + hauteurEntete + 8,
                modele.isAfficherPiedPage() ? 40 : 20);
        PdfWriter writer = PdfWriter.getInstance(document, out);
        writer.setPageEvent(new HabillagePage(entete, modele.isAfficherPiedPage() ? gris : null));
        document.open();

        // Largeurs partagees avec le fichier .jrxml : les deux presentations decoupent la page de
        // la meme facon, et chaque colonne recoit d'abord de quoi ne pas couper son contenu.
        int[] points = JrxmlFactureBuilder.largeursColonnes(colonnes);
        float[] largeurs = new float[points.length];
        for (int i = 0; i < points.length; i++) {
            largeurs[i] = points[i];
        }
        PdfPTable table = new PdfPTable(largeurs);
        table.setWidthPercentage(100);
        table.setHeaderRows(1);
        for (ModelFactureDynamiqueColonne c : colonnes) {
            PdfPCell cell = new PdfPCell(new Phrase(StringUtils.upperCase(c.getLibelle()), fontEnteteColonne));
            // Un libelle de montant est cadre a droite, comme la colonne qu'il coiffe : c'est ce
            // qui fait qu'on lit une colonne de chiffres sans hesiter.
            cell.setHorizontalAlignment(estNumerique(c.getChamp()) ? Element.ALIGN_RIGHT : Element.ALIGN_CENTER);
            cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cell.setBackgroundColor(MARINE);
            cell.setBorder(Rectangle.NO_BORDER);
            cell.setMinimumHeight(18f);
            cell.setPaddingTop(3f);
            cell.setPaddingBottom(3f);
            cell.setPaddingLeft(3f);
            cell.setPaddingRight(4f);
            table.addCell(cell);
        }

        Map<String, Long> totaux = new LinkedHashMap<>();
        int numero = 1;
        for (LigneFacture l : lignes) {
            // Une ligne sur deux sur fond bleu tres pale : c'est ce qui permet de suivre une ligne
            // du regard jusqu'au bout sur une facture large, sans quadriller toute la page.
            boolean paire = numero % 2 == 0;
            for (ModelFactureDynamiqueColonne c : colonnes) {
                String champ = c.getChamp();
                PdfPCell cell = new PdfPCell(new Phrase(valeurChamp(champ, l, numero), fontCellule));
                cell.setHorizontalAlignment(alignement(champ));
                cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                cell.setBorder(Rectangle.BOTTOM);
                cell.setBorderColorBottom(FILET);
                cell.setBorderWidthBottom(0.25f);
                if (paire) {
                    cell.setBackgroundColor(ZEBRE);
                }
                cell.setMinimumHeight(14f);
                cell.setPaddingTop(2f);
                cell.setPaddingBottom(2f);
                cell.setPaddingLeft(3f);
                cell.setPaddingRight(4f);
                if (estNumerique(champ)) {
                    totaux.merge(champ, valeurNumerique(champ, l), Long::sum);
                }
                table.addCell(cell);
            }
            // Detail des produits : les lignes de vente du bon s'inserent JUSTE SOUS sa ligne,
            // dans un tableau imbrique en retrait, pour rester rattachees visuellement au bon.
            if (!colonnesProduit.isEmpty()) {
                PdfPTable sousTable = tableauProduits(em, l, colonnesProduit, gris);
                if (sousTable != null) {
                    PdfPCell porteur = new PdfPCell(sousTable);
                    porteur.setColspan(colonnes.size());
                    porteur.setBorder(Rectangle.BOTTOM);
                    porteur.setBorderColorBottom(FILET);
                    porteur.setBorderWidthBottom(0.25f);
                    porteur.setPaddingLeft(14f);
                    porteur.setPaddingTop(1f);
                    porteur.setPaddingBottom(3f);
                    table.addCell(porteur);
                }
            }
            numero++;
        }
        document.add(table);

        // Ligne des totaux, alignee sur les memes colonnes : le libelle TOTAUX occupe les colonnes
        // non numeriques de gauche, chaque colonne numerique porte sa somme.
        if (colonnes.stream().anyMatch(c -> estNumerique(c.getChamp()))) {
            PdfPTable totalTable = new PdfPTable(largeurs);
            totalTable.setWidthPercentage(100);
            totalTable.setSpacingBefore(4f);
            boolean libellePose = false;
            int i = 0;
            while (i < colonnes.size()) {
                ModelFactureDynamiqueColonne c = colonnes.get(i);
                if (estNumerique(c.getChamp())) {
                    PdfPCell cell = new PdfPCell(new Phrase(
                            conversion.AmountFormat(totaux.getOrDefault(c.getChamp(), 0L).intValue()), fontTotal));
                    cell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                    habillerTotal(cell);
                    totalTable.addCell(cell);
                    i++;
                } else {
                    int fusion = 0;
                    while (i + fusion < colonnes.size() && !estNumerique(colonnes.get(i + fusion).getChamp())) {
                        fusion++;
                    }
                    PdfPCell cell = new PdfPCell(new Phrase(libellePose ? "" : "TOTAUX", fontTotal));
                    cell.setColspan(fusion);
                    habillerTotal(cell);
                    totalTable.addCell(cell);
                    libellePose = true;
                    i += fusion;
                }
            }
            document.add(totalTable);
        }

        double montantNet = facture.getDblMONTANTCMDE() != null ? facture.getDblMONTANTCMDE() : 0d;
        Paragraph totalGeneral = new Paragraph(
                "TOTAL GENERAL " + (tiersPayant != null ? StringUtils.defaultString(tiersPayant.getStrNAME()) : "")
                        + " ( NOMBRE DE BONS=" + lignes.size() + " )",
                fontBlocGras);
        totalGeneral.setSpacingBefore(12);
        document.add(totalGeneral);
        Paragraph libelleLettres = new Paragraph("ARRETE LA PRESENTE FACTURE A LA SOMME DE (en lettres) :",
                fontBlocGras);
        libelleLettres.setSpacingBefore(8);
        document.add(libelleLettres);
        document.add(new Paragraph(conversion.GetNumberTowords(montantNet).toUpperCase() + " ("
                + conversion.AmountFormat((int) montantNet) + " FCFA)", fontBlocGras));

        Paragraph signature = new Paragraph("LE PHARMACIEN", fontSignature);
        signature.setAlignment(Element.ALIGN_RIGHT);
        signature.setSpacingBefore(20);
        document.add(signature);

        document.close();
        return out.toByteArray();
    }

    /**
     * Lignes de vente (produits) d'un bon, sous forme de tableau imbrique place sous la ligne du bon.
     *
     * Renvoie null quand le bon n'a aucune ligne de vente : aucune bande vide n'est alors inseree.
     */
    private PdfPTable tableauProduits(EntityManager em, LigneFacture ligne,
            List<ModelFactureDynamiqueColonne> colonnesProduit, BaseColor gris) {
        TPreenregistrement vente = ligne.dossier.getLgPREENREGISTREMENTID();
        if (vente == null) {
            return null;
        }
        List<TPreenregistrementDetail> produits = em
                .createQuery(
                        "SELECT d FROM TPreenregistrementDetail d "
                                + "WHERE d.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID = ?1 ORDER BY d.dtCREATED",
                        TPreenregistrementDetail.class)
                .setParameter(1, vente.getLgPREENREGISTREMENTID()).getResultList();
        if (produits.isEmpty()) {
            return null;
        }
        float[] largeurs = new float[colonnesProduit.size()];
        for (int i = 0; i < colonnesProduit.size(); i++) {
            largeurs[i] = largeurRelativeProduit(colonnesProduit.get(i).getChamp());
        }
        PdfPTable sousTable = new PdfPTable(largeurs);
        sousTable.setWidthPercentage(100);
        // Le sous-tableau des produits reste discret : c'est le detail d'un bon, pas un second
        // tableau principal. Fond tres pale, libelles en italique, aucun cadre.
        Font fontEnteteProduit = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 6.5f, MARINE);
        for (ModelFactureDynamiqueColonne c : colonnesProduit) {
            PdfPCell cell = new PdfPCell(new Phrase(c.getLibelle(), fontEnteteProduit));
            cell.setHorizontalAlignment(alignementProduit(c.getChamp()));
            cell.setBackgroundColor(FOND_PRODUIT);
            cell.setBorder(Rectangle.BOTTOM);
            cell.setBorderColorBottom(FILET);
            cell.setBorderWidthBottom(0.25f);
            cell.setPaddingTop(1.5f);
            cell.setPaddingBottom(1.5f);
            cell.setPaddingLeft(3f);
            cell.setPaddingRight(4f);
            sousTable.addCell(cell);
        }
        Font fontProduit = FontFactory.getFont(FontFactory.HELVETICA, 7);
        for (TPreenregistrementDetail d : produits) {
            for (ModelFactureDynamiqueColonne c : colonnesProduit) {
                PdfPCell cell = new PdfPCell(new Phrase(valeurChampProduit(c.getChamp(), d), fontProduit));
                cell.setHorizontalAlignment(alignementProduit(c.getChamp()));
                cell.setBorder(Rectangle.NO_BORDER);
                cell.setPaddingTop(1.5f);
                cell.setPaddingBottom(1.5f);
                cell.setPaddingLeft(3f);
                cell.setPaddingRight(4f);
                sousTable.addCell(cell);
            }
        }
        return sousTable;
    }

    /** Largeur relative d'une colonne de produit (proportions du sous-tableau). */
    private static float largeurRelativeProduit(String champ) {
        switch (champ) {
        case "PROD_CIP":
            return 55f;
        case "PROD_DESIGNATION":
            return 160f;
        case "PROD_QUANTITE":
            return 35f;
        default:
            return 60f;
        }
    }

    private static int alignementProduit(String champ) {
        switch (champ) {
        case "PROD_DESIGNATION":
            return Element.ALIGN_LEFT;
        case "PROD_CIP":
        case "PROD_QUANTITE":
            return Element.ALIGN_CENTER;
        default:
            return Element.ALIGN_RIGHT;
        }
    }

    private static String valeurChampProduit(String champ, TPreenregistrementDetail d) {
        TFamille produit = d.getLgFAMILLEID();
        switch (champ) {
        case "PROD_CIP":
            return produit != null ? StringUtils.defaultString(produit.getIntCIP()) : "";
        case "PROD_DESIGNATION":
            return produit != null ? StringUtils.defaultString(produit.getStrDESCRIPTION()) : "";
        case "PROD_QUANTITE":
            return d.getIntQUANTITY() != null ? String.valueOf(d.getIntQUANTITY()) : "";
        case "PROD_PRIX_UNITAIRE":
            return conversion.AmountFormat(d.getIntPRICEUNITAIR() != null ? d.getIntPRICEUNITAIR() : 0);
        case "PROD_MONTANT":
            return conversion.AmountFormat(d.getIntPRICE() != null ? d.getIntPRICE() : 0);
        case "PROD_REMISE":
            return conversion.AmountFormat(d.getIntPRICEREMISE() != null ? d.getIntPRICEREMISE() : 0);
        default:
            return "";
        }
    }

    /** Bloc de totaux : fond bleu pale et filet marine au-dessus, comme le bandeau de total du 0202. */
    private static void habillerTotal(PdfPCell cellule) {
        cellule.setBackgroundColor(FOND_TOTAL);
        cellule.setBorder(Rectangle.TOP);
        cellule.setBorderColorTop(MARINE);
        cellule.setBorderWidthTop(0.6f);
        cellule.setPaddingTop(4f);
        cellule.setPaddingBottom(4f);
        cellule.setPaddingLeft(3f);
        cellule.setPaddingRight(4f);
    }

    /**
     * Bloc d'en-tete repris du modele de reference rp_facture_0202, sous forme de tableau pour pouvoir etre repeint a
     * l'identique en haut de CHAQUE page.
     *
     * <p>
     * Trois bandes : le nom de l'officine et son pharmacien, centres ; un filet bleu marine ; puis le cartouche de la
     * facture (numero et periode sur fond bleu pale a filet vert-bleu) a gauche et l'identification du tiers payant
     * cadree a droite.
     * </p>
     */
    PdfPTable construireEntete(TFacture facture, TTiersPayant tiersPayant, TOfficine officine, Font fontInstitution,
            Font fontSousTitre) {
        PdfPTable entete = new PdfPTable(1);
        entete.setWidthPercentage(100);

        Paragraph identite = new Paragraph();
        if (officine != null) {
            identite.add(new Phrase(StringUtils.defaultString(officine.getStrNOMABREGE()) + "\n", fontInstitution));
            String sousTitre = (StringUtils.defaultString(officine.getStrFIRSTNAME()) + " "
                    + StringUtils.defaultString(officine.getStrLASTNAME())).trim();
            if (StringUtils.isNotBlank(sousTitre)) {
                identite.add(new Phrase(sousTitre, fontSousTitre));
            }
        }
        identite.setAlignment(Element.ALIGN_CENTER);
        PdfPCell celluleIdentite = new PdfPCell(identite);
        celluleIdentite.setBorder(Rectangle.NO_BORDER);
        // Le centrage se regle sur la CELLULE : pose sur le seul paragraphe, il est ignore et le
        // nom de l'officine revient contre le bord gauche.
        celluleIdentite.setHorizontalAlignment(Element.ALIGN_CENTER);
        celluleIdentite.setPaddingBottom(6f);
        entete.addCell(celluleIdentite);

        // Filet bleu marine qui separe l'identite de l'officine du cartouche de la facture.
        PdfPCell filet = new PdfPCell(new Phrase(" ", fontSousTitre));
        filet.setFixedHeight(2f);
        filet.setBorder(Rectangle.NO_BORDER);
        filet.setBackgroundColor(MARINE);
        entete.addCell(filet);

        PdfPCell porteur = new PdfPCell(cartouche(facture, tiersPayant));
        porteur.setBorder(Rectangle.NO_BORDER);
        porteur.setPaddingTop(6f);
        porteur.setPaddingBottom(2f);
        entete.addCell(porteur);
        return entete;
    }

    /**
     * Le cartouche de la facture, repris du modele rp_facture_0202 : le numero et la periode poses sur un rectangle
     * bleu tres pale borde a gauche d'un filet vert-bleu, et en face, cadres a droite, la date puis le tiers payant et
     * ses coordonnees. C'est ce bloc que l'officine reconnait au premier coup d'oeil.
     */
    PdfPTable cartouche(TFacture facture, TTiersPayant tiersPayant) {
        Font fontNumero = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, MARINE);
        Font fontPeriode = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, ENCRE_DOUCE);
        Font fontMention = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, ENCRE_DOUCE);
        Font fontDestinataire = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, MARINE);

        PdfPTable bandeau = new PdfPTable(new float[] { 52f, 48f });
        bandeau.setWidthPercentage(100);

        Paragraph gauche = new Paragraph();
        gauche.add(
                new Phrase("FACTURE N° " + StringUtils.defaultString(facture.getStrCODEFACTURE()) + "\n", fontNumero));
        if (facture.getDtDEBUTFACTURE() != null && facture.getDtFINFACTURE() != null) {
            gauche.add(new Phrase("PERIODE DU " + date.formatterShort.format(facture.getDtDEBUTFACTURE()) + " AU "
                    + date.formatterShort.format(facture.getDtFINFACTURE()), fontPeriode));
        }
        PdfPCell celluleGauche = new PdfPCell(gauche);
        celluleGauche.setBorder(Rectangle.LEFT);
        celluleGauche.setBorderColorLeft(SARCELLE);
        celluleGauche.setBorderWidthLeft(3f);
        celluleGauche.setBackgroundColor(FOND_CARTOUCHE);
        celluleGauche.setPaddingLeft(10f);
        celluleGauche.setPaddingTop(5f);
        celluleGauche.setPaddingBottom(6f);
        bandeau.addCell(celluleGauche);

        Paragraph droite = new Paragraph();
        droite.setAlignment(Element.ALIGN_RIGHT);
        if (facture.getDtCREATED() != null) {
            droite.add(new Phrase(date.FULDATE.format(facture.getDtCREATED()) + "\n", fontMention));
        }
        if (tiersPayant != null) {
            droite.add(new Phrase(StringUtils.defaultString(tiersPayant.getStrFULLNAME()) + "\n", fontDestinataire));
            ajouterLigneBloc(droite, tiersPayant.getStrADRESSE(), fontMention);
            ajouterLigneBloc(droite, tiersPayant.getStrCOMPTECONTRIBUABLE(), fontMention);
            ajouterLigneBloc(droite, tiersPayant.getStrCODEOFFICINE(), fontMention);
            ajouterLigneBloc(droite, tiersPayant.getStrREGISTRECOMMERCE(), fontMention);
        }
        PdfPCell celluleDroite = new PdfPCell(droite);
        celluleDroite.setBorder(Rectangle.NO_BORDER);
        celluleDroite.setHorizontalAlignment(Element.ALIGN_RIGHT);
        celluleDroite.setPaddingLeft(10f);
        bandeau.addCell(celluleDroite);
        return bandeau;
    }

    private static void ajouterLigneBloc(Paragraph bloc, String valeur, Font police) {
        if (StringUtils.isNotBlank(valeur)) {
            bloc.add(new Phrase(valeur + "\n", police));
        }
    }

    /**
     * Ce qui se repete sur chaque page : l'en-tete en haut et, s'il est demande, le pied de page numerote en bas.
     *
     * <p>
     * L'en-tete ne peut pas etre simplement ajoute au fil du document : il ne sortirait alors que sur la premiere page.
     * On le peint donc a chaque changement de page, toujours au meme endroit, la marge haute du document ayant ete
     * reservee pour lui.
     * </p>
     */
    static final class HabillagePage extends PdfPageEventHelper {
        /** null quand le modele n'affiche pas d'en-tete. */
        private final PdfPTable entete;
        /** null quand le modele n'affiche pas de pied de page. */
        private final BaseColor grisPied;

        HabillagePage(PdfPTable entete, BaseColor grisPied) {
            this.entete = entete;
            this.grisPied = grisPied;
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte toile = writer.getDirectContent();
            if (entete != null) {
                // Le tableau se dessine vers le BAS a partir de l'ordonnee donnee : on part donc
                // du haut de la page, sous la marge du modele de reference.
                entete.writeSelectedRows(0, -1, document.left(), document.getPageSize().getHeight() - MARGE_HAUTE,
                        toile);
            }
            if (grisPied == null) {
                return;
            }
            Font police = FontFactory.getFont(FontFactory.HELVETICA, 8);
            float y = document.bottom() - 14;
            toile.saveState();
            toile.setColorFill(grisPied);
            toile.rectangle(document.left(), y + 14, document.right() - document.left(), 2);
            toile.fill();
            toile.restoreState();
            ColumnText.showTextAligned(toile, Element.ALIGN_CENTER,
                    new Phrase("Page " + writer.getPageNumber(), police), (document.left() + document.right()) / 2, y,
                    0);
        }
    }

    /**
     * Rend un libelle utilisable dans un nom de fichier : accents retires, et tout ce qui n'est ni lettre ni chiffre
     * remplace par un souligne. Un nom d'organisme comporte souvent des espaces, des apostrophes ou des points, que
     * certains navigateurs et systemes de fichiers refusent.
     */
    /**
     * Nom du fichier PDF d'une facture : "Facture_ASCOMA_COTE_D_IVOIRE_FA0012.pdf".
     *
     * Les parties vides sont ecartees : un tiers payant sans libelle ne produit pas de "__" au milieu du nom, et une
     * facture sans numero ne laisse pas le nom se terminer par un blanc.
     */
    static String nomFichierFacture(String tiersPayant, String numeroFacture) {
        StringBuilder nom = new StringBuilder("Facture");
        for (String partie : new String[] { nettoyerPourNomDeFichier(tiersPayant),
                nettoyerPourNomDeFichier(numeroFacture) }) {
            if (!partie.isEmpty()) {
                nom.append('_').append(partie);
            }
        }
        return nom.append(".pdf").toString();
    }

    static String nettoyerPourNomDeFichier(String libelle) {
        String sansAccent = Normalizer.normalize(StringUtils.defaultString(libelle), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return StringUtils.strip(sansAccent.replaceAll("[^A-Za-z0-9]+", "_"), "_");
    }

    private static String normaliserModeTri(String modeTri) {
        if (ModelFactureDynamique.TRI_ALPHABETIQUE.equalsIgnoreCase(StringUtils.trimToEmpty(modeTri))) {
            return ModelFactureDynamique.TRI_ALPHABETIQUE;
        }
        if (ModelFactureDynamique.TRI_DATE_BON.equalsIgnoreCase(StringUtils.trimToEmpty(modeTri))) {
            return ModelFactureDynamique.TRI_DATE_BON;
        }
        return ModelFactureDynamique.TRI_SELON_TIERS_PAYANT;
    }

    /** Tri effectif : celui du modele, ou celui de la fiche du tiers payant quand le modele suit la fiche. */
    private static String modeTriEffectif(ModelFactureDynamique modele, TTiersPayant tiersPayant) {
        if (!ModelFactureDynamique.TRI_SELON_TIERS_PAYANT.equals(modele.getModeTri())) {
            return modele.getModeTri();
        }
        String triTp = tiersPayant != null ? tiersPayant.getStrMODETRIFACTURE() : null;
        return rest.report.TriFacture.parDateDeBon(triTp) == 1 ? ModelFactureDynamique.TRI_DATE_BON
                : ModelFactureDynamique.TRI_ALPHABETIQUE;
    }

    private static Comparator<LigneFacture> comparateur(String modeTri) {
        if (ModelFactureDynamique.TRI_DATE_BON.equals(modeTri)) {
            return Comparator.comparing(l -> l.dossier.getDtCREATED(), Comparator.nullsLast(Comparator.naturalOrder()));
        }
        return Comparator.comparing(ModelFactureDynamiqueRessource::nomCompletNormalise);
    }

    private static String nomCompletNormalise(LigneFacture l) {
        TPreenregistrement pre = l.dossier.getLgPREENREGISTREMENTID();
        // NOM puis PRENOM, comme l'ORDER BY de l'etat genere. L'apercu du createur de modeles
        // classait par prenom : le meme modele donnait donc deux ordres differents selon qu'on
        // regardait l'apercu ou la facture reellement editee.
        //
        // Dans cette base, str_FIRST_NAME porte le NOM et str_LAST_NAME les PRENOMS : la fiche
        // client libelle "Nom" le champ strFIRSTNAME et "Prenom" le champ strLASTNAME. Le nom
        // complet se compose donc FIRST puis LAST, et non l'inverse.
        String nom = (StringUtils.defaultString(pre.getStrFIRSTNAMECUSTOMER()) + " "
                + StringUtils.defaultString(pre.getStrLASTNAMECUSTOMER())).trim();
        return Normalizer.normalize(nom, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toUpperCase();
    }

    /** Alignement d'une colonne : montants a droite, references et dates centrees, textes a gauche. */
    private static int alignement(String champ) {
        if (estNumerique(champ)) {
            return Element.ALIGN_RIGHT;
        }
        switch (champ) {
        case "NUMERO":
        case "DATE_BON":
        case "REF_BON":
        case "MATRICULE":
        case "REF_VENTE":
        case "TAUX":
            return Element.ALIGN_CENTER;
        default:
            return Element.ALIGN_LEFT;
        }
    }

    private static boolean estNumerique(String champ) {
        Object[] def = COLONNES_DISPONIBLES.get(champ);
        return def != null && (Boolean) def[1];
    }

    private static long valeurNumerique(String champ, LigneFacture l) {
        TPreenregistrement pre = l.dossier.getLgPREENREGISTREMENTID();
        switch (champ) {
        case "MONTANT_BRUT":
            return pre.getIntPRICE() != null ? pre.getIntPRICE() : 0L;
        case "REMISE":
            long remise = l.detail.getDblMONTANTREMISE() != null ? l.detail.getDblMONTANTREMISE().longValue() : 0L;
            if (remise == 0 && pre.getIntPRICEREMISE() != null) {
                remise = pre.getIntPRICEREMISE();
            }
            return remise;
        case "PART_CLIENT":
            return pre.getIntCUSTPART() != null ? pre.getIntCUSTPART() : 0L;
        case "PART_TIERS_PAYANT":
            return l.detail.getDblMONTANT() != null ? l.detail.getDblMONTANT().longValue() : 0L;
        default:
            return 0L;
        }
    }

    private static String valeurChamp(String champ, LigneFacture l, int numero) {
        TPreenregistrement pre = l.dossier.getLgPREENREGISTREMENTID();
        switch (champ) {
        case "NUMERO":
            return String.valueOf(numero);
        case "DATE_BON":
            return l.dossier.getDtCREATED() != null ? date.formatterShort.format(l.dossier.getDtCREATED()) : "";
        case "REF_BON":
            return StringUtils.defaultString(l.dossier.getStrREFBON());
        case "NOM_CLIENT":
            return StringUtils.defaultString(pre.getStrFIRSTNAMECUSTOMER());
        case "PRENOM_CLIENT":
            return StringUtils.defaultString(pre.getStrLASTNAMECUSTOMER());
        case "NOM_COMPLET":
            return (StringUtils.defaultString(pre.getStrFIRSTNAMECUSTOMER()) + " "
                    + StringUtils.defaultString(pre.getStrLASTNAMECUSTOMER())).trim();
        case "MATRICULE":
            return StringUtils.defaultString(pre.getStrNUMEROSECURITESOCIAL());
        case "REF_VENTE":
            return StringUtils.defaultString(pre.getStrREF());
        case "TAUX":
            return l.dossier.getIntPERCENT() != null ? String.valueOf(l.dossier.getIntPERCENT()) : "";
        default:
            return conversion.AmountFormat((int) valeurNumerique(champ, l));
        }
    }

    /**
     * Recherche de tiers payants pour l'ecran d'affectation : renvoie le modele actuellement affecte a chacun, pour
     * voir d'un coup d'oeil ce qui va changer avant de valider une affectation de masse.
     *
     * <p>
     * Trois parametres facultatifs completent le critere de nom :
     * <ul>
     * <li><b>groupeId</b> : ne garder que les tiers payants d'un groupe (0 ou absent = tous les groupes) ;
     * <li><b>limit</b> : taille de page, 100 par defaut ;
     * <li><b>tout</b> : ignorer la pagination et renvoyer TOUTES les correspondances. C'est ce que demande le bouton
     * "Tout cocher" de l'ecran d'affectation, qui doit cocher le resultat complet de la recherche et pas seulement la
     * page affichee.
     * </ul>
     */
    @GET
    @Path("rechercher-tiers-payants")
    public Response rechercherTiersPayants(@DefaultValue("") @QueryParam("query") String query,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("100") @QueryParam("limit") int limit,
            @DefaultValue("0") @QueryParam("groupeId") int groupeId,
            @DefaultValue("false") @QueryParam("tout") boolean tout) {
        if (utilisateurSession() == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        try {
            odm.initEntityManager();
            EntityManager em = odm.getEm();
            String recherche = "%" + StringUtils.defaultString(query).trim() + "%";
            String filtre = "FROM TTiersPayant t WHERE (t.strFULLNAME LIKE ?1 OR t.strNAME LIKE ?1) "
                    + "AND t.strSTATUT = ?2";
            // groupeId <= 0 : aucun filtre de groupe. La valeur -1 est celle de la ligne
            // "Tous les groupes" des autres ecrans, on la traite donc comme une absence de filtre.
            boolean parGroupe = groupeId > 0;
            if (parGroupe) {
                filtre += " AND t.lgGROUPEID.lgGROUPEID = ?3";
            }
            // Le nombre TOTAL de correspondances, et non le nombre de lignes de la page : sans lui,
            // l'ecran affichait "25 sur 25" alors que la recherche en trouvait 45, et les 20 autres
            // etaient inatteignables.
            javax.persistence.TypedQuery<Long> requeteTotal = em.createQuery("SELECT COUNT(t) " + filtre, Long.class)
                    .setParameter(1, recherche).setParameter(2, commonparameter.statut_enable);
            javax.persistence.TypedQuery<TTiersPayant> requeteLignes = em
                    .createQuery("SELECT t " + filtre + " ORDER BY t.strFULLNAME", TTiersPayant.class)
                    .setParameter(1, recherche).setParameter(2, commonparameter.statut_enable);
            if (parGroupe) {
                requeteTotal.setParameter(3, groupeId);
                requeteLignes.setParameter(3, groupeId);
            }
            long total = requeteTotal.getSingleResult();
            if (!tout) {
                requeteLignes.setFirstResult(Math.max(0, start)).setMaxResults(limit > 0 ? limit : 100);
            }
            List<TTiersPayant> tps = requeteLignes.getResultList();
            JSONArray data = new JSONArray();
            for (TTiersPayant tp : tps) {
                JSONObject json = new JSONObject();
                json.put("lg_TIERS_PAYANT_ID", tp.getLgTIERSPAYANTID());
                json.put("str_FULLNAME", tp.getStrFULLNAME());
                String modeleActuel = "";
                boolean dynamique = false;
                if (tp.getLgMODELFACTUREID() != null) {
                    modeleActuel = StringUtils.defaultString(tp.getLgMODELFACTUREID().getStrDESCRIPTION());
                    if (StringUtils.isBlank(modeleActuel)) {
                        modeleActuel = StringUtils.defaultString(tp.getLgMODELFACTUREID().getStrVALUE());
                    }
                    dynamique = tp.getLgMODELFACTUREID().isDynamique();
                }
                json.put("MODELE_ACTUEL", modeleActuel);
                json.put("EST_DYNAMIQUE", dynamique);
                json.put("isChecked", false);
                data.put(json);
            }
            return reponseJson(new JSONObject().put("data", data).put("total", total));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "recherche tiers payants pour affectation", e);
            return reponseJson(new JSONObject().put("data", new JSONArray()).put("total", 0));
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Affectation d'un modele a PLUSIEURS tiers payants en une fois (liste d'identifiants issue de la recherche).
     * modelId = 0 retire le modele dynamique et remet le modele Jasper par defaut.
     */
    @POST
    @Path("assigner-masse")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response assignerMasse(@DefaultValue("0") @FormParam("modelId") int modelId,
            @DefaultValue("[]") @FormParam("tiersPayants") String tiersPayantsParam) {
        if (utilisateurSession() == null) {
            return reponseDeconnecte();
        }
        JSONArray ids;
        try {
            ids = new JSONArray(tiersPayantsParam);
        } catch (Exception e) {
            return reponseJson(new JSONObject().put("success", "0").put("errors", "Liste de tiers payants invalide"));
        }
        if (ids.length() == 0) {
            return reponseJson(
                    new JSONObject().put("success", "0").put("errors", "Sélectionnez au moins un tiers payant"));
        }
        dataManager odm = new dataManager();
        try {
            odm.initEntityManager();
            EntityManager em = odm.getEm();
            TModelFacture cible;
            if (modelId > 0) {
                cible = modelFactureDe(em, modelId);
                if (cible == null) {
                    return reponseJson(new JSONObject().put("success", "0").put("errors",
                            "Modèle introuvable dans la liste des modèles de facture"));
                }
            } else {
                cible = em.find(TModelFacture.class, commonparameter.PROCESS_SUCCESS);
            }
            em.getTransaction().begin();
            int affectes = 0;
            for (int i = 0; i < ids.length(); i++) {
                String id = ids.optString(i);
                if (StringUtils.isBlank(id)) {
                    continue;
                }
                TTiersPayant tp = em.find(TTiersPayant.class, id);
                if (tp != null) {
                    tp.setLgMODELFACTUREID(cible);
                    em.merge(tp);
                    affectes++;
                }
            }
            em.getTransaction().commit();
            return reponseJson(new JSONObject().put("success", "1").put("total", affectes).put("errors",
                    affectes + " tiers payant(s) mis à jour"));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "affectation de masse modele dynamique", e);
            return reponseJson(new JSONObject().put("success", "0").put("errors", "Impossible d'affecter le modèle"));
        } finally {
            odm.closeEntityManager();
        }
    }
}
