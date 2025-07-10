/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.util.Date;
import java.util.UUID;
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

/**
 *
 * @author Kobena
 */
@Entity
@Table(name = "annulation_snapshot")
@NamedQueries({
        @NamedQuery(name = "AnnulationSnapshot.findAll", query = "SELECT a FROM AnnulationSnapshot a WHERE a.dateOp=:dateOp  ") })
public class AnnulationSnapshot implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "ID")
    private String id = UUID.randomUUID().toString();
    @Basic(optional = false)
    @Column(name = "dateOp")
    @Temporal(TemporalType.DATE)
    private Date dateOp = new Date();
    @Basic(optional = false)
    @Column(name = "created_At")
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt = new Date();
    @Basic(optional = false)
    @Column(name = "updated_At")
    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt = new Date();
    @Basic(optional = false)
    @Column(name = "montant")
    private Integer montant = 0;
    @Column(name = "montantTP")
    private Integer montantTP = 0;
    @Basic(optional = false)
    @Column(name = "montantPaye")
    private Integer montantPaye = 0;
    @Basic(optional = false)
    @Column(name = "remise")
    private Integer remise = 0;
    @JoinColumn(name = "idVente", referencedColumnName = "lg_PREENREGISTREMENT_ID", nullable = false)
    @ManyToOne
    private TPreenregistrement preenregistrement;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID", nullable = false)
    @ManyToOne
    private TUser user;
    @JoinColumn(name = "caissier", referencedColumnName = "lg_USER_ID", nullable = false)
    @ManyToOne
    private TUser caissier;
    @JoinColumn(name = "reglement", referencedColumnName = "lg_TYPE_REGLEMENT_ID", nullable = false)
    @ManyToOne
    private TTypeReglement reglement;
    @JoinColumn(name = "emplacement", referencedColumnName = "lg_EMPLACEMENT_ID", nullable = false)
    @ManyToOne
    private TEmplacement emplacement;
    @Column(name = "montantRestant")
    private Integer montantRestant = 0;

    public TTypeReglement getReglement() {
        return reglement;
    }

    public Integer getMontantRestant() {
        return montantRestant;
    }

    public void setMontantRestant(Integer montantRestant) {
        this.montantRestant = montantRestant;
    }

    public void setReglement(TTypeReglement reglement) {
        this.reglement = reglement;
    }

    public TEmplacement getEmplacement() {
        return emplacement;
    }

    public void setEmplacement(TEmplacement emplacement) {
        this.emplacement = emplacement;
    }

    public AnnulationSnapshot() {
    }

    public AnnulationSnapshot(String id) {
        this.id = id;
    }

    public AnnulationSnapshot(String id, Date dateOp, Date createdAt, Date updatedAt, Integer montant,
            Integer montantPaye) {
        this.id = id;
        this.dateOp = dateOp;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.montant = montant;
        this.montantPaye = montantPaye;
    }

    public String getId() {
        return id;
    }

    public TUser getCaissier() {
        return caissier;
    }

    public void setCaissier(TUser caissier) {
        this.caissier = caissier;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Date getDateOp() {
        return dateOp;
    }

    public void setDateOp(Date dateOp) {
        this.dateOp = dateOp;
    }

    public Date getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }

    public Date getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Date updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Integer getMontant() {
        return montant;
    }

    public void setMontant(Integer montant) {
        this.montant = montant;
    }

    public Integer getMontantTP() {
        return montantTP;
    }

    public void setMontantTP(Integer montantTP) {
        this.montantTP = montantTP;
    }

    public Integer getMontantPaye() {
        return montantPaye;
    }

    public void setMontantPaye(Integer montantPaye) {
        this.montantPaye = montantPaye;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (id != null ? id.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof AnnulationSnapshot)) {
            return false;
        }
        AnnulationSnapshot other = (AnnulationSnapshot) object;
        return !((this.id == null && other.id != null) || (this.id != null && !this.id.equals(other.id)));
    }

    @Override
    public String toString() {
        return "dal.AnnulationSnapshot[ id=" + id + " ]";
    }

    public TPreenregistrement getPreenregistrement() {
        return preenregistrement;
    }

    public void setPreenregistrement(TPreenregistrement preenregistrement) {
        this.preenregistrement = preenregistrement;
    }

    public Integer getRemise() {
        return remise;
    }

    public void setRemise(Integer remise) {
        this.remise = remise;
    }

    public TUser getUser() {
        return user;
    }

    public void setUser(TUser user) {
        this.user = user;
    }

}
