/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.util.List;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
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
@Table(name = "t_groupe_tierspayant")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TGroupeTierspayant.findAll", query = "SELECT t FROM TGroupeTierspayant t"),
        @NamedQuery(name = "TGroupeTierspayant.findByLgGROUPEID", query = "SELECT t FROM TGroupeTierspayant t WHERE t.lgGROUPEID = :lgGROUPEID"),
        @NamedQuery(name = "TGroupeTierspayant.findByStrLIBELLE", query = "SELECT t FROM TGroupeTierspayant t WHERE t.strLIBELLE = :strLIBELLE") })
public class TGroupeTierspayant implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Basic(optional = false)
    @Column(name = "lg_GROUPE_ID")
    private Integer lgGROUPEID;
    @Basic(optional = false)
    @Column(name = "str_LIBELLE")
    private String strLIBELLE;
    @OneToMany(mappedBy = "lgGROUPEID")
    private List<TTiersPayant> tTiersPayantList;
    @Column(name = "str_ADRESSE")
    private String strADRESSE;
    @Column(name = "str_TELEPHONE")
    private String strTELEPHONE;

    @OneToMany(mappedBy = "lgGROUPEID")
    private List<TGroupeFactures> tGroupeFacturesList;

    public TGroupeTierspayant() {
    }

    public TGroupeTierspayant(Integer lgGROUPEID) {
        this.lgGROUPEID = lgGROUPEID;
    }

    public TGroupeTierspayant(Integer lgGROUPEID, String strLIBELLE) {
        this.lgGROUPEID = lgGROUPEID;
        this.strLIBELLE = strLIBELLE;
    }

    public Integer getLgGROUPEID() {
        return lgGROUPEID;
    }

    public void setLgGROUPEID(Integer lgGROUPEID) {
        this.lgGROUPEID = lgGROUPEID;
    }

    public String getStrLIBELLE() {
        return strLIBELLE;
    }

    public void setStrLIBELLE(String strLIBELLE) {
        this.strLIBELLE = strLIBELLE;
    }

    @XmlTransient
    public List<TTiersPayant> getTTiersPayantList() {
        return tTiersPayantList;
    }

    public void setTTiersPayantList(List<TTiersPayant> tTiersPayantList) {
        this.tTiersPayantList = tTiersPayantList;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgGROUPEID != null ? lgGROUPEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TGroupeTierspayant)) {
            return false;
        }
        TGroupeTierspayant other = (TGroupeTierspayant) object;
        if ((this.lgGROUPEID == null && other.lgGROUPEID != null)
                || (this.lgGROUPEID != null && !this.lgGROUPEID.equals(other.lgGROUPEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TGroupeTierspayant[ lgGROUPEID=" + lgGROUPEID + " ]";
    }

    @XmlTransient
    public List<TGroupeFactures> getTGroupeFacturesList() {
        return tGroupeFacturesList;
    }

    public void setTGroupeFacturesList(List<TGroupeFactures> tGroupeFacturesList) {
        this.tGroupeFacturesList = tGroupeFacturesList;
    }

    public String getStrADRESSE() {
        return strADRESSE;
    }

    public void setStrADRESSE(String strADRESSE) {
        this.strADRESSE = strADRESSE;
    }

    public String getStrTELEPHONE() {
        return strTELEPHONE;
    }

    public void setStrTELEPHONE(String strTELEPHONE) {
        this.strTELEPHONE = strTELEPHONE;
    }

}
