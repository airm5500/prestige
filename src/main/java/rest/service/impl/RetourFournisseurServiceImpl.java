/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import commonTasks.dto.ErpAvoir;
import commonTasks.dto.RetourDetailsDTO;
import commonTasks.dto.RetourFournisseurDTO;
import dal.TBonLivraison;
import dal.TBonLivraisonDetail;
import dal.TFamille;
import dal.TFamilleStock;
import dal.TGrossiste;
import dal.TMotifRetour;
import dal.TRetourFournisseur;
import dal.TRetourFournisseurDetail;
import dal.TUser;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TemporalType;
import javax.persistence.TypedQuery;
import org.apache.commons.lang3.StringUtils;
import rest.service.MvtProduitService;
import rest.service.RetourFournisseurService;
import rest.service.SessionHelperService;
import rest.service.dto.UpdateRetourDTO;
import rest.service.dto.UpdateRetourItemDTO;
import util.DateConverter;

/**
 *
 * @author koben
 */
@Stateless
public class RetourFournisseurServiceImpl implements RetourFournisseurService {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private MvtProduitService mvtProduitService;
    @EJB
    private SessionHelperService sessionHelperService;

    public EntityManager getEntityManager() {
        return em;
    }

    @Override
    public List<RetourDetailsDTO> loadDetailRetourFournisseur(String retourId) {
        TypedQuery<TRetourFournisseurDetail> q = getEntityManager().createQuery(
                "SELECT o FROM TRetourFournisseurDetail o WHERE o.lgRETOURFRSID.lgRETOURFRSID=?1 ORDER BY o.dtCREATED DESC",
                TRetourFournisseurDetail.class);
        q.setParameter(1, retourId);
        return q.getResultList().stream().map(RetourDetailsDTO::new).collect(Collectors.toList());
    }

    private TRetourFournisseur create(RetourFournisseurDTO params) {
        params.setUser(sessionHelperService.getCurrentUser());
        TRetourFournisseurDetail item = newItem(params.getItems().get(0), params.getLgBONLIVRAISONID(),
                params.getUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        if (item == null) {
            return null;
        }
        TBonLivraison bonLivraison = getTBonLivraison(params.getLgBONLIVRAISONID());
        TRetourFournisseur fournisseur = createRetourFournisseur(params.getUser(), params.getStrCOMMENTAIRE(),
                params.getStrREPONSEFRS(), bonLivraison);
        getEntityManager().persist(fournisseur);
        item.setLgRETOURFRSID(fournisseur);
        getEntityManager().persist(item);
        return fournisseur;
    }

    @Override
    public RetourFournisseurDTO createRetour(RetourFournisseurDTO params) {
        TRetourFournisseur fournisseur = create(params);
        if (fournisseur != null) {
            return new RetourFournisseurDTO(fournisseur);
        }
        return null;

    }

    @Override
    public RetourDetailsDTO addItem(RetourDetailsDTO params) {
        TRetourFournisseur fournisseur = getEntityManager().find(TRetourFournisseur.class, params.getLgRETOURFRSID());
        TRetourFournisseurDetail item = getRetourFournisseurDetail(params.getLgRETOURFRSID(), params.getProduitId());
        if (item == null) {
            item = newItem(params, fournisseur.getLgBONLIVRAISONID().getStrREFLIVRAISON(),
                    fournisseur.getLgUSERID().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            if (item != null) {
                item.setLgRETOURFRSID(fournisseur);
                getEntityManager().persist(item);
                return new RetourDetailsDTO(item);
            }
            return null;

        } else {
            boolean r = updateItem(item, params);
            if (r) {
                return new RetourDetailsDTO(item);
            }
            return null;
        }

    }

    private boolean updateItem(TRetourFournisseurDetail item, RetourDetailsDTO params) {
        TBonLivraisonDetail bonLivraisonDetail = item.getBonLivraisonDetail();
        if (item.getIntNUMBERRETURN() + params.getIntNUMBERRETURN() > bonLivraisonDetail.getIntQTERECUE()) {
            return false;
        }
        item.setIntNUMBERRETURN(item.getIntNUMBERRETURN() + params.getIntNUMBERRETURN());
        item.setDtUPDATED(new Date());
        getEntityManager().merge(item);
        return true;
    }

    @Override
    public RetourDetailsDTO updateItem(RetourDetailsDTO params) {
        TRetourFournisseurDetail item = getEntityManager().find(TRetourFournisseurDetail.class,
                params.getLgRETOURFRSDETAIL());
        TBonLivraisonDetail bonLivraisonDetail = item.getBonLivraisonDetail();
        if (params.getIntNUMBERRETURN() > bonLivraisonDetail.getIntQTERECUE()) {
            return null;
        }
        item.setIntNUMBERRETURN(params.getIntNUMBERRETURN());
        item.setDtUPDATED(new Date());
        getEntityManager().merge(item);
        return new RetourDetailsDTO(item);
    }

    @Override
    public void removeItem(String id) {
        TRetourFournisseurDetail item = getEntityManager().find(TRetourFournisseurDetail.class, id);
        getEntityManager().remove(item);
    }

    @Override
    public void cloture(RetourFournisseurDTO params) {
        throw new UnsupportedOperationException("Not supported yet."); // To change body of generated methods, choose
        // Tools | Templates.
    }

    private TBonLivraisonDetail getTBonLivraisonDetailLast(String lgBONLIVRAISONID, String lgFAMILLEID) {
        TypedQuery<TBonLivraisonDetail> qry = getEntityManager().createQuery(
                "SELECT t FROM TBonLivraisonDetail t WHERE t.lgBONLIVRAISONID.strREFLIVRAISON = ?1  AND t.lgFAMILLEID.lgFAMILLEID = ?2",
                TBonLivraisonDetail.class).setParameter(1, lgBONLIVRAISONID).setParameter(2, lgFAMILLEID);
        qry.setMaxResults(1);
        return qry.getSingleResult();

    }

    private TBonLivraison getTBonLivraison(String lgBONLIVRAISONID) {
        TypedQuery<TBonLivraison> qry = getEntityManager()
                .createQuery("SELECT t FROM TBonLivraison t WHERE t.strREFLIVRAISON = ?1", TBonLivraison.class)
                .setParameter(1, lgBONLIVRAISONID);
        return qry.getSingleResult();
    }

    private TFamille getFamille(String produitId) {
        return getEntityManager().find(TFamille.class, produitId);
    }

    private TFamilleStock getFamilleStock(String produitId, String emplacementId) {
        TypedQuery<TFamilleStock> q = getEntityManager().createQuery(
                "SELECT o FROM TFamilleStock o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND o.lgEMPLACEMENTID.lgEMPLACEMENTID=?2 AND o.strSTATUT='enable'",
                TFamilleStock.class);
        q.setParameter(1, produitId).setParameter(2, emplacementId);
        q.setMaxResults(1);
        return q.getSingleResult();
    }

    private TRetourFournisseurDetail newItem(RetourDetailsDTO item, String bonId, String emplacementId) {
        TBonLivraisonDetail bonLivraisonDetail = getTBonLivraisonDetailLast(bonId, item.getProduitId());
        if (bonLivraisonDetail == null) {
            return null;
        }
        if (item.getIntNUMBERRETURN() > bonLivraisonDetail.getIntQTERECUE()) {
            return null;
        }
        TRetourFournisseurDetail oTRetourFournisseurDetail = new TRetourFournisseurDetail(UUID.randomUUID().toString());
        oTRetourFournisseurDetail.setIntNUMBERRETURN(item.getIntNUMBERRETURN());
        oTRetourFournisseurDetail.setIntNUMBERANSWER(0);
        oTRetourFournisseurDetail.setIntPAF(bonLivraisonDetail.getIntPAF());
        oTRetourFournisseurDetail.setBonLivraisonDetail(bonLivraisonDetail);
        oTRetourFournisseurDetail.setDtCREATED(new Date());
        oTRetourFournisseurDetail.setDtUPDATED(oTRetourFournisseurDetail.getDtCREATED());
        oTRetourFournisseurDetail.setStrSTATUT(DateConverter.STATUT_PROCESS);
        oTRetourFournisseurDetail.setLgFAMILLEID(getFamille(item.getProduitId()));
        oTRetourFournisseurDetail
                .setIntSTOCK(getFamilleStock(item.getProduitId(), emplacementId).getIntNUMBERAVAILABLE());
        oTRetourFournisseurDetail.setLgMOTIFRETOUR(getFromId(item.getLgMOTIFRETOUR()));

        return oTRetourFournisseurDetail;
    }

    private TMotifRetour getFromId(String id) {
        if (StringUtils.isEmpty(id)) {
            return new TMotifRetour("01");
        }
        return new TMotifRetour(id);
    }

    private TRetourFournisseurDetail getRetourFournisseurDetail(String lgRetourId, String lgFAMILLEID) {
        try {
            TypedQuery<TRetourFournisseurDetail> qry = getEntityManager().createQuery(
                    "SELECT t FROM TRetourFournisseurDetail t WHERE t.lgRETOURFRSID.lgRETOURFRSID = ?1  AND t.lgFAMILLEID.lgFAMILLEID = ?2",
                    TRetourFournisseurDetail.class).setParameter(1, lgRetourId).setParameter(2, lgFAMILLEID);
            return qry.getSingleResult();
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public List<ErpAvoir> erpAvoirsFournisseurs(String dtStart, String dtEnd) {
        return getEntityManager().createQuery(
                "SELECT new commonTasks.dto.ErpAvoir(o) FROM TRetourFournisseurDetail o WHERE o.strSTATUT='enable' AND FUNCTION('DATE',o.dtUPDATED) BETWEEN ?1 AND ?2",
                ErpAvoir.class).setParameter(1, java.sql.Date.valueOf(dtStart), TemporalType.DATE)
                .setParameter(2, java.sql.Date.valueOf(dtEnd), TemporalType.DATE).getResultList();
    }

    @Override
    public void returnFullBonLivraison(String bonId, String motifId) throws CloneNotSupportedException {

        TBonLivraison bonLivraison = this.getEntityManager().find(TBonLivraison.class, bonId);
        TRetourFournisseur retourFournisseur = createRetourFournisseur(this.sessionHelperService.getCurrentUser(), "",
                null, bonLivraison);
        retourFournisseur.setStrSTATUT(DateConverter.STATUT_ENABLE);
        TMotifRetour motifRetour = getFromId(motifId);
        ArrayList<TBonLivraisonDetail> bonLivraisonDetails = new ArrayList<>(
                bonLivraison.getTBonLivraisonDetailCollection());
        cloneBl(bonLivraison, this.sessionHelperService.getCurrentUser(), bonLivraisonDetails);
        retourFournisseur.setLgBONLIVRAISONID(bonLivraison);
        mvtProduitService.validerFullBlRetourFournisseur(retourFournisseur, motifRetour, bonLivraisonDetails);

        this.getEntityManager().merge(bonLivraison);

    }

    private void cloneBl(TBonLivraison bonLivraison, TUser user, ArrayList<TBonLivraisonDetail> bonLivraisonDetails)
            throws CloneNotSupportedException {
        bonLivraison.setDtUPDATED(new Date());
        bonLivraison.setSTATUS(DateConverter.STATUT_DELETE);
        bonLivraison.setStrSTATUT(DateConverter.STATUT_DELETE);
        TBonLivraison cloneBl = (TBonLivraison) bonLivraison.clone();
        cloneBl.setTBonLivraisonDetailCollection(new ArrayList<>());
        cloneBl.setTRetourFournisseurCollection(new ArrayList<>());
        cloneBl.setLgBONLIVRAISONID(UUID.randomUUID().toString());
        cloneBl.setDtCREATED(new Date());
        cloneBl.setDtUPDATED(cloneBl.getDtCREATED());
        cloneBl.setLgUSERID(user);
        cloneBl.setIntHTTC(cloneBl.getIntHTTC() * (-1));
        cloneBl.setIntMHT(cloneBl.getIntMHT() * (-1));
        cloneBl.setIntTVA(cloneBl.getIntTVA() * (-1));
        cloneTBonLivraisonDetails(cloneBl, bonLivraisonDetails);
        this.getEntityManager().merge(bonLivraison);

    }

    private final Function<TBonLivraisonDetail, TBonLivraisonDetail> cloneTBonLivraisonDetail = (
            bonLivraisonDetail) -> {
        TBonLivraisonDetail copy = (TBonLivraisonDetail) bonLivraisonDetail.clone();
        copy.setLgBONLIVRAISONDETAIL(UUID.randomUUID().toString());
        copy.setDtCREATED(new Date());
        copy.setDtUPDATED(bonLivraisonDetail.getDtCREATED());
        copy.setLgBONLIVRAISONID(new TBonLivraison());
        return copy;
    };

    private void cloneTBonLivraisonDetails(TBonLivraison cloneBl, ArrayList<TBonLivraisonDetail> bonLivraisonDetails) {

        bonLivraisonDetails.stream().map(this.cloneTBonLivraisonDetail).forEach(bonLivraisonDetail -> {
            bonLivraisonDetail.setLgBONLIVRAISONID(cloneBl);
            cloneBl.getTBonLivraisonDetailCollection().add(bonLivraisonDetail);
        });
        this.getEntityManager().persist(cloneBl);
        cloneBl.getTBonLivraisonDetailCollection().stream().forEach(this.getEntityManager()::persist);
    }

    private TRetourFournisseur createRetourFournisseur(TUser tUser, String comment, String response,
            TBonLivraison bonLivraison) {
        TRetourFournisseur retourFournisseur = new TRetourFournisseur(UUID.randomUUID().toString());
        retourFournisseur.setDtCREATED(new Date());
        retourFournisseur.setDtDATE(retourFournisseur.getDtCREATED());
        retourFournisseur.setLgUSERID(tUser);
        retourFournisseur.setDtUPDATED(retourFournisseur.getDtCREATED());
        retourFournisseur.setDlAMOUNT(0.0);
        retourFournisseur.setStrREFRETOURFRS(DateConverter.getShortId(8));
        retourFournisseur.setStrCOMMENTAIRE(comment);
        if (StringUtils.isEmpty(response)) {
            retourFournisseur.setStrREPONSEFRS("");
        } else {
            retourFournisseur.setStrREPONSEFRS(response);
        }

        TGrossiste grossite = bonLivraison.getLgORDERID().getLgGROSSISTEID();
        retourFournisseur.setLgBONLIVRAISONID(bonLivraison);
        retourFournisseur.setLgGROSSISTEID(grossite);
        retourFournisseur.setStrSTATUT(DateConverter.STATUT_PROCESS);
        return retourFournisseur;
    }

    @Override
    public void updateQuantiteReponse(UpdateRetourItemDTO retourItem) {
        TRetourFournisseurDetail retourFournisseurDetail = this.getEntityManager().find(TRetourFournisseurDetail.class,
                retourItem.getRetourtItemId());
        retourFournisseurDetail.setIntNUMBERANSWER(retourItem.getQuantity());
        this.getEntityManager().merge(retourFournisseurDetail);
    }

    @Override
    public void finaliserRetourFournisseur(UpdateRetourDTO updateRetour) {
        TRetourFournisseur retourFournisseur = this.getEntityManager().find(TRetourFournisseur.class,
                updateRetour.getRetourId());
        retourFournisseur.setDlAMOUNT(0.0);
        retourFournisseur.getTRetourFournisseurDetailCollection().forEach(retourFournisseurDetail -> {
            TBonLivraisonDetail bonLivraisonDetail = retourFournisseurDetail.getBonLivraisonDetail();
            bonLivraisonDetail.setIntQTERETURN(Objects.requireNonNullElse(bonLivraisonDetail.getIntQTERETURN(), 0)
                    + retourFournisseurDetail.getIntNUMBERANSWER());
            this.getEntityManager().merge(bonLivraisonDetail);
            retourFournisseur.setDlAMOUNT(retourFournisseur.getDlAMOUNT()
                    + (retourFournisseurDetail.getIntNUMBERANSWER() * retourFournisseurDetail.getIntPAF()));

        });
        retourFournisseur.setDtUPDATED(new Date());
        retourFournisseur.setStrREPONSEFRS(updateRetour.getComment());
        retourFournisseur.setLgUSERID(this.sessionHelperService.getCurrentUser());
        this.getEntityManager().merge(retourFournisseur);
    }

}
