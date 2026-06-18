package dal;

import java.io.Serializable;
import java.util.Date;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.UniqueConstraint;
import javax.xml.bind.annotation.XmlRootElement;

/**
 * Classe ABC parametrable (A / B / C) servant a la classification des produits
 * par rotation commerciale et au calcul SEMOIS par classe.
 *
 * Cette entite est ajoutee dans le cadre du socle ABC (Lot 0). Elle est
 * totalement independante de l'existant : tant qu'elle n'est pas exploitee
 * (SEMOIS_ABC = 0), elle n'a aucun impact sur les calculs en place.
 */
@Entity
@Table(name = "t_classe_abc", uniqueConstraints = { @UniqueConstraint(columnNames = { "str_CODE" }) })
@XmlRootElement
@NamedQueries({
        @NamedQuery(name = "TClasseAbc.findAll", query = "SELECT t FROM TClasseAbc t"),
        @NamedQuery(name = "TClasseAbc.findByStrCODE", query = "SELECT t FROM TClasseAbc t WHERE t.strCODE = :strCODE"),
        @NamedQuery(name = "TClasseAbc.findByStrSTATUT", query = "SELECT t FROM TClasseAbc t WHERE t.strSTATUT = :strSTATUT") })
public class TClasseAbc implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @Basic(optional = false)
    @Column(name = "lg_CLASSE_ABC_ID", nullable = false, length = 40)
    private String lgCLASSEABCID;

    @Basic(optional = false)
    @Column(name = "str_CODE", nullable = false, length = 1)
    private String strCODE;

    @Basic(optional = false)
    @Column(name = "str_LIBELLE", nullable = false, length = 100)
    private String strLIBELLE;

    @Basic(optional = false)
    @Column(name = "int_Q1", nullable = false)
    private int intQ1;

    @Basic(optional = false)
    @Column(name = "int_Q2", nullable = false)
    private int intQ2;

    @Basic(optional = false)
    @Column(name = "str_UNITE_CALCUL", nullable = false, length = 20)
    private String strUNITECALCUL;

    @Basic(optional = false)
    @Column(name = "int_Q3", nullable = false)
    private int intQ3;

    @Basic(optional = false)
    @Column(name = "dbl_SEUIL_CUMUL_MIN", nullable = false, precision = 5, scale = 2)
    private Double dblSEUILCUMULMIN;

    @Basic(optional = false)
    @Column(name = "dbl_SEUIL_CUMUL_MAX", nullable = false, precision = 5, scale = 2)
    private Double dblSEUILCUMULMAX;

    @Basic(optional = false)
    @Column(name = "str_STATUT", nullable = false, length = 20)
    private String strSTATUT;

    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;

    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;

    public TClasseAbc() {
    }

    public TClasseAbc(String lgCLASSEABCID) {
        this.lgCLASSEABCID = lgCLASSEABCID;
    }

    public String getLgCLASSEABCID() {
        return lgCLASSEABCID;
    }

    public void setLgCLASSEABCID(String lgCLASSEABCID) {
        this.lgCLASSEABCID = lgCLASSEABCID;
    }

    public String getStrCODE() {
        return strCODE;
    }

    public void setStrCODE(String strCODE) {
        this.strCODE = strCODE;
    }

    public String getStrLIBELLE() {
        return strLIBELLE;
    }

    public void setStrLIBELLE(String strLIBELLE) {
        this.strLIBELLE = strLIBELLE;
    }

    public int getIntQ1() {
        return intQ1;
    }

    public void setIntQ1(int intQ1) {
        this.intQ1 = intQ1;
    }

    public int getIntQ2() {
        return intQ2;
    }

    public void setIntQ2(int intQ2) {
        this.intQ2 = intQ2;
    }

    public String getStrUNITECALCUL() {
        return strUNITECALCUL;
    }

    public void setStrUNITECALCUL(String strUNITECALCUL) {
        this.strUNITECALCUL = strUNITECALCUL;
    }

    public int getIntQ3() {
        return intQ3;
    }

    public void setIntQ3(int intQ3) {
        this.intQ3 = intQ3;
    }

    public Double getDblSEUILCUMULMIN() {
        return dblSEUILCUMULMIN;
    }

    public void setDblSEUILCUMULMIN(Double dblSEUILCUMULMIN) {
        this.dblSEUILCUMULMIN = dblSEUILCUMULMIN;
    }

    public Double getDblSEUILCUMULMAX() {
        return dblSEUILCUMULMAX;
    }

    public void setDblSEUILCUMULMAX(Double dblSEUILCUMULMAX) {
        this.dblSEUILCUMULMAX = dblSEUILCUMULMAX;
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

    @Override
    public int hashCode() {
        return (lgCLASSEABCID != null ? lgCLASSEABCID.hashCode() : 0);
    }

    @Override
    public boolean equals(Object object) {
        if (!(object instanceof TClasseAbc)) {
            return false;
        }
        TClasseAbc other = (TClasseAbc) object;
        return (this.lgCLASSEABCID != null || other.lgCLASSEABCID == null)
                && (this.lgCLASSEABCID == null || this.lgCLASSEABCID.equals(other.lgCLASSEABCID));
    }

    @Override
    public String toString() {
        return "TClasseAbc{" + "lgCLASSEABCID=" + lgCLASSEABCID + ", strCODE=" + strCODE + '}';
    }
}
