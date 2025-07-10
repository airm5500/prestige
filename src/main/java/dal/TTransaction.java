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
import javax.persistence.UniqueConstraint;
import javax.xml.bind.annotation.XmlRootElement;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_transaction", uniqueConstraints = { @UniqueConstraint(columnNames = { "str_transaction_id" }) })
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTransaction.findAll", query = "SELECT t FROM TTransaction t"),
        @NamedQuery(name = "TTransaction.findByStrTransactionId", query = "SELECT t FROM TTransaction t WHERE t.strTransactionId = :strTransactionId"),
        @NamedQuery(name = "TTransaction.findByDtTransactionDate", query = "SELECT t FROM TTransaction t WHERE t.dtTransactionDate = :dtTransactionDate"),
        @NamedQuery(name = "TTransaction.findByStrDescription", query = "SELECT t FROM TTransaction t WHERE t.strDescription = :strDescription"),
        @NamedQuery(name = "TTransaction.findByDecAmount", query = "SELECT t FROM TTransaction t WHERE t.decAmount = :decAmount"),
        @NamedQuery(name = "TTransaction.findByDtDateCreated", query = "SELECT t FROM TTransaction t WHERE t.dtDateCreated = :dtDateCreated"),
        @NamedQuery(name = "TTransaction.findByStrTransactionNumber", query = "SELECT t FROM TTransaction t WHERE t.strTransactionNumber = :strTransactionNumber"),
        @NamedQuery(name = "TTransaction.findByBValide", query = "SELECT t FROM TTransaction t WHERE t.bValide = :bValide"),
        @NamedQuery(name = "TTransaction.findByStrMotifTransaction", query = "SELECT t FROM TTransaction t WHERE t.strMotifTransaction = :strMotifTransaction"),
        @NamedQuery(name = "TTransaction.findByIsCancel", query = "SELECT t FROM TTransaction t WHERE t.isCancel = :isCancel"),
        @NamedQuery(name = "TTransaction.findByDecBalanceInDisponible", query = "SELECT t FROM TTransaction t WHERE t.decBalanceInDisponible = :decBalanceInDisponible"),
        @NamedQuery(name = "TTransaction.findByDecBalanceDisponible", query = "SELECT t FROM TTransaction t WHERE t.decBalanceDisponible = :decBalanceDisponible") })
public class TTransaction implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "str_transaction_id", nullable = false, length = 40)
    private String strTransactionId;
    @Column(name = "dt_transaction_date")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtTransactionDate;
    @Column(name = "str_Description", length = 200)
    private String strDescription;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "dec_Amount", precision = 40, scale = 3)
    private Double decAmount;
    @Column(name = "dt_date_created")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtDateCreated;
    @Column(name = "str_transaction_number", length = 200)
    private String strTransactionNumber;
    @Column(name = "b_valide")
    private Boolean bValide;
    @Column(name = "str_Motif_Transaction", length = 500)
    private String strMotifTransaction;
    @Column(name = "is_cancel")
    private Boolean isCancel;
    @Column(name = "dec_Balance_InDisponible", precision = 15, scale = 3)
    private Double decBalanceInDisponible;
    @Column(name = "dec_Balance_Disponible", precision = 15, scale = 3)
    private Double decBalanceDisponible;
    @JoinColumn(name = "str_user_account_ID", referencedColumnName = "lg_COMPTE_CLIENT_ID")
    @ManyToOne
    private TCompteClient struseraccountID;
    @JoinColumn(name = "str_transaction_type_ID", referencedColumnName = "str_transaction_type_ID")
    @ManyToOne
    private TTransactionType strtransactiontypeID;
    @JoinColumn(name = "str_transaction_code_ID", referencedColumnName = "str_transaction_code_ID", nullable = false)
    @ManyToOne(optional = false)
    private TTransactionCode strtransactioncodeID;

    public TTransaction() {
    }

    public TTransaction(String strTransactionId) {
        this.strTransactionId = strTransactionId;
    }

    public String getStrTransactionId() {
        return strTransactionId;
    }

    public void setStrTransactionId(String strTransactionId) {
        this.strTransactionId = strTransactionId;
    }

    public Date getDtTransactionDate() {
        return dtTransactionDate;
    }

    public void setDtTransactionDate(Date dtTransactionDate) {
        this.dtTransactionDate = dtTransactionDate;
    }

    public String getStrDescription() {
        return strDescription;
    }

    public void setStrDescription(String strDescription) {
        this.strDescription = strDescription;
    }

    public Double getDecAmount() {
        return decAmount;
    }

    public void setDecAmount(Double decAmount) {
        this.decAmount = decAmount;
    }

    public Date getDtDateCreated() {
        return dtDateCreated;
    }

    public void setDtDateCreated(Date dtDateCreated) {
        this.dtDateCreated = dtDateCreated;
    }

    public String getStrTransactionNumber() {
        return strTransactionNumber;
    }

    public void setStrTransactionNumber(String strTransactionNumber) {
        this.strTransactionNumber = strTransactionNumber;
    }

    public Boolean getBValide() {
        return bValide;
    }

    public void setBValide(Boolean bValide) {
        this.bValide = bValide;
    }

    public String getStrMotifTransaction() {
        return strMotifTransaction;
    }

    public void setStrMotifTransaction(String strMotifTransaction) {
        this.strMotifTransaction = strMotifTransaction;
    }

    public Boolean getIsCancel() {
        return isCancel;
    }

    public void setIsCancel(Boolean isCancel) {
        this.isCancel = isCancel;
    }

    public Double getDecBalanceInDisponible() {
        return decBalanceInDisponible;
    }

    public void setDecBalanceInDisponible(Double decBalanceInDisponible) {
        this.decBalanceInDisponible = decBalanceInDisponible;
    }

    public Double getDecBalanceDisponible() {
        return decBalanceDisponible;
    }

    public void setDecBalanceDisponible(Double decBalanceDisponible) {
        this.decBalanceDisponible = decBalanceDisponible;
    }

    public TCompteClient getStruseraccountID() {
        return struseraccountID;
    }

    public void setStruseraccountID(TCompteClient struseraccountID) {
        this.struseraccountID = struseraccountID;
    }

    public TTransactionType getStrtransactiontypeID() {
        return strtransactiontypeID;
    }

    public void setStrtransactiontypeID(TTransactionType strtransactiontypeID) {
        this.strtransactiontypeID = strtransactiontypeID;
    }

    public TTransactionCode getStrtransactioncodeID() {
        return strtransactioncodeID;
    }

    public void setStrtransactioncodeID(TTransactionCode strtransactioncodeID) {
        this.strtransactioncodeID = strtransactioncodeID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (strTransactionId != null ? strTransactionId.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTransaction)) {
            return false;
        }
        TTransaction other = (TTransaction) object;
        if ((this.strTransactionId == null && other.strTransactionId != null)
                || (this.strTransactionId != null && !this.strTransactionId.equals(other.strTransactionId))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTransaction[ strTransactionId=" + strTransactionId + " ]";
    }

}
