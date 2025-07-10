/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package dal;

import java.io.Serializable;
import java.util.Collection;
import java.util.Date;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.OneToMany;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlTransient;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_bordereau")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TBordereau.findAll", query = "SELECT t FROM TBordereau t"),
        @NamedQuery(name = "TBordereau.findByLgBORDEREAUID", query = "SELECT t FROM TBordereau t WHERE t.lgBORDEREAUID = :lgBORDEREAUID"),
        @NamedQuery(name = "TBordereau.findByStrCODE", query = "SELECT t FROM TBordereau t WHERE t.strCODE = :strCODE"),
        @NamedQuery(name = "TBordereau.findByDblMONTANT", query = "SELECT t FROM TBordereau t WHERE t.dblMONTANT = :dblMONTANT"),
        @NamedQuery(name = "TBordereau.findByIntnbFACTURE", query = "SELECT t FROM TBordereau t WHERE t.intnbFACTURE = :intnbFACTURE"),
        @NamedQuery(name = "TBordereau.findByDblMONTANTRESTANT", query = "SELECT t FROM TBordereau t WHERE t.dblMONTANTRESTANT = :dblMONTANTRESTANT"),
        @NamedQuery(name = "TBordereau.findByDblMONTANTPAYE", query = "SELECT t FROM TBordereau t WHERE t.dblMONTANTPAYE = :dblMONTANTPAYE"),
        @NamedQuery(name = "TBordereau.findByStrSTATUT", query = "SELECT t FROM TBordereau t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TBordereau.findByDtCREATED", query = "SELECT t FROM TBordereau t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TBordereau.findByDtUPDATED", query = "SELECT t FROM TBordereau t WHERE t.dtUPDATED = :dtUPDATED") })
public class TBordereau implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_BORDEREAU_ID", nullable = false, length = 40)
    private String lgBORDEREAUID;
    @Column(name = "str_CODE", length = 20)
    private String strCODE;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "dbl_MONTANT", precision = 15, scale = 3)
    private Double dblMONTANT;
    @Column(name = "int_nb_FACTURE")
    private Integer intnbFACTURE;
    @Column(name = "dbl_MONTANT_RESTANT", precision = 15, scale = 3)
    private Double dblMONTANTRESTANT;
    @Column(name = "dbl_MONTANT_PAYE")
    private Integer dblMONTANTPAYE;
    @Column(name = "str_STATUT", length = 60)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @OneToMany(mappedBy = "lgBORDEREAUID")
    private Collection<TBordereauDetail> tBordereauDetailCollection;

    public TBordereau() {
    }

    public TBordereau(String lgBORDEREAUID) {
        this.lgBORDEREAUID = lgBORDEREAUID;
    }

    public String getLgBORDEREAUID() {
        return lgBORDEREAUID;
    }

    public void setLgBORDEREAUID(String lgBORDEREAUID) {
        this.lgBORDEREAUID = lgBORDEREAUID;
    }

    public String getStrCODE() {
        return strCODE;
    }

    public void setStrCODE(String strCODE) {
        this.strCODE = strCODE;
    }

    public Double getDblMONTANT() {
        return dblMONTANT;
    }

    public void setDblMONTANT(Double dblMONTANT) {
        this.dblMONTANT = dblMONTANT;
    }

    public Integer getIntnbFACTURE() {
        return intnbFACTURE;
    }

    public void setIntnbFACTURE(Integer intnbFACTURE) {
        this.intnbFACTURE = intnbFACTURE;
    }

    public Double getDblMONTANTRESTANT() {
        return dblMONTANTRESTANT;
    }

    public void setDblMONTANTRESTANT(Double dblMONTANTRESTANT) {
        this.dblMONTANTRESTANT = dblMONTANTRESTANT;
    }

    public Integer getDblMONTANTPAYE() {
        return dblMONTANTPAYE;
    }

    public void setDblMONTANTPAYE(Integer dblMONTANTPAYE) {
        this.dblMONTANTPAYE = dblMONTANTPAYE;
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

    @XmlTransient
    public Collection<TBordereauDetail> getTBordereauDetailCollection() {
        return tBordereauDetailCollection;
    }

    public void setTBordereauDetailCollection(Collection<TBordereauDetail> tBordereauDetailCollection) {
        this.tBordereauDetailCollection = tBordereauDetailCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgBORDEREAUID != null ? lgBORDEREAUID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TBordereau)) {
            return false;
        }
        TBordereau other = (TBordereau) object;
        if ((this.lgBORDEREAUID == null && other.lgBORDEREAUID != null)
                || (this.lgBORDEREAUID != null && !this.lgBORDEREAUID.equals(other.lgBORDEREAUID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TBordereau[ lgBORDEREAUID=" + lgBORDEREAUID + " ]";
    }

}
