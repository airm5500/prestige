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
@Table(name = "t_etiquette")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TEtiquette.findAll", query = "SELECT t FROM TEtiquette t"),
        @NamedQuery(name = "TEtiquette.findByLgETIQUETTEID", query = "SELECT t FROM TEtiquette t WHERE t.lgETIQUETTEID = :lgETIQUETTEID"),
        @NamedQuery(name = "TEtiquette.findByStrCODE", query = "SELECT t FROM TEtiquette t WHERE t.strCODE = :strCODE"),
        @NamedQuery(name = "TEtiquette.findByStrNAME", query = "SELECT t FROM TEtiquette t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TEtiquette.findByStrSTATUT", query = "SELECT t FROM TEtiquette t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TEtiquette.findByIntNUMBER", query = "SELECT t FROM TEtiquette t WHERE t.intNUMBER = :intNUMBER"),
        @NamedQuery(name = "TEtiquette.findByDtCREATED", query = "SELECT t FROM TEtiquette t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TEtiquette.findByDtUPDATED", query = "SELECT t FROM TEtiquette t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TEtiquette.findByDtPEROMPTION", query = "SELECT t FROM TEtiquette t WHERE t.dtPEROMPTION = :dtPEROMPTION") })
public class TEtiquette implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_ETIQUETTE_ID", nullable = false, length = 40)
    private String lgETIQUETTEID;
    @Column(name = "str_CODE", length = 100)
    private String strCODE;
    @Column(name = "str_NAME", length = 100)
    private String strNAME;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @Column(name = "int_NUMBER", length = 40)
    private String intNUMBER;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "dt_PEROMPTION")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtPEROMPTION;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID")
    @ManyToOne
    private TFamille lgFAMILLEID;
    @JoinColumn(name = "lg_TYPEETIQUETTE_ID", referencedColumnName = "lg_TYPEETIQUETTE_ID")
    @ManyToOne
    private TTypeetiquette lgTYPEETIQUETTEID;
    @JoinColumn(name = "lg_EMPLACEMENT_ID", referencedColumnName = "lg_EMPLACEMENT_ID")
    @ManyToOne
    private TEmplacement lgEMPLACEMENTID;

    public TEtiquette() {
    }

    public TEtiquette(String lgETIQUETTEID) {
        this.lgETIQUETTEID = lgETIQUETTEID;
    }

    public String getLgETIQUETTEID() {
        return lgETIQUETTEID;
    }

    public void setLgETIQUETTEID(String lgETIQUETTEID) {
        this.lgETIQUETTEID = lgETIQUETTEID;
    }

    public String getStrCODE() {
        return strCODE;
    }

    public void setStrCODE(String strCODE) {
        this.strCODE = strCODE;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public String getIntNUMBER() {
        return intNUMBER;
    }

    public void setIntNUMBER(String intNUMBER) {
        this.intNUMBER = intNUMBER;
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

    public Date getDtPEROMPTION() {
        return dtPEROMPTION;
    }

    public void setDtPEROMPTION(Date dtPEROMPTION) {
        this.dtPEROMPTION = dtPEROMPTION;
    }

    public TFamille getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(TFamille lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    public TTypeetiquette getLgTYPEETIQUETTEID() {
        return lgTYPEETIQUETTEID;
    }

    public void setLgTYPEETIQUETTEID(TTypeetiquette lgTYPEETIQUETTEID) {
        this.lgTYPEETIQUETTEID = lgTYPEETIQUETTEID;
    }

    public TEmplacement getLgEMPLACEMENTID() {
        return lgEMPLACEMENTID;
    }

    public void setLgEMPLACEMENTID(TEmplacement lgEMPLACEMENTID) {
        this.lgEMPLACEMENTID = lgEMPLACEMENTID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgETIQUETTEID != null ? lgETIQUETTEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TEtiquette)) {
            return false;
        }
        TEtiquette other = (TEtiquette) object;
        if ((this.lgETIQUETTEID == null && other.lgETIQUETTEID != null)
                || (this.lgETIQUETTEID != null && !this.lgETIQUETTEID.equals(other.lgETIQUETTEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TEtiquette[ lgETIQUETTEID=" + lgETIQUETTEID + " ]";
    }

}
