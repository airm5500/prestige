/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package dal;

import java.io.Serializable;
import java.util.Collection;
import javax.persistence.Basic;
import javax.persistence.CascadeType;
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
@Table(name = "t_transaction_code")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTransactionCode.findAll", query = "SELECT t FROM TTransactionCode t"),
        @NamedQuery(name = "TTransactionCode.findByStrtransactioncodeID", query = "SELECT t FROM TTransactionCode t WHERE t.strtransactioncodeID = :strtransactioncodeID"),
        @NamedQuery(name = "TTransactionCode.findByStrDescription", query = "SELECT t FROM TTransactionCode t WHERE t.strDescription = :strDescription") })
public class TTransactionCode implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "str_transaction_code_ID", nullable = false, length = 20)
    private String strtransactioncodeID;
    @Column(name = "str_description", length = 200)
    private String strDescription;
    @OneToMany(mappedBy = "strtransactioncodeID")
    private Collection<TTransaction> tTransactionCollection;

    public TTransactionCode() {
    }

    public TTransactionCode(String strtransactioncodeID) {
        this.strtransactioncodeID = strtransactioncodeID;
    }

    public String getStrtransactioncodeID() {
        return strtransactioncodeID;
    }

    public void setStrtransactioncodeID(String strtransactioncodeID) {
        this.strtransactioncodeID = strtransactioncodeID;
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
        hash += (strtransactioncodeID != null ? strtransactioncodeID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTransactionCode)) {
            return false;
        }
        TTransactionCode other = (TTransactionCode) object;
        if ((this.strtransactioncodeID == null && other.strtransactioncodeID != null)
                || (this.strtransactioncodeID != null
                        && !this.strtransactioncodeID.equals(other.strtransactioncodeID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTransactionCode[ strtransactioncodeID=" + strtransactioncodeID + " ]";
    }

}
