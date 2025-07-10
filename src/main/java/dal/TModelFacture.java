/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import dal.enumeration.TypeAffichage;
import dal.enumeration.TypeConnexion;

import java.io.Serializable;
import java.util.Collection;
import java.util.Date;
import javax.persistence.*;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlTransient;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_model_facture")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TModelFacture.findAll", query = "SELECT t FROM TModelFacture t"),
        @NamedQuery(name = "TModelFacture.findByLgMODELFACTUREID", query = "SELECT t FROM TModelFacture t WHERE t.lgMODELFACTUREID = :lgMODELFACTUREID"),
        @NamedQuery(name = "TModelFacture.findByStrVALUE", query = "SELECT t FROM TModelFacture t WHERE t.strVALUE = :strVALUE"),
        @NamedQuery(name = "TModelFacture.findByStrDESCRIPTION", query = "SELECT t FROM TModelFacture t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TModelFacture.findByStrSTATUT", query = "SELECT t FROM TModelFacture t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TModelFacture.findByDtCREATED", query = "SELECT t FROM TModelFacture t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TModelFacture.findByDtUPDATED", query = "SELECT t FROM TModelFacture t WHERE t.dtUPDATED = :dtUPDATED") })
public class TModelFacture implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_MODEL_FACTURE_ID", nullable = false, length = 40)
    private String lgMODELFACTUREID;
    @Column(name = "str_VALUE", length = 100)
    private String strVALUE;
    @Column(name = "str_DESCRIPTION", length = 100)
    private String strDESCRIPTION;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @OneToMany(mappedBy = "lgMODELFACTUREID")
    private Collection<TTiersPayant> tTiersPayantCollection;
    @Column(name = "nomFichier", length = 100)
    private String nomFichier;
    @Column(name = "nomFichierRemiseTierspayant", length = 100)
    private String nomFichierRemiseTierspayant;
    @Column(name = "typeConnexion")
    @Enumerated(EnumType.ORDINAL)
    private TypeConnexion typeConnexion;
    @Column(name = "typeAffichage")
    @Enumerated(EnumType.STRING)
    private TypeAffichage typeAffichage;

    public void setTypeConnexion(TypeConnexion typeConnexion) {
        this.typeConnexion = typeConnexion;
    }

    public TypeConnexion getTypeConnexion() {
        return typeConnexion;
    }

    public String getNomFichierRemiseTierspayant() {
        return nomFichierRemiseTierspayant;
    }

    public void setNomFichierRemiseTierspayant(String nomFichierRemiseTierspayant) {
        this.nomFichierRemiseTierspayant = nomFichierRemiseTierspayant;
    }

    public TModelFacture() {
    }

    public void setNomFichier(String nomFichier) {
        this.nomFichier = nomFichier;
    }

    public TypeAffichage getTypeAffichage() {
        return typeAffichage;
    }

    public void setTypeAffichage(TypeAffichage typeAffichage) {
        this.typeAffichage = typeAffichage;
    }

    public String getNomFichier() {
        return nomFichier;
    }

    public TModelFacture(String lgMODELFACTUREID) {
        this.lgMODELFACTUREID = lgMODELFACTUREID;
    }

    public String getLgMODELFACTUREID() {
        return lgMODELFACTUREID;
    }

    public void setLgMODELFACTUREID(String lgMODELFACTUREID) {
        this.lgMODELFACTUREID = lgMODELFACTUREID;
    }

    public String getStrVALUE() {
        return strVALUE;
    }

    public void setStrVALUE(String strVALUE) {
        this.strVALUE = strVALUE;
    }

    public String getStrDESCRIPTION() {
        return strDESCRIPTION;
    }

    public void setStrDESCRIPTION(String strDESCRIPTION) {
        this.strDESCRIPTION = strDESCRIPTION;
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
    public Collection<TTiersPayant> getTTiersPayantCollection() {
        return tTiersPayantCollection;
    }

    public void setTTiersPayantCollection(Collection<TTiersPayant> tTiersPayantCollection) {
        this.tTiersPayantCollection = tTiersPayantCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgMODELFACTUREID != null ? lgMODELFACTUREID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TModelFacture)) {
            return false;
        }
        TModelFacture other = (TModelFacture) object;
        if ((this.lgMODELFACTUREID == null && other.lgMODELFACTUREID != null)
                || (this.lgMODELFACTUREID != null && !this.lgMODELFACTUREID.equals(other.lgMODELFACTUREID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TModelFacture[ lgMODELFACTUREID=" + lgMODELFACTUREID + " ]";
    }

}
