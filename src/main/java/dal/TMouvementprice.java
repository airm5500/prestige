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
@Table(name = "t_mouvementprice")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TMouvementprice.findAll", query = "SELECT t FROM TMouvementprice t"),
        @NamedQuery(name = "TMouvementprice.findByLgMOUVEMENTPRICEID", query = "SELECT t FROM TMouvementprice t WHERE t.lgMOUVEMENTPRICEID = :lgMOUVEMENTPRICEID"),
        @NamedQuery(name = "TMouvementprice.findByStrACTION", query = "SELECT t FROM TMouvementprice t WHERE t.strACTION = :strACTION"),
        @NamedQuery(name = "TMouvementprice.findByStrREF", query = "SELECT t FROM TMouvementprice t WHERE t.strREF = :strREF"),
        @NamedQuery(name = "TMouvementprice.findByDtDAY", query = "SELECT t FROM TMouvementprice t WHERE t.dtDAY = :dtDAY"),
        @NamedQuery(name = "TMouvementprice.findByDtCREATED", query = "SELECT t FROM TMouvementprice t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TMouvementprice.findByDtUPDATED", query = "SELECT t FROM TMouvementprice t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TMouvementprice.findByStrSTATUT", query = "SELECT t FROM TMouvementprice t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TMouvementprice.findByIntPRICEOLD", query = "SELECT t FROM TMouvementprice t WHERE t.intPRICEOLD = :intPRICEOLD"),
        @NamedQuery(name = "TMouvementprice.findByIntPRICENEW", query = "SELECT t FROM TMouvementprice t WHERE t.intPRICENEW = :intPRICENEW"),
        @NamedQuery(name = "TMouvementprice.findByIntECART", query = "SELECT t FROM TMouvementprice t WHERE t.intECART = :intECART") })
public class TMouvementprice implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_MOUVEMENTPRICE_ID", nullable = false, length = 40)
    private String lgMOUVEMENTPRICEID;
    @Basic(optional = false)
    @Column(name = "str_ACTION", nullable = false, length = 40)
    private String strACTION;
    @Basic(optional = false)
    @Column(name = "str_REF", nullable = false, length = 40)
    private String strREF;
    @Column(name = "dt_DAY")
    @Temporal(TemporalType.DATE)
    private Date dtDAY;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "int_PRICE_OLD")
    private Integer intPRICEOLD;
    @Column(name = "int_PRICE_NEW")
    private Integer intPRICENEW;
    @Column(name = "int_ECART")
    private Integer intECART;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID", nullable = false)
    @ManyToOne(optional = false)
    private TUser lgUSERID;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID")
    @ManyToOne
    private TFamille lgFAMILLEID;

    public TMouvementprice() {
    }

    public TMouvementprice(String lgMOUVEMENTPRICEID) {
        this.lgMOUVEMENTPRICEID = lgMOUVEMENTPRICEID;
    }

    public TMouvementprice(String lgMOUVEMENTPRICEID, String strACTION, String strREF) {
        this.lgMOUVEMENTPRICEID = lgMOUVEMENTPRICEID;
        this.strACTION = strACTION;
        this.strREF = strREF;
    }

    public String getLgMOUVEMENTPRICEID() {
        return lgMOUVEMENTPRICEID;
    }

    public void setLgMOUVEMENTPRICEID(String lgMOUVEMENTPRICEID) {
        this.lgMOUVEMENTPRICEID = lgMOUVEMENTPRICEID;
    }

    public String getStrACTION() {
        return strACTION;
    }

    public void setStrACTION(String strACTION) {
        this.strACTION = strACTION;
    }

    public String getStrREF() {
        return strREF;
    }

    public void setStrREF(String strREF) {
        this.strREF = strREF;
    }

    public Date getDtDAY() {
        return dtDAY;
    }

    public void setDtDAY(Date dtDAY) {
        this.dtDAY = dtDAY;
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

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public Integer getIntPRICEOLD() {
        return intPRICEOLD;
    }

    public void setIntPRICEOLD(Integer intPRICEOLD) {
        this.intPRICEOLD = intPRICEOLD;
    }

    public Integer getIntPRICENEW() {
        return intPRICENEW;
    }

    public void setIntPRICENEW(Integer intPRICENEW) {
        this.intPRICENEW = intPRICENEW;
    }

    public Integer getIntECART() {
        return intECART;
    }

    public void setIntECART(Integer intECART) {
        this.intECART = intECART;
    }

    public TUser getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(TUser lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    public TFamille getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(TFamille lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgMOUVEMENTPRICEID != null ? lgMOUVEMENTPRICEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TMouvementprice)) {
            return false;
        }
        TMouvementprice other = (TMouvementprice) object;
        if ((this.lgMOUVEMENTPRICEID == null && other.lgMOUVEMENTPRICEID != null)
                || (this.lgMOUVEMENTPRICEID != null && !this.lgMOUVEMENTPRICEID.equals(other.lgMOUVEMENTPRICEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TMouvementprice[ lgMOUVEMENTPRICEID=" + lgMOUVEMENTPRICEID + " ]";
    }

}
