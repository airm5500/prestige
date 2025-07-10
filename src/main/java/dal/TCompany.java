/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.util.Collection;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.OneToMany;
import javax.persistence.Table;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlTransient;

/**
 *
 * @author KKOFFI
 */
@Entity
@Table(name = "t_company")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TCompany.findAll", query = "SELECT t FROM TCompany t"),
        @NamedQuery(name = "TCompany.findByLgCOMPANYID", query = "SELECT t FROM TCompany t WHERE t.lgCOMPANYID = :lgCOMPANYID"),
        @NamedQuery(name = "TCompany.findByStrRAISONSOCIALE", query = "SELECT t FROM TCompany t WHERE t.strRAISONSOCIALE = :strRAISONSOCIALE"),
        @NamedQuery(name = "TCompany.findByStrADRESS", query = "SELECT t FROM TCompany t WHERE t.strADRESS = :strADRESS"),
        @NamedQuery(name = "TCompany.findByStrPHONE", query = "SELECT t FROM TCompany t WHERE t.strPHONE = :strPHONE"),
        @NamedQuery(name = "TCompany.findByStrCEL", query = "SELECT t FROM TCompany t WHERE t.strCEL = :strCEL") })
public class TCompany implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_COMPANY_ID")
    private String lgCOMPANYID;
    @Column(name = "str_RAISONSOCIALE")
    private String strRAISONSOCIALE;
    @Column(name = "str_ADRESS")
    private String strADRESS;
    @Column(name = "str_PHONE")
    private String strPHONE;
    @Column(name = "str_CEL")
    private String strCEL;
    @OneToMany(mappedBy = "lgCOMPANYID")
    private Collection<TClient> cliens;

    public void setTClientCollection(Collection<TClient> clientscollection) {
        this.cliens = clientscollection;
    }

    @XmlTransient
    public Collection<TClient> getTClientCollection() {
        return cliens;
    }

    public TCompany() {
    }

    public TCompany(String lgCOMPANYID) {
        this.lgCOMPANYID = lgCOMPANYID;
    }

    public String getLgCOMPANYID() {
        return lgCOMPANYID;
    }

    public void setLgCOMPANYID(String lgCOMPANYID) {
        this.lgCOMPANYID = lgCOMPANYID;
    }

    public String getStrRAISONSOCIALE() {
        return strRAISONSOCIALE;
    }

    public void setStrRAISONSOCIALE(String strRAISONSOCIALE) {
        this.strRAISONSOCIALE = strRAISONSOCIALE;
    }

    public String getStrADRESS() {
        return strADRESS;
    }

    public void setStrADRESS(String strADRESS) {
        this.strADRESS = strADRESS;
    }

    public String getStrPHONE() {
        return strPHONE;
    }

    public void setStrPHONE(String strPHONE) {
        this.strPHONE = strPHONE;
    }

    public String getStrCEL() {
        return strCEL;
    }

    public void setStrCEL(String strCEL) {
        this.strCEL = strCEL;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgCOMPANYID != null ? lgCOMPANYID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TCompany)) {
            return false;
        }
        TCompany other = (TCompany) object;
        if ((this.lgCOMPANYID == null && other.lgCOMPANYID != null)
                || (this.lgCOMPANYID != null && !this.lgCOMPANYID.equals(other.lgCOMPANYID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TCompany[ lgCOMPANYID=" + lgCOMPANYID + " ]";
    }

}
