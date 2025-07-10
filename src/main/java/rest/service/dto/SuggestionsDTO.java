
package rest.service.dto;

import dal.TGrossiste;
import dal.TSuggestionOrder;
import org.json.JSONPropertyName;
import util.DateCommonUtils;

/**
 * @author koben
 */

public class SuggestionsDTO {
    private int montantAchat;
    private int montantVente;
    private int nbreLigne;
    private int totalQty;
    private Integer dateButoir;
    private String lgSUGGESTIONORDERID;
    private String strREF;
    private String grossisteId;
    private String strSTATUT;
    private String dtUPDATED;
    private String dtCREATED;
    private String lgGROSSISTEID;
    private String details = " ";

    public String getLgGROSSISTEID() {
        return lgGROSSISTEID;
    }

    public SuggestionsDTO setLgGROSSISTEID(String lgGROSSISTEID) {
        this.lgGROSSISTEID = lgGROSSISTEID;
        return this;
    }

    @JSONPropertyName("int_TOTAL_ACHAT")
    public int getMontantAchat() {
        return montantAchat;
    }

    public SuggestionsDTO setMontantAchat(int montantAchat) {
        this.montantAchat = montantAchat;
        return this;
    }

    @JSONPropertyName("int_TOTAL_VENTE")
    public int getMontantVente() {
        return montantVente;
    }

    @JSONPropertyName("int_DATE_BUTOIR_ARTICLE")

    public Integer getDateButoir() {
        return dateButoir;
    }

    public SuggestionsDTO setDateButoir(Integer dateButoir) {
        this.dateButoir = dateButoir;
        return this;
    }

    public SuggestionsDTO setMontantVente(int montantVente) {
        this.montantVente = montantVente;
        return this;
    }

    @JSONPropertyName("lg_SUGGESTION_ORDER_ID")
    public String getLgSUGGESTIONORDERID() {
        return lgSUGGESTIONORDERID;
    }

    public SuggestionsDTO setLgSUGGESTIONORDERID(String lgSUGGESTIONORDERID) {
        this.lgSUGGESTIONORDERID = lgSUGGESTIONORDERID;
        return this;
    }

    @JSONPropertyName("str_REF")
    public String getStrREF() {
        return strREF;
    }

    public SuggestionsDTO setStrREF(String strREF) {
        this.strREF = strREF;
        return this;
    }

    @JSONPropertyName("lg_GROSSISTE_ID")
    public String getGrossisteId() {
        return grossisteId;
    }

    public SuggestionsDTO setGrossisteId(String grossisteId) {
        this.grossisteId = grossisteId;
        return this;
    }

    @JSONPropertyName("str_STATUT")
    public String getStrSTATUT() {
        return strSTATUT;
    }

    public SuggestionsDTO setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
        return this;
    }

    @JSONPropertyName("dt_UPDATED")
    public String getDtUPDATED() {
        return dtUPDATED;
    }

    public SuggestionsDTO setDtUPDATED(String dtUPDATED) {
        this.dtUPDATED = dtUPDATED;
        return this;
    }

    @JSONPropertyName("dt_CREATED")
    public String getDtCREATED() {
        return dtCREATED;
    }

    public SuggestionsDTO setDtCREATED(String dtCREATED) {
        this.dtCREATED = dtCREATED;
        return this;
    }

    @JSONPropertyName("str_FAMILLE_ITEM")
    public String getDetails() {
        return details;
    }

    @JSONPropertyName("int_NOMBRE_ARTICLES")
    public int getNbreLigne() {
        return nbreLigne;
    }

    public SuggestionsDTO setNbreLigne(int nbreLigne) {
        this.nbreLigne = nbreLigne;
        return this;
    }

    @JSONPropertyName("int_NUMBER")
    public int getTotalQty() {
        return totalQty;
    }

    public SuggestionsDTO setTotalQty(int totalQty) {
        this.totalQty = totalQty;
        return this;
    }

    public SuggestionsDTO setDetails(String details) {
        this.details = details;
        return this;
    }

    public SuggestionsDTO() {
    }

    public SuggestionsDTO(TSuggestionOrder suggestionOrder, String items, int montantAchat, int montantVente,
            int nbreLigne, int totalQty) {
        TGrossiste grossiste = suggestionOrder.getLgGROSSISTEID();
        this.montantAchat = montantAchat;
        this.montantVente = montantVente;
        this.nbreLigne = nbreLigne;
        this.totalQty = totalQty;
        this.dateButoir = grossiste.getIntDATEBUTOIRARTICLE();
        this.details = items;
        this.lgSUGGESTIONORDERID = suggestionOrder.getLgSUGGESTIONORDERID();
        this.strREF = suggestionOrder.getStrREF();
        this.grossisteId = grossiste.getStrLIBELLE();
        this.lgGROSSISTEID = grossiste.getLgGROSSISTEID();
        this.strSTATUT = suggestionOrder.getStrSTATUT();
        this.dtCREATED = DateCommonUtils.formatDate(suggestionOrder.getDtCREATED());
        this.dtUPDATED = DateCommonUtils.formatToHour(suggestionOrder.getDtCREATED());

    }
}
