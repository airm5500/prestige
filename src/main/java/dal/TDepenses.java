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
@Table(name = "t_depenses")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TDepenses.findAll", query = "SELECT t FROM TDepenses t"),
        @NamedQuery(name = "TDepenses.findByIdDepense", query = "SELECT t FROM TDepenses t WHERE t.idDepense = :idDepense"),
        @NamedQuery(name = "TDepenses.findByDtCREATED", query = "SELECT t FROM TDepenses t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TDepenses.findByStrCREATEDBY", query = "SELECT t FROM TDepenses t WHERE t.strCREATEDBY = :strCREATEDBY"),
        @NamedQuery(name = "TDepenses.findByDtUPDATED", query = "SELECT t FROM TDepenses t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TDepenses.findByStrUPDATEDBY", query = "SELECT t FROM TDepenses t WHERE t.strUPDATEDBY = :strUPDATEDBY"),
        @NamedQuery(name = "TDepenses.findByIntAMOUNT", query = "SELECT t FROM TDepenses t WHERE t.intAMOUNT = :intAMOUNT"),
        @NamedQuery(name = "TDepenses.findByStrDESCRIPTION", query = "SELECT t FROM TDepenses t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TDepenses.findByStrREFFACTURE", query = "SELECT t FROM TDepenses t WHERE t.strREFFACTURE = :strREFFACTURE") })
public class TDepenses implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "ID_DEPENSE", nullable = false, length = 40)
    private String idDepense;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "str_CREATED_BY", length = 40)
    private String strCREATEDBY;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_UPDATED_BY", length = 40)
    private String strUPDATEDBY;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "int_AMOUNT", precision = 15, scale = 3)
    private Double intAMOUNT;
    @Column(name = "str_DESCRIPTION", length = 2000)
    private String strDESCRIPTION;
    @Column(name = "str_REF_FACTURE", length = 40)
    private String strREFFACTURE;
    @JoinColumn(name = "lg_TYPE_DEPENSE_ID", referencedColumnName = "lg_TYPE_DEPENSE_ID")
    @ManyToOne
    private TTypeDepense lgTYPEDEPENSEID;

    public TDepenses() {
    }

    public TDepenses(String idDepense) {
        this.idDepense = idDepense;
    }

    public String getIdDepense() {
        return idDepense;
    }

    public void setIdDepense(String idDepense) {
        this.idDepense = idDepense;
    }

    public Date getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(Date dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    public String getStrCREATEDBY() {
        return strCREATEDBY;
    }

    public void setStrCREATEDBY(String strCREATEDBY) {
        this.strCREATEDBY = strCREATEDBY;
    }

    public Date getDtUPDATED() {
        return dtUPDATED;
    }

    public void setDtUPDATED(Date dtUPDATED) {
        this.dtUPDATED = dtUPDATED;
    }

    public String getStrUPDATEDBY() {
        return strUPDATEDBY;
    }

    public void setStrUPDATEDBY(String strUPDATEDBY) {
        this.strUPDATEDBY = strUPDATEDBY;
    }

    public Double getIntAMOUNT() {
        return intAMOUNT;
    }

    public void setIntAMOUNT(Double intAMOUNT) {
        this.intAMOUNT = intAMOUNT;
    }

    public String getStrDESCRIPTION() {
        return strDESCRIPTION;
    }

    public void setStrDESCRIPTION(String strDESCRIPTION) {
        this.strDESCRIPTION = strDESCRIPTION;
    }

    public String getStrREFFACTURE() {
        return strREFFACTURE;
    }

    public void setStrREFFACTURE(String strREFFACTURE) {
        this.strREFFACTURE = strREFFACTURE;
    }

    public TTypeDepense getLgTYPEDEPENSEID() {
        return lgTYPEDEPENSEID;
    }

    public void setLgTYPEDEPENSEID(TTypeDepense lgTYPEDEPENSEID) {
        this.lgTYPEDEPENSEID = lgTYPEDEPENSEID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (idDepense != null ? idDepense.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TDepenses)) {
            return false;
        }
        TDepenses other = (TDepenses) object;
        if ((this.idDepense == null && other.idDepense != null)
                || (this.idDepense != null && !this.idDepense.equals(other.idDepense))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TDepenses[ idDepense=" + idDepense + " ]";
    }

}
