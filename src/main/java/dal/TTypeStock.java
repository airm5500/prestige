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
import javax.persistence.CascadeType;
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
@Table(name = "t_type_stock")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTypeStock.findAll", query = "SELECT t FROM TTypeStock t"),
        @NamedQuery(name = "TTypeStock.findByLgTYPESTOCKID", query = "SELECT t FROM TTypeStock t WHERE t.lgTYPESTOCKID = :lgTYPESTOCKID"),
        @NamedQuery(name = "TTypeStock.findByStrNAME", query = "SELECT t FROM TTypeStock t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TTypeStock.findByStrDESCRIPTION", query = "SELECT t FROM TTypeStock t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TTypeStock.findByDtCREATED", query = "SELECT t FROM TTypeStock t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TTypeStock.findByDtUPDATED", query = "SELECT t FROM TTypeStock t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TTypeStock.findByStrSTATUT", query = "SELECT t FROM TTypeStock t WHERE t.strSTATUT = :strSTATUT") })
public class TTypeStock implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TYPE_STOCK_ID", nullable = false, length = 40)
    private String lgTYPESTOCKID;
    @Basic(optional = false)
    @Column(name = "str_NAME", nullable = false, length = 40)
    private String strNAME;
    @Basic(optional = false)
    @Column(name = "str_DESCRIPTION", nullable = false, length = 100)
    private String strDESCRIPTION;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @OneToMany(mappedBy = "lgTYPESTOCKID")
    private Collection<TTypeStockFamille> tTypeStockFamilleCollection;

    public TTypeStock() {
    }

    public TTypeStock(String lgTYPESTOCKID) {
        this.lgTYPESTOCKID = lgTYPESTOCKID;
    }

    public TTypeStock(String lgTYPESTOCKID, String strNAME, String strDESCRIPTION) {
        this.lgTYPESTOCKID = lgTYPESTOCKID;
        this.strNAME = strNAME;
        this.strDESCRIPTION = strDESCRIPTION;
    }

    public String getLgTYPESTOCKID() {
        return lgTYPESTOCKID;
    }

    public void setLgTYPESTOCKID(String lgTYPESTOCKID) {
        this.lgTYPESTOCKID = lgTYPESTOCKID;
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

    @XmlTransient
    public Collection<TTypeStockFamille> getTTypeStockFamilleCollection() {
        return tTypeStockFamilleCollection;
    }

    public void setTTypeStockFamilleCollection(Collection<TTypeStockFamille> tTypeStockFamilleCollection) {
        this.tTypeStockFamilleCollection = tTypeStockFamilleCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgTYPESTOCKID != null ? lgTYPESTOCKID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTypeStock)) {
            return false;
        }
        TTypeStock other = (TTypeStock) object;
        if ((this.lgTYPESTOCKID == null && other.lgTYPESTOCKID != null)
                || (this.lgTYPESTOCKID != null && !this.lgTYPESTOCKID.equals(other.lgTYPESTOCKID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTypeStock[ lgTYPESTOCKID=" + lgTYPESTOCKID + " ]";
    }

}
