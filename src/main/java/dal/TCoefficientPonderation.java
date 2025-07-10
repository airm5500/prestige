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

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_coefficient_ponderation")
@XmlRootElement
@NamedQueries({
        @NamedQuery(name = "TCoefficientPonderation.findAll", query = "SELECT t FROM TCoefficientPonderation t"),
        @NamedQuery(name = "TCoefficientPonderation.findByLgCOEFFICIENTPONDERATIONID", query = "SELECT t FROM TCoefficientPonderation t WHERE t.lgCOEFFICIENTPONDERATIONID = :lgCOEFFICIENTPONDERATIONID"),
        @NamedQuery(name = "TCoefficientPonderation.findByIntCOEFFICIENTPONDERATION", query = "SELECT t FROM TCoefficientPonderation t WHERE t.intCOEFFICIENTPONDERATION = :intCOEFFICIENTPONDERATION"),
        @NamedQuery(name = "TCoefficientPonderation.findByIntINDICEMONTH", query = "SELECT t FROM TCoefficientPonderation t WHERE t.intINDICEMONTH = :intINDICEMONTH"),
        @NamedQuery(name = "TCoefficientPonderation.findByStrSTATUT", query = "SELECT t FROM TCoefficientPonderation t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TCoefficientPonderation.findByDtCREATED", query = "SELECT t FROM TCoefficientPonderation t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TCoefficientPonderation.findByDtUPDATED", query = "SELECT t FROM TCoefficientPonderation t WHERE t.dtUPDATED = :dtUPDATED") })
public class TCoefficientPonderation implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_COEFFICIENT_PONDERATION_ID", nullable = false, length = 40)
    private String lgCOEFFICIENTPONDERATIONID;
    @Column(name = "int_COEFFICIENT_PONDERATION")
    private Integer intCOEFFICIENTPONDERATION;
    @Column(name = "int_INDICE_MONTH")
    private Integer intINDICEMONTH;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @JoinColumn(name = "lg_CODE_GESTION_ID", referencedColumnName = "lg_CODE_GESTION_ID")
    @ManyToOne
    private TCodeGestion lgCODEGESTIONID;

    public TCoefficientPonderation() {
    }

    public TCoefficientPonderation(String lgCOEFFICIENTPONDERATIONID) {
        this.lgCOEFFICIENTPONDERATIONID = lgCOEFFICIENTPONDERATIONID;
    }

    public String getLgCOEFFICIENTPONDERATIONID() {
        return lgCOEFFICIENTPONDERATIONID;
    }

    public void setLgCOEFFICIENTPONDERATIONID(String lgCOEFFICIENTPONDERATIONID) {
        this.lgCOEFFICIENTPONDERATIONID = lgCOEFFICIENTPONDERATIONID;
    }

    public Integer getIntCOEFFICIENTPONDERATION() {
        return intCOEFFICIENTPONDERATION;
    }

    public void setIntCOEFFICIENTPONDERATION(Integer intCOEFFICIENTPONDERATION) {
        this.intCOEFFICIENTPONDERATION = intCOEFFICIENTPONDERATION;
    }

    public Integer getIntINDICEMONTH() {
        return intINDICEMONTH;
    }

    public void setIntINDICEMONTH(Integer intINDICEMONTH) {
        this.intINDICEMONTH = intINDICEMONTH;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
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

    public TCodeGestion getLgCODEGESTIONID() {
        return lgCODEGESTIONID;
    }

    public void setLgCODEGESTIONID(TCodeGestion lgCODEGESTIONID) {
        this.lgCODEGESTIONID = lgCODEGESTIONID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgCOEFFICIENTPONDERATIONID != null ? lgCOEFFICIENTPONDERATIONID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TCoefficientPonderation)) {
            return false;
        }
        TCoefficientPonderation other = (TCoefficientPonderation) object;
        if ((this.lgCOEFFICIENTPONDERATIONID == null && other.lgCOEFFICIENTPONDERATIONID != null)
                || (this.lgCOEFFICIENTPONDERATIONID != null
                        && !this.lgCOEFFICIENTPONDERATIONID.equals(other.lgCOEFFICIENTPONDERATIONID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TCoefficientPonderation[ lgCOEFFICIENTPONDERATIONID=" + lgCOEFFICIENTPONDERATIONID + " ]";
    }

}
