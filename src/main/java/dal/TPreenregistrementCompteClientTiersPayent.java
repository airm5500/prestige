/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package dal;

import java.io.Serializable;
import java.util.Date;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.xml.bind.annotation.XmlRootElement;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_preenregistrement_compte_client_tiers_payent")
@XmlRootElement
@NamedQueries({
        @NamedQuery(name = "TPreenregistrementCompteClientTiersPayent.findAll", query = "SELECT t FROM TPreenregistrementCompteClientTiersPayent t"),
        @NamedQuery(name = "TPreenregistrementCompteClientTiersPayent.findByLgPREENREGISTREMENTCOMPTECLIENTPAYENTID", query = "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID = :lgPREENREGISTREMENTCOMPTECLIENTPAYENTID"),
        @NamedQuery(name = "TPreenregistrementCompteClientTiersPayent.findByStrSTATUT", query = "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TPreenregistrementCompteClientTiersPayent.findByDtCREATED", query = "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TPreenregistrementCompteClientTiersPayent.findByDtUPDATED", query = "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TPreenregistrementCompteClientTiersPayent.findByIntPERCENT", query = "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.intPERCENT = :intPERCENT"),
        @NamedQuery(name = "TPreenregistrementCompteClientTiersPayent.findByIntPRICE", query = "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.intPRICE = :intPRICE"),
        @NamedQuery(name = "TPreenregistrementCompteClientTiersPayent.findByIntPRICERESTE", query = "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.intPRICERESTE = :intPRICERESTE"),
        @NamedQuery(name = "TPreenregistrementCompteClientTiersPayent.findByStrLASTTRANSACTION", query = "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.strLASTTRANSACTION = :strLASTTRANSACTION"),
        @NamedQuery(name = "TPreenregistrementCompteClientTiersPayent.findByStrSTATUTFACTURE", query = "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.strSTATUTFACTURE = :strSTATUTFACTURE"),
        @NamedQuery(name = "TPreenregistrementCompteClientTiersPayent.findByStrREFBON", query = "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.strREFBON = :strREFBON"),
        @NamedQuery(name = "TPreenregistrementCompteClientTiersPayent.findByDblQUOTACONSOVENTE", query = "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.dblQUOTACONSOVENTE = :dblQUOTACONSOVENTE") })
public class TPreenregistrementCompteClientTiersPayent implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID", nullable = false, length = 40)
    private String lgPREENREGISTREMENTCOMPTECLIENTPAYENTID;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "int_PERCENT")
    private Integer intPERCENT;
    @Column(name = "int_PRICE")
    private Integer intPRICE;
    @Column(name = "int_PRICE_RESTE")
    private Integer intPRICERESTE;
    @Column(name = "str_LAST_TRANSACTION", length = 40)
    private String strLASTTRANSACTION;
    @Column(name = "str_STATUT_FACTURE", length = 40)
    private String strSTATUTFACTURE;
    @Column(name = "str_REF_BON", length = 50)
    private String strREFBON;
    @Column(name = "dbl_QUOTA_CONSO_VENTE", precision = 12, scale = 2)
    private Double dblQUOTACONSOVENTE;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERID;
    @JoinColumn(name = "lg_COMPTE_CLIENT_TIERS_PAYANT_ID", referencedColumnName = "lg_COMPTE_CLIENT_TIERS_PAYANT_ID")
    @ManyToOne
    private TCompteClientTiersPayant lgCOMPTECLIENTTIERSPAYANTID;
    @JoinColumn(name = "lg_PREENREGISTREMENT_ID", referencedColumnName = "lg_PREENREGISTREMENT_ID")
    @ManyToOne
    private TPreenregistrement lgPREENREGISTREMENTID;

    public TPreenregistrementCompteClientTiersPayent() {
    }

    public TPreenregistrementCompteClientTiersPayent(String lgPREENREGISTREMENTCOMPTECLIENTPAYENTID) {
        this.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID = lgPREENREGISTREMENTCOMPTECLIENTPAYENTID;
    }

    public String getLgPREENREGISTREMENTCOMPTECLIENTPAYENTID() {
        return lgPREENREGISTREMENTCOMPTECLIENTPAYENTID;
    }

    public void setLgPREENREGISTREMENTCOMPTECLIENTPAYENTID(String lgPREENREGISTREMENTCOMPTECLIENTPAYENTID) {
        this.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID = lgPREENREGISTREMENTCOMPTECLIENTPAYENTID;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public Date getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(Date dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    public Date getDtUPDATED() {
        return dtUPDATED;
    }

    public void setDtUPDATED(Date dtUPDATED) {
        this.dtUPDATED = dtUPDATED;
    }

    public Integer getIntPERCENT() {
        return intPERCENT;
    }

    public void setIntPERCENT(Integer intPERCENT) {
        this.intPERCENT = intPERCENT;
    }

    public Integer getIntPRICE() {
        return intPRICE;
    }

    public void setIntPRICE(Integer intPRICE) {
        this.intPRICE = intPRICE;
    }

    public Integer getIntPRICERESTE() {
        return intPRICERESTE;
    }

    public void setIntPRICERESTE(Integer intPRICERESTE) {
        this.intPRICERESTE = intPRICERESTE;
    }

    public String getStrLASTTRANSACTION() {
        return strLASTTRANSACTION;
    }

    public void setStrLASTTRANSACTION(String strLASTTRANSACTION) {
        this.strLASTTRANSACTION = strLASTTRANSACTION;
    }

    public String getStrSTATUTFACTURE() {
        return strSTATUTFACTURE;
    }

    public void setStrSTATUTFACTURE(String strSTATUTFACTURE) {
        this.strSTATUTFACTURE = strSTATUTFACTURE;
    }

    public String getStrREFBON() {
        return strREFBON;
    }

    public void setStrREFBON(String strREFBON) {
        this.strREFBON = strREFBON;
    }

    public Double getDblQUOTACONSOVENTE() {
        return dblQUOTACONSOVENTE;
    }

    public void setDblQUOTACONSOVENTE(Double dblQUOTACONSOVENTE) {
        this.dblQUOTACONSOVENTE = dblQUOTACONSOVENTE;
    }

    public TUser getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(TUser lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    public TCompteClientTiersPayant getLgCOMPTECLIENTTIERSPAYANTID() {
        return lgCOMPTECLIENTTIERSPAYANTID;
    }

    public void setLgCOMPTECLIENTTIERSPAYANTID(TCompteClientTiersPayant lgCOMPTECLIENTTIERSPAYANTID) {
        this.lgCOMPTECLIENTTIERSPAYANTID = lgCOMPTECLIENTTIERSPAYANTID;
    }

    public TPreenregistrement getLgPREENREGISTREMENTID() {
        return lgPREENREGISTREMENTID;
    }

    public void setLgPREENREGISTREMENTID(TPreenregistrement lgPREENREGISTREMENTID) {
        this.lgPREENREGISTREMENTID = lgPREENREGISTREMENTID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgPREENREGISTREMENTCOMPTECLIENTPAYENTID != null ? lgPREENREGISTREMENTCOMPTECLIENTPAYENTID.hashCode()
                : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TPreenregistrementCompteClientTiersPayent)) {
            return false;
        }
        TPreenregistrementCompteClientTiersPayent other = (TPreenregistrementCompteClientTiersPayent) object;
        if ((this.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID == null
                && other.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID != null)
                || (this.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID != null
                        && !this.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID
                                .equals(other.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TPreenregistrementCompteClientTiersPayent[ lgPREENREGISTREMENTCOMPTECLIENTPAYENTID="
                + lgPREENREGISTREMENTCOMPTECLIENTPAYENTID + " ]";
    }

    public TPreenregistrementCompteClientTiersPayent(TPreenregistrementCompteClientTiersPayent p) {
        this.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID = p.getLgPREENREGISTREMENTCOMPTECLIENTPAYENTID();
        this.strSTATUT = p.getStrSTATUT();
        this.dtCREATED = p.getDtCREATED();
        this.dtUPDATED = p.getDtUPDATED();
        this.intPERCENT = p.getIntPERCENT();
        this.intPRICE = p.getIntPRICE();
        this.intPRICERESTE = p.getIntPRICERESTE();
        this.strLASTTRANSACTION = p.getStrLASTTRANSACTION();
        this.strSTATUTFACTURE = p.getStrSTATUTFACTURE();
        this.strREFBON = p.getStrREFBON();
        this.dblQUOTACONSOVENTE = p.getDblQUOTACONSOVENTE();
        this.lgUSERID = p.getLgUSERID();
        this.lgCOMPTECLIENTTIERSPAYANTID = p.getLgCOMPTECLIENTTIERSPAYANTID();
        this.lgPREENREGISTREMENTID = p.getLgPREENREGISTREMENTID();
    }

}
