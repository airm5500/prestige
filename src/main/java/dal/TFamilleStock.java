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
import javax.persistence.Version;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlTransient;
import toolkits.parameters.commonparameter;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_famille_stock")
@XmlRootElement
@NamedQueries({
        @NamedQuery(name = "TFamilleStock.findFamilleStockByProduitAndEmplacement", query = "SELECT t FROM TFamilleStock t WHERE t.lgFAMILLEID.lgFAMILLEID =:lgFAMILLEID AND t.lgEMPLACEMENTID.lgEMPLACEMENTID =:lgEMPLACEMENTID AND t.strSTATUT ='enable' "),
        @NamedQuery(name = "TFamilleStock.findFamilleStockByEmplacement", query = "SELECT t FROM TFamilleStock t WHERE t.lgEMPLACEMENTID.lgEMPLACEMENTID =:lgEMPLACEMENTID "),
        @NamedQuery(name = "TFamilleStock.findStock", query = "SELECT t.intNUMBERAVAILABLE FROM TFamilleStock t WHERE t.lgFAMILLEID.lgFAMILLEID =:lgFAMILLEID AND t.lgEMPLACEMENTID.lgEMPLACEMENTID =:lgEMPLACEMENTID AND t.strSTATUT ='enable' "),
        @NamedQuery(name = "TFamilleStock.findStockUg", query = "SELECT t.intUG FROM TFamilleStock t WHERE t.lgFAMILLEID.lgFAMILLEID =:lgFAMILLEID AND t.lgEMPLACEMENTID.lgEMPLACEMENTID =:lgEMPLACEMENTID AND t.strSTATUT ='enable' ") })

public class TFamilleStock implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_FAMILLE_STOCK_ID", nullable = false, length = 40)
    private String lgFAMILLESTOCKID;

    @OneToMany(mappedBy = "lgFAMILLESTOCKID")
    private Collection<TInventaireFamille> tInventaireFamilleCollection;
    @Column(name = "int_UG")
    private Integer intUG = 0;
    @Column(name = "int_NUMBER")
    private Integer intNUMBER;
    @Column(name = "int_NUMBER_AVAILABLE")
    private Integer intNUMBERAVAILABLE;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED = new Date();
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED = new Date();
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT = commonparameter.statut_enable;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID", nullable = false)
    @ManyToOne(optional = false)
    private TFamille lgFAMILLEID;
    @JoinColumn(name = "lg_EMPLACEMENT_ID", referencedColumnName = "lg_EMPLACEMENT_ID")
    @ManyToOne
    private TEmplacement lgEMPLACEMENTID;
    @Version
    private int version;

    public int getVersion() {
        return version;
    }

    public void setVersion(int version) {
        this.version = version;
    }

    public TFamilleStock() {
    }

    public TFamilleStock(String lgFAMILLESTOCKID) {
        this.lgFAMILLESTOCKID = lgFAMILLESTOCKID;
    }

    public String getLgFAMILLESTOCKID() {
        return lgFAMILLESTOCKID;
    }

    public void setLgFAMILLESTOCKID(String lgFAMILLESTOCKID) {
        this.lgFAMILLESTOCKID = lgFAMILLESTOCKID;
    }

    public Integer getIntNUMBER() {
        return intNUMBER;
    }

    public void setIntNUMBER(Integer intNUMBER) {
        this.intNUMBER = intNUMBER;
    }

    public Integer getIntNUMBERAVAILABLE() {
        return intNUMBERAVAILABLE;
    }

    public void setIntNUMBERAVAILABLE(Integer intNUMBERAVAILABLE) {
        this.intNUMBERAVAILABLE = intNUMBERAVAILABLE;
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

    public TFamille getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(TFamille lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    public TEmplacement getLgEMPLACEMENTID() {
        return lgEMPLACEMENTID;
    }

    public void setLgEMPLACEMENTID(TEmplacement lgEMPLACEMENTID) {
        this.lgEMPLACEMENTID = lgEMPLACEMENTID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgFAMILLESTOCKID != null ? lgFAMILLESTOCKID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TFamilleStock)) {
            return false;
        }
        TFamilleStock other = (TFamilleStock) object;
        return !((this.lgFAMILLESTOCKID == null && other.lgFAMILLESTOCKID != null)
                || (this.lgFAMILLESTOCKID != null && !this.lgFAMILLESTOCKID.equals(other.lgFAMILLESTOCKID)));
    }

    @Override
    public String toString() {
        return "dal.TFamilleStock[ lgFAMILLESTOCKID=" + lgFAMILLESTOCKID + " ]";
    }

    public Integer getIntUG() {
        return intUG;
    }

    public void setIntUG(Integer intUG) {
        this.intUG = intUG;
    }

    @XmlTransient
    public Collection<TInventaireFamille> getTInventaireFamilleCollection() {
        return tInventaireFamilleCollection;
    }

    public void setTInventaireFamilleCollection(Collection<TInventaireFamille> tInventaireFamilleCollection) {
        this.tInventaireFamilleCollection = tInventaireFamilleCollection;
    }

}
