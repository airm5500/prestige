/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.TBonLivraison;
import dal.TGrossiste;
import dal.TRetourFournisseur;
import dal.TUser;
import java.io.Serializable;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONPropertyName;
import util.DateConverter;

/**
 *
 * @author kkoffi
 */
public class RetourFournisseurDTO implements Serializable {

    final public static SimpleDateFormat SIMPLE_DATE_FORMAT = new SimpleDateFormat("dd/MM/yyyy");
    private static final long serialVersionUID = 1L;

    private String lgRETOURFRSID;

    private String strREFRETOURFRS;

    private String dtDATE;

    private String strREPONSEFRS;

    private String strCOMMENTAIRE;

    private String strSTATUT;

    private String dtUPDATED;
    private String details = " ";
    private String dtCREATED;

    private Integer dlAMOUNT, nombreProduit;

    private String lgUSERID;
    private String userFullName;
    private String lgGROSSISTEID;
    private boolean BTNDELETE;
    private String lgBONLIVRAISONID, strREFLIVRAISON, strLIBELLE;
    private List<RetourDetailsDTO> items = new ArrayList<>();
    private TUser user;
    private boolean closed;

    public boolean isClosed() {
        return closed;
    }

    public void setClosed(boolean closed) {
        this.closed = closed;
    }

    public List<RetourDetailsDTO> getItems() {
        return items;
    }

    public void setItems(List<RetourDetailsDTO> items) {
        this.items = items;
    }

    @JSONPropertyName("lg_RETOUR_FRS_ID")
    public String getLgRETOURFRSID() {
        return lgRETOURFRSID;
    }

    public void setLgRETOURFRSID(String lgRETOURFRSID) {
        this.lgRETOURFRSID = lgRETOURFRSID;
    }

    @JSONPropertyName("str_FAMILLE_ITEM")
    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    @JSONPropertyName("str_REF_RETOUR_FRS")
    public String getStrREFRETOURFRS() {
        return strREFRETOURFRS;
    }

    public void setStrREFRETOURFRS(String strREFRETOURFRS) {
        this.strREFRETOURFRS = strREFRETOURFRS;
    }

    @JSONPropertyName("dt_DATE")
    public String getDtDATE() {
        return dtDATE;
    }

    public void setDtDATE(String dtDATE) {
        this.dtDATE = dtDATE;
    }

    @JSONPropertyName("str_REPONSE_FRS")
    public String getStrREPONSEFRS() {
        return strREPONSEFRS;
    }

    public void setStrREPONSEFRS(String strREPONSEFRS) {
        this.strREPONSEFRS = strREPONSEFRS;
    }

    @JSONPropertyName("str_COMMENTAIRE")
    public String getStrCOMMENTAIRE() {
        return strCOMMENTAIRE;
    }

    public void setStrCOMMENTAIRE(String strCOMMENTAIRE) {
        this.strCOMMENTAIRE = strCOMMENTAIRE;
    }

    @JSONPropertyName("str_STATUT")
    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    @JSONPropertyName("DATEBL")
    public String getDtUPDATED() {
        return dtUPDATED;
    }

    public void setDtUPDATED(String dtUPDATED) {
        this.dtUPDATED = dtUPDATED;
    }

    @JSONPropertyName("dt_CREATED")
    public String getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(String dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    @JSONPropertyName("MONTANTRETOUR")
    public Integer getDlAMOUNT() {
        return dlAMOUNT;
    }

    public void setDlAMOUNT(Integer dlAMOUNT) {
        this.dlAMOUNT = dlAMOUNT;
    }

    @JSONPropertyName("int_LINE")
    public Integer getNombreProduit() {
        return nombreProduit;
    }

    public void setNombreProduit(Integer nombreProduit) {
        this.nombreProduit = nombreProduit;
    }

    public String getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(String lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    @JSONPropertyName("lg_USER_ID")
    public String getUserFullName() {
        return userFullName;
    }

    public void setUserFullName(String userFullName) {
        this.userFullName = userFullName;
    }

    @JSONPropertyName("lg_GROSSISTE_ID")
    public String getLgGROSSISTEID() {
        return lgGROSSISTEID;
    }

    public void setLgGROSSISTEID(String lgGROSSISTEID) {
        this.lgGROSSISTEID = lgGROSSISTEID;
    }

    @JSONPropertyName("BTNDELETE")
    public boolean isBTNDELETE() {
        return BTNDELETE;
    }

    public void setBTNDELETE(boolean BTNDELETE) {
        this.BTNDELETE = BTNDELETE;
    }

    @JSONPropertyName("lg_BON_LIVRAISON_ID")
    public String getLgBONLIVRAISONID() {
        return lgBONLIVRAISONID;
    }

    public void setLgBONLIVRAISONID(String lgBONLIVRAISONID) {
        this.lgBONLIVRAISONID = lgBONLIVRAISONID;
    }

    @JSONPropertyName("str_REF_LIVRAISON")
    public String getStrREFLIVRAISON() {
        return strREFLIVRAISON;
    }

    public void setStrREFLIVRAISON(String strREFLIVRAISON) {
        this.strREFLIVRAISON = strREFLIVRAISON;
    }

    @JSONPropertyName("str_GROSSISTE_LIBELLE")
    public String getStrLIBELLE() {
        return strLIBELLE;
    }

    public void setStrLIBELLE(String strLIBELLE) {
        this.strLIBELLE = strLIBELLE;
    }

    public RetourFournisseurDTO(TRetourFournisseur f, List<RetourDetailsDTO> details, boolean BTNDELETE) {
        TGrossiste tg = f.getLgGROSSISTEID();
        TBonLivraison bonLivraison = f.getLgBONLIVRAISONID();
        TUser tu = f.getLgUSERID();
        this.lgRETOURFRSID = f.getLgRETOURFRSID();
        this.strREFRETOURFRS = f.getStrREFRETOURFRS();
        this.dtDATE = SIMPLE_DATE_FORMAT.format(f.getDtDATE());
        this.strREPONSEFRS = f.getStrREPONSEFRS();
        this.strCOMMENTAIRE = f.getStrCOMMENTAIRE();
        this.strSTATUT = f.getStrSTATUT();
        this.dtUPDATED = SIMPLE_DATE_FORMAT.format(bonLivraison.getDtDATELIVRAISON());
        this.dtCREATED = SIMPLE_DATE_FORMAT.format(f.getDtUPDATED());
        this.dlAMOUNT = f.getDlAMOUNT().intValue();
        this.nombreProduit = details.size();
        this.lgUSERID = tu.getLgUSERID();
        this.userFullName = tu.getStrFIRSTNAME() + " " + tu.getStrLASTNAME();
        this.lgGROSSISTEID = tg.getLgGROSSISTEID();
        this.BTNDELETE = BTNDELETE;
        this.lgBONLIVRAISONID = bonLivraison.getLgBONLIVRAISONID();
        this.strREFLIVRAISON = bonLivraison.getStrREFLIVRAISON();
        this.strLIBELLE = tg.getStrLIBELLE();
        int count = 0;
        for (RetourDetailsDTO tpd : details) {
            this.details = "<b><span style='display:inline-block;width: 7%;'>" + tpd.getIntCIP()
                    + "</span><span style='display:inline-block;width: 25%;'>" + tpd.getStrNAME()
                    + "</span><span style='display:inline-block;width: 10%;'>(" + tpd.getIntNUMBERRETURN()
                    + ")</span><span style='display:inline-block;width: 15%;'>"
                    + DateConverter.amountFormat(tpd.getPrixPaf(), '.') + " F CFA " + "</span></b><br> " + this.details;
            if (tpd.getIntNUMBERRETURN() > tpd.getIntNUMBERANSWER()) {
                count++;
            }
        }

        this.closed = count == 0;
    }

    public TUser getUser() {
        return user;
    }

    public void setUser(TUser user) {
        this.user = user;
    }

    public RetourFournisseurDTO() {
    }

    public RetourFournisseurDTO(TRetourFournisseur f) {
        this.lgRETOURFRSID = f.getLgRETOURFRSID();
        this.strREFRETOURFRS = f.getStrREFRETOURFRS();
        this.dtDATE = SIMPLE_DATE_FORMAT.format(f.getDtDATE());
        this.strREPONSEFRS = f.getStrREPONSEFRS();
        this.strCOMMENTAIRE = f.getStrCOMMENTAIRE();
        this.dlAMOUNT = f.getDlAMOUNT().intValue();
    }

    public RetourFournisseurDTO(TRetourFournisseur f, List<RetourDetailsDTO> details) {
        TGrossiste tg = f.getLgGROSSISTEID();
        TBonLivraison bonLivraison = f.getLgBONLIVRAISONID();
        TUser tu = f.getLgUSERID();
        this.lgRETOURFRSID = f.getLgRETOURFRSID();
        this.strREFRETOURFRS = f.getStrREFRETOURFRS();
        this.dtDATE = SIMPLE_DATE_FORMAT.format(f.getDtDATE());
        this.strREPONSEFRS = f.getStrREPONSEFRS();
        this.strCOMMENTAIRE = f.getStrCOMMENTAIRE();
        this.strSTATUT = f.getStrSTATUT();
        this.dtUPDATED = SIMPLE_DATE_FORMAT.format(bonLivraison.getDtDATELIVRAISON());
        this.dtCREATED = SIMPLE_DATE_FORMAT.format(f.getDtUPDATED());
        this.dlAMOUNT = f.getDlAMOUNT().intValue();
        this.nombreProduit = details.size();
        this.lgUSERID = tu.getLgUSERID();
        this.userFullName = tu.getStrFIRSTNAME() + " " + tu.getStrLASTNAME();
        this.lgGROSSISTEID = tg.getLgGROSSISTEID();
        this.lgBONLIVRAISONID = bonLivraison.getLgBONLIVRAISONID();
        this.strREFLIVRAISON = bonLivraison.getStrREFLIVRAISON();
        this.strLIBELLE = tg.getStrLIBELLE();
        this.items = details;
    }
}
