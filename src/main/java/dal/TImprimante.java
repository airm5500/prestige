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
import javax.persistence.Lob;
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
@Table(name = "t_imprimante")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TImprimante.findAll", query = "SELECT t FROM TImprimante t"),
        @NamedQuery(name = "TImprimante.findByLgIMPRIMANTEID", query = "SELECT t FROM TImprimante t WHERE t.lgIMPRIMANTEID = :lgIMPRIMANTEID"),
        @NamedQuery(name = "TImprimante.findByDtCREATED", query = "SELECT t FROM TImprimante t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TImprimante.findByDtUPDATED", query = "SELECT t FROM TImprimante t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TImprimante.findByStrSTATUT", query = "SELECT t FROM TImprimante t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TImprimante.findByIntBEGIN", query = "SELECT t FROM TImprimante t WHERE t.intBEGIN = :intBEGIN"),
        @NamedQuery(name = "TImprimante.findByIntCOLUMN1", query = "SELECT t FROM TImprimante t WHERE t.intCOLUMN1 = :intCOLUMN1"),
        @NamedQuery(name = "TImprimante.findByIntCOLUMN2", query = "SELECT t FROM TImprimante t WHERE t.intCOLUMN2 = :intCOLUMN2"),
        @NamedQuery(name = "TImprimante.findByIntCOLUMN3", query = "SELECT t FROM TImprimante t WHERE t.intCOLUMN3 = :intCOLUMN3"),
        @NamedQuery(name = "TImprimante.findByIntCOLUMN4", query = "SELECT t FROM TImprimante t WHERE t.intCOLUMN4 = :intCOLUMN4") })
public class TImprimante implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_IMPRIMANTE_ID", nullable = false, length = 40)
    private String lgIMPRIMANTEID;
    @Lob
    @Column(name = "str_NAME", length = 65535)
    private String strNAME;
    @Lob
    @Column(name = "str_DESCRIPTION", length = 65535)
    private String strDESCRIPTION;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @Column(name = "int_BEGIN")
    private Integer intBEGIN;
    @Column(name = "int_COLUMN1")
    private Integer intCOLUMN1;
    @Column(name = "int_COLUMN2")
    private Integer intCOLUMN2;
    @Column(name = "int_COLUMN3")
    private Integer intCOLUMN3;
    @Column(name = "int_COLUMN4")
    private Integer intCOLUMN4;
    @Column(name = "int_FONT")
    private Integer intFONT;
    @OneToMany(mappedBy = "lgIMPRIMANTEID")
    private Collection<TUserImprimante> tUserImprimanteCollection;

    public TImprimante() {
    }

    public TImprimante(String lgIMPRIMANTEID) {
        this.lgIMPRIMANTEID = lgIMPRIMANTEID;
    }

    public String getLgIMPRIMANTEID() {
        return lgIMPRIMANTEID;
    }

    public void setLgIMPRIMANTEID(String lgIMPRIMANTEID) {
        this.lgIMPRIMANTEID = lgIMPRIMANTEID;
    }

    public Integer getIntFONT() {
        return intFONT;
    }

    public void setIntFONT(Integer intFONT) {
        this.intFONT = intFONT;
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

    public Integer getIntBEGIN() {
        return intBEGIN;
    }

    public void setIntBEGIN(Integer intBEGIN) {
        this.intBEGIN = intBEGIN;
    }

    public Integer getIntCOLUMN1() {
        return intCOLUMN1;
    }

    public void setIntCOLUMN1(Integer intCOLUMN1) {
        this.intCOLUMN1 = intCOLUMN1;
    }

    public Integer getIntCOLUMN2() {
        return intCOLUMN2;
    }

    public void setIntCOLUMN2(Integer intCOLUMN2) {
        this.intCOLUMN2 = intCOLUMN2;
    }

    public Integer getIntCOLUMN3() {
        return intCOLUMN3;
    }

    public void setIntCOLUMN3(Integer intCOLUMN3) {
        this.intCOLUMN3 = intCOLUMN3;
    }

    public Integer getIntCOLUMN4() {
        return intCOLUMN4;
    }

    public void setIntCOLUMN4(Integer intCOLUMN4) {
        this.intCOLUMN4 = intCOLUMN4;
    }

    @XmlTransient
    public Collection<TUserImprimante> getTUserImprimanteCollection() {
        return tUserImprimanteCollection;
    }

    public void setTUserImprimanteCollection(Collection<TUserImprimante> tUserImprimanteCollection) {
        this.tUserImprimanteCollection = tUserImprimanteCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgIMPRIMANTEID != null ? lgIMPRIMANTEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TImprimante)) {
            return false;
        }
        TImprimante other = (TImprimante) object;
        if ((this.lgIMPRIMANTEID == null && other.lgIMPRIMANTEID != null)
                || (this.lgIMPRIMANTEID != null && !this.lgIMPRIMANTEID.equals(other.lgIMPRIMANTEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TImprimante[ lgIMPRIMANTEID=" + lgIMPRIMANTEID + " ]";
    }

}
