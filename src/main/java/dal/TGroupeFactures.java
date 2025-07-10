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
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.xml.bind.annotation.XmlRootElement;

/**
 *
 * @author KKOFFI
 */
@Entity
@Table(name = "t_groupe_factures")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TGroupeFactures.findAll", query = "SELECT t FROM TGroupeFactures t"),
        @NamedQuery(name = "TGroupeFactures.findById", query = "SELECT t FROM TGroupeFactures t WHERE t.id = :id"),
        @NamedQuery(name = "TGroupeFactures.findByIntAMOUNT", query = "SELECT t FROM TGroupeFactures t WHERE t.intAMOUNT = :intAMOUNT"),
        @NamedQuery(name = "TGroupeFactures.findByDtDEBUTFACTURE", query = "SELECT t FROM TGroupeFactures t WHERE t.dtDEBUTFACTURE = :dtDEBUTFACTURE"),
        @NamedQuery(name = "TGroupeFactures.findByDtFINFACTURE", query = "SELECT t FROM TGroupeFactures t WHERE t.dtFINFACTURE = :dtFINFACTURE"),
        @NamedQuery(name = "TGroupeFactures.findByIntNBDOSSIER", query = "SELECT t FROM TGroupeFactures t WHERE t.intNBDOSSIER = :intNBDOSSIER"),
        @NamedQuery(name = "TGroupeFactures.findByStrCODEFACTURE", query = "SELECT t FROM TGroupeFactures t WHERE t.strCODEFACTURE = :strCODEFACTURE"),
        @NamedQuery(name = "TGroupeFactures.findByDtCREATED", query = "SELECT t FROM TGroupeFactures t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TGroupeFactures.findByDtUPDATED", query = "SELECT t FROM TGroupeFactures t WHERE t.dtUPDATED = :dtUPDATED") })
public class TGroupeFactures implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Basic(optional = false)
    @Column(name = "ID")
    private Integer id;
    @Column(name = "int_AMOUNT")
    private Integer intAMOUNT;
    @Column(name = "dt_DEBUT_FACTURE")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtDEBUTFACTURE;
    @Column(name = "dt_FIN_FACTURE")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtFINFACTURE;
    @Column(name = "int_NB_DOSSIER")
    private Short intNBDOSSIER;
    @Column(name = "str_CODE_FACTURE")
    private String strCODEFACTURE;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @JoinColumn(name = "lg_GROUPE_ID", referencedColumnName = "lg_GROUPE_ID")
    @ManyToOne
    private TGroupeTierspayant lgGROUPEID;
    @JoinColumn(name = "lg_FACTURES_ID", referencedColumnName = "lg_FACTURE_ID")
    @ManyToOne
    private TFacture lgFACTURESID;
    @Column(name = "int_PAYE")
    private Integer intPAYE;

    public TGroupeFactures() {
    }

    public TGroupeFactures(Integer id) {
        this.id = id;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getIntAMOUNT() {
        return intAMOUNT;
    }

    public void setIntAMOUNT(Integer intAMOUNT) {
        this.intAMOUNT = intAMOUNT;
    }

    public Date getDtDEBUTFACTURE() {
        return dtDEBUTFACTURE;
    }

    public void setDtDEBUTFACTURE(Date dtDEBUTFACTURE) {
        this.dtDEBUTFACTURE = dtDEBUTFACTURE;
    }

    public Date getDtFINFACTURE() {
        return dtFINFACTURE;
    }

    public void setDtFINFACTURE(Date dtFINFACTURE) {
        this.dtFINFACTURE = dtFINFACTURE;
    }

    public Short getIntNBDOSSIER() {
        return intNBDOSSIER;
    }

    public void setIntNBDOSSIER(Short intNBDOSSIER) {
        this.intNBDOSSIER = intNBDOSSIER;
    }

    public String getStrCODEFACTURE() {
        return strCODEFACTURE;
    }

    public void setStrCODEFACTURE(String strCODEFACTURE) {
        this.strCODEFACTURE = strCODEFACTURE;
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

    public TGroupeTierspayant getLgGROUPEID() {
        return lgGROUPEID;
    }

    public void setLgGROUPEID(TGroupeTierspayant lgGROUPEID) {
        this.lgGROUPEID = lgGROUPEID;
    }

    public TFacture getLgFACTURESID() {
        return lgFACTURESID;
    }

    public void setLgFACTURESID(TFacture lgFACTURESID) {
        this.lgFACTURESID = lgFACTURESID;
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
        if (!(object instanceof TGroupeFactures)) {
            return false;
        }
        TGroupeFactures other = (TGroupeFactures) object;
        if ((this.id == null && other.id != null) || (this.id != null && !this.id.equals(other.id))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TGroupeFactures[ id=" + id + " ]";
    }

    public Integer getIntPAYE() {
        return intPAYE;
    }

    public void setIntPAYE(Integer intPAYE) {
        this.intPAYE = intPAYE;
    }
    // public int getVersion() {
    // return version;
    // }
    //
    // public void setVersion(int version) {
    // this.version = version;
    // }
    //
    //
    // @Version private int version;
}
