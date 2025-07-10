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
import javax.persistence.UniqueConstraint;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlTransient;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_menu", uniqueConstraints = { @UniqueConstraint(columnNames = { "lg_MENU_ID" }) })
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TMenu.findAll", query = "SELECT t FROM TMenu t"),
        @NamedQuery(name = "TMenu.findByLgMENUID", query = "SELECT t FROM TMenu t WHERE t.lgMENUID = :lgMENUID"),
        @NamedQuery(name = "TMenu.findByStrVALUE", query = "SELECT t FROM TMenu t WHERE t.strVALUE = :strVALUE"),
        @NamedQuery(name = "TMenu.findByStrIMAGECSS", query = "SELECT t FROM TMenu t WHERE t.strIMAGECSS = :strIMAGECSS"),
        @NamedQuery(name = "TMenu.findByStrDESCRIPTION", query = "SELECT t FROM TMenu t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TMenu.findByIntPRIORITY", query = "SELECT t FROM TMenu t WHERE t.intPRIORITY = :intPRIORITY"),
        @NamedQuery(name = "TMenu.findByStrStatus", query = "SELECT t FROM TMenu t WHERE t.strStatus = :strStatus"),
        @NamedQuery(name = "TMenu.findByPKey", query = "SELECT t FROM TMenu t WHERE t.pKey = :pKey"),
        @NamedQuery(name = "TMenu.findByDtCREATED", query = "SELECT t FROM TMenu t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TMenu.findByDtUPDATED", query = "SELECT t FROM TMenu t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TMenu.findByIconCLASS", query = "SELECT t FROM TMenu t WHERE t.iconCLASS = :iconCLASS") })
public class TMenu implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_MENU_ID", nullable = false, length = 40)
    private String lgMENUID;
    @Column(name = "str_VALUE", length = 30)
    private String strVALUE;
    @Column(name = "str_IMAGE_CSS", length = 30)
    private String strIMAGECSS;
    @Column(name = "str_DESCRIPTION", length = 200)
    private String strDESCRIPTION;
    @Column(name = "int_PRIORITY")
    private Integer intPRIORITY;
    @Column(name = "str_Status", length = 20)
    private String strStatus;
    @Column(name = "P_KEY", length = 100)
    private String pKey;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "icon_CLASS", length = 50)
    private String iconCLASS;
    @OneToMany(mappedBy = "lgMENUID")
    private Collection<TSousMenu> tSousMenuCollection;
    @JoinColumn(name = "lg_MODULE_ID", referencedColumnName = "lg_MODULE_ID")
    @ManyToOne
    private TModule lgMODULEID;

    public TMenu() {
    }

    public TMenu(String lgMENUID) {
        this.lgMENUID = lgMENUID;
    }

    public String getLgMENUID() {
        return lgMENUID;
    }

    public void setLgMENUID(String lgMENUID) {
        this.lgMENUID = lgMENUID;
    }

    public String getStrVALUE() {
        return strVALUE;
    }

    public void setStrVALUE(String strVALUE) {
        this.strVALUE = strVALUE;
    }

    public String getStrIMAGECSS() {
        return strIMAGECSS;
    }

    public void setStrIMAGECSS(String strIMAGECSS) {
        this.strIMAGECSS = strIMAGECSS;
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

    public String getIconCLASS() {
        return iconCLASS;
    }

    public void setIconCLASS(String iconCLASS) {
        this.iconCLASS = iconCLASS;
    }

    @XmlTransient
    public Collection<TSousMenu> getTSousMenuCollection() {
        return tSousMenuCollection;
    }

    public void setTSousMenuCollection(Collection<TSousMenu> tSousMenuCollection) {
        this.tSousMenuCollection = tSousMenuCollection;
    }

    public TModule getLgMODULEID() {
        return lgMODULEID;
    }

    public void setLgMODULEID(TModule lgMODULEID) {
        this.lgMODULEID = lgMODULEID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgMENUID != null ? lgMENUID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TMenu)) {
            return false;
        }
        TMenu other = (TMenu) object;
        if ((this.lgMENUID == null && other.lgMENUID != null)
                || (this.lgMENUID != null && !this.lgMENUID.equals(other.lgMENUID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TMenu[ lgMENUID=" + lgMENUID + " ]";
    }

}
