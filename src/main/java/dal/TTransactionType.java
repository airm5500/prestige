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
 * @author MKABOU
 */
@Entity
@Table(name = "t_transaction_type")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTransactionType.findAll", query = "SELECT t FROM TTransactionType t"),
        @NamedQuery(name = "TTransactionType.findByStrtransactiontypeID", query = "SELECT t FROM TTransactionType t WHERE t.strtransactiontypeID = :strtransactiontypeID"),
        @NamedQuery(name = "TTransactionType.findByStrDescription", query = "SELECT t FROM TTransactionType t WHERE t.strDescription = :strDescription") })
public class TTransactionType implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "str_transaction_type_ID", nullable = false, length = 20)
    private String strtransactiontypeID;
    @Column(name = "str_Description", length = 200)
    private String strDescription;
    @OneToMany(mappedBy = "strtransactiontypeID")
    private Collection<TTransaction> tTransactionCollection;

    public TTransactionType() {
    }

    public TTransactionType(String strtransactiontypeID) {
        this.strtransactiontypeID = strtransactiontypeID;
    }

    public String getStrtransactiontypeID() {
        return strtransactiontypeID;
    }

    public void setStrtransactiontypeID(String strtransactiontypeID) {
        this.strtransactiontypeID = strtransactiontypeID;
    }

    public String getStrDescription() {
        return strDescription;
    }

    public void setStrDescription(String strDescription) {
        this.strDescription = strDescription;
    }

    @XmlTransient
    public Collection<TTransaction> getTTransactionCollection() {
        return tTransactionCollection;
    }

    public void setTTransactionCollection(Collection<TTransaction> tTransactionCollection) {
        this.tTransactionCollection = tTransactionCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (strtransactiontypeID != null ? strtransactiontypeID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTransactionType)) {
            return false;
        }
        TTransactionType other = (TTransactionType) object;
        if ((this.strtransactiontypeID == null && other.strtransactiontypeID != null)
                || (this.strtransactiontypeID != null
                        && !this.strtransactiontypeID.equals(other.strtransactiontypeID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTransactionType[ strtransactiontypeID=" + strtransactiontypeID + " ]";
    }

}
