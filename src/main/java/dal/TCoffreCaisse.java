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
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
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
@Table(name = "t_coffre_caisse")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TCoffreCaisse.findAll", query = "SELECT t FROM TCoffreCaisse t"),
        @NamedQuery(name = "TCoffreCaisse.findByIdCoffreCaisse", query = "SELECT t FROM TCoffreCaisse t WHERE t.idCoffreCaisse = :idCoffreCaisse"),
        @NamedQuery(name = "TCoffreCaisse.findByIntAMOUNT", query = "SELECT t FROM TCoffreCaisse t WHERE t.intAMOUNT = :intAMOUNT"),
        @NamedQuery(name = "TCoffreCaisse.findByDtCREATED", query = "SELECT t FROM TCoffreCaisse t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TCoffreCaisse.findByDtUPDATED", query = "SELECT t FROM TCoffreCaisse t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TCoffreCaisse.findByLdCREATEDBY", query = "SELECT t FROM TCoffreCaisse t WHERE t.ldCREATEDBY = :ldCREATEDBY"),
        @NamedQuery(name = "TCoffreCaisse.findByLdUPDATEDBY", query = "SELECT t FROM TCoffreCaisse t WHERE t.ldUPDATEDBY = :ldUPDATEDBY"),
        @NamedQuery(name = "TCoffreCaisse.findByStrSTATUT", query = "SELECT t FROM TCoffreCaisse t WHERE t.strSTATUT = :strSTATUT") })
public class TCoffreCaisse implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "ID_COFFRE_CAISSE", nullable = false, length = 40)
    private String idCoffreCaisse;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "int_AMOUNT", precision = 15, scale = 3)
    private Double intAMOUNT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "ld_CREATED_BY", length = 40)
    private String ldCREATEDBY;
    @Column(name = "ld_UPDATED_BY", length = 40)
    private String ldUPDATEDBY;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @OneToMany(mappedBy = "idCoffreCaisse")
    private Collection<TResumeCaisse> tResumeCaisseCollection;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERID;

    public TCoffreCaisse() {
    }

    public TCoffreCaisse(String idCoffreCaisse) {
        this.idCoffreCaisse = idCoffreCaisse;
    }

    public String getIdCoffreCaisse() {
        return idCoffreCaisse;
    }

    public void setIdCoffreCaisse(String idCoffreCaisse) {
        this.idCoffreCaisse = idCoffreCaisse;
    }

    public Double getIntAMOUNT() {
        return intAMOUNT;
    }

    public void setIntAMOUNT(Double intAMOUNT) {
        this.intAMOUNT = intAMOUNT;
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

    public String getLdCREATEDBY() {
        return ldCREATEDBY;
    }

    public void setLdCREATEDBY(String ldCREATEDBY) {
        this.ldCREATEDBY = ldCREATEDBY;
    }

    public String getLdUPDATEDBY() {
        return ldUPDATEDBY;
    }

    public void setLdUPDATEDBY(String ldUPDATEDBY) {
        this.ldUPDATEDBY = ldUPDATEDBY;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    @XmlTransient
    public Collection<TResumeCaisse> getTResumeCaisseCollection() {
        return tResumeCaisseCollection;
    }

    public void setTResumeCaisseCollection(Collection<TResumeCaisse> tResumeCaisseCollection) {
        this.tResumeCaisseCollection = tResumeCaisseCollection;
    }

    public TUser getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(TUser lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (idCoffreCaisse != null ? idCoffreCaisse.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TCoffreCaisse)) {
            return false;
        }
        TCoffreCaisse other = (TCoffreCaisse) object;
        if ((this.idCoffreCaisse == null && other.idCoffreCaisse != null)
                || (this.idCoffreCaisse != null && !this.idCoffreCaisse.equals(other.idCoffreCaisse))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TCoffreCaisse[ idCoffreCaisse=" + idCoffreCaisse + " ]";
    }

}
