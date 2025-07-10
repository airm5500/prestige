/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package dal;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.Date;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Lob;
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
@Table(name = "t_alert_event", uniqueConstraints = { @UniqueConstraint(columnNames = { "str_Event" }) })
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TAlertEvent.findAll", query = "SELECT t FROM TAlertEvent t"),
        @NamedQuery(name = "TAlertEvent.findByDtDateEnvoi", query = "SELECT t FROM TAlertEvent t WHERE t.dtDateEnvoi = :dtDateEnvoi"),
        @NamedQuery(name = "TAlertEvent.findByIntMaxMessages", query = "SELECT t FROM TAlertEvent t WHERE t.intMaxMessages = :intMaxMessages"),
        @NamedQuery(name = "TAlertEvent.findByStrEvent", query = "SELECT t FROM TAlertEvent t WHERE t.strEvent = :strEvent"),
        @NamedQuery(name = "TAlertEvent.findByBIsCommand", query = "SELECT t FROM TAlertEvent t WHERE t.bIsCommand = :bIsCommand"),
        @NamedQuery(name = "TAlertEvent.findByDecNumPercent", query = "SELECT t FROM TAlertEvent t WHERE t.decNumPercent = :decNumPercent"),
        @NamedQuery(name = "TAlertEvent.findByBRowActive", query = "SELECT t FROM TAlertEvent t WHERE t.bRowActive = :bRowActive"),
        @NamedQuery(name = "TAlertEvent.findByLgUIDWhoNew", query = "SELECT t FROM TAlertEvent t WHERE t.lgUIDWhoNew = :lgUIDWhoNew"),
        @NamedQuery(name = "TAlertEvent.findByLgUIDWhoLastUpdate", query = "SELECT t FROM TAlertEvent t WHERE t.lgUIDWhoLastUpdate = :lgUIDWhoLastUpdate"),
        @NamedQuery(name = "TAlertEvent.findByDtLastEnterDate", query = "SELECT t FROM TAlertEvent t WHERE t.dtLastEnterDate = :dtLastEnterDate"),
        @NamedQuery(name = "TAlertEvent.findByStrERRORCODE", query = "SELECT t FROM TAlertEvent t WHERE t.strERRORCODE = :strERRORCODE"),
        @NamedQuery(name = "TAlertEvent.findByStrDESCRIPTION", query = "SELECT t FROM TAlertEvent t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TAlertEvent.findByStrFONCTION", query = "SELECT t FROM TAlertEvent t WHERE t.strFONCTION = :strFONCTION"),
        @NamedQuery(name = "TAlertEvent.findByStrTYPE", query = "SELECT t FROM TAlertEvent t WHERE t.strTYPE = :strTYPE") })
public class TAlertEvent implements Serializable {
    private static final long serialVersionUID = 1L;
    @Column(name = "dt_Date_Envoi")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtDateEnvoi;
    @Column(name = "int_Max_Messages")
    private Integer intMaxMessages;
    @Id
    @Basic(optional = false)
    @Column(name = "str_Event", nullable = false, length = 40)
    private String strEvent;
    @Column(name = "b_IsCommand")
    private Boolean bIsCommand;
    @Lob
    @Column(name = "str_SMS_English_Text", length = 65535)
    private String strSMSEnglishText;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "dec_Num_Percent", precision = 15, scale = 6)
    private BigDecimal decNumPercent;
    @Lob
    @Column(name = "str_MAIL_English_Text", length = 65535)
    private String strMAILEnglishText;
    @Column(name = "b_Row_Active")
    private Boolean bRowActive;
    @Lob
    @Column(name = "str_SMS_French_Text", length = 65535)
    private String strSMSFrenchText;
    @Column(name = "lg_UID_Who_New", length = 20)
    private String lgUIDWhoNew;
    @Column(name = "lg_UID_Who_Last_Update", length = 20)
    private String lgUIDWhoLastUpdate;
    @Lob
    @Column(name = "str_MAIL_French_Text", length = 65535)
    private String strMAILFrenchText;
    @Column(name = "dt_Last_Enter_Date")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtLastEnterDate;
    @Column(name = "str_ERROR_CODE", length = 20)
    private String strERRORCODE;
    @Column(name = "str_DESCRIPTION", length = 50)
    private String strDESCRIPTION;
    @Column(name = "str_FONCTION", length = 40)
    private String strFONCTION;
    @Column(name = "str_TYPE", length = 20)
    private String strTYPE;
    @OneToMany(mappedBy = "strEvent")
    private Collection<TAlertEventUserFone> tAlertEventUserFoneCollection;

    public TAlertEvent() {
    }

    public TAlertEvent(String strEvent) {
        this.strEvent = strEvent;
    }

    public Date getDtDateEnvoi() {
        return dtDateEnvoi;
    }

    public void setDtDateEnvoi(Date dtDateEnvoi) {
        this.dtDateEnvoi = dtDateEnvoi;
    }

    public Integer getIntMaxMessages() {
        return intMaxMessages;
    }

    public void setIntMaxMessages(Integer intMaxMessages) {
        this.intMaxMessages = intMaxMessages;
    }

    public String getStrEvent() {
        return strEvent;
    }

    public void setStrEvent(String strEvent) {
        this.strEvent = strEvent;
    }

    public Boolean getBIsCommand() {
        return bIsCommand;
    }

    public void setBIsCommand(Boolean bIsCommand) {
        this.bIsCommand = bIsCommand;
    }

    public String getStrSMSEnglishText() {
        return strSMSEnglishText;
    }

    public void setStrSMSEnglishText(String strSMSEnglishText) {
        this.strSMSEnglishText = strSMSEnglishText;
    }

    public BigDecimal getDecNumPercent() {
        return decNumPercent;
    }

    public void setDecNumPercent(BigDecimal decNumPercent) {
        this.decNumPercent = decNumPercent;
    }

    public String getStrMAILEnglishText() {
        return strMAILEnglishText;
    }

    public void setStrMAILEnglishText(String strMAILEnglishText) {
        this.strMAILEnglishText = strMAILEnglishText;
    }

    public Boolean getBRowActive() {
        return bRowActive;
    }

    public void setBRowActive(Boolean bRowActive) {
        this.bRowActive = bRowActive;
    }

    public String getStrSMSFrenchText() {
        return strSMSFrenchText;
    }

    public void setStrSMSFrenchText(String strSMSFrenchText) {
        this.strSMSFrenchText = strSMSFrenchText;
    }

    public String getLgUIDWhoNew() {
        return lgUIDWhoNew;
    }

    public void setLgUIDWhoNew(String lgUIDWhoNew) {
        this.lgUIDWhoNew = lgUIDWhoNew;
    }

    public String getLgUIDWhoLastUpdate() {
        return lgUIDWhoLastUpdate;
    }

    public void setLgUIDWhoLastUpdate(String lgUIDWhoLastUpdate) {
        this.lgUIDWhoLastUpdate = lgUIDWhoLastUpdate;
    }

    public String getStrMAILFrenchText() {
        return strMAILFrenchText;
    }

    public void setStrMAILFrenchText(String strMAILFrenchText) {
        this.strMAILFrenchText = strMAILFrenchText;
    }

    public Date getDtLastEnterDate() {
        return dtLastEnterDate;
    }

    public void setDtLastEnterDate(Date dtLastEnterDate) {
        this.dtLastEnterDate = dtLastEnterDate;
    }

    public String getStrERRORCODE() {
        return strERRORCODE;
    }

    public void setStrERRORCODE(String strERRORCODE) {
        this.strERRORCODE = strERRORCODE;
    }

    public String getStrDESCRIPTION() {
        return strDESCRIPTION;
    }

    public void setStrDESCRIPTION(String strDESCRIPTION) {
        this.strDESCRIPTION = strDESCRIPTION;
    }

    public String getStrFONCTION() {
        return strFONCTION;
    }

    public void setStrFONCTION(String strFONCTION) {
        this.strFONCTION = strFONCTION;
    }

    public String getStrTYPE() {
        return strTYPE;
    }

    public void setStrTYPE(String strTYPE) {
        this.strTYPE = strTYPE;
    }

    @XmlTransient
    public Collection<TAlertEventUserFone> getTAlertEventUserFoneCollection() {
        return tAlertEventUserFoneCollection;
    }

    public void setTAlertEventUserFoneCollection(Collection<TAlertEventUserFone> tAlertEventUserFoneCollection) {
        this.tAlertEventUserFoneCollection = tAlertEventUserFoneCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (strEvent != null ? strEvent.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TAlertEvent)) {
            return false;
        }
        TAlertEvent other = (TAlertEvent) object;
        if ((this.strEvent == null && other.strEvent != null)
                || (this.strEvent != null && !this.strEvent.equals(other.strEvent))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TAlertEvent[ strEvent=" + strEvent + " ]";
    }

}
