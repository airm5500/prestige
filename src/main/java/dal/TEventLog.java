/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import dal.enumeration.TypeLog;
import java.io.Serializable;
import java.util.Date;
import java.util.UUID;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import toolkits.parameters.commonparameter;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_event_log")

public class TEventLog implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_EVENT_LOG_ID", nullable = false, length = 40)
    private String lgEVENTLOGID;
    @Column(name = "MATRICULE_ELEVE", length = 20)
    private String matriculeEleve;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_DESCRIPTION", length = 255)
    private String strDESCRIPTION;
    @Column(name = "str_CREATED_BY", length = 255)
    private String strCREATEDBY;
    @Column(name = "str_UPDATED_BY", length = 20)
    private String strUPDATEDBY;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "str_TABLE_CONCERN", length = 40)
    private String strTABLECONCERN;
    @Column(name = "str_MODULE_CONCERN", length = 40)
    private String strMODULECONCERN;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERID;
    @Enumerated(EnumType.ORDINAL)
    @Column(name = "typeLog")
    private TypeLog typeLog;
    @Column(name = "str_TYPE_LOG")
    private String strTYPELOG;
    @Column(name = "remote_addr")
    private String remoteAddr;
    @Column(name = "remote_host")
    private String remoteHost;

    public String getRemoteAddr() {
        return remoteAddr;
    }

    public void setRemoteAddr(String remoteAddr) {
        this.remoteAddr = remoteAddr;
    }

    public String getRemoteHost() {
        return remoteHost;
    }

    public void setRemoteHost(String remoteHost) {
        this.remoteHost = remoteHost;
    }

    public TUser getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(TUser lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    public TypeLog getTypeLog() {
        return typeLog;
    }

    public void setTypeLog(TypeLog typeLog) {
        this.typeLog = typeLog;
    }

    public TEventLog() {
    }

    public TEventLog(String lgEVENTLOGID) {
        this.lgEVENTLOGID = lgEVENTLOGID;
    }

    public String getLgEVENTLOGID() {
        return lgEVENTLOGID;
    }

    public void setLgEVENTLOGID(String lgEVENTLOGID) {
        this.lgEVENTLOGID = lgEVENTLOGID;
    }

    public String getMatriculeEleve() {
        return matriculeEleve;
    }

    public void setMatriculeEleve(String matriculeEleve) {
        this.matriculeEleve = matriculeEleve;
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

    public String getStrDESCRIPTION() {
        return strDESCRIPTION;
    }

    public void setStrDESCRIPTION(String strDESCRIPTION) {
        this.strDESCRIPTION = strDESCRIPTION;
    }

    public String getStrCREATEDBY() {
        return strCREATEDBY;
    }

    public void setStrCREATEDBY(String strCREATEDBY) {
        this.strCREATEDBY = strCREATEDBY;
    }

    public String getStrUPDATEDBY() {
        return strUPDATEDBY;
    }

    public void setStrUPDATEDBY(String strUPDATEDBY) {
        this.strUPDATEDBY = strUPDATEDBY;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public String getStrTABLECONCERN() {
        return strTABLECONCERN;
    }

    public void setStrTABLECONCERN(String strTABLECONCERN) {
        this.strTABLECONCERN = strTABLECONCERN;
    }

    public String getStrMODULECONCERN() {
        return strMODULECONCERN;
    }

    public void setStrMODULECONCERN(String strMODULECONCERN) {
        this.strMODULECONCERN = strMODULECONCERN;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgEVENTLOGID != null ? lgEVENTLOGID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TEventLog)) {
            return false;
        }
        TEventLog other = (TEventLog) object;
        if ((this.lgEVENTLOGID == null && other.lgEVENTLOGID != null)
                || (this.lgEVENTLOGID != null && !this.lgEVENTLOGID.equals(other.lgEVENTLOGID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TEventLog[ lgEVENTLOGID=" + lgEVENTLOGID + " ]";
    }

    public String getStrTYPELOG() {
        return strTYPELOG;
    }

    public void setStrTYPELOG(String strTYPELOG) {
        this.strTYPELOG = strTYPELOG;
    }

    public TEventLog build(TUser user, String ref, String desc, TypeLog typeLog, Object T) {
        this.lgUSERID = user;
        this.lgEVENTLOGID = UUID.randomUUID().toString();
        this.dtCREATED = new Date();
        this.dtUPDATED = new Date();
        this.strCREATEDBY = user.getStrLOGIN();
        this.strSTATUT = commonparameter.statut_enable;
        this.strTABLECONCERN = T.getClass().getName();
        this.typeLog = typeLog;
        this.strTYPELOG = ref;
        this.strDESCRIPTION = desc + " référence [" + ref + " ]";
        return this;
    }
}
