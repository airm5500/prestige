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
import javax.xml.bind.annotation.XmlRootElement;
import toolkits.utils.date;

/**
 *
 * @author JZAGO
 */
@Entity
@Table(name = "t_quinzaine")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TQuinzaine.findAll", query = "SELECT t FROM TQuinzaine t"),
        @NamedQuery(name = "TQuinzaine.findByLgQUINZAINEID", query = "SELECT t FROM TQuinzaine t WHERE t.lgQUINZAINEID = :lgQUINZAINEID"),
        @NamedQuery(name = "TQuinzaine.findByDtDATESTART", query = "SELECT t FROM TQuinzaine t WHERE t.dtDATESTART = :dtDATESTART"),
        @NamedQuery(name = "TQuinzaine.findByDtDATEEND", query = "SELECT t FROM TQuinzaine t WHERE t.dtDATEEND = :dtDATEEND") })
public class TQuinzaine implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_QUINZAINE_ID")
    private String lgQUINZAINEID;
    @Basic(optional = false)
    @Column(name = "dt_DATE_START")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtDATESTART;
    @Basic(optional = false)
    @Column(name = "dt_DATE_END")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtDATEEND;
    @JoinColumn(name = "lg_GROSSISTE_ID", referencedColumnName = "lg_GROSSISTE_ID")
    @ManyToOne(optional = false)
    private TGrossiste lgGROSSISTEID;

    public TQuinzaine() {
        // this.lgQUINZAINEID = new date().getComplexId();
    }

    public TQuinzaine(TGrossiste lgGROSSISTEID, Date dtDATESTART, Date dtDATEEND) {
        this.lgQUINZAINEID = new date().getComplexId();
        this.lgGROSSISTEID = lgGROSSISTEID;
        this.dtDATESTART = dtDATESTART;
        this.dtDATEEND = dtDATEEND;
    }

    public String getLgQUINZAINEID() {
        return lgQUINZAINEID;
    }

    public void setLgQUINZAINEID(String lgQUINZAINEID) {
        this.lgQUINZAINEID = lgQUINZAINEID;
    }

    public Date getDtDATESTART() {
        return dtDATESTART;
    }

    public void setDtDATESTART(Date dtDATESTART) {
        this.dtDATESTART = dtDATESTART;
    }

    public Date getDtDATEEND() {
        return dtDATEEND;
    }

    public void setDtDATEEND(Date dtDATEEND) {
        this.dtDATEEND = dtDATEEND;
    }

    public TGrossiste getLgGROSSISTEID() {
        return lgGROSSISTEID;
    }

    public void setLgGROSSISTEID(TGrossiste lgGROSSISTEID) {
        this.lgGROSSISTEID = lgGROSSISTEID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgQUINZAINEID != null ? lgQUINZAINEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TQuinzaine)) {
            return false;
        }
        TQuinzaine other = (TQuinzaine) object;
        if ((this.lgQUINZAINEID == null && other.lgQUINZAINEID != null)
                || (this.lgQUINZAINEID != null && !this.lgQUINZAINEID.equals(other.lgQUINZAINEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TQuinzaine[ lgQUINZAINEID=" + lgQUINZAINEID + " ]";
    }

}
