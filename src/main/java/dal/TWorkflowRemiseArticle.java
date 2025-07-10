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
import javax.persistence.Lob;
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
@Table(name = "t_workflow_remise_article")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TWorkflowRemiseArticle.findAll", query = "SELECT t FROM TWorkflowRemiseArticle t"),
        @NamedQuery(name = "TWorkflowRemiseArticle.findByLgWORKFLOWREMISEARTICLEID", query = "SELECT t FROM TWorkflowRemiseArticle t WHERE t.lgWORKFLOWREMISEARTICLEID = :lgWORKFLOWREMISEARTICLEID"),
        @NamedQuery(name = "TWorkflowRemiseArticle.findByStrCODEREMISEARTICLE", query = "SELECT t FROM TWorkflowRemiseArticle t WHERE t.strCODEREMISEARTICLE = :strCODEREMISEARTICLE"),
        @NamedQuery(name = "TWorkflowRemiseArticle.findByStrCODEGRILLEVO", query = "SELECT t FROM TWorkflowRemiseArticle t WHERE t.strCODEGRILLEVO = :strCODEGRILLEVO"),
        @NamedQuery(name = "TWorkflowRemiseArticle.findByStrCODEGRILLEVNO", query = "SELECT t FROM TWorkflowRemiseArticle t WHERE t.strCODEGRILLEVNO = :strCODEGRILLEVNO"),
        @NamedQuery(name = "TWorkflowRemiseArticle.findByStrSTATUT", query = "SELECT t FROM TWorkflowRemiseArticle t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TWorkflowRemiseArticle.findByDtCREATED", query = "SELECT t FROM TWorkflowRemiseArticle t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TWorkflowRemiseArticle.findByDtUPDATED", query = "SELECT t FROM TWorkflowRemiseArticle t WHERE t.dtUPDATED = :dtUPDATED") })
public class TWorkflowRemiseArticle implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_WORKFLOW_REMISE_ARTICLE_ID", nullable = false, length = 40)
    private String lgWORKFLOWREMISEARTICLEID;
    @Lob
    @Column(name = "str_DESCRIPTION", length = 65535)
    private String strDESCRIPTION;
    @Column(name = "str_CODE_REMISE_ARTICLE", length = 2)
    private String strCODEREMISEARTICLE;
    @Column(name = "str_CODE_GRILLE_VO")
    private Integer strCODEGRILLEVO;
    @Column(name = "str_CODE_GRILLE_VNO")
    private Integer strCODEGRILLEVNO;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;

    public TWorkflowRemiseArticle() {
    }

    public TWorkflowRemiseArticle(String lgWORKFLOWREMISEARTICLEID) {
        this.lgWORKFLOWREMISEARTICLEID = lgWORKFLOWREMISEARTICLEID;
    }

    public String getLgWORKFLOWREMISEARTICLEID() {
        return lgWORKFLOWREMISEARTICLEID;
    }

    public void setLgWORKFLOWREMISEARTICLEID(String lgWORKFLOWREMISEARTICLEID) {
        this.lgWORKFLOWREMISEARTICLEID = lgWORKFLOWREMISEARTICLEID;
    }

    public String getStrDESCRIPTION() {
        return strDESCRIPTION;
    }

    public void setStrDESCRIPTION(String strDESCRIPTION) {
        this.strDESCRIPTION = strDESCRIPTION;
    }

    public String getStrCODEREMISEARTICLE() {
        return strCODEREMISEARTICLE;
    }

    public void setStrCODEREMISEARTICLE(String strCODEREMISEARTICLE) {
        this.strCODEREMISEARTICLE = strCODEREMISEARTICLE;
    }

    public Integer getStrCODEGRILLEVO() {
        return strCODEGRILLEVO;
    }

    public void setStrCODEGRILLEVO(Integer strCODEGRILLEVO) {
        this.strCODEGRILLEVO = strCODEGRILLEVO;
    }

    public Integer getStrCODEGRILLEVNO() {
        return strCODEGRILLEVNO;
    }

    public void setStrCODEGRILLEVNO(Integer strCODEGRILLEVNO) {
        this.strCODEGRILLEVNO = strCODEGRILLEVNO;
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

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgWORKFLOWREMISEARTICLEID != null ? lgWORKFLOWREMISEARTICLEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TWorkflowRemiseArticle)) {
            return false;
        }
        TWorkflowRemiseArticle other = (TWorkflowRemiseArticle) object;
        if ((this.lgWORKFLOWREMISEARTICLEID == null && other.lgWORKFLOWREMISEARTICLEID != null)
                || (this.lgWORKFLOWREMISEARTICLEID != null
                        && !this.lgWORKFLOWREMISEARTICLEID.equals(other.lgWORKFLOWREMISEARTICLEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TWorkflowRemiseArticle[ lgWORKFLOWREMISEARTICLEID=" + lgWORKFLOWREMISEARTICLEID + " ]";
    }

}
