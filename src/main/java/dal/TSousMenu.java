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
@Table(name = "t_sous_menu", uniqueConstraints = { @UniqueConstraint(columnNames = { "lg_SOUS_MENU_ID" }) })
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TSousMenu.findAll", query = "SELECT t FROM TSousMenu t"),
        @NamedQuery(name = "TSousMenu.findByLgSOUSMENUID", query = "SELECT t FROM TSousMenu t WHERE t.lgSOUSMENUID = :lgSOUSMENUID"),
        @NamedQuery(name = "TSousMenu.findByStrVALUE", query = "SELECT t FROM TSousMenu t WHERE t.strVALUE = :strVALUE"),
        @NamedQuery(name = "TSousMenu.findByStrIMAGECSS", query = "SELECT t FROM TSousMenu t WHERE t.strIMAGECSS = :strIMAGECSS"),
        @NamedQuery(name = "TSousMenu.findByStrDESCRIPTION", query = "SELECT t FROM TSousMenu t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TSousMenu.findByStrCOMPOSANT", query = "SELECT t FROM TSousMenu t WHERE t.strCOMPOSANT = :strCOMPOSANT"),
        @NamedQuery(name = "TSousMenu.findByIntPRIORITY", query = "SELECT t FROM TSousMenu t WHERE t.intPRIORITY = :intPRIORITY"),
        @NamedQuery(name = "TSousMenu.findByStrURL", query = "SELECT t FROM TSousMenu t WHERE t.strURL = :strURL"),
        @NamedQuery(name = "TSousMenu.findByStrStatus", query = "SELECT t FROM TSousMenu t WHERE t.strStatus = :strStatus"),
        @NamedQuery(name = "TSousMenu.findByPKey", query = "SELECT t FROM TSousMenu t WHERE t.pKey = :pKey"),
        @NamedQuery(name = "TSousMenu.findByDtCREATED", query = "SELECT t FROM TSousMenu t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TSousMenu.findByDtUPDATED", query = "SELECT t FROM TSousMenu t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TSousMenu.findByIconCLASS", query = "SELECT t FROM TSousMenu t WHERE t.iconCLASS = :iconCLASS") })
public class TSousMenu implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_SOUS_MENU_ID", nullable = false, length = 40)
    private String lgSOUSMENUID;
    @Column(name = "str_VALUE", length = 35)
    private String strVALUE;
    @Column(name = "str_IMAGE_CSS", length = 30)
    private String strIMAGECSS;
    @Column(name = "str_DESCRIPTION", length = 200)
    private String strDESCRIPTION;
    @Basic(optional = false)
    @Column(name = "str_COMPOSANT", nullable = false, length = 40)
    private String strCOMPOSANT;
    @Column(name = "int_PRIORITY")
    private Integer intPRIORITY;
    @Column(name = "str_URL", length = 50)
    private String strURL;
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
    @JoinColumn(name = "lg_MENU_ID", referencedColumnName = "lg_MENU_ID")
    @ManyToOne
    private TMenu lgMENUID;

    public TSousMenu() {
    }

    public TSousMenu(String lgSOUSMENUID) {
        this.lgSOUSMENUID = lgSOUSMENUID;
    }

    public TSousMenu(String lgSOUSMENUID, String strCOMPOSANT) {
        this.lgSOUSMENUID = lgSOUSMENUID;
        this.strCOMPOSANT = strCOMPOSANT;
    }

    public String getLgSOUSMENUID() {
        return lgSOUSMENUID;
    }

    public void setLgSOUSMENUID(String lgSOUSMENUID) {
        this.lgSOUSMENUID = lgSOUSMENUID;
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

    public String getStrCOMPOSANT() {
        return strCOMPOSANT;
    }

    public void setStrCOMPOSANT(String strCOMPOSANT) {
        this.strCOMPOSANT = strCOMPOSANT;
    }

    public Integer getIntPRIORITY() {
        return intPRIORITY;
    }

    public void setIntPRIORITY(Integer intPRIORITY) {
        this.intPRIORITY = intPRIORITY;
    }

    public String getStrURL() {
        return strURL;
    }

    public void setStrURL(String strURL) {
        this.strURL = strURL;
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

    public TMenu getLgMENUID() {
        return lgMENUID;
    }

    public void setLgMENUID(TMenu lgMENUID) {
        this.lgMENUID = lgMENUID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgSOUSMENUID != null ? lgSOUSMENUID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TSousMenu)) {
            return false;
        }
        TSousMenu other = (TSousMenu) object;
        if ((this.lgSOUSMENUID == null && other.lgSOUSMENUID != null)
                || (this.lgSOUSMENUID != null && !this.lgSOUSMENUID.equals(other.lgSOUSMENUID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TSousMenu[ lgSOUSMENUID=" + lgSOUSMENUID + " ]";
    }

}
