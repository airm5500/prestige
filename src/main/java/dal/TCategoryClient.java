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
@Table(name = "t_category_client")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TCategoryClient.findAll", query = "SELECT t FROM TCategoryClient t"),
        @NamedQuery(name = "TCategoryClient.findByLgCATEGORYCLIENTID", query = "SELECT t FROM TCategoryClient t WHERE t.lgCATEGORYCLIENTID = :lgCATEGORYCLIENTID"),
        @NamedQuery(name = "TCategoryClient.findByStrLIBELLE", query = "SELECT t FROM TCategoryClient t WHERE t.strLIBELLE = :strLIBELLE"),
        @NamedQuery(name = "TCategoryClient.findByStrDESCRIPTION", query = "SELECT t FROM TCategoryClient t WHERE t.strDESCRIPTION = :strDESCRIPTION") })
public class TCategoryClient implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_CATEGORY_CLIENT_ID")
    private String lgCATEGORYCLIENTID;
    @Column(name = "str_LIBELLE")
    private String strLIBELLE;
    @Column(name = "str_DESCRIPTION")
    private String strDESCRIPTION;
    @OneToMany(mappedBy = "lgCATEGORYCLIENTID")
    private Collection<TClient> cliens;

    public TCategoryClient() {
    }

    public TCategoryClient(String lgCATEGORYCLIENTID) {
        this.lgCATEGORYCLIENTID = lgCATEGORYCLIENTID;
    }

    public String getLgCATEGORYCLIENTID() {
        return lgCATEGORYCLIENTID;
    }

    public void setLgCATEGORYCLIENTID(String lgCATEGORYCLIENTID) {
        this.lgCATEGORYCLIENTID = lgCATEGORYCLIENTID;
    }

    public String getStrLIBELLE() {
        return strLIBELLE;
    }

    public void setStrLIBELLE(String strLIBELLE) {
        this.strLIBELLE = strLIBELLE;
    }

    public String getStrDESCRIPTION() {
        return strDESCRIPTION;
    }

    public void setStrDESCRIPTION(String strDESCRIPTION) {
        this.strDESCRIPTION = strDESCRIPTION;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgCATEGORYCLIENTID != null ? lgCATEGORYCLIENTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TCategoryClient)) {
            return false;
        }
        TCategoryClient other = (TCategoryClient) object;
        if ((this.lgCATEGORYCLIENTID == null && other.lgCATEGORYCLIENTID != null)
                || (this.lgCATEGORYCLIENTID != null && !this.lgCATEGORYCLIENTID.equals(other.lgCATEGORYCLIENTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TCategoryClient[ lgCATEGORYCLIENTID=" + lgCATEGORYCLIENTID + " ]";
    }

    public void setTClientCollection(Collection<TClient> clientscollection) {
        this.cliens = clientscollection;
    }

    @XmlTransient
    public Collection<TClient> getTClientCollection() {
        return cliens;
    }

}
