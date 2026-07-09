package rest.service.impl;

import commonTasks.dto.ProduitExtraInfoDTO;
import dal.TClasseAbc;
import dal.TFamille;
import java.util.Date;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TemporalType;
import rest.service.ProduitExtraInfoService;
import util.DateUtil;

/**
 * Infos complementaires d'un produit : derniere vente (date + qte totale vendue ce jour), dernier achat (date + qte
 * totale entree ce jour), dernier inventaire clot (date + qte comptee), code geo, classe ABC et, si le produit gere un
 * stock reserve, le stock reserve avec ses seuils. La derniere vente, le dernier inventaire et le stock reserve sont
 * calcules sur l'emplacement fourni.
 */
@Stateless
public class ProduitExtraInfoServiceImpl implements ProduitExtraInfoService {

    private static final Logger LOG = Logger.getLogger(ProduitExtraInfoServiceImpl.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public ProduitExtraInfoDTO getExtraInfo(String familleId, String emplacementId) {
        ProduitExtraInfoDTO extra = new ProduitExtraInfoDTO();
        TFamille famille = em.find(TFamille.class, familleId);
        if (famille == null) {
            return extra;
        }
        extra.setCodeGeoArticle(famille.getStrCODEGEOARTICLE());

        // Classe ABC du produit
        if (famille.getLgCLASSEABCID() != null) {
            TClasseAbc classeAbc = em.find(TClasseAbc.class, famille.getLgCLASSEABCID());
            if (classeAbc != null) {
                extra.setClasse(classeAbc.getStrCODE());
            }
        }

        // Derniere vente : date + quantite totale vendue a cette date
        try {
            List<Date> lastVente = em
                    .createQuery("SELECT o.lgPREENREGISTREMENTID.dtUPDATED FROM TPreenregistrementDetail o "
                            + "WHERE o.lgPREENREGISTREMENTID.strSTATUT='is_Closed' "
                            + "AND o.lgPREENREGISTREMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID=?1 "
                            + "AND o.lgFAMILLEID.lgFAMILLEID=?2 ORDER BY o.lgPREENREGISTREMENTID.dtUPDATED DESC",
                            Date.class)
                    .setParameter(1, emplacementId).setParameter(2, familleId).setMaxResults(1).getResultList();
            if (!lastVente.isEmpty()) {
                Date dateVente = lastVente.get(0);
                extra.setDateDerniereVente(DateUtil.convertDateToDD_MM_YYYY(dateVente));
                Number qteVente = (Number) em
                        .createQuery("SELECT COALESCE(SUM(o.intQUANTITY),0) FROM TPreenregistrementDetail o "
                                + "WHERE o.lgPREENREGISTREMENTID.strSTATUT='is_Closed' "
                                + "AND o.lgPREENREGISTREMENTID.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID=?1 "
                                + "AND o.lgFAMILLEID.lgFAMILLEID=?2 "
                                + "AND FUNCTION('DATE',o.lgPREENREGISTREMENTID.dtUPDATED)=?3")
                        .setParameter(1, emplacementId).setParameter(2, familleId)
                        .setParameter(3, new java.sql.Date(dateVente.getTime()), TemporalType.DATE).getSingleResult();
                extra.setQteDerniereVente(qteVente != null ? qteVente.intValue() : 0);
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "extraInfo derniere vente {0} : {1}", new Object[] { familleId, e.toString() });
        }

        // Dernier achat : date + quantite totale entree a cette date
        try {
            List<Date> lastAchat = em.createQuery(
                    "SELECT o.lgBONLIVRAISONID.dtUPDATED FROM TBonLivraisonDetail o "
                            + "WHERE o.lgFAMILLEID.lgFAMILLEID=?1 ORDER BY o.lgBONLIVRAISONID.dtUPDATED DESC",
                    Date.class).setParameter(1, familleId).setMaxResults(1).getResultList();
            if (!lastAchat.isEmpty()) {
                Date dateAchat = lastAchat.get(0);
                extra.setDateDernierAchat(DateUtil.convertDateToDD_MM_YYYY(dateAchat));
                Number qteAchat = (Number) em
                        .createQuery("SELECT COALESCE(SUM(o.intQTERECUE),0) FROM TBonLivraisonDetail o "
                                + "WHERE o.lgFAMILLEID.lgFAMILLEID=?1 "
                                + "AND FUNCTION('DATE',o.lgBONLIVRAISONID.dtUPDATED)=?2")
                        .setParameter(1, familleId)
                        .setParameter(2, new java.sql.Date(dateAchat.getTime()), TemporalType.DATE).getSingleResult();
                extra.setQteDernierAchat(qteAchat != null ? qteAchat.intValue() : 0);
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "extraInfo dernier achat {0} : {1}", new Object[] { familleId, e.toString() });
        }

        // Dernier inventaire clot : date + quantite comptee
        try {
            List<Object[]> lastInv = em
                    .createQuery("SELECT o.dtUPDATED, o.intNUMBER FROM TInventaireFamille o "
                            + "WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND o.boolINVENTAIRE=true "
                            + "AND o.lgINVENTAIREID.strSTATUT='is_Closed' "
                            + "AND o.lgINVENTAIREID.lgEMPLACEMENTID.lgEMPLACEMENTID=?2 ORDER BY o.dtUPDATED DESC",
                            Object[].class)
                    .setParameter(1, familleId).setParameter(2, emplacementId).setMaxResults(1).getResultList();
            if (!lastInv.isEmpty()) {
                Object[] inv = lastInv.get(0);
                if (inv[0] != null) {
                    extra.setDateDernierInventaire(DateUtil.convertDateToDD_MM_YYYY((Date) inv[0]));
                }
                extra.setQteDernierInventaire(inv[1] != null ? ((Number) inv[1]).intValue() : 0);
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "extraInfo dernier inventaire {0} : {1}", new Object[] { familleId, e.toString() });
        }

        // Stock reserve (t_type_stock_famille type 2) + seuils, uniquement si le produit est en reserve
        if (Boolean.TRUE.equals(famille.getBoolRESERVE())) {
            extra.setSeuilReserve(famille.getIntSEUILRESERVE());
            extra.setSeuilMiniRayon(famille.getIntSEUILMINIRAYON());
            try {
                Object reserve = em.createNativeQuery("SELECT tsf.int_NUMBER FROM t_type_stock_famille tsf "
                        + "WHERE tsf.lg_TYPE_STOCK_ID='2' AND tsf.lg_FAMILLE_ID=?1 AND tsf.lg_EMPLACEMENT_ID=?2")
                        .setParameter(1, familleId).setParameter(2, emplacementId != null ? emplacementId : "")
                        .setMaxResults(1).getSingleResult();
                extra.setStockReserve(reserve != null ? ((Number) reserve).intValue() : 0);
            } catch (Exception e) {
                extra.setStockReserve(0);
            }
        }
        return extra;
    }
}
