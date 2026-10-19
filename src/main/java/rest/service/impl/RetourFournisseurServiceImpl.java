/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import rest.service.RefusMetier;

import commonTasks.dto.ErpAvoir;
import commonTasks.dto.RetourDetailsDTO;
import commonTasks.dto.RetourFournisseurDTO;
import dal.MvtTransaction;
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
import util.Constant;
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
        /*
         * Decision 17 D7 du pharmacien : une ligne par produit, motif et lot. Meme motif et meme lot : la quantite
         * s'ajoute a la ligne (comme avant) ; autre motif : nouvelle ligne, avec un message. Le total du produit sur le
         * retour ne depasse jamais la quantite recue.
         */
        List<TRetourFournisseurDetail> lignes = lignesDuProduit(params.getLgRETOURFRSID(), params.getProduitId());
        TRetourFournisseurDetail item = lignes.stream().filter(l -> memeMotifEtLot(l, params)).findFirst().orElse(null);
        if (item == null) {
            int dejaRetourne = lignes.stream().mapToInt(l -> Objects.requireNonNullElse(l.getIntNUMBERRETURN(), 0))
                    .sum();
            item = newItem(params, fournisseur.getLgBONLIVRAISONID().getStrREFLIVRAISON(),
                    fournisseur.getLgUSERID().getLgEMPLACEMENTID().getLgEMPLACEMENTID(), dejaRetourne);
            if (item != null) {
                item.setLgRETOURFRSID(fournisseur);
                getEntityManager().persist(item);
                RetourDetailsDTO dto = new RetourDetailsDTO(item);
                if (lignes.stream().anyMatch(l -> !memeMotif(l, params))) {
                    dto.setMessage(Constant.MSG_RETOUR_MOTIF_DIFFERENT);
                }
                return dto;
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
        /* toutes les lignes du produit sur ce retour (une par motif et lot depuis la decision 17 D7) */
        int total = lignesDuProduit(item.getLgRETOURFRSID().getLgRETOURFRSID(), item.getLgFAMILLEID().getLgFAMILLEID())
                .stream().mapToInt(l -> Objects.requireNonNullElse(l.getIntNUMBERRETURN(), 0)).sum()
                + params.getIntNUMBERRETURN();
        if (total > bonLivraisonDetail.getIntQTERECUE()) {
            return false;
        }
        controlerStock(item.getLgFAMILLEID().getLgFAMILLEID(),
                item.getLgRETOURFRSID().getLgUSERID().getLgEMPLACEMENTID().getLgEMPLACEMENTID(), total);
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
        controlerStock(item.getLgFAMILLEID().getLgFAMILLEID(),
                item.getLgRETOURFRSID().getLgUSERID().getLgEMPLACEMENTID().getLgEMPLACEMENTID(),
                params.getIntNUMBERRETURN());
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
                /* retours du 08/10 : numero de bon repris (homonymes) -> le bon le plus recent, au lieu d'une erreur */
                "SELECT t FROM TBonLivraisonDetail t WHERE t.lgBONLIVRAISONID.strREFLIVRAISON = ?1  AND t.lgFAMILLEID.lgFAMILLEID = ?2"
                        + " ORDER BY t.lgBONLIVRAISONID.dtCREATED DESC",
                TBonLivraisonDetail.class).setParameter(1, lgBONLIVRAISONID).setParameter(2, lgFAMILLEID);
        qry.setMaxResults(1);
        // demandes des applications mobiles (D2) : produit absent du BL -> null (avant : NoResultException, erreur 500)
        List<TBonLivraisonDetail> l = qry.getResultList();
        return l.isEmpty() ? null : l.get(0);

    }

    private TBonLivraison getTBonLivraison(String lgBONLIVRAISONID) {
        TypedQuery<TBonLivraison> qry = getEntityManager()
                .createQuery("SELECT t FROM TBonLivraison t WHERE t.strREFLIVRAISON = ?1 ORDER BY t.dtCREATED DESC",
                        TBonLivraison.class)
                .setParameter(1, lgBONLIVRAISONID).setMaxResults(1);
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
        List<TFamilleStock> l = q.getResultList();
        return l.isEmpty() ? null : l.get(0);
    }

    /** Stock disponible du produit dans l'emplacement (0 sans fiche de stock). */
    private int stockDisponible(String produitId, String emplacementId) {
        TFamilleStock st = getFamilleStock(produitId, emplacementId);
        return st == null || st.getIntNUMBERAVAILABLE() == null ? 0 : st.getIntNUMBERAVAILABLE();
    }

    /* demandes des applications mobiles (3, D4) : une ligne de retour ne depasse jamais le stock disponible */
    private void controlerStock(String produitId, String emplacementId, int quantite) {
        int dispo = stockDisponible(produitId, emplacementId);
        if (quantite > dispo) {
            throw new RefusMetier(
                    "Stock disponible insuffisant : " + dispo + " en stock, " + quantite + " à retourner.");
        }
    }

    private TRetourFournisseurDetail newItem(RetourDetailsDTO item, String bonId, String emplacementId) {
        return newItem(item, bonId, emplacementId, 0);
    }

    /**
     * @param dejaRetourne
     *            boites du meme produit deja sur d'autres lignes de ce retour (autre motif ou lot)
     */
    private TRetourFournisseurDetail newItem(RetourDetailsDTO item, String bonId, String emplacementId,
            int dejaRetourne) {
        TBonLivraisonDetail bonLivraisonDetail = getTBonLivraisonDetailLast(bonId, item.getProduitId());
        if (bonLivraisonDetail == null) {
            throw new RefusMetier("Ce produit n'est pas sur le BL n° " + bonId + ".");
        }
        if (dejaRetourne + item.getIntNUMBERRETURN() > bonLivraisonDetail.getIntQTERECUE()) {
            throw new RefusMetier("Quantité à retourner (" + (dejaRetourne + item.getIntNUMBERRETURN())
                    + ") supérieure à la quantité reçue sur ce BL (" + bonLivraisonDetail.getIntQTERECUE() + ").");
        }
        controlerStock(item.getProduitId(), emplacementId, dejaRetourne + item.getIntNUMBERRETURN());
        TRetourFournisseurDetail oTRetourFournisseurDetail = new TRetourFournisseurDetail(UUID.randomUUID().toString());
        oTRetourFournisseurDetail.setIntNUMBERRETURN(item.getIntNUMBERRETURN());
        oTRetourFournisseurDetail.setIntNUMBERANSWER(0);
        oTRetourFournisseurDetail.setIntPAF(bonLivraisonDetail.getIntPAF());
        oTRetourFournisseurDetail.setBonLivraisonDetail(bonLivraisonDetail);
        oTRetourFournisseurDetail.setDtCREATED(new Date());
        oTRetourFournisseurDetail.setDtUPDATED(oTRetourFournisseurDetail.getDtCREATED());
        oTRetourFournisseurDetail.setStrSTATUT(DateConverter.STATUT_PROCESS);
        oTRetourFournisseurDetail.setLgFAMILLEID(getFamille(item.getProduitId()));
        oTRetourFournisseurDetail.setIntSTOCK(stockDisponible(item.getProduitId(), emplacementId));
        oTRetourFournisseurDetail.setLgMOTIFRETOUR(getFromId(item.getLgMOTIFRETOUR()));
        appliquerLot(oTRetourFournisseurDetail, item, bonLivraisonDetail);

        return oTRetourFournisseurDetail;
    }

    /**
     * D14 : lot retourne, donne par son identifiant (liste des lots recus sur la ligne) ou par son numero (DataMatrix).
     * Le lot doit appartenir a ce BL et a ce produit ; sans lot, rien ne change.
     */
    private void appliquerLot(TRetourFournisseurDetail d, RetourDetailsDTO item, TBonLivraisonDetail ligne) {
        String lotId = StringUtils.trimToNull(item.getLotId());
        String numLot = StringUtils.trimToNull(item.getNumLot());
        if (lotId == null && numLot == null) {
            return;
        }
        @SuppressWarnings("unchecked")
        List<Object[]> lots = getEntityManager()
                .createNativeQuery("SELECT lg_LOT_ID, int_NUM_LOT FROM t_lot"
                        + " WHERE str_REF_LIVRAISON = ?1 AND lg_FAMILLE_ID = ?2"
                        + (lotId != null ? " AND lg_LOT_ID = ?3" : " AND int_NUM_LOT = ?3") + " ORDER BY dt_CREATED")
                .setParameter(1, ligne.getLgBONLIVRAISONID().getStrREFLIVRAISON())
                .setParameter(2, ligne.getLgFAMILLEID().getLgFAMILLEID())
                .setParameter(3, lotId != null ? lotId : numLot).getResultList();
        if (lots.isEmpty()) {
            throw new RefusMetier(
                    "Le lot " + (numLot != null ? numLot : lotId) + " n'a pas été reçu sur ce BL pour ce produit.");
        }
        d.setLgLOTID(String.valueOf(lots.get(0)[0]));
        d.setNumLot(lots.get(0)[1] == null ? numLot : String.valueOf(lots.get(0)[1]));
    }

    private TMotifRetour getFromId(String id) {
        if (StringUtils.isEmpty(id)) {
            return new TMotifRetour("01");
        }
        return new TMotifRetour(id);
    }

    private List<TRetourFournisseurDetail> lignesDuProduit(String lgRetourId, String lgFAMILLEID) {
        return getEntityManager().createQuery(
                "SELECT t FROM TRetourFournisseurDetail t WHERE t.lgRETOURFRSID.lgRETOURFRSID = ?1 AND t.lgFAMILLEID.lgFAMILLEID = ?2"
                        + " ORDER BY t.dtCREATED",
                TRetourFournisseurDetail.class).setParameter(1, lgRetourId).setParameter(2, lgFAMILLEID)
                .getResultList();
    }

    private static boolean memeMotif(TRetourFournisseurDetail l, RetourDetailsDTO p) {
        String motif = l.getLgMOTIFRETOUR() == null ? null : l.getLgMOTIFRETOUR().getLgMOTIFRETOUR();
        return Objects.equals(StringUtils.trimToNull(motif), StringUtils.trimToNull(p.getLgMOTIFRETOUR()));
    }

    /** meme motif et meme lot (identifiant du lot, a defaut son numero ; sans lot des deux cotes : meme lot) */
    private static boolean memeMotifEtLot(TRetourFournisseurDetail l, RetourDetailsDTO p) {
        if (!memeMotif(l, p)) {
            return false;
        }
        if (StringUtils.isNotBlank(p.getLotId())) {
            return p.getLotId().equals(l.getLgLOTID());
        }
        return Objects.equals(StringUtils.trimToNull(p.getNumLot()), StringUtils.trimToNull(l.getNumLot()));
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
        retourFournisseur.setStrSTATUT(Constant.STATUT_ENABLE);
        TMotifRetour motifRetour = getFromId(motifId);
        ArrayList<TBonLivraisonDetail> bonLivraisonDetails = new ArrayList<>(
                bonLivraison.getTBonLivraisonDetailCollection());
        cloneBl(bonLivraison, this.sessionHelperService.getCurrentUser(), bonLivraisonDetails);
        retourFournisseur.setLgBONLIVRAISONID(bonLivraison);
        mvtProduitService.validerFullBlRetourFournisseur(retourFournisseur, motifRetour, bonLivraisonDetails);
        deleteMvtTransactionByPkey(bonId);
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

    private void deleteMvtTransactionByPkey(String bonId) {
        TypedQuery<MvtTransaction> typedQuery = em.createQuery("SELECT o FROM MvtTransaction o WHERE o.pkey=?1",
                MvtTransaction.class);
        typedQuery.setParameter(1, bonId);
        MvtTransaction mt = typedQuery.getSingleResult();
        em.remove(mt);
    }

    @Override
    @SuppressWarnings("unchecked")
    public org.json.JSONObject tableauBord(String dtStart, String dtEnd, String fourId, int nbProduits) {
        boolean parGrossiste = fourId != null && !fourId.isEmpty();
        javax.persistence.Query q = em
                .createNativeQuery("SELECT DATE_FORMAT(r.dt_UPDATED, '%Y-%m'), r.lg_RETOUR_FRS_ID,"
                        + " d.lg_FAMILLE_ID, f.int_CIP, f.str_NAME, d.lg_MOTIF_RETOUR, m.str_LIBELLE, COALESCE(d.int_NUMBER_RETURN, 0),"
                        + " COALESCE(d.int_NUMBER_ANSWER, 0), COALESCE(d.int_PAF, 0)"
                        + " FROM t_retour_fournisseur r JOIN t_retour_fournisseur_detail d ON d.lg_RETOUR_FRS_ID = r.lg_RETOUR_FRS_ID"
                        + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
                        + " LEFT JOIN t_motif_retour m ON m.lg_MOTIF_RETOUR = d.lg_MOTIF_RETOUR"
                        + " WHERE r.str_STATUT = 'enable' AND DATE(r.dt_UPDATED) BETWEEN ?1 AND ?2"
                        + (parGrossiste ? " AND r.lg_GROSSISTE_ID = ?3" : ""))
                .setParameter(1, java.sql.Date.valueOf(dtStart)).setParameter(2, java.sql.Date.valueOf(dtEnd));
        if (parGrossiste) {
            q.setParameter(3, fourId);
        }
        rest.service.impl.retour.TableauRetourFournisseur t = new rest.service.impl.retour.TableauRetourFournisseur();
        for (Object[] r : (List<Object[]>) q.getResultList()) {
            t.ajouter(s(r[0]), s(r[1]), s(r[2]), s(r[3]), s(r[4]), s(r[5]), s(r[6]), n(r[7]), n(r[8]), n(r[9]));
        }
        return t.json(nbProduits).put("debut", dtStart).put("fin", dtEnd);
    }

    private static String s(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private static int n(Object o) {
        return o == null ? 0 : ((Number) o).intValue();
    }
}
