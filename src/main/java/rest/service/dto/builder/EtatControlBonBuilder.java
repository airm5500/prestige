package rest.service.dto.builder;

import commonTasks.dto.ErpFournisseur;
import dal.TBonLivraison;
import dal.TBonLivraisonDetail;
import dal.TGrossiste;
import dal.TOrder;
import dal.TUser;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import rest.service.dto.BonLivraisonDetail;
import rest.service.dto.EtatControlBon;
import util.DateUtil;

/**
 *
 * @author koben
 */
public final class EtatControlBonBuilder extends CommonBuilder {

    public static EtatControlBon build(TBonLivraison bonLivraison) {
        TOrder order = bonLivraison.getLgORDERID();
        TGrossiste grossiste = order.getLgGROSSISTEID();
        TUser oUser = bonLivraison.getLgUSERID();
        List<BonLivraisonDetail> bonLivraisonDetails = bonLivraison.getTBonLivraisonDetailCollection().stream()
                .map(EtatControlBonBuilder::buildItem).collect(Collectors.toList());
        return EtatControlBon.builder().dtCREATED(DateUtil.convertDateToDD_MM_YYYY_HH_mm(bonLivraison.getDtCREATED()))
                .dtUPDATED(DateUtil.convertDateToDD_MM_YYYY_HH_mm(bonLivraison.getDtUPDATED()))
                .dtDATELIVRAISON(DateUtil.convertDateToDD_MM_YYYY_HH_mm(bonLivraison.getDtDATELIVRAISON()))
                .dtREGLEMENTDATE(DateUtil.convertDateToDD_MM_YYYY_HH_mm(bonLivraison.getDtREGLEMENTDATE()))
                .intHTTC(bonLivraison.getIntHTTC()).intMHT(bonLivraison.getIntMHT()).intTVA(bonLivraison.getIntTVA())
                .intMONTANTREGLE(bonLivraison.getIntMONTANTREGLE())
                .intMONTANTRESTANT(bonLivraison.getIntMONTANTRESTANT()).fournisseur(new ErpFournisseur(grossiste))
                .orderId(order.getLgORDERID()).orderRef(order.getStrREFORDER())
                .lgBONLIVRAISONID(bonLivraison.getLgBONLIVRAISONID()).strREFLIVRAISON(bonLivraison.getStrREFLIVRAISON())
                .strSTATUT(bonLivraison.getStrSTATUT()).bonLivraisonDetails(bonLivraisonDetails)
                .items(buildItems(bonLivraisonDetails)).montantAvoir(computeAvoirAmount(bonLivraisonDetails))
                .user(user(oUser)).fournisseurLibelle(grossiste.getStrLIBELLE())
                .userName(oUser.getStrFIRSTNAME().charAt(0) + ".".concat(oUser.getStrLASTNAME()))
                .dateLivraison(DateUtil.convertDateToISO(bonLivraison.getDtDATELIVRAISON())).build();
    }

    public static BonLivraisonDetail buildItem(TBonLivraisonDetail item) {
        return BonLivraisonDetail.builder().intINITSTOCK(item.getIntINITSTOCK()).intPAF(item.getIntPAF())
                .intPAREEL(item.getIntPAREEL()).intPRIXREFERENCE(item.getIntPRIXREFERENCE())
                .intPRIXVENTE(item.getIntPRIXVENTE()).intQTECMDE(item.getIntQTECMDE())
                .intQTEMANQUANT(item.getIntQTEMANQUANT()).intQTERECUE(item.getIntQTERECUE())
                .intQTERETURN(item.getIntQTERETURN()).intQTEUG(item.getIntQTEUG()).prixTarif(item.getPrixTarif())
                .prixUni(item.getPrixUni()).produit(produit(item.getLgFAMILLEID()))
                .lgBONLIVRAISONDETAIL(item.getLgBONLIVRAISONDETAIL()).build();
    }

    public static String buildItems(List<BonLivraisonDetail> bonLivraisonDetails) {
        String items = " ";
        for (BonLivraisonDetail e : bonLivraisonDetails) {
            items = "<b><span style='display:inline-block;width: 7%;'>" + e.getProduit().getIntCIP()
                    + "</span><span style='display:inline-block;width: 25%;'>" + e.getProduit().getStrDESCRIPTION()
                    + "</span><span style='display:inline-block;width: 15%;'>Qte Cmdée: (" + e.getIntQTECMDE()
                    + ")</span><span style='display:inline-block;width: 15%;'>Qte Livrée: ("
                    + (e.getIntQTERECUE() - e.getIntQTEUG())
                    + ")</span><span style='display:inline-block;width: 15%;'>Unité gratuite: (" + e.getIntQTEUG()
                    + ")</span><span style='display:inline-block;width: 15%;'>Avoir ("
                    + (e.getIntQTERETURN() != null ? e.getIntQTERETURN() : 0) + ")</span></b><br> " + items;
        }

        return items;
    }

    public static int computeAvoirAmount(List<BonLivraisonDetail> bonLivraisonDetails) {
        return bonLivraisonDetails.stream().filter(e -> Objects.nonNull(e.getIntQTERETURN()))
                .peek(e -> e.setMontantAvoir(e.getIntQTERETURN() * e.getIntPAF()))
                .map(BonLivraisonDetail::getMontantAvoir).reduce(0, Integer::sum);
    }

}
