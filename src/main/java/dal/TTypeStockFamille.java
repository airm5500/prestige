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
import javax.persistence.Lob;
import javax.persistence.ManyToOne;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.xml.bind.annotation.XmlRootElement;
import toolkits.parameters.commonparameter;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_type_stock_famille")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTypeStockFamille.findAll", query = "SELECT t FROM TTypeStockFamille t"),
        @NamedQuery(name = "TTypeStockFamille.findByLgTYPESTOCKFAMILLEID", query = "SELECT t FROM TTypeStockFamille t WHERE t.lgTYPESTOCKFAMILLEID = :lgTYPESTOCKFAMILLEID"),
        @NamedQuery(name = "TTypeStockFamille.findByDtCREATED", query = "SELECT t FROM TTypeStockFamille t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TTypeStockFamille.findByDtUPDATED", query = "SELECT t FROM TTypeStockFamille t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TTypeStockFamille.findByStrSTATUT", query = "SELECT t FROM TTypeStockFamille t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TTypeStockFamille.findByIntNUMBER", query = "SELECT t FROM TTypeStockFamille t WHERE t.intNUMBER = :intNUMBER") })
public class TTypeStockFamille implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TYPE_STOCK_FAMILLE_ID", nullable = false, length = 40)
    private String lgTYPESTOCKFAMILLEID;
    @Basic(optional = false)
    @Lob
    @Column(name = "str_NAME", nullable = false, length = 65535)
    private String strNAME;
    @Basic(optional = false)
    @Lob
    @Column(name = "str_DESCRIPTION", nullable = false, length = 255)
    private String strDESCRIPTION;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED = new Date();

    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED = new Date();

    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT = commonparameter.statut_enable;

    @Column(name = "int_NUMBER")
    private Integer intNUMBER;
    @JoinColumn(name = "lg_EMPLACEMENT_ID", referencedColumnName = "lg_EMPLACEMENT_ID", nullable = false)
    @ManyToOne(optional = false)
    private TEmplacement lgEMPLACEMENTID;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID", nullable = false)
    @ManyToOne(optional = false)
    private TFamille lgFAMILLEID;
    @JoinColumn(name = "lg_TYPE_STOCK_ID", referencedColumnName = "lg_TYPE_STOCK_ID", nullable = false)
    @ManyToOne(optional = false)
    private TTypeStock lgTYPESTOCKID;

    public TTypeStockFamille() {
    }

    public TTypeStockFamille(String lgTYPESTOCKFAMILLEID) {
        this.lgTYPESTOCKFAMILLEID = lgTYPESTOCKFAMILLEID;
    }

    public TTypeStockFamille(String lgTYPESTOCKFAMILLEID, String strNAME, String strDESCRIPTION) {
        this.lgTYPESTOCKFAMILLEID = lgTYPESTOCKFAMILLEID;
        this.strNAME = strNAME;
        this.strDESCRIPTION = strDESCRIPTION;
    }

    public String getLgTYPESTOCKFAMILLEID() {
        return lgTYPESTOCKFAMILLEID;
    }

    public void setLgTYPESTOCKFAMILLEID(String lgTYPESTOCKFAMILLEID) {
        this.lgTYPESTOCKFAMILLEID = lgTYPESTOCKFAMILLEID;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
    }

    public String getStrDESCRIPTION() {
        return strDESCRIPTION;
    }

    public void setStrDESCRIPTION(String strDESCRIPTION) {
        this.strDESCRIPTION = strDESCRIPTION;
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

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public Integer getIntNUMBER() {
        return intNUMBER;
    }

    public void setIntNUMBER(Integer intNUMBER) {
        this.intNUMBER = intNUMBER;
    }

    public TEmplacement getLgEMPLACEMENTID() {
        return lgEMPLACEMENTID;
    }

    public void setLgEMPLACEMENTID(TEmplacement lgEMPLACEMENTID) {
        this.lgEMPLACEMENTID = lgEMPLACEMENTID;
    }

    public TFamille getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(TFamille lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    public TTypeStock getLgTYPESTOCKID() {
        return lgTYPESTOCKID;
    }

    public void setLgTYPESTOCKID(TTypeStock lgTYPESTOCKID) {
        this.lgTYPESTOCKID = lgTYPESTOCKID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgTYPESTOCKFAMILLEID != null ? lgTYPESTOCKFAMILLEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTypeStockFamille)) {
            return false;
        }
        TTypeStockFamille other = (TTypeStockFamille) object;
        if ((this.lgTYPESTOCKFAMILLEID == null && other.lgTYPESTOCKFAMILLEID != null)
                || (this.lgTYPESTOCKFAMILLEID != null
                        && !this.lgTYPESTOCKFAMILLEID.equals(other.lgTYPESTOCKFAMILLEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTypeStockFamille[ lgTYPESTOCKFAMILLEID=" + lgTYPESTOCKFAMILLEID + " ]";
    }

}
