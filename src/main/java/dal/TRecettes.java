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
@Table(name = "t_recettes")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TRecettes.findAll", query = "SELECT t FROM TRecettes t"),
        @NamedQuery(name = "TRecettes.findByIdRecette", query = "SELECT t FROM TRecettes t WHERE t.idRecette = :idRecette"),
        @NamedQuery(name = "TRecettes.findByDtCREATED", query = "SELECT t FROM TRecettes t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TRecettes.findByStrCREATEDBY", query = "SELECT t FROM TRecettes t WHERE t.strCREATEDBY = :strCREATEDBY"),
        @NamedQuery(name = "TRecettes.findByDtUPDATED", query = "SELECT t FROM TRecettes t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TRecettes.findByStrUPDATEDBY", query = "SELECT t FROM TRecettes t WHERE t.strUPDATEDBY = :strUPDATEDBY"),
        @NamedQuery(name = "TRecettes.findByIntAMOUNT", query = "SELECT t FROM TRecettes t WHERE t.intAMOUNT = :intAMOUNT"),
        @NamedQuery(name = "TRecettes.findByStrDESCRIPTION", query = "SELECT t FROM TRecettes t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TRecettes.findByStrREFFACTURE", query = "SELECT t FROM TRecettes t WHERE t.strREFFACTURE = :strREFFACTURE") })
public class TRecettes implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "ID_RECETTE", nullable = false, length = 40)
    private String idRecette;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "str_CREATED_BY", length = 40)
    private String strCREATEDBY;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_UPDATED_BY", length = 40)
    private String strUPDATEDBY;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "int_AMOUNT", precision = 15, scale = 3)
    private Double intAMOUNT;
    @Column(name = "str_DESCRIPTION", length = 2000)
    private String strDESCRIPTION;
    @Column(name = "str_REF_FACTURE", length = 40)
    private String strREFFACTURE;
    @JoinColumn(name = "lg_TYPE_RECETTE_ID", referencedColumnName = "lg_TYPE_RECETTE_ID")
    @ManyToOne
    private TTypeRecette lgTYPERECETTEID;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERID;

    public TRecettes() {
    }

    public TRecettes(String idRecette) {
        this.idRecette = idRecette;
    }

    public String getIdRecette() {
        return idRecette;
    }

    public void setIdRecette(String idRecette) {
        this.idRecette = idRecette;
    }

    public Date getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(Date dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    public String getStrCREATEDBY() {
        return strCREATEDBY;
    }

    public void setStrCREATEDBY(String strCREATEDBY) {
        this.strCREATEDBY = strCREATEDBY;
    }

    public Date getDtUPDATED() {
        return dtUPDATED;
    }

    public void setDtUPDATED(Date dtUPDATED) {
        this.dtUPDATED = dtUPDATED;
    }

    public String getStrUPDATEDBY() {
        return strUPDATEDBY;
    }

    public void setStrUPDATEDBY(String strUPDATEDBY) {
        this.strUPDATEDBY = strUPDATEDBY;
    }

    public Double getIntAMOUNT() {
        return intAMOUNT;
    }

    public void setIntAMOUNT(Double intAMOUNT) {
        this.intAMOUNT = intAMOUNT;
    }

    public String getStrDESCRIPTION() {
        return strDESCRIPTION;
    }

    public void setStrDESCRIPTION(String strDESCRIPTION) {
        this.strDESCRIPTION = strDESCRIPTION;
    }

    public String getStrREFFACTURE() {
        return strREFFACTURE;
    }

    public void setStrREFFACTURE(String strREFFACTURE) {
        this.strREFFACTURE = strREFFACTURE;
    }

    public TTypeRecette getLgTYPERECETTEID() {
        return lgTYPERECETTEID;
    }

    public void setLgTYPERECETTEID(TTypeRecette lgTYPERECETTEID) {
        this.lgTYPERECETTEID = lgTYPERECETTEID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (idRecette != null ? idRecette.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TRecettes)) {
            return false;
        }
        TRecettes other = (TRecettes) object;
        if ((this.idRecette == null && other.idRecette != null)
                || (this.idRecette != null && !this.idRecette.equals(other.idRecette))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TRecettes[ idRecette=" + idRecette + " ]";
    }

    public TUser getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(TUser lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

}
