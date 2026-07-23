package rest.service.impl;

import dal.TFamille;
import dal.TFamilleGrossiste;
import dal.TFamilleStock;
import dal.TGrossiste;
import dal.TSuggestionOrder;
import dal.TSuggestionOrderDetails;
import dal.TUser;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.json.JSONObject;
import rest.service.EtatStockService;
import toolkits.parameters.commonparameter;
import util.KeyUtilGen;

/**
 * Actions de l'ecran Etat de stock. La creation de suggestion reprend exactement le meme modele que le module Suggerer
 * commande (TSuggestionOrder par fournisseur + TSuggestionOrderDetails au statut is_Process, lien TFamilleGrossiste
 * retrouve ou cree comme dans SuggestionImpl) : les suggestions creees apparaissent dans l'ecran Suggerer commande ou
 * les quantites restent modifiables.
 */
@Stateless
public class EtatStockServiceImpl implements EtatStockService {

    private static final Logger LOG = Logger.getLogger(EtatStockServiceImpl.class.getName());
    private static final String SUCCESS = commonparameter.PROCESS_SUCCESS;
    private static final String FAILED = commonparameter.PROCESS_FAILED;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Meme logique que SuggestionImpl.findOrCreateFamilleGrossiste. */
    private TFamilleGrossiste familleGrossiste(TFamille famille, TGrossiste grossiste) {
        try {
            return (TFamilleGrossiste) em
                    .createQuery("SELECT DISTINCT t FROM TFamilleGrossiste t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1"
                            + " AND t.lgGROSSISTEID.lgGROSSISTEID = ?2 AND t.strSTATUT = ?3")
                    .setParameter(1, famille.getLgFAMILLEID()).setParameter(2, grossiste.getLgGROSSISTEID())
                    .setParameter(3, commonparameter.statut_enable).setMaxResults(1).getSingleResult();
        } catch (Exception e) {
            TFamilleGrossiste lien = new TFamilleGrossiste(UUID.randomUUID().toString());
            lien.setLgFAMILLEID(famille);
            lien.setLgGROSSISTEID(grossiste);
            lien.setDtCREATED(new Date());
            lien.setDtUPDATED(lien.getDtCREATED());
            lien.setIntNBRERUPTURE(0);
            lien.setBlRUPTURE(true);
            lien.setStrCODEARTICLE(famille.getIntCIP());
            lien.setIntPAF(famille.getIntPAF());
            lien.setStrSTATUT(commonparameter.statut_enable);
            lien.setIntPRICE(famille.getIntPRICE());
            em.persist(lien);
            return lien;
        }
    }

    /** Stock disponible du produit dans l'emplacement de l'utilisateur (0 si introuvable). */
    private int stockDisponible(String familleId, String emplacementId) {
        try {
            List<TFamilleStock> stocks = em
                    .createNamedQuery("TFamilleStock.findFamilleStockByProduitAndEmplacement", TFamilleStock.class)
                    .setParameter("lgFAMILLEID", familleId).setParameter("lgEMPLACEMENTID", emplacementId)
                    .setMaxResults(1).getResultList();
            if (!stocks.isEmpty() && stocks.get(0).getIntNUMBERAVAILABLE() != null) {
                return stocks.get(0).getIntNUMBERAVAILABLE();
            }
        } catch (Exception ignore) {
        }
        return 0;
    }

    /** Meme construction de ligne que SuggestionImpl.initTSuggestionOrderDetail. */
    private void ajouterLigne(TSuggestionOrder ordre, TFamille famille, TGrossiste grossiste, int quantite) {
        TFamilleGrossiste lien = familleGrossiste(famille, grossiste);
        TSuggestionOrderDetails ligne = new TSuggestionOrderDetails();
        ligne.setLgSUGGESTIONORDERDETAILSID(UUID.randomUUID().toString());
        ligne.setLgSUGGESTIONORDERID(ordre);
        ligne.setLgFAMILLEID(famille);
        ligne.setLgGROSSISTEID(grossiste);
        ligne.setIntNUMBER(quantite);
        boolean pafLien = lien != null && lien.getIntPAF() != null && lien.getIntPAF() != 0;
        boolean prixLien = lien != null && lien.getIntPRICE() != null && lien.getIntPRICE() != 0;
        ligne.setIntPRICE(pafLien ? lien.getIntPAF() * quantite : famille.getIntPAF() * quantite);
        ligne.setIntPAFDETAIL(pafLien ? lien.getIntPAF() : famille.getIntPAF());
        ligne.setIntPRICEDETAIL(prixLien ? lien.getIntPRICE() : famille.getIntPRICE());
        ligne.setStrSTATUT(commonparameter.statut_is_Process);
        ligne.setDtCREATED(new Date());
        ligne.setDtUPDATED(ligne.getDtCREATED());
        em.persist(ligne);
    }

    @Override
    public JSONObject creerSuggestion(TUser user, List<String> familleIds) {
        JSONObject json = new JSONObject();
        try {
            if (familleIds == null || familleIds.isEmpty()) {
                return json.put("success", FAILED).put("errors", "Aucun produit dans le résultat de la recherche");
            }
            String emplacementId = user.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            // Regroupement des produits par fournisseur : une NOUVELLE suggestion par fournisseur
            Map<String, TGrossiste> grossistes = new LinkedHashMap<>();
            Map<String, TSuggestionOrder> ordres = new HashMap<>();
            int produits = 0, ignores = 0;
            for (String familleId : familleIds) {
                TFamille famille = em.find(TFamille.class, familleId);
                if (famille == null || famille.getLgGROSSISTEID() == null) {
                    ignores++;
                    continue;
                }
                TGrossiste grossiste = famille.getLgGROSSISTEID();
                TSuggestionOrder ordre = ordres.get(grossiste.getLgGROSSISTEID());
                if (ordre == null) {
                    ordre = new TSuggestionOrder();
                    ordre.setLgSUGGESTIONORDERID(new KeyUtilGen().getComplexId());
                    ordre.setStrREF("REF_" + new KeyUtilGen().getShortId(7));
                    ordre.setLgGROSSISTEID(grossiste);
                    ordre.setStrSTATUT(commonparameter.statut_is_Process);
                    ordre.setDtCREATED(new Date());
                    ordre.setDtUPDATED(ordre.getDtCREATED());
                    em.persist(ordre);
                    ordres.put(grossiste.getLgGROSSISTEID(), ordre);
                    grossistes.put(grossiste.getLgGROSSISTEID(), grossiste);
                }
                // Quantite prealimentee : seuil de reappro - stock disponible, au moins 1 (modifiable ensuite)
                int seuil = famille.getIntSEUILMIN() != null ? famille.getIntSEUILMIN() : 0;
                int quantite = Math.max(1, seuil - stockDisponible(familleId, emplacementId));
                ajouterLigne(ordre, famille, grossiste, quantite);
                produits++;
            }
            if (produits == 0) {
                return json.put("success", FAILED).put("errors",
                        "Aucun produit exploitable (fournisseur manquant sur " + ignores + " produit(s))");
            }
            String message = ordres.size() + " suggestion(s) créée(s) pour " + produits
                    + " produit(s), à retrouver dans Suggérer commande";
            if (ignores > 0) {
                message += " ; " + ignores + " produit(s) sans fournisseur ignoré(s)";
            }
            return json.put("success", SUCCESS).put("errors", message).put("suggestions", ordres.size()).put("produits",
                    produits);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "creerSuggestion etat de stock", e);
            return json.put("success", FAILED).put("errors", "Impossible de créer la suggestion");
        }
    }
}
