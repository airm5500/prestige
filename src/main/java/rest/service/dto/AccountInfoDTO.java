package rest.service.dto;

import org.json.JSONPropertyName;

public class AccountInfoDTO {

    private String lgUSERID;

    private Integer strIDS;

    private String strLOGIN;

    private String strTYPE;

    private String strPASSWORD;

    private String strCODE;

    private String strCREATEDBY;

    private String strUPDATEDBY;

    private String strFIRSTNAME;

    private String strLASTNAME;

    private String strLASTCONNECTIONDATE;

    private String lgSKINID;

    private String strSTATUT;

    private String dtLASTACTIVITY;

    private String strFUNCTION;

    private String strPHONE;

    private String strMAIL;

    private Integer intCONNEXION;

    private Boolean bCHANGEPASSWORD;

    private Boolean bIsConnected;

    private String strPIC;

    private String lgEMPLACEMENTID;
    private String lgLanguageID;
    private String role;
    private String xtypeload;

    @JSONPropertyName("lg_ROLE_ID")
    public String getRole() {
        return role;
    }

    public AccountInfoDTO setRole(String role) {
        this.role = role;
        return this;
    }

    @JSONPropertyName("xtypeload")
    public String getXtypeload() {
        return xtypeload;
    }

    public AccountInfoDTO setXtypeload(String xtypeload) {
        this.xtypeload = xtypeload;
        return this;
    }

    @JSONPropertyName("lg_USER_ID")
    public String getLgUSERID() {
        return lgUSERID;
    }

    public AccountInfoDTO setLgUSERID(String lgUSERID) {
        this.lgUSERID = lgUSERID;
        return this;
    }

    @JSONPropertyName("str_IDS")
    public Integer getStrIDS() {
        return strIDS;
    }

    public AccountInfoDTO setStrIDS(Integer strIDS) {
        this.strIDS = strIDS;
        return this;
    }

    @JSONPropertyName("str_LOGIN")
    public String getStrLOGIN() {
        return strLOGIN;
    }

    public AccountInfoDTO setStrLOGIN(String strLOGIN) {
        this.strLOGIN = strLOGIN;
        return this;
    }

    @JSONPropertyName("str_TYPE")
    public String getStrTYPE() {
        return strTYPE;
    }

    public AccountInfoDTO setStrTYPE(String strTYPE) {
        this.strTYPE = strTYPE;
        return this;
    }

    @JSONPropertyName("str_PASSWORD")
    public String getStrPASSWORD() {
        return strPASSWORD;
    }

    public AccountInfoDTO setStrPASSWORD(String strPASSWORD) {
        this.strPASSWORD = strPASSWORD;
        return this;
    }

    @JSONPropertyName("str_CODE")
    public String getStrCODE() {
        return strCODE;
    }

    public AccountInfoDTO setStrCODE(String strCODE) {
        this.strCODE = strCODE;
        return this;
    }

    @JSONPropertyName("str_CREATED_BY")
    public String getStrCREATEDBY() {
        return strCREATEDBY;
    }

    public AccountInfoDTO setStrCREATEDBY(String strCREATEDBY) {
        this.strCREATEDBY = strCREATEDBY;
        return this;
    }

    @JSONPropertyName("str_UPDATED_BY")
    public String getStrUPDATEDBY() {
        return strUPDATEDBY;
    }

    public AccountInfoDTO setStrUPDATEDBY(String strUPDATEDBY) {
        this.strUPDATEDBY = strUPDATEDBY;
        return this;
    }

    @JSONPropertyName("str_FIRST_NAME")
    public String getStrFIRSTNAME() {
        return strFIRSTNAME;
    }

    public AccountInfoDTO setStrFIRSTNAME(String strFIRSTNAME) {
        this.strFIRSTNAME = strFIRSTNAME;
        return this;
    }

    @JSONPropertyName("str_LAST_NAME")
    public String getStrLASTNAME() {
        return strLASTNAME;
    }

    public AccountInfoDTO setStrLASTNAME(String strLASTNAME) {
        this.strLASTNAME = strLASTNAME;
        return this;
    }

    @JSONPropertyName("str_LAST_CONNECTION_DATE")
    public String getStrLASTCONNECTIONDATE() {
        return strLASTCONNECTIONDATE;
    }

    public AccountInfoDTO setStrLASTCONNECTIONDATE(String strLASTCONNECTIONDATE) {
        this.strLASTCONNECTIONDATE = strLASTCONNECTIONDATE;
        return this;
    }

    @JSONPropertyName("lg_SKIN_ID")
    public String getLgSKINID() {
        return lgSKINID;
    }

    public AccountInfoDTO setLgSKINID(String lgSKINID) {
        this.lgSKINID = lgSKINID;
        return this;
    }

    @JSONPropertyName("str_STATUT")
    public String getStrSTATUT() {
        return strSTATUT;
    }

    public AccountInfoDTO setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
        return this;
    }

    @JSONPropertyName("dt_LAST_ACTIVITY")
    public String getDtLASTACTIVITY() {
        return dtLASTACTIVITY;
    }

    public AccountInfoDTO setDtLASTACTIVITY(String dtLASTACTIVITY) {
        this.dtLASTACTIVITY = dtLASTACTIVITY;
        return this;
    }

    @JSONPropertyName("str_FUNCTION")
    public String getStrFUNCTION() {
        return strFUNCTION;
    }

    public AccountInfoDTO setStrFUNCTION(String strFUNCTION) {
        this.strFUNCTION = strFUNCTION;
        return this;
    }

    @JSONPropertyName("str_PHONE")
    public String getStrPHONE() {
        return strPHONE;
    }

    public AccountInfoDTO setStrPHONE(String strPHONE) {
        this.strPHONE = strPHONE;
        return this;
    }

    @JSONPropertyName("str_MAIL")
    public String getStrMAIL() {
        return strMAIL;
    }

    public AccountInfoDTO setStrMAIL(String strMAIL) {
        this.strMAIL = strMAIL;
        return this;
    }

    @JSONPropertyName("int_CONNEXION")
    public Integer getIntCONNEXION() {
        return intCONNEXION;
    }

    public AccountInfoDTO setIntCONNEXION(Integer intCONNEXION) {
        this.intCONNEXION = intCONNEXION;
        return this;
    }

    @JSONPropertyName("b_CHANGE_PASSWORD")
    public Boolean getbCHANGEPASSWORD() {
        return bCHANGEPASSWORD;
    }

    public AccountInfoDTO setbCHANGEPASSWORD(Boolean bCHANGEPASSWORD) {
        this.bCHANGEPASSWORD = bCHANGEPASSWORD;
        return this;
    }

    @JSONPropertyName("b_is_connected")
    public Boolean getbIsConnected() {
        return bIsConnected;
    }

    public AccountInfoDTO setbIsConnected(Boolean bIsConnected) {
        this.bIsConnected = bIsConnected;
        return this;
    }

    @JSONPropertyName("str_PIC")
    public String getStrPIC() {
        return strPIC;
    }

    public AccountInfoDTO setStrPIC(String strPIC) {
        this.strPIC = strPIC;
        return this;
    }

    @JSONPropertyName("lg_EMPLACEMENT_ID")
    public String getLgEMPLACEMENTID() {
        return lgEMPLACEMENTID;
    }

    public AccountInfoDTO setLgEMPLACEMENTID(String lgEMPLACEMENTID) {
        this.lgEMPLACEMENTID = lgEMPLACEMENTID;
        return this;
    }

    @JSONPropertyName("lg_Language_ID")
    public String getLgLanguageID() {
        return lgLanguageID;
    }

    public AccountInfoDTO setLgLanguageID(String lgLanguageID) {
        this.lgLanguageID = lgLanguageID;
        return this;
    }

    @Override
    public String toString() {
        return "AccountInfoDTO{" + "lgUSERID=" + lgUSERID + ", strLOGIN=" + strLOGIN + ", strFIRSTNAME=" + strFIRSTNAME
                + ", strLASTNAME=" + strLASTNAME + ", strLASTCONNECTIONDATE=" + strLASTCONNECTIONDATE + ", lgSKINID="
                + lgSKINID + ", strSTATUT=" + strSTATUT + ", bCHANGEPASSWORD=" + bCHANGEPASSWORD + '}';
    }

}
