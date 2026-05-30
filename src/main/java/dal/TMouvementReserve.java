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
 * Historique des mouvements de reserve (assort / reassort / destockage).
 * Chaque operation rayon&lt;-&gt;reserve y laisse une trace auditable.
 */
@Entity
@Table(name = "t_mouvement_reserve")
@XmlRootElement
@NamedQueries({
        @NamedQuery(name = "TMouvementReserve.findAll", query = "SELECT t FROM TMouvementReserve t"),
        @NamedQuery(name = "TMouvementReserve.findByFamille", query = "SELECT t FROM TMouvementReserve t WHERE t.lgFAMILLEID.lgFAMILLEID = :lgFAMILLEID ORDER BY t.dtCREATED DESC") })
public class TMouvementReserve implements Serializable {

    public static final String TYPE_ASSORT = "ASSORT";
    public static final String TYPE_REASSORT = "REASSORT";
    public static final String TYPE_DESTOCKAGE = "DESTOCKAGE";

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_MOUVEMENT_ID", nullable = false, length = 40)
    private String lgMOUVEMENTID;

    @Column(name = "str_TYPE", length = 20)
    private String strTYPE;

    @Column(name = "int_QTE")
    private Integer intQTE;

    @Column(name = "int_STOCK_RAYON_AVANT")
    private Integer intSTOCKRAYONAVANT;

    @Column(name = "int_STOCK_RESERVE_AVANT")
    private Integer intSTOCKRESERVEAVANT;

    @Column(name = "int_STOCK_RAYON_APRES")
    private Integer intSTOCKRAYONAPRES;

    @Column(name = "int_STOCK_RESERVE_APRES")
    private Integer intSTOCKRESERVEAPRES;

    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED = new Date();

    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID")
    @ManyToOne
    private TFamille lgFAMILLEID;

    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERID;

    @JoinColumn(name = "lg_EMPLACEMENT_ID", referencedColumnName = "lg_EMPLACEMENT_ID")
    @ManyToOne
    private TEmplacement lgEMPLACEMENTID;

    public TMouvementReserve() {
    }

    public TMouvementReserve(String lgMOUVEMENTID) {
        this.lgMOUVEMENTID = lgMOUVEMENTID;
    }

    public String getLgMOUVEMENTID() {
        return lgMOUVEMENTID;
    }

    public void setLgMOUVEMENTID(String lgMOUVEMENTID) {
        this.lgMOUVEMENTID = lgMOUVEMENTID;
    }

    public String getStrTYPE() {
        return strTYPE;
    }

    public void setStrTYPE(String strTYPE) {
        this.strTYPE = strTYPE;
    }

    public Integer getIntQTE() {
        return intQTE;
    }

    public void setIntQTE(Integer intQTE) {
        this.intQTE = intQTE;
    }

    public Integer getIntSTOCKRAYONAVANT() {
        return intSTOCKRAYONAVANT;
    }

    public void setIntSTOCKRAYONAVANT(Integer intSTOCKRAYONAVANT) {
        this.intSTOCKRAYONAVANT = intSTOCKRAYONAVANT;
    }

    public Integer getIntSTOCKRESERVEAVANT() {
        return intSTOCKRESERVEAVANT;
    }

    public void setIntSTOCKRESERVEAVANT(Integer intSTOCKRESERVEAVANT) {
        this.intSTOCKRESERVEAVANT = intSTOCKRESERVEAVANT;
    }

    public Integer getIntSTOCKRAYONAPRES() {
        return intSTOCKRAYONAPRES;
    }

    public void setIntSTOCKRAYONAPRES(Integer intSTOCKRAYONAPRES) {
        this.intSTOCKRAYONAPRES = intSTOCKRAYONAPRES;
    }

    public Integer getIntSTOCKRESERVEAPRES() {
        return intSTOCKRESERVEAPRES;
    }

    public void setIntSTOCKRESERVEAPRES(Integer intSTOCKRESERVEAPRES) {
        this.intSTOCKRESERVEAPRES = intSTOCKRESERVEAPRES;
    }

    public Date getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(Date dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    public TFamille getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(TFamille lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    public TUser getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(TUser lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    public TEmplacement getLgEMPLACEMENTID() {
        return lgEMPLACEMENTID;
    }

    public void setLgEMPLACEMENTID(TEmplacement lgEMPLACEMENTID) {
        this.lgEMPLACEMENTID = lgEMPLACEMENTID;
    }

    @Override
    public int hashCode() {
        return (lgMOUVEMENTID != null ? lgMOUVEMENTID.hashCode() : 0);
    }

    @Override
    public boolean equals(Object object) {
        if (!(object instanceof TMouvementReserve)) {
            return false;
        }
        TMouvementReserve other = (TMouvementReserve) object;
        return !((this.lgMOUVEMENTID == null && other.lgMOUVEMENTID != null)
                || (this.lgMOUVEMENTID != null && !this.lgMOUVEMENTID.equals(other.lgMOUVEMENTID)));
    }

    @Override
    public String toString() {
        return "dal.TMouvementReserve[ lgMOUVEMENTID=" + lgMOUVEMENTID + " ]";
    }
}
