package rest.service.dto;

import dal.TGrossiste;
import dal.TOrder;
import dal.TUser;
import org.json.JSONPropertyName;
import util.DateCommonUtils;

/**
 * @author koben
 */
public class CommandeDTO {

    private int montantAchat;
    private int montantVente;
    private int nbreLigne;
    private int totalQty;

    private String strRefOrder;
    private String lgORDERID;
    private String userFullName;
    private String libelleGrossiste;
    private String telephone;
    private String mobile;
    private String urlPharma;
    private String urlExtranet;
    private String strSTATUT;
    private String dtUPDATED;
    private String dtCREATED;
    private String lgGROSSISTEID;
    private String details = " ";
    private StatutTraitement statutTraitement;

    public String getLgGROSSISTEID() {
        return lgGROSSISTEID;
    }

    public CommandeDTO setLgGROSSISTEID(String lgGROSSISTEID) {
        this.lgGROSSISTEID = lgGROSSISTEID;
        return this;
    }

    @JSONPropertyName("PRIX_ACHAT_TOTAL")
    public int getMontantAchat() {
        return montantAchat;
    }

    public CommandeDTO setMontantAchat(int montantAchat) {
        this.montantAchat = montantAchat;
        return this;
    }

    @JSONPropertyName("PRIX_VENTE_TOTAL")
    public int getMontantVente() {
        return montantVente;
    }

    public CommandeDTO setMontantVente(int montantVente) {
        this.montantVente = montantVente;
        return this;
    }

    @JSONPropertyName("str_REF_ORDER")
    public String getStrRefOrder() {
        return strRefOrder;
    }

    public CommandeDTO setStrRefOrder(String strRefOrder) {
        this.strRefOrder = strRefOrder;
        return this;
    }

    @JSONPropertyName("lg_ORDER_ID")
    public String getLgORDERID() {
        return lgORDERID;
    }

    public CommandeDTO setLgORDERID(String lgORDERID) {
        this.lgORDERID = lgORDERID;
        return this;
    }

    @JSONPropertyName("lg_USER_ID")
    public String getUserFullName() {
        return userFullName;
    }

    public CommandeDTO setUserFullName(String userFullName) {
        this.userFullName = userFullName;
        return this;
    }

    @JSONPropertyName("str_GROSSISTE_LIBELLE")
    public String getLibelleGrossiste() {
        return libelleGrossiste;
    }

    public CommandeDTO setLibelleGrossiste(String libelleGrossiste) {
        this.libelleGrossiste = libelleGrossiste;
        return this;
    }

    @JSONPropertyName("str_GROSSISTE_TELEPHONE")
    public String getTelephone() {
        return telephone;
    }

    public CommandeDTO setTelephone(String telephone) {
        this.telephone = telephone;
        return this;
    }

    @JSONPropertyName("str_GROSSISTE_MOBILE")
    public String getMobile() {
        return mobile;
    }

    public CommandeDTO setMobile(String mobile) {
        this.mobile = mobile;
        return this;
    }

    @JSONPropertyName("str_GROSSISTE_URLPHARMAML")
    public String getUrlPharma() {
        return urlPharma;
    }

    public CommandeDTO setUrlPharma(String urlPharma) {
        this.urlPharma = urlPharma;
        return this;
    }

    @JSONPropertyName("str_GROSSISTE_URLEXTRANET")
    public String getUrlExtranet() {
        return urlExtranet;
    }

    public CommandeDTO setUrlExtranet(String urlExtranet) {
        this.urlExtranet = urlExtranet;
        return this;
    }

    @JSONPropertyName("str_STATUT")
    public String getStrSTATUT() {
        return strSTATUT;
    }

    public CommandeDTO setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
        return this;
    }

    @JSONPropertyName("dt_UPDATED")
    public String getDtUPDATED() {
        return dtUPDATED;
    }

    public CommandeDTO setDtUPDATED(String dtUPDATED) {
        this.dtUPDATED = dtUPDATED;
        return this;
    }

    @JSONPropertyName("dt_CREATED")
    public String getDtCREATED() {
        return dtCREATED;
    }

    public CommandeDTO setDtCREATED(String dtCREATED) {
        this.dtCREATED = dtCREATED;
        return this;
    }

    @JSONPropertyName("str_FAMILLE_ITEM")
    public String getDetails() {
        return details;
    }

    @JSONPropertyName("int_LINE")
    public int getNbreLigne() {
        return nbreLigne;
    }

    public CommandeDTO setNbreLigne(int nbreLigne) {
        this.nbreLigne = nbreLigne;
        return this;
    }

    @JSONPropertyName("int_NBRE_PRODUIT")
    public int getTotalQty() {
        return totalQty;
    }

    public CommandeDTO setTotalQty(int totalQty) {
        this.totalQty = totalQty;
        return this;
    }

    public CommandeDTO setDetails(String details) {
        this.details = details;
        return this;
    }

    public StatutTraitement getStatutTraitement() {
        return statutTraitement;
    }

    public void setStatutTraitement(StatutTraitement statutTraitement) {
        this.statutTraitement = statutTraitement;
    }

    public CommandeDTO() {
    }

    public CommandeDTO(TOrder order, String items, int montantAchat, int montantVente, int nbreLigne, int totalQty) {
        TGrossiste grossiste = order.getLgGROSSISTEID();
        TUser user = order.getLgUSERID();
        this.montantAchat = montantAchat;
        this.montantVente = montantVente;
        this.nbreLigne = nbreLigne;
        this.totalQty = totalQty;
        this.details = items;
        this.lgGROSSISTEID = grossiste.getLgGROSSISTEID();
        this.strSTATUT = order.getStrSTATUT();
        this.dtCREATED = DateCommonUtils.formatDate(order.getDtCREATED());
        this.dtUPDATED = DateCommonUtils.formatToHour(order.getDtCREATED());
        this.userFullName = user.getStrFIRSTNAME().charAt(0) + "." + user.getStrLASTNAME();
        this.strRefOrder = order.getStrREFORDER();
        this.lgORDERID = order.getLgORDERID();
        this.libelleGrossiste = grossiste.getStrLIBELLE();
        this.telephone = grossiste.getStrTELEPHONE();
        this.mobile = grossiste.getStrMOBILE();
        this.urlPharma = grossiste.getStrURLPHARMAML();
        this.urlExtranet = grossiste.getStrURLEXTRANET();

    }
}
