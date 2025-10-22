package rest.service.dto;

import dal.OrderDetailLot;
import dal.TFamille;
import dal.TFamilleGrossiste;
import dal.TFamilleStock;
import dal.TGrossiste;
import dal.TOrder;
import dal.TOrderDetail;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONPropertyName;
import util.DateCommonUtils;

/**
 *
 * @author koben
 */
public class CommandeEncourDetailDTO {

    private final String lgORDERDETAILID;
    private final Integer intNUMBER;

    private final Integer intPRICE;

    private final Integer intPAFDETAIL;

    private final Integer intPRICEDETAIL;

    private final Integer intQTEMANQUANT;

    private final Integer intQTEREPGROSSISTE;

    private final Boolean boolBL;

    private final String strSTATUT;
    private final String grossisteLibelle;

    private final String dtCREATED;

    private final String dtUPDATED;

    private final String lgGROSSISTEID;

    private final String lgORDERID;

    private final String lgFAMILLEID;

    private final Integer prixUnitaire;

    private final Integer prixAchat;

    private final Short intORERSTATUS;

    private final int ug;
    private final String produitName;
    private String produitCip;
    private final Integer produitPrixAchat;
    private final Integer produitPrixVente;
    private final Integer produitPrixMachine;
    private final Integer produitPrixReference;
    private final boolean prixDiff;
    private final int qteLivree;
    private final Integer seuil;
    private int qteReasor;
    private int stock;
    private String codeArticle;
    private int[] produitStates;
    private Set<OrderDetailLot> lots = new HashSet<>();
    private String datePeremption;
    private String lotNums;
    private boolean checked;

    private Integer checkedQuantity;

    public int[] getProduitStates() {
        return produitStates;
    }

    public String getLotNums() {
        return lotNums;
    }

    public void setLotNums(String lotNums) {
        this.lotNums = lotNums;
    }

    public void setProduitStates(int[] produitStates) {
        this.produitStates = produitStates;
    }

    @JSONPropertyName("lg_GROSSISTE_LIBELLE")
    public String getGrossisteLibelle() {
        return grossisteLibelle;
    }

    @JSONPropertyName("lg_ORDERDETAIL_ID")
    public String getLgORDERDETAILID() {
        return lgORDERDETAILID;
    }

    @JSONPropertyName("int_NUMBER")
    public Integer getIntNUMBER() {
        return intNUMBER;
    }

    @JSONPropertyName("int_PRICE")
    public Integer getIntPRICE() {
        return intPRICE;
    }

    @JSONPropertyName("int_PAF")
    public Integer getIntPAFDETAIL() {
        return intPAFDETAIL;
    }

    @JSONPropertyName("lg_FAMILLE_PRIX_VENTE")
    public Integer getIntPRICEDETAIL() {
        return intPRICEDETAIL;
    }

    @JSONPropertyName("int_QTE_MANQUANT")
    public Integer getIntQTEMANQUANT() {
        return intQTEMANQUANT;
    }

    @JSONPropertyName("int_QTE_REP_GROSSISTE")
    public Integer getIntQTEREPGROSSISTE() {
        return intQTEREPGROSSISTE;
    }

    @JSONPropertyName("bool_BL")
    public Boolean getBoolBL() {
        return boolBL;
    }

    @JSONPropertyName("str_STATUT")
    public String getStrSTATUT() {
        return strSTATUT;
    }

    @JSONPropertyName("dt_CREATED")
    public String getDtCREATED() {
        return dtCREATED;
    }

    @JSONPropertyName("dt_UPDATED")
    public String getDtUPDATED() {
        return dtUPDATED;
    }

    @JSONPropertyName("lg_GROSSISTE_ID")
    public String getLgGROSSISTEID() {
        return lgGROSSISTEID;
    }

    @JSONPropertyName("lg_ORDER_ID")
    public String getLgORDERID() {
        return lgORDERID;
    }

    @JSONPropertyName("lg_FAMILLE_ID")
    public String getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public Integer getPrixUnitaire() {
        return prixUnitaire;
    }

    public Integer getPrixAchat() {
        return prixAchat;
    }

    @JSONPropertyName("int_ORERSTATUS")
    public Short getIntORERSTATUS() {
        return intORERSTATUS;
    }

    public int getUg() {
        return ug;
    }

    @JSONPropertyName("lg_FAMILLE_NAME")
    public String getProduitName() {
        return produitName;
    }

    @JSONPropertyName("lg_FAMILLE_CIP")
    public String getProduitCip() {
        return produitCip;
    }

    @JSONPropertyName("lg_FAMILLE_PRIX_ACHAT")
    public Integer getProduitPrixAchat() {
        return produitPrixAchat;
    }

    @JSONPropertyName("lg_FAMILLE_PRIX_VENTE")
    public Integer getProduitPrixVente() {
        return produitPrixVente;
    }

    @JSONPropertyName("int_PRICE_MACHINE")
    public Integer getProduitPrixMachine() {
        return produitPrixMachine;
    }

    @JSONPropertyName("int_PRIX_REFERENCE")
    public Integer getProduitPrixReference() {
        return produitPrixReference;
    }

    public boolean getPrixDiff() {
        return prixDiff;
    }

    @JSONPropertyName("int_QTE_LIVRE")
    public int getQteLivree() {
        return qteLivree;
    }

    @JSONPropertyName("int_SEUIL")
    public Integer getSeuil() {
        return seuil;
    }

    @JSONPropertyName("int_QTE_REASSORT")
    public int getQteReasor() {
        return qteReasor;
    }

    @JSONPropertyName("lg_FAMILLE_QTE_STOCK")
    public int getStock() {
        return stock;
    }

    @JSONPropertyName("str_CODE_ARTICLE")
    public String getCodeArticle() {
        return codeArticle;
    }

    public String getDatePeremption() {
        return datePeremption;
    }

    public void setDatePeremption(String datePeremption) {
        this.datePeremption = datePeremption;
    }

    public CommandeEncourDetailDTO(TOrderDetail detail) {
        this.prixUnitaire = detail.getPrixUnitaire();
        this.prixAchat = detail.getPrixAchat();
        this.lgORDERDETAILID = detail.getLgORDERDETAILID();
        this.intNUMBER = detail.getIntNUMBER();
        this.intPRICE = detail.getIntPRICE();
        this.intPAFDETAIL = detail.getIntPAFDETAIL();
        this.intPRICEDETAIL = detail.getIntPRICEDETAIL();
        this.intQTEMANQUANT = detail.getIntQTEMANQUANT();
        this.intQTEREPGROSSISTE = detail.getIntQTEREPGROSSISTE();
        this.boolBL = detail.getBoolBL();
        this.strSTATUT = detail.getStrSTATUT();
        this.dtCREATED = DateCommonUtils.formatDate(detail.getDtCREATED());
        this.dtUPDATED = Objects.isNull(detail.getDtUPDATED()) ? this.dtCREATED
                : DateCommonUtils.formatDate(detail.getDtUPDATED());

        TOrder order = detail.getLgORDERID();
        TGrossiste grossiste = order.getLgGROSSISTEID();
        this.lgGROSSISTEID = grossiste.getLgGROSSISTEID();
        TFamille famille = detail.getLgFAMILLEID();

        Collection<TFamilleGrossiste> tFamilleGrossisteCollection = famille.getTFamilleGrossisteCollection();
        if (CollectionUtils.isNotEmpty(tFamilleGrossisteCollection)) {
            famille.getTFamilleGrossisteCollection().stream()
                    .filter(t -> t.getLgGROSSISTEID().getLgGROSSISTEID().equals(grossiste.getLgGROSSISTEID())
                            && "enable".equals(t.getStrSTATUT()))
                    .findFirst().ifPresentOrElse(t -> {
                        this.produitCip = t.getStrCODEARTICLE();
                        this.codeArticle = t.getStrCODEARTICLE();
                    }, () -> {
                        this.produitCip = famille.getIntCIP();
                        this.codeArticle = "";
                    });
        } else {
            this.produitCip = famille.getIntCIP();
            this.codeArticle = "";
        }

        this.lgORDERID = order.getLgORDERID();
        this.lgFAMILLEID = famille.getLgFAMILLEID();
        this.produitName = famille.getStrNAME();
        this.grossisteLibelle = grossiste.getStrLIBELLE();
        this.intORERSTATUS = detail.getIntORERSTATUS();
        this.ug = detail.getUg();
        this.produitPrixAchat = famille.getIntPAF();
        this.produitPrixVente = detail.getIntPRICEDETAIL();
        this.produitPrixReference = famille.getIntPRICETIPS();
        this.produitPrixMachine = famille.getIntPRICE();
        this.prixDiff = detail.getIntPRICEDETAIL().compareTo(famille.getIntPRICE()) != 0;
        this.qteLivree = detail.getIntNUMBER() - detail.getIntQTEMANQUANT();
        this.seuil = famille.getIntSEUILMIN();
        famille.getTFamilleStockCollection().stream()
                .filter(s -> s.getLgEMPLACEMENTID().equals(order.getLgUSERID().getLgEMPLACEMENTID())).findFirst()
                .ifPresentOrElse(e -> {
                    this.stock = e.getIntNUMBERAVAILABLE();
                    this.qteReasor = Math.abs(e.getIntNUMBERAVAILABLE() - famille.getIntSEUILMIN());

                }, () -> {
                    this.stock = 0;
                    this.qteReasor = 0;
                });

        this.lots = fetchLots(detail.getLots());
        this.datePeremption = buildDatePeremption(this.lots);
        this.lotNums = buildLotNums(this.lots);
        this.checked = detail.isChecked();
        this.checkedQuantity = detail.getCheckedQuantity();
    }

    public boolean isChecked() {
        return checked;
    }

    public void setChecked(boolean checked) {
        this.checked = checked;
    }

    public Integer getCheckedQuantity() {
        return checkedQuantity;
    }

    public void setCheckedQuantity(Integer checkedQuantity) {
        this.checkedQuantity = checkedQuantity;
    }

    public void setProduitCip(String produitCip) {
        this.produitCip = produitCip;
    }

    public void setQteReasor(int qteReasor) {
        this.qteReasor = qteReasor;
    }

    public void setStock(int stock) {
        this.stock = stock;
    }

    public Set<OrderDetailLot> getLots() {
        return lots;
    }

    public void setLots(Set<OrderDetailLot> lots) {
        this.lots = lots;
    }

    public void setCodeArticle(String codeArticle) {
        this.codeArticle = codeArticle;
    }

    public CommandeEncourDetailDTO(TOrderDetail detail, TFamilleStock familleStock) {
        this.prixUnitaire = detail.getPrixUnitaire();
        this.prixAchat = detail.getPrixAchat();
        this.lgORDERDETAILID = detail.getLgORDERDETAILID();
        this.intNUMBER = detail.getIntNUMBER();
        this.intPRICE = detail.getIntPRICE();
        this.intPAFDETAIL = detail.getIntPAFDETAIL();
        this.intPRICEDETAIL = detail.getIntPRICEDETAIL();
        this.intQTEMANQUANT = detail.getIntQTEMANQUANT();
        this.intQTEREPGROSSISTE = detail.getIntQTEREPGROSSISTE();
        this.boolBL = detail.getBoolBL();
        this.strSTATUT = detail.getStrSTATUT();
        this.dtCREATED = DateCommonUtils.formatDate(detail.getDtCREATED());
        this.dtUPDATED = Objects.isNull(detail.getDtUPDATED()) ? this.dtCREATED
                : DateCommonUtils.formatDate(detail.getDtUPDATED());

        TOrder order = detail.getLgORDERID();
        TGrossiste grossiste = order.getLgGROSSISTEID();
        this.lgGROSSISTEID = grossiste.getLgGROSSISTEID();
        TFamille famille = detail.getLgFAMILLEID();

        Collection<TFamilleGrossiste> tFamilleGrossisteCollection = famille.getTFamilleGrossisteCollection();
        if (CollectionUtils.isNotEmpty(tFamilleGrossisteCollection)) {
            famille.getTFamilleGrossisteCollection().stream()
                    .filter((t) -> t.getLgGROSSISTEID().equals(grossiste) && "enable".equals(t.getStrSTATUT()))
                    .findFirst().ifPresentOrElse(t -> {
                        this.produitCip = t.getStrCODEARTICLE();
                        this.codeArticle = t.getStrCODEARTICLE();
                    }, () -> {
                        this.produitCip = famille.getIntCIP();
                        this.codeArticle = "";
                    });
        } else {
            this.produitCip = famille.getIntCIP();
            this.codeArticle = "";
        }

        this.lgORDERID = order.getLgORDERID();
        this.lgFAMILLEID = famille.getLgFAMILLEID();
        this.produitName = famille.getStrNAME();
        this.grossisteLibelle = grossiste.getStrLIBELLE();
        this.intORERSTATUS = detail.getIntORERSTATUS();
        this.ug = detail.getUg();
        this.produitPrixAchat = famille.getIntPAF();
        this.produitPrixVente = detail.getIntPRICEDETAIL();
        this.produitPrixReference = famille.getIntPRICETIPS();
        this.produitPrixMachine = famille.getIntPRICE();
        this.prixDiff = detail.getIntPRICEDETAIL().compareTo(famille.getIntPRICE()) != 0;
        this.qteLivree = detail.getIntNUMBER() - detail.getIntQTEMANQUANT();
        this.seuil = famille.getIntSEUILMIN();
        this.stock = familleStock.getIntNUMBERAVAILABLE();
        this.qteReasor = Math.abs(familleStock.getIntNUMBERAVAILABLE() - famille.getIntSEUILMIN());
        this.lots = fetchLots(detail.getLots());
        this.datePeremption = buildDatePeremption(this.lots);
        this.lotNums = buildLotNums(this.lots);
        this.checked = detail.isChecked();
        this.checkedQuantity = detail.getCheckedQuantity();

    }

    private String buildDatePeremption(Set<OrderDetailLot> lots) {
        if (lots != null) {
            return lots.stream().map(OrderDetailLot::getDatePeremption).distinct().collect(Collectors.joining(", "));
        }
        return null;
    }

    private String buildLotNums(Set<OrderDetailLot> lots) {
        if (lots != null) {
            return lots.stream().map(OrderDetailLot::getNumeroLot).distinct().collect(Collectors.joining(", "));
        }
        return null;
    }

    private Set<OrderDetailLot> fetchLots(List<OrderDetailLot> lots) {
        if (lots != null) {
            return lots.stream()
                    .filter(e -> Objects.nonNull(e.getDatePeremption()) && StringUtils.isNoneEmpty(e.getNumeroLot()))
                    .distinct().collect(Collectors.toSet());
        }
        return Set.of();
    }
}
