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
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.OneToMany;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlTransient;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_module")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TModule.findAll", query = "SELECT t FROM TModule t"),
        @NamedQuery(name = "TModule.findByLgMODULEID", query = "SELECT t FROM TModule t WHERE t.lgMODULEID = :lgMODULEID"),
        @NamedQuery(name = "TModule.findByStrVALUE", query = "SELECT t FROM TModule t WHERE t.strVALUE = :strVALUE"),
        @NamedQuery(name = "TModule.findByStrDESCRIPTION", query = "SELECT t FROM TModule t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TModule.findByIntPRIORITY", query = "SELECT t FROM TModule t WHERE t.intPRIORITY = :intPRIORITY"),
        @NamedQuery(name = "TModule.findByStrStatus", query = "SELECT t FROM TModule t WHERE t.strStatus = :strStatus"),
        @NamedQuery(name = "TModule.findByPKey", query = "SELECT t FROM TModule t WHERE t.pKey = :pKey"),
        @NamedQuery(name = "TModule.findByStrLink", query = "SELECT t FROM TModule t WHERE t.strLink = :strLink"),
        @NamedQuery(name = "TModule.findByStrIcone", query = "SELECT t FROM TModule t WHERE t.strIcone = :strIcone"),
        @NamedQuery(name = "TModule.findByStrIconehover", query = "SELECT t FROM TModule t WHERE t.strIconehover = :strIconehover"),
        @NamedQuery(name = "TModule.findByStrIconeout", query = "SELECT t FROM TModule t WHERE t.strIconeout = :strIconeout"),
        @NamedQuery(name = "TModule.findByStrLinkdefault", query = "SELECT t FROM TModule t WHERE t.strLinkdefault = :strLinkdefault"),
        @NamedQuery(name = "TModule.findByDtCREATED", query = "SELECT t FROM TModule t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TModule.findByDtUPDATED", query = "SELECT t FROM TModule t WHERE t.dtUPDATED = :dtUPDATED") })
public class TModule implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_MODULE_ID", nullable = false, length = 40)
    private String lgMODULEID;
    @Column(name = "str_VALUE", length = 30)
    private String strVALUE;
    @Column(name = "str_DESCRIPTION", length = 200)
    private String strDESCRIPTION;
    @Column(name = "int_PRIORITY")
    private Integer intPRIORITY;
    @Column(name = "str_Status", length = 20)
    private String strStatus;
    @Column(name = "P_KEY", length = 100)
    private String pKey;
    @Column(name = "str_Link", length = 100)
    private String strLink;
    @Column(name = "str_Icone", length = 100)
    private String strIcone;
    @Column(name = "str_Icone_hover", length = 100)
    private String strIconehover;
    @Column(name = "str_Icone_out", length = 100)
    private String strIconeout;
    @Column(name = "str_Link_default", length = 100)
    private String strLinkdefault;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @OneToMany(mappedBy = "lgMODULEID")
    private Collection<TMenu> tMenuCollection;

    public TModule() {
    }

    public TModule(String lgMODULEID) {
        this.lgMODULEID = lgMODULEID;
    }

    public String getLgMODULEID() {
        return lgMODULEID;
    }

    public void setLgMODULEID(String lgMODULEID) {
        this.lgMODULEID = lgMODULEID;
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

    public Integer getIntPRIORITY() {
        return intPRIORITY;
    }

    public void setIntPRIORITY(Integer intPRIORITY) {
        this.intPRIORITY = intPRIORITY;
    }

    public String getStrStatus() {
        return strStatus;
    }

    public void setStrStatus(String strStatus) {
        this.strStatus = strStatus;
    }

    public String getPKey() {
        return pKey;
    }

    public void setPKey(String pKey) {
        this.pKey = pKey;
    }

    public String getStrLink() {
        return strLink;
    }

    public void setStrLink(String strLink) {
        this.strLink = strLink;
    }

    public String getStrIcone() {
        return strIcone;
    }

    public void setStrIcone(String strIcone) {
        this.strIcone = strIcone;
    }

    public String getStrIconehover() {
        return strIconehover;
    }

    public void setStrIconehover(String strIconehover) {
        this.strIconehover = strIconehover;
    }

    public String getStrIconeout() {
        return strIconeout;
    }

    public void setStrIconeout(String strIconeout) {
        this.strIconeout = strIconeout;
    }

    public String getStrLinkdefault() {
        return strLinkdefault;
    }

    public void setStrLinkdefault(String strLinkdefault) {
        this.strLinkdefault = strLinkdefault;
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
    public Collection<TMenu> getTMenuCollection() {
        return tMenuCollection;
    }

    public void setTMenuCollection(Collection<TMenu> tMenuCollection) {
        this.tMenuCollection = tMenuCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgMODULEID != null ? lgMODULEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TModule)) {
            return false;
        }
        TModule other = (TModule) object;
        if ((this.lgMODULEID == null && other.lgMODULEID != null)
                || (this.lgMODULEID != null && !this.lgMODULEID.equals(other.lgMODULEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TModule[ lgMODULEID=" + lgMODULEID + " ]";
    }

}
