/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import bll.Util;
import bll.tierspayantManagement.tierspayantManagement;
import dal.TPrivilege;
import dal.TUser;
import dal.dataManager;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.FormParam;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.TiersPayantService;
import toolkits.parameters.commonparameter;
import util.Constant;
import util.DateConverter;

/**
 *
 * @author koben
 */
@Path("v1/tierspayant")
@Produces("application/json")
@Consumes("application/json")
public class TiersPayantRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private TiersPayantService tiersPayantService;

    @GET
    @Path("list")
    @Produces("application/json")
    public Response fetchList(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query, @QueryParam(value = "search_value") String search,
            @QueryParam(value = "lg_TYPE_TIERS_PAYANT_ID") String typeTierspayant,
            @QueryParam(value = "cmb_TYPE_TIERS_PAYANT") String id) {
        HttpSession hs = servletRequest.getSession();
        List<TPrivilege> privileges = (List<TPrivilege>) hs.getAttribute(Constant.USER_LIST_PRIVILEGE);
        boolean delete = DateConverter.hasAuthorityById(privileges, Util.ACTIONDELETE);
        boolean btnDesactive = DateConverter.hasAuthorityByName(privileges, Constant.P_BTN_DESACTIVER_TIERS_PAYANT);

        if (StringUtils.isNoneEmpty(query)) {
            search = query;
        }

        if (StringUtils.isNoneEmpty(id)) {
            typeTierspayant = id;
        }

        return Response.ok().entity(
                tiersPayantService.fetchList(start, limit, search, typeTierspayant, btnDesactive, delete).toString())
                .build();
    }

    @GET
    @Path("encours")
    @Produces("application/json")
    public Response encours(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "search_value") String search, @QueryParam(value = "tp") String lg_TIERS_PAYANT_ID) {
        HttpSession hs = servletRequest.getSession();

        return Response.ok().entity(tiersPayantService.getAccount(lg_TIERS_PAYANT_ID)).build();
    }

    // =============================================================================================
    // Ecran Gestion des tiers payants : modification, desactivation/reactivation, suppression et
    // consultation du detail. Toutes ces operations deleguent aux MEMES methodes metier
    // bll.tierspayantManagement / bll.clientManagement que les JSP historiques
    // (tierspayantmanagement/tierspayant/ws_transaction.jsp, ws_client.jsp, ws_tierspayantaccount.jsp) :
    // memes regles, memes messages, memes cles JSON.
    // =============================================================================================

    private static final Logger LOG_GESTION = Logger.getLogger(TiersPayantRessource.class.getName());
    /** Valeur par defaut historique de ws_transaction.jsp pour le risque. */
    private static final String RISQUE_DEFAUT = "55181642844215217016";

    private TUser utilisateurSession() {
        return (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
    }

    private Response reponseDeconnecte() {
        return Response.ok().entity(new JSONObject().put("success", commonparameter.PROCESS_FAILED)
                .put("errors", Constant.DECONNECTED_MESSAGE).put("total", 0).toString()).build();
    }

    private Response reponseSimple(String success, String errors) {
        return Response.ok().entity(
                new JSONObject().put("success", success).put("errors", StringUtils.defaultString(errors)).toString())
                .build();
    }

    /**
     * Creation d'un tiers payant : MEME methode metier tierspayantManagement.create que la JSP historique
     * (mode=create), sequencier compris, avec les MEMES valeurs par defaut quand un champ n'est pas transmis. L'ecran
     * pose ensuite « gere comme depot » et le plafond par vente par l'appel depot-apres-creation, comme avant - la
     * methode metier ne rend pas l'identifiant cree.
     */
    @POST
    @Path("gestion/create")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response creerGestion(@DefaultValue("") @FormParam("str_CODE_ORGANISME") String codeOrganisme,
            @DefaultValue("") @FormParam("str_NAME") String name,
            @DefaultValue("") @FormParam("str_FULLNAME") String fullName,
            @DefaultValue("") @FormParam("str_ADRESSE") String adresse,
            @DefaultValue("") @FormParam("str_MOBILE") String mobile,
            @DefaultValue("") @FormParam("str_TELEPHONE") String telephone,
            @DefaultValue("") @FormParam("str_MAIL") String mail,
            @DefaultValue("0") @FormParam("dbl_PLAFOND_CREDIT") double plafondCredit,
            @DefaultValue("0") @FormParam("dbl_TAUX_REMBOURSEMENT") double tauxRemboursement,
            @DefaultValue("") @FormParam("str_NUMERO_CAISSE_OFFICIEL") String numeroCaisseOfficiel,
            @DefaultValue("") @FormParam("str_CENTRE_PAYEUR") String centrePayeur,
            @DefaultValue("") @FormParam("str_CODE_REGROUPEMENT") String codeRegroupement,
            @DefaultValue("0") @FormParam("dbl_SEUIL_MINIMUM") double seuilMinimum,
            @DefaultValue("false") @FormParam("bool_INTERDICTION") boolean interdiction,
            @DefaultValue("46700000000") @FormParam("str_CODE_COMPTABLE") String codeComptable,
            @DefaultValue("false") @FormParam("bool_PRENUM_FACT_SUBROGATOIRE") boolean prenumFactSubrogatoire,
            @DefaultValue("0") @FormParam("int_NUMERO_DECOMPTE") int numeroDecompte,
            @DefaultValue("") @FormParam("str_CODE_PAIEMENT") String codePaiement,
            @DefaultValue("0") @FormParam("dt_DELAI_PAIEMENT") int delaiPaiement,
            @DefaultValue("0") @FormParam("dbl_POURCENTAGE_REMISE") double pourcentageRemise,
            @DefaultValue("0") @FormParam("dbl_REMISE_FORFETAIRE") double remiseForfetaire,
            @DefaultValue("") @FormParam("str_CODE_EDIT_BORDEREAU") String codeEditBordereau,
            @DefaultValue("1") @FormParam("int_NBRE_EXEMPLAIRE_BORD") int nbreExemplaireBord,
            @DefaultValue("0") @FormParam("int_PERIODICITE_EDIT_BORD") int periodiciteEditBord,
            @DefaultValue("0") @FormParam("int_DATE_DERNIERE_EDITION") int dateDerniereEdition,
            @DefaultValue("") @FormParam("str_NUMERO_IDF_ORGANISME") String numeroIdfOrganisme,
            @DefaultValue("0") @FormParam("dbl_MONTANT_F_CLIENT") double montantFClient,
            @DefaultValue("0") @FormParam("dbl_BASE_REMISE") double baseRemise,
            @DefaultValue("") @FormParam("str_CODE_DOC_COMPTOIRE") String codeDocComptoire,
            @DefaultValue("false") @FormParam("bool_ENABLED") boolean enabled,
            @DefaultValue("") @FormParam("lg_VILLE_ID") String villeId,
            @DefaultValue("") @FormParam("lg_TYPE_TIERS_PAYANT_ID") String typeTiersPayantId,
            @DefaultValue("") @FormParam("lg_TYPE_CONTRAT_ID") String typeContratId,
            @DefaultValue("") @FormParam("lg_REGIMECAISSE_ID") String regimeCaisseId,
            @DefaultValue("") @FormParam("lg_RISQUE_ID") String risqueId,
            @DefaultValue("0") @FormParam("dbl_CAUTION") double cautionDepot,
            @DefaultValue("0") @FormParam("dbl_QUOTA_CONSO_MENSUELLE") double quotaConsoMensuelle,
            @DefaultValue("0") @FormParam("dbl_SOLDE") int solde,
            @DefaultValue("false") @FormParam("bool_IsACCOUNT") boolean isAccount,
            @DefaultValue("") @FormParam("str_REGISTRE_COMMERCE") String registreCommerce,
            @DefaultValue("") @FormParam("str_CODE_OFFICINE") String codeOfficine,
            @DefaultValue("") @FormParam("str_COMPTE_CONTRIBUABLE") String compteContribuable,
            @DefaultValue("false") @FormParam("b_IsAbsolute") boolean isAbsolute,
            @DefaultValue("") @FormParam("lg_GROUPE_ID") String groupeId,
            @DefaultValue("-1") @FormParam("nbrbons") int nbrBons,
            @DefaultValue("-1") @FormParam("montantFact") int montantFact,
            @DefaultValue("false") @FormParam("groupingByTaux") boolean groupingByTaux,
            @DefaultValue("false") @FormParam("cmu") boolean cmu, @DefaultValue("0") @FormParam("caution") int caution,
            @DefaultValue("ALPHABETIQUE") @FormParam("str_MODE_TRI_FACTURE") String strModeTriFacture,
            @DefaultValue("0") @FormParam("int_NB_BONS_PAR_PAGE") int nbBonsParPage,
            @DefaultValue("0") @FormParam("int_TAILLE_POLICE") int taillePolice) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            TUser user = odm.getEm().find(TUser.class, sessionUser.getLgUSERID());
            tierspayantManagement otm = new tierspayantManagement(odm, user);
            dal.TSequencier sequencier = new bll.facture.factureManagement(odm, user).CreateSequencier();
            String risque = StringUtils.isNotBlank(risqueId) ? risqueId : RISQUE_DEFAUT;
            otm.create(codeOrganisme, name, fullName, adresse, mobile, telephone, mail, plafondCredit,
                    tauxRemboursement, numeroCaisseOfficiel, centrePayeur, codeRegroupement, seuilMinimum, interdiction,
                    codeComptable, prenumFactSubrogatoire, numeroDecompte, codePaiement, delaiPaiement,
                    pourcentageRemise, remiseForfetaire, codeEditBordereau, nbreExemplaireBord, periodiciteEditBord,
                    dateDerniereEdition, numeroIdfOrganisme, montantFClient, baseRemise, codeDocComptoire, enabled,
                    villeId, typeTiersPayantId, typeContratId, regimeCaisseId, risque, cautionDepot,
                    quotaConsoMensuelle, solde, isAccount, sequencier, registreCommerce, codeOfficine,
                    compteContribuable, isAbsolute, groupeId, nbrBons, montantFact, groupingByTaux, cmu, caution,
                    strModeTriFacture, nbBonsParPage, taillePolice);
            return reponseSimple(otm.getMessage(), otm.getDetailmessage());
        } catch (Exception e) {
            LOG_GESTION.log(Level.SEVERE, "createTiersPayant", e);
            return reponseSimple(commonparameter.PROCESS_FAILED, "Impossible de créer ce tiers payant");
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Modification d'un tiers payant : MEME methode metier tierspayantManagement.update que la JSP historique
     * (mode=update), avec les MEMES valeurs par defaut quand un champ n'est pas transmis.
     */
    @POST
    @Path("gestion/update")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response modifierGestion(@FormParam("lg_TIERS_PAYANT_ID") String tiersPayantId,
            @DefaultValue("") @FormParam("str_CODE_ORGANISME") String codeOrganisme,
            @DefaultValue("") @FormParam("str_NAME") String name,
            @DefaultValue("") @FormParam("str_FULLNAME") String fullName,
            @DefaultValue("") @FormParam("str_ADRESSE") String adresse,
            @DefaultValue("") @FormParam("str_MOBILE") String mobile,
            @DefaultValue("") @FormParam("str_TELEPHONE") String telephone,
            @DefaultValue("") @FormParam("str_MAIL") String mail,
            @DefaultValue("0") @FormParam("dbl_PLAFOND_CREDIT") double plafondCredit,
            @DefaultValue("0") @FormParam("dbl_TAUX_REMBOURSEMENT") double tauxRemboursement,
            @DefaultValue("") @FormParam("str_NUMERO_CAISSE_OFFICIEL") String numeroCaisseOfficiel,
            @DefaultValue("") @FormParam("str_CENTRE_PAYEUR") String centrePayeur,
            @DefaultValue("") @FormParam("str_CODE_REGROUPEMENT") String codeRegroupement,
            @DefaultValue("0") @FormParam("dbl_SEUIL_MINIMUM") double seuilMinimum,
            @DefaultValue("false") @FormParam("bool_INTERDICTION") boolean interdiction,
            @DefaultValue("46700000000") @FormParam("str_CODE_COMPTABLE") String codeComptable,
            @DefaultValue("false") @FormParam("bool_PRENUM_FACT_SUBROGATOIRE") boolean prenumFactSubrogatoire,
            @DefaultValue("0") @FormParam("int_NUMERO_DECOMPTE") int numeroDecompte,
            @DefaultValue("") @FormParam("str_CODE_PAIEMENT") String codePaiement,
            @DefaultValue("0") @FormParam("dt_DELAI_PAIEMENT") int delaiPaiement,
            @DefaultValue("0") @FormParam("dbl_POURCENTAGE_REMISE") double pourcentageRemise,
            @DefaultValue("0") @FormParam("dbl_REMISE_FORFETAIRE") double remiseForfetaire,
            @DefaultValue("") @FormParam("str_CODE_EDIT_BORDEREAU") String codeEditBordereau,
            @DefaultValue("1") @FormParam("int_NBRE_EXEMPLAIRE_BORD") int nbreExemplaireBord,
            @DefaultValue("0") @FormParam("int_PERIODICITE_EDIT_BORD") int periodiciteEditBord,
            @DefaultValue("0") @FormParam("int_DATE_DERNIERE_EDITION") int dateDerniereEdition,
            @DefaultValue("") @FormParam("str_NUMERO_IDF_ORGANISME") String numeroIdfOrganisme,
            @DefaultValue("0") @FormParam("dbl_MONTANT_F_CLIENT") double montantFClient,
            @DefaultValue("0") @FormParam("dbl_BASE_REMISE") double baseRemise,
            @DefaultValue("") @FormParam("str_CODE_DOC_COMPTOIRE") String codeDocComptoire,
            @DefaultValue("false") @FormParam("bool_ENABLED") boolean enabled,
            @DefaultValue("") @FormParam("lg_VILLE_ID") String villeId,
            @DefaultValue("") @FormParam("lg_TYPE_TIERS_PAYANT_ID") String typeTiersPayantId,
            @DefaultValue("") @FormParam("lg_TYPE_CONTRAT_ID") String typeContratId,
            @DefaultValue("") @FormParam("lg_REGIMECAISSE_ID") String regimeCaisseId,
            @DefaultValue("") @FormParam("lg_RISQUE_ID") String risqueId,
            @DefaultValue("") @FormParam("str_CODE_OFFICINE") String codeOfficine,
            @DefaultValue("") @FormParam("str_REGISTRE_COMMERCE") String registreCommerce,
            @DefaultValue("") @FormParam("str_COMPTE_CONTRIBUABLE") String compteContribuable,
            @DefaultValue("0") @FormParam("dbl_QUOTA_CONSO_MENSUELLE") double quotaConsoMensuelle,
            @DefaultValue("false") @FormParam("b_IsAbsolute") boolean isAbsolute,
            @DefaultValue("") @FormParam("lg_GROUPE_ID") String groupeId,
            @DefaultValue("-1") @FormParam("nbrbons") int nbrBons,
            @DefaultValue("-1") @FormParam("montantFact") int montantFact,
            @DefaultValue("false") @FormParam("groupingByTaux") boolean groupingByTaux,
            @DefaultValue("false") @FormParam("cmu") boolean cmu, @DefaultValue("0") @FormParam("caution") int caution,
            @DefaultValue("ALPHABETIQUE") @FormParam("str_MODE_TRI_FACTURE") String strModeTriFacture,
            @FormParam("int_NB_BONS_PAR_PAGE") Integer nbBonsParPage,
            @FormParam("int_TAILLE_POLICE") Integer taillePolice,
            @DefaultValue("false") @FormParam("is_depot") boolean isDepot,
            @DefaultValue("-1") @FormParam("dbl_PLAFOND_VENTE") double plafondVente) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            TUser user = odm.getEm().find(TUser.class, sessionUser.getLgUSERID());
            tierspayantManagement otm = new tierspayantManagement(odm, user);
            String risque = StringUtils.isNotBlank(risqueId) ? risqueId : RISQUE_DEFAUT;
            otm.update(tiersPayantId, codeOrganisme, name, fullName, adresse, mobile, telephone, mail, plafondCredit,
                    tauxRemboursement, numeroCaisseOfficiel, centrePayeur, codeRegroupement, seuilMinimum, interdiction,
                    codeComptable, prenumFactSubrogatoire, numeroDecompte, codePaiement, delaiPaiement,
                    pourcentageRemise, remiseForfetaire, codeEditBordereau, nbreExemplaireBord, periodiciteEditBord,
                    dateDerniereEdition, numeroIdfOrganisme, montantFClient, baseRemise, codeDocComptoire, enabled,
                    villeId, typeTiersPayantId, typeContratId, regimeCaisseId, risque, codeOfficine, registreCommerce,
                    compteContribuable, quotaConsoMensuelle, isAbsolute, groupeId, nbrBons, montantFact, groupingByTaux,
                    cmu, caution, strModeTriFacture, nbBonsParPage, taillePolice);
            // « Gere comme depot » n'est pas porte par la methode metier historique, partagee avec
            // la JSP : on pose l'indicateur a part, sur l'entite, une fois la modification faite.
            marquerDepot(odm.getEm(), tiersPayantId, isDepot);
            // Meme logique pour le plafond par vente : -1 = zone absente de l'ecran, on ne touche rien.
            poserPlafondVente(odm.getEm(), tiersPayantId, plafondVente);
            // Plafond de credit inferieur a la consommation en cours : la modification aboutit, mais le
            // fait est rappele dans le message de retour pour qu'il ne passe pas inapercu.
            String detail = otm.getDetailmessage();
            if (org.apache.commons.lang3.StringUtils.isNotBlank(otm.getAvertissementPlafond())) {
                detail = org.apache.commons.lang3.StringUtils.defaultString(detail) + "<br><br>"
                        + otm.getAvertissementPlafond();
            }
            return reponseSimple(otm.getMessage(), detail);
        } catch (Exception e) {
            LOG_GESTION.log(Level.SEVERE, "updateTiersPayant", e);
            return reponseSimple(commonparameter.PROCESS_FAILED, "Impossible de modifier ce tiers payant");
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Pose le plafond par vente sur la fiche de l'organisme et, quand la valeur CHANGE et devient positive, la propage
     * au plafond de tous les liens client/tiers payant actifs.
     *
     * <p>
     * La propagation n'a lieu qu'au changement : re-enregistrer la fiche sans toucher au plafond n'ecrase donc pas les
     * valeurs saisies individuellement sur des clients. Et remettre la fiche a zero n'efface rien : zero veut dire «
     * aucun plafond predefini », pas « effacer les plafonds des clients ».
     *
     * @param plafondVente
     *            valeur de l'ecran ; negative quand la zone n'etait pas presente (rien n'est ecrit)
     */
    private void poserPlafondVente(javax.persistence.EntityManager em, String tiersPayantId, double plafondVente) {
        if (plafondVente < 0 || StringUtils.isBlank(tiersPayantId)) {
            return;
        }
        dal.TTiersPayant tp = em.find(dal.TTiersPayant.class, tiersPayantId);
        if (tp == null) {
            return;
        }
        double ancienne = tp.getDblPLAFONDVENTE() != null ? tp.getDblPLAFONDVENTE() : 0;
        if (ancienne == plafondVente) {
            return;
        }
        tp.setDblPLAFONDVENTE(plafondVente);
        javax.persistence.EntityTransaction transaction = em.getTransaction();
        boolean aNous = !transaction.isActive();
        if (aNous) {
            transaction.begin();
        }
        em.merge(tp);
        if (plafondVente > 0) {
            int touches = em
                    .createQuery("UPDATE TCompteClientTiersPayant c SET c.dblPLAFOND = ?1, c.isCapped = TRUE,"
                            + " c.dtUPDATED = CURRENT_TIMESTAMP"
                            + " WHERE c.lgTIERSPAYANTID.lgTIERSPAYANTID = ?2 AND c.strSTATUT = 'enable'")
                    .setParameter(1, plafondVente).setParameter(2, tiersPayantId).executeUpdate();
            LOG_GESTION.log(Level.INFO, "Plafond par vente {0} propage a {1} lien(s) client du tiers payant {2}",
                    new Object[] { plafondVente, touches, tiersPayantId });
        }
        if (aNous) {
            transaction.commit();
        }
    }

    /**
     * Pose ou retire « gere comme depot » sur un tiers payant. Sans effet si l'identifiant est vide ou inconnu.
     */
    private void marquerDepot(javax.persistence.EntityManager em, String tiersPayantId, boolean depot) {
        if (StringUtils.isBlank(tiersPayantId)) {
            return;
        }
        dal.TTiersPayant tp = em.find(dal.TTiersPayant.class, tiersPayantId);
        if (tp == null) {
            return;
        }
        tp.setIsDepot(depot);
        ecrire(em, tp);
    }

    /**
     * Ecrit une entite avec l'unite de persistance historique, qui n'est pas geree par le conteneur : sans transaction
     * ouverte, le merge reste en memoire et se perd a la fermeture. On n'ouvre la transaction que si le code metier
     * appele juste avant n'en a pas deja une en cours.
     */
    private void ecrire(javax.persistence.EntityManager em, Object entite) {
        javax.persistence.EntityTransaction transaction = em.getTransaction();
        boolean aNous = !transaction.isActive();
        if (aNous) {
            transaction.begin();
        }
        em.merge(entite);
        if (aNous) {
            transaction.commit();
        }
    }

    /**
     * « Gere comme depot » sur un tiers payant qui vient d'etre CREE.
     *
     * <p>
     * La creation passe encore par la page historique, qui ne rend pas l'identifiant du tiers payant qu'elle vient
     * d'ecrire. Plutot que de deviner cote ecran, on le retrouve ici : meme nom, meme type, cree dans les cinq
     * dernieres minutes, et un seul candidat. A defaut, rien n'est ecrit et l'ecran le dit - mieux vaut inviter a
     * cocher la case depuis la liste que de marquer un homonyme cree l'an dernier.
     */
    @POST
    @Path("gestion/depot-apres-creation")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response marquerDepotApresCreation(@DefaultValue("") @FormParam("str_NAME") String name,
            @DefaultValue("") @FormParam("lg_TYPE_TIERS_PAYANT_ID") String typeTiersPayantId,
            @DefaultValue("false") @FormParam("is_depot") boolean isDepot,
            @DefaultValue("-1") @FormParam("dbl_PLAFOND_VENTE") double plafondVente) {
        if (utilisateurSession() == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            java.util.Date limite = new java.util.Date(System.currentTimeMillis() - 5 * 60 * 1000L);
            List<dal.TTiersPayant> candidats = odm.getEm()
                    .createQuery("SELECT t FROM TTiersPayant t WHERE t.strNAME = ?1"
                            + " AND t.lgTYPETIERSPAYANTID.lgTYPETIERSPAYANTID = ?2 AND t.dtCREATED >= ?3"
                            + " ORDER BY t.dtCREATED DESC", dal.TTiersPayant.class)
                    .setParameter(1, name).setParameter(2, typeTiersPayantId).setParameter(3, limite).setMaxResults(2)
                    .getResultList();
            if (candidats.size() != 1) {
                return Response.ok().entity(new JSONObject().put("success", false)
                        .put("message", "Le tiers payant a bien ete cree, mais ses options (gere comme depot, plafond"
                                + " par vente) n'ont pas pu etre posees automatiquement. Ouvrez la fiche depuis la"
                                + " liste pour les renseigner.")
                        .toString()).build();
            }
            dal.TTiersPayant tp = candidats.get(0);
            tp.setIsDepot(isDepot);
            if (plafondVente >= 0) {
                // Fiche neuve : aucun lien client n'existe encore, poser la valeur suffit.
                tp.setDblPLAFONDVENTE(plafondVente);
            }
            ecrire(odm.getEm(), tp);
            return Response.ok().entity(new JSONObject().put("success", true).toString()).build();
        } catch (Exception e) {
            LOG_GESTION.log(Level.SEVERE, "marquerDepotApresCreation", e);
            return Response.ok().entity(new JSONObject().put("success", false)
                    .put("message", "L'option « gere comme depot » n'a pas pu etre posee.").toString()).build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Suppression d'un tiers payant : MEME methode metier que la JSP historique (mode=delete). */
    @POST
    @Path("gestion/delete")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response supprimerGestion(@FormParam("lg_TIERS_PAYANT_ID") String tiersPayantId) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            TUser user = odm.getEm().find(TUser.class, sessionUser.getLgUSERID());
            tierspayantManagement otm = new tierspayantManagement(odm, user);
            otm.deleteTierspayant(StringUtils.defaultString(tiersPayantId));
            return reponseSimple(otm.getMessage(), otm.getDetailmessage());
        } catch (Exception e) {
            LOG_GESTION.log(Level.SEVERE, "deleteTiersPayant", e);
            return reponseSimple(commonparameter.PROCESS_FAILED, "Impossible de supprimer ce tiers payant");
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Desactivation / reactivation d'un tiers payant : MEME methode metier que les modes disable / enable de la JSP
     * historique.
     */
    @POST
    @Path("gestion/toggle-statut")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response basculerStatutGestion(@FormParam("lg_TIERS_PAYANT_ID") String tiersPayantId,
            @DefaultValue("false") @FormParam("actif") boolean actif) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            TUser user = odm.getEm().find(TUser.class, sessionUser.getLgUSERID());
            tierspayantManagement otm = new tierspayantManagement(odm, user);
            otm.enableOrDisableTierspayant(StringUtils.defaultString(tiersPayantId),
                    actif ? Constant.STATUT_ENABLE : Constant.STATUT_DISABLE);
            return reponseSimple(otm.getMessage(), otm.getDetailmessage());
        } catch (Exception e) {
            LOG_GESTION.log(Level.SEVERE, "toggleStatutTiersPayant", e);
            return reponseSimple(commonparameter.PROCESS_FAILED, "Impossible de changer le statut de ce tiers payant");
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Clients d'un tiers payant (onglet Clients du detail) : MEME methode metier et MEMES cles JSON que la JSP
     * historique ws_client.jsp (reponse {total, data}).
     */
    @GET
    @Path("gestion/clients")
    public Response clientsGestion(@QueryParam("lg_TIERS_PAYANT_ID") String tiersPayantId,
            @QueryParam("query") String query, @QueryParam("search_value") String searchValue,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            String recherche = StringUtils.isNotBlank(query) ? query
                    : (StringUtils.isNotBlank(searchValue) ? searchValue : "%%");
            List<dal.TClient> clients = new bll.preenregistrement.Preenregistrement(odm, null).getAllClients(recherche,
                    StringUtils.defaultString(tiersPayantId));
            JSONArray data = new JSONArray();
            int fin = limit > 0 ? Math.min(clients.size(), Math.max(0, start) + limit) : clients.size();
            for (int i = Math.max(0, start); i < fin; i++) {
                dal.TClient c = clients.get(i);
                data.put(new JSONObject().put("lg_CLIENT_ID", c.getLgCLIENTID())
                        .put("str_FIRST_LAST_NAME",
                                StringUtils.trimToEmpty(c.getStrFIRSTNAME()) + " "
                                        + StringUtils.trimToEmpty(c.getStrLASTNAME()))
                        .put("str_NUMERO_SECURITE_SOCIAL", StringUtils.trimToEmpty(c.getStrNUMEROSECURITESOCIAL()))
                        .put("str_CODE_INTERNE", StringUtils.defaultString(c.getStrCODEINTERNE()))
                        .put("dt_NAISSANCE",
                                c.getDtCREATED() != null ? toolkits.utils.date.DateToString(c.getDtNAISSANCE(),
                                        toolkits.utils.date.formatterShort) : "")
                        .put("str_SEXE", StringUtils.defaultString(c.getStrSEXE())));
            }
            return Response.ok().entity(new JSONObject().put("data", data).put("total", clients.size()).toString())
                    .build();
        } catch (Exception e) {
            LOG_GESTION.log(Level.SEVERE, "clientsTiersPayant", e);
            return Response.ok().entity(new JSONObject().put("data", new JSONArray()).put("total", 0).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Situation du compte d'un tiers payant (onglet Compte du detail) : MEME methode metier
     * clientManagement.getTiersPayantDATA et MEME reponse {total, data} que la JSP ws_tierspayantaccount.jsp.
     */
    @GET
    @Path("gestion/compte")
    public Response compteGestion(@QueryParam("lg_TIERS_PAYANT_ID") String tiersPayantId,
            @QueryParam("dt_start_vente") String dtStart, @QueryParam("dt_end_vente") String dtEnd) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            // Memes bornes par defaut que la JSP historique
            String debut = StringUtils.isNotBlank(dtStart) ? dtStart
                    : toolkits.utils.date.formatterMysqlShort.format(java.sql.Date.valueOf("2015-12-01"));
            String fin = StringUtils.isNotBlank(dtEnd) ? dtEnd
                    : toolkits.utils.date.formatterMysqlShort.format(new java.util.Date());
            JSONArray data = new bll.configManagement.clientManagement(odm).getTiersPayantDATA(debut, fin,
                    StringUtils.defaultString(tiersPayantId));
            return Response.ok().entity(new JSONObject().put("data", data).put("total", 1).toString()).build();
        } catch (Exception e) {
            LOG_GESTION.log(Level.SEVERE, "compteTiersPayant", e);
            return Response.ok().entity(new JSONObject().put("data", new JSONArray()).put("total", 0).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    // =============================================================================================
    // Mise a jour selective : appliquer un meme reglage a plusieurs tiers payants a la fois.
    //
    // L'officine peut avoir des dizaines d'organismes a regler de la meme facon (meme code
    // d'edition de bordereau, meme nombre de bons par page, meme taille de police). Les reprendre
    // un par un dans la fiche est long et laisse passer des oublis.
    //
    // Trois regles tenues ici :
    // - le droit P_BTN_MAJ_SELECTIVE_TIERS_PAYANT est verifie SUR LE SERVEUR, pas seulement a
    // l'ecran : masquer un bouton n'empeche personne d'appeler l'adresse directement ;
    // - un reglage laisse vide n'est PAS applique, il n'ecrase donc rien ;
    // - les memes bornes que la fiche s'appliquent (rest.report.MiseEnPageFacture).
    // =============================================================================================

    /** Le droit de faire des mises a jour selectives, pour afficher ou masquer le bouton. */
    @GET
    @Path("mise-a-jour-selective/privilege")
    public Response privilegeMiseAJourSelective() {
        return Response.ok().entity(new JSONObject().put("autorise", peutMettreAJourEnMasse()).toString()).build();
    }

    private boolean peutMettreAJourEnMasse() {
        HttpSession session = servletRequest.getSession();
        if (session.getAttribute(Constant.AIRTIME_USER) == null) {
            return false;
        }
        @SuppressWarnings("unchecked")
        List<TPrivilege> privileges = (List<TPrivilege>) session.getAttribute(Constant.USER_LIST_PRIVILEGE);
        return privileges != null
                && DateConverter.hasAuthorityByName(privileges, Constant.P_BTN_MAJ_SELECTIVE_TIERS_PAYANT);
    }

    /**
     * Les tiers payants a cocher, avec la valeur ACTUELLE des trois reglages : c'est ce qui permet de voir avant de
     * modifier, et de repartir de ce qui existe.
     *
     * @param tout
     *            true pour recevoir tout le resultat de la recherche, toutes pages confondues (bouton « Tout cocher »)
     */
    @GET
    @Path("mise-a-jour-selective/rechercher")
    public Response rechercherPourMiseAJour(@DefaultValue("") @QueryParam("query") String query,
            @DefaultValue("") @QueryParam("groupeId") String groupeId,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("25") @QueryParam("limit") int limit,
            @DefaultValue("false") @QueryParam("tout") boolean tout) {
        if (!peutMettreAJourEnMasse()) {
            return reponseNonAutorise();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            String recherche = "%" + StringUtils.defaultString(query).trim() + "%";
            String filtre = "FROM TTiersPayant t WHERE (t.strFULLNAME LIKE ?1 OR t.strNAME LIKE ?1"
                    + " OR t.strCODEORGANISME LIKE ?1) AND t.strSTATUT = ?2";
            // Filtre par groupe. Le groupe est designe par son libelle, comme partout ailleurs dans
            // l'application (la fiche du tiers payant enregistre elle aussi le libelle).
            boolean parGroupe = StringUtils.isNotBlank(groupeId);
            if (parGroupe) {
                filtre += " AND t.lgGROUPEID.strLIBELLE = ?3";
            }
            javax.persistence.EntityManager em = odm.getEm();
            javax.persistence.TypedQuery<Long> requeteTotal = em.createQuery("SELECT COUNT(t) " + filtre, Long.class)
                    .setParameter(1, recherche).setParameter(2, commonparameter.statut_enable);
            javax.persistence.TypedQuery<dal.TTiersPayant> requete = em
                    .createQuery("SELECT t " + filtre + " ORDER BY t.strFULLNAME", dal.TTiersPayant.class)
                    .setParameter(1, recherche).setParameter(2, commonparameter.statut_enable);
            if (parGroupe) {
                requeteTotal.setParameter(3, groupeId.trim());
                requete.setParameter(3, groupeId.trim());
            }
            long total = requeteTotal.getSingleResult();
            if (!tout) {
                requete.setFirstResult(Math.max(0, start)).setMaxResults(limit > 0 ? limit : 25);
            }
            JSONArray resultats = new JSONArray();
            for (dal.TTiersPayant tp : requete.getResultList()) {
                resultats
                        .put(new JSONObject().put("lg_TIERS_PAYANT_ID", tp.getLgTIERSPAYANTID())
                                .put("str_NAME", StringUtils.defaultString(tp.getStrNAME()))
                                .put("str_FULLNAME", StringUtils.defaultString(tp.getStrFULLNAME()))
                                .put("str_CODE_ORGANISME", StringUtils.defaultString(tp.getStrCODEORGANISME()))
                                .put("str_CODE_EDIT_BORDEREAU", tp.getLgMODELFACTUREID() != null
                                        ? StringUtils.defaultString(tp.getLgMODELFACTUREID().getStrVALUE()) : "")
                                .put("int_NB_BONS_PAR_PAGE", tp.bonsParPageEffectif())
                                .put("int_TAILLE_POLICE", tp.taillePoliceEffective()));
            }
            return Response.ok().entity(new JSONObject().put("total", total).put("results", resultats).toString())
                    .build();
        } catch (Exception e) {
            LOG_GESTION.log(Level.SEVERE, "rechercherPourMiseAJour", e);
            return Response.ok().entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Applique les reglages renseignes aux tiers payants coches.
     *
     * Chaque reglage est facultatif : celui qu'on laisse vide n'est pas touche. On peut donc ne changer que le code
     * d'edition, ou que la police, sans rien ecraser d'autre.
     */
    @POST
    @Path("mise-a-jour-selective/appliquer")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response appliquerMiseAJourSelective(@FormParam("tiersPayants") String tiersPayants,
            @FormParam("codeEditBordereau") String codeEditBordereau, @FormParam("nbBonsParPage") String nbBonsParPage,
            @FormParam("taillePolice") String taillePolice) {
        if (!peutMettreAJourEnMasse()) {
            return reponseNonAutorise();
        }
        List<String> identifiants = MiseAJourSelectiveUtil.identifiants(tiersPayants);
        if (identifiants.isEmpty()) {
            return reponseSimple(commonparameter.PROCESS_FAILED, "Cochez au moins un tiers payant.");
        }
        boolean poseCode = StringUtils.isNotBlank(codeEditBordereau);
        Integer bons = MiseAJourSelectiveUtil.entierOuNull(nbBonsParPage);
        Integer police = MiseAJourSelectiveUtil.entierOuNull(taillePolice);
        if (!poseCode && bons == null && police == null) {
            return reponseSimple(commonparameter.PROCESS_FAILED,
                    "Renseignez au moins un réglage à appliquer (code d'édition, bons par page ou police).");
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            TUser sessionUser = utilisateurSession();
            TUser user = odm.getEm().find(TUser.class, sessionUser.getLgUSERID());
            tierspayantManagement otm = new tierspayantManagement(odm, user);
            dal.TModelFacture modele = poseCode ? otm.getModelFacture(codeEditBordereau.trim()) : null;
            if (poseCode && modele == null) {
                return reponseSimple(commonparameter.PROCESS_FAILED,
                        "Le code d'édition « " + codeEditBordereau + " » n'existe pas.");
            }
            // Une seule transaction pour toute la selection : soit tous les tiers payants sont
            // regles, soit aucun. Une coupure au milieu laisserait l'officine avec la moitie des
            // organismes reglee et l'autre non, sans savoir lesquels.
            odm.beginTransaction();
            int modifies = 0;
            for (String id : identifiants) {
                dal.TTiersPayant tp = odm.getEm().find(dal.TTiersPayant.class, id);
                if (tp == null) {
                    continue;
                }
                if (modele != null) {
                    tp.setStrCODEEDITBORDEREAU(modele.getStrVALUE());
                    tp.setLgMODELFACTUREID(modele);
                }
                if (bons != null) {
                    tp.setIntNBBONSPARPAGE(rest.report.MiseEnPageFacture.bonsParPage(bons));
                }
                if (police != null) {
                    tp.setIntTAILLEPOLICE(rest.report.MiseEnPageFacture.taillePolice(police));
                }
                tp.setDtUPDATED(new java.util.Date());
                odm.getEm().merge(tp);
                modifies++;
            }
            odm.CloseTransaction();
            return reponseSimple(commonparameter.PROCESS_SUCCESS,
                    modifies + " tiers payant(s) mis à jour." + (modifies < identifiants.size()
                            ? " " + (identifiants.size() - modifies) + " introuvable(s), ignoré(s)." : ""));
        } catch (Exception e) {
            LOG_GESTION.log(Level.SEVERE, "appliquerMiseAJourSelective", e);
            try {
                if (odm.getEm().getTransaction().isActive()) {
                    odm.RejectTransaction();
                }
            } catch (Exception ignore) {
                // la transaction etait deja close : rien a annuler
            }
            return reponseSimple(commonparameter.PROCESS_FAILED,
                    "La mise à jour n'a pas abouti : " + messageClair(e) + " Aucun tiers payant n'a été modifié.");
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Le message le plus parlant de la chaine d'erreurs, pour que le support sache quoi regarder. */
    private static String messageClair(Exception e) {
        Throwable cause = e;
        while (cause.getCause() != null) {
            cause = cause.getCause();
        }
        String message = StringUtils.defaultString(cause.getMessage());
        return message.isEmpty() ? cause.getClass().getSimpleName() : message;
    }

    private Response reponseNonAutorise() {
        return Response.ok()
                .entity(new JSONObject().put("success", commonparameter.PROCESS_FAILED).put("autorise", false)
                        .put("errors", "Vous n'avez pas l'autorisation de mise à jour sélective des tiers payants.")
                        .toString())
                .build();
    }

    // =============================================================================================
    // Listes deroulantes des ecrans de balance agee, en REST.
    //
    // Memes methodes metier et MEMES cles JSON que les JSP qu'elles remplacent, y compris la ligne
    // « Tous » ajoutee en fin de liste : les ecrans qui s'en servent ne voient aucune difference.
    // Les JSP restent en place pour les autres ecrans qui les appellent encore.
    // =============================================================================================

    /** Tiers payants d'une liste deroulante. Remplace ws_data_other.jsp. */
    @GET
    @Path("combo")
    public Response combo(@DefaultValue("") @QueryParam("search_value") String searchValue,
            @DefaultValue("") @QueryParam("query") String query,
            @DefaultValue("") @QueryParam("lg_TIERS_PAYANT_ID") String tiersPayantId,
            @DefaultValue("") @QueryParam("cmb_TYPE_TIERS_PAYANT") String typeTiersPayantId,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("0") @QueryParam("limit") int limit) {
        if (utilisateurSession() == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            String recherche = StringUtils.isNotEmpty(query) ? query : StringUtils.defaultString(searchValue);
            String tp = StringUtils.isNotEmpty(tiersPayantId) ? tiersPayantId : "%%";
            String type = StringUtils.isNotEmpty(typeTiersPayantId) ? typeTiersPayantId : "%%";
            List<dal.TTiersPayant> liste = new tierspayantManagement(odm).ShowAllOrOneTierspayant(recherche, tp, type);
            JSONArray resultats = new JSONArray();
            for (dal.TTiersPayant tiersPayant : PaginationUtil.tranche(liste, start, limit)) {
                resultats.put(ligneCombo(tiersPayant));
            }
            // Ligne « Tous » en fin de liste, comme la JSP : elle sert a lever le filtre.
            resultats.put(new JSONObject().put("lg_TIERS_PAYANT_ID", "").put("str_FULLNAME", "Tous"));
            return Response.ok()
                    .entity(new JSONObject().put("total", liste.size()).put("results", resultats).toString()).build();
        } catch (Exception e) {
            LOG_GESTION.log(Level.SEVERE, "combo tiers payants", e);
            return Response.ok().entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Memes cles que ws_data_other.jsp, y compris celles qu'aucun ecran n'affiche aujourd'hui. */
    private static JSONObject ligneCombo(dal.TTiersPayant tp) {
        JSONObject json = new JSONObject();
        json.put("lg_TIERS_PAYANT_ID", tp.getLgTIERSPAYANTID());
        json.put("str_CODE_ORGANISME", tp.getStrCODEORGANISME());
        json.put("str_NAME", tp.getStrNAME());
        json.put("str_FULLNAME", tp.getStrFULLNAME());
        json.put("str_ADRESSE", tp.getStrADRESSE());
        json.put("str_MOBILE", tp.getStrMOBILE());
        json.put("str_TELEPHONE", tp.getStrTELEPHONE());
        json.put("str_MAIL", tp.getStrMAIL());
        json.put("dbl_PLAFOND_CREDIT", tp.getDblPLAFONDCREDIT());
        json.put("dbl_PLAFOND_VENTE", tp.getDblPLAFONDVENTE() != null ? tp.getDblPLAFONDVENTE() : 0);
        json.put("dbl_TAUX_REMBOURSEMENT", tp.getDblTAUXREMBOURSEMENT());
        json.put("str_NUMERO_CAISSE_OFFICIEL", tp.getStrNUMEROCAISSEOFFICIEL());
        json.put("str_CENTRE_PAYEUR", tp.getStrCENTREPAYEUR());
        json.put("str_CODE_REGROUPEMENT", tp.getStrCODEREGROUPEMENT());
        json.put("dbl_SEUIL_MINIMUM", tp.getDblSEUILMINIMUM());
        json.put("bool_INTERDICTION", tp.getBoolINTERDICTION());
        json.put("str_CODE_COMPTABLE", tp.getStrCODECOMPTABLE());
        json.put("bool_PRENUM_FACT_SUBROGATOIRE", tp.getBoolPRENUMFACTSUBROGATOIRE());
        json.put("int_NUMERO_DECOMPTE", tp.getIntNUMERODECOMPTE());
        json.put("str_CODE_PAIEMENT", tp.getStrCODEPAIEMENT());
        json.put("dt_DELAI_PAIEMENT", tp.getDtDELAIPAIEMENT());
        json.put("dbl_POURCENTAGE_REMISE", tp.getDblPOURCENTAGEREMISE());
        json.put("dbl_REMISE_FORFETAIRE", tp.getDblREMISEFORFETAIRE());
        json.put("str_CODE_EDIT_BORDEREAU", tp.getStrCODEEDITBORDEREAU());
        json.put("int_NBRE_EXEMPLAIRE_BORD", tp.getIntNBREEXEMPLAIREBORD());
        json.put("int_PERIODICITE_EDIT_BORD", tp.getIntPERIODICITEEDITBORD());
        json.put("int_DATE_DERNIERE_EDITION", tp.getIntDATEDERNIEREEDITION());
        json.put("str_NUMERO_IDF_ORGANISME", tp.getStrNUMEROIDFORGANISME());
        json.put("dbl_MONTANT_F_CLIENT", tp.getDblMONTANTFCLIENT());
        json.put("dbl_BASE_REMISE", tp.getDblBASEREMISE());
        json.put("str_CODE_DOC_COMPTOIRE", tp.getStrCODEDOCCOMPTOIRE());
        json.put("bool_ENABLED", tp.getBoolENABLED());
        json.put("lg_CUSTOMER_ID", tp.getLgTIERSPAYANTID());
        json.put("str_LIBELLE", tp.getStrNAME());
        if (tp.getLgVILLEID() != null) {
            json.put("lg_VILLE_ID", tp.getLgVILLEID().getStrName());
        }
        if (tp.getLgTYPETIERSPAYANTID() != null) {
            json.put("lg_TYPE_TIERS_PAYANT_ID", tp.getLgTYPETIERSPAYANTID().getStrLIBELLETYPETIERSPAYANT());
        }
        if (tp.getLgTYPECONTRATID() != null) {
            json.put("lg_TYPE_CONTRAT_ID", tp.getLgTYPECONTRATID().getStrLIBELLETYPECONTRAT());
        }
        if (tp.getLgRISQUEID() != null) {
            json.put("lg_RISQUE_ID", tp.getLgRISQUEID().getStrLIBELLERISQUE());
        }
        if (tp.getLgREGIMECAISSEID() != null) {
            json.put("lg_REGIMECAISSE_ID", tp.getLgREGIMECAISSEID().getStrCODEREGIMECAISSE());
        }
        json.put("str_STATUT", tp.getStrSTATUT());
        json.put("str_PHOTO", tp.getStrPHOTO());
        if (tp.getDtCREATED() != null) {
            json.put("dt_CREATED", toolkits.utils.date.formatterOrange.format(tp.getDtCREATED()));
        }
        if (tp.getDtUPDATED() != null) {
            json.put("dt_UPDATED", toolkits.utils.date.formatterOrange.format(tp.getDtUPDATED()));
        }
        return json;
    }

    /** Types de tiers payant d'une liste deroulante. Remplace typetierspayant/ws_data.jsp. */
    @GET
    @Path("types")
    public Response types(@DefaultValue("0") @QueryParam("start") int start,
            @DefaultValue("0") @QueryParam("limit") int limit) {
        if (utilisateurSession() == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            List<dal.TTypeTiersPayant> liste = odm.getEm()
                    .createQuery("SELECT t FROM TTypeTiersPayant t WHERE t.strSTATUT = ?1"
                            + " ORDER BY t.strLIBELLETYPETIERSPAYANT", dal.TTypeTiersPayant.class)
                    .setParameter(1, commonparameter.statut_enable).getResultList();
            JSONArray resultats = new JSONArray();
            for (dal.TTypeTiersPayant type : PaginationUtil.tranche(liste, start, limit)) {
                JSONObject json = new JSONObject();
                json.put("lg_TYPE_TIERS_PAYANT_ID", type.getLgTYPETIERSPAYANTID());
                json.put("str_CODE_TYPE_TIERS_PAYANT", type.getStrCODETYPETIERSPAYANT());
                json.put("str_LIBELLE_TYPE_TIERS_PAYANT", type.getStrLIBELLETYPETIERSPAYANT());
                json.put("str_STATUT", type.getStrSTATUT());
                if (type.getDtCREATED() != null) {
                    json.put("dt_CREATED", toolkits.utils.date.formatterOrange.format(type.getDtCREATED()));
                }
                if (type.getDtUPDATED() != null) {
                    json.put("dt_UPDATED", toolkits.utils.date.formatterOrange.format(type.getDtUPDATED()));
                }
                resultats.put(json);
            }
            return Response.ok()
                    .entity(new JSONObject().put("total", liste.size()).put("results", resultats).toString()).build();
        } catch (Exception e) {
            LOG_GESTION.log(Level.SEVERE, "types de tiers payant", e);
            return Response.ok().entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Clients rattaches a un tiers payant, pour la liste deroulante. Remplace ws_data_compteclttierspayants.jsp. */
    @GET
    @Path("clients-combo")
    public Response clientsCombo(@DefaultValue("") @QueryParam("lg_TIERS_PAYANT_ID") String tiersPayantId,
            @DefaultValue("") @QueryParam("lg_COMPTE_CLIENT_ID") String compteClientId,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("0") @QueryParam("limit") int limit) {
        if (utilisateurSession() == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        odm.initEntityManager();
        try {
            String compte = StringUtils.isNotEmpty(compteClientId) ? compteClientId : "%%";
            String tp = StringUtils.isNotEmpty(tiersPayantId) ? tiersPayantId : "%%";
            List<dal.TCompteClientTiersPayant> liste = new bll.configManagement.clientManagement(odm)
                    .getTiersPayantsByClient(compte, tp);
            JSONArray resultats = new JSONArray();
            for (dal.TCompteClientTiersPayant ligne : PaginationUtil.tranche(liste, start, limit)) {
                JSONObject json = new JSONObject();
                json.put("lg_COMPTE_CLIENT_TIERS_PAYANT_ID", ligne.getLgCOMPTECLIENTTIERSPAYANTID());
                json.put("lg_COMPTE_CLIENT_ID", ligne.getLgCOMPTECLIENTID().getLgCOMPTECLIENTID());
                json.put("lg_TIERS_PAYANT_ID", ligne.getLgTIERSPAYANTID().getLgTIERSPAYANTID());
                json.put("str_STATUT", ligne.getStrSTATUT());
                json.put("int_POURCENTAGE", ligne.getIntPOURCENTAGE());
                json.put("str_FIRST_LAST_NAME",
                        StringUtils.defaultString(ligne.getLgCOMPTECLIENTID().getLgCLIENTID().getStrFIRSTNAME()) + " "
                                + StringUtils
                                        .defaultString(ligne.getLgCOMPTECLIENTID().getLgCLIENTID().getStrLASTNAME()));
                if (ligne.getDtCREATED() != null) {
                    json.put("dt_CREATED", toolkits.utils.date.formatterOrange.format(ligne.getDtCREATED()));
                }
                if (ligne.getDtUPDATED() != null) {
                    json.put("dt_UPDATED", toolkits.utils.date.formatterOrange.format(ligne.getDtUPDATED()));
                }
                resultats.put(json);
            }
            // Ligne « Tous » en fin de liste, comme la JSP.
            resultats.put(new JSONObject().put("lg_COMPTE_CLIENT_TIERS_PAYANT_ID", "").put("lg_COMPTE_CLIENT_ID", "")
                    .put("str_FIRST_LAST_NAME", "Tous"));
            return Response.ok()
                    .entity(new JSONObject().put("total", liste.size()).put("results", resultats).toString()).build();
        } catch (Exception e) {
            LOG_GESTION.log(Level.SEVERE, "clients d'un tiers payant", e);
            return Response.ok().entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

}
