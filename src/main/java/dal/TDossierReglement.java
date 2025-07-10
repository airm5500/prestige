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
import javax.persistence.OneToMany;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.xml.bind.annotation.XmlTransient;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_dossier_reglement")

public class TDossierReglement implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_DOSSIER_REGLEMENT_ID", nullable = false, length = 40)
    private String lgDOSSIERREGLEMENTID;
    @Column(name = "str_LIBELLE", length = 40)
    private String strLIBELLE;
    @Column(name = "str_NATURE_DOSSIER", length = 40)
    private String strNATUREDOSSIER;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "dbl_AMOUNT", precision = 15, scale = 3)
    private Double dblAMOUNT;
    @Column(name = "str_ORGANISME_ID", length = 40)
    private String strORGANISMEID;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @Column(name = "dbl_MONTANT_ATTENDU", precision = 15, scale = 0)
    private Double dblMONTANTATTENDU;
    @Column(name = "dt_REGLEMENT")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtREGLEMENT;
    @OneToMany(mappedBy = "lgDOSSIERREGLEMENTID")
    private Collection<TDossierReglementDetail> tDossierReglementDetailCollection;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERID;
    @JoinColumn(name = "lg_FACTURE_ID", referencedColumnName = "lg_FACTURE_ID")
    @ManyToOne
    private TFacture lgFACTUREID;

    public TDossierReglement() {
    }

    public TDossierReglement(String lgDOSSIERREGLEMENTID) {
        this.lgDOSSIERREGLEMENTID = lgDOSSIERREGLEMENTID;
    }

    public String getLgDOSSIERREGLEMENTID() {
        return lgDOSSIERREGLEMENTID;
    }

    public void setLgDOSSIERREGLEMENTID(String lgDOSSIERREGLEMENTID) {
        this.lgDOSSIERREGLEMENTID = lgDOSSIERREGLEMENTID;
    }

    public String getStrLIBELLE() {
        return strLIBELLE;
    }

    public void setStrLIBELLE(String strLIBELLE) {
        this.strLIBELLE = strLIBELLE;
    }

    public String getStrNATUREDOSSIER() {
        return strNATUREDOSSIER;
    }

    public void setStrNATUREDOSSIER(String strNATUREDOSSIER) {
        this.strNATUREDOSSIER = strNATUREDOSSIER;
    }

    public Double getDblAMOUNT() {
        return dblAMOUNT;
    }

    public void setDblAMOUNT(Double dblAMOUNT) {
        this.dblAMOUNT = dblAMOUNT;
    }

    public String getStrORGANISMEID() {
        return strORGANISMEID;
    }

    public void setStrORGANISMEID(String strORGANISMEID) {
        this.strORGANISMEID = strORGANISMEID;
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

    public Double getDblMONTANTATTENDU() {
        return dblMONTANTATTENDU;
    }

    public void setDblMONTANTATTENDU(Double dblMONTANTATTENDU) {
        this.dblMONTANTATTENDU = dblMONTANTATTENDU;
    }

    public Date getDtREGLEMENT() {
        return dtREGLEMENT;
    }

    public void setDtREGLEMENT(Date dtREGLEMENT) {
        this.dtREGLEMENT = dtREGLEMENT;
    }

    @XmlTransient
    public Collection<TDossierReglementDetail> getTDossierReglementDetailCollection() {
        return tDossierReglementDetailCollection;
    }

    public void setTDossierReglementDetailCollection(
            Collection<TDossierReglementDetail> tDossierReglementDetailCollection) {
        this.tDossierReglementDetailCollection = tDossierReglementDetailCollection;
    }

    public TUser getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(TUser lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    public TFacture getLgFACTUREID() {
        return lgFACTUREID;
    }

    public void setLgFACTUREID(TFacture lgFACTUREID) {
        this.lgFACTUREID = lgFACTUREID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgDOSSIERREGLEMENTID != null ? lgDOSSIERREGLEMENTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TDossierReglement)) {
            return false;
        }
        TDossierReglement other = (TDossierReglement) object;
        if ((this.lgDOSSIERREGLEMENTID == null && other.lgDOSSIERREGLEMENTID != null)
                || (this.lgDOSSIERREGLEMENTID != null
                        && !this.lgDOSSIERREGLEMENTID.equals(other.lgDOSSIERREGLEMENTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TDossierReglement[ lgDOSSIERREGLEMENTID=" + lgDOSSIERREGLEMENTID + " ]";
    }

}
