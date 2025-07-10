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
import javax.persistence.Lob;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.xml.bind.annotation.XmlRootElement;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_inboud_message")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TInboudMessage.findAll", query = "SELECT t FROM TInboudMessage t"),
        @NamedQuery(name = "TInboudMessage.findByLgINBOUNDMESSAGEID", query = "SELECT t FROM TInboudMessage t WHERE t.lgINBOUNDMESSAGEID = :lgINBOUNDMESSAGEID"),
        @NamedQuery(name = "TInboudMessage.findByDtCREATED", query = "SELECT t FROM TInboudMessage t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TInboudMessage.findByDtUPDATED", query = "SELECT t FROM TInboudMessage t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TInboudMessage.findByStrSTATUT", query = "SELECT t FROM TInboudMessage t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TInboudMessage.findByStrPHONE", query = "SELECT t FROM TInboudMessage t WHERE t.strPHONE = :strPHONE") })
public class TInboudMessage implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_INBOUND_MESSAGE_ID", nullable = false)
    private String lgINBOUNDMESSAGEID;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Basic(optional = false)
    @Column(name = "str_MESSAGE", nullable = false)
    private String strMESSAGE;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "str_PHONE", length = 20)
    private String strPHONE;

    public TInboudMessage() {
    }

    public TInboudMessage(String lgINBOUNDMESSAGEID) {
        this.lgINBOUNDMESSAGEID = lgINBOUNDMESSAGEID;
    }

    public TInboudMessage(String lgINBOUNDMESSAGEID, String strMESSAGE) {
        this.lgINBOUNDMESSAGEID = lgINBOUNDMESSAGEID;
        this.strMESSAGE = strMESSAGE;
    }

    public String getLgINBOUNDMESSAGEID() {
        return lgINBOUNDMESSAGEID;
    }

    public void setLgINBOUNDMESSAGEID(String lgINBOUNDMESSAGEID) {
        this.lgINBOUNDMESSAGEID = lgINBOUNDMESSAGEID;
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

    public String getStrMESSAGE() {
        return strMESSAGE;
    }

    public void setStrMESSAGE(String strMESSAGE) {
        this.strMESSAGE = strMESSAGE;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public String getStrPHONE() {
        return strPHONE;
    }

    public void setStrPHONE(String strPHONE) {
        this.strPHONE = strPHONE;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgINBOUNDMESSAGEID != null ? lgINBOUNDMESSAGEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TInboudMessage)) {
            return false;
        }
        TInboudMessage other = (TInboudMessage) object;
        if ((this.lgINBOUNDMESSAGEID == null && other.lgINBOUNDMESSAGEID != null)
                || (this.lgINBOUNDMESSAGEID != null && !this.lgINBOUNDMESSAGEID.equals(other.lgINBOUNDMESSAGEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TInboudMessage[ lgINBOUNDMESSAGEID=" + lgINBOUNDMESSAGEID + " ]";
    }

}
