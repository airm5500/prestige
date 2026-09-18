package dal;

import java.io.Serializable;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;

/**
 * Piece justificative jointe a une ordonnance client : image, PDF ou document numerise.
 *
 * <p>
 * Seul le CHEMIN du fichier est en base, jamais son contenu : des scans dans MariaDB, c'est une sauvegarde qui triple
 * de volume et une base qui ralentit pour tout le monde. Les fichiers vivent sous la racine de stockage que le logiciel
 * utilise deja ({@code util.StockageDisque}).
 *
 * <p>
 * La table est posee des la vague 1 pour que le schema ne bouge plus ; le depot et la consultation sont servis en vague
 * 2.
 */
@Entity
@Table(name = "t_ordonnance_client_piece")
public class TOrdonnanceClientPiece implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "lg_PIECE_ID", nullable = false, length = 40)
    private String lgPIECEID;

    @JoinColumn(name = "lg_ORDONNANCE_ID", referencedColumnName = "lg_ORDONNANCE_ID", nullable = false)
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    private TOrdonnanceClient ordonnance;

    @Column(name = "str_NOM_ORIGINE", nullable = false, length = 150)
    private String strNOMORIGINE;

    @Column(name = "str_TYPE_MIME", length = 100)
    private String strTYPEMIME;

    @Column(name = "int_TAILLE", nullable = false)
    private long intTAILLE;

    @Column(name = "str_CHEMIN", nullable = false, length = 255)
    private String strCHEMIN;

    @Column(name = "lg_USER_ID", length = 40)
    private String lgUSERID;

    @Column(name = "dt_CREATED", nullable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;

    public TOrdonnanceClientPiece() {
    }

    public String getLgPIECEID() {
        return lgPIECEID;
    }

    public void setLgPIECEID(String lgPIECEID) {
        this.lgPIECEID = lgPIECEID;
    }

    public TOrdonnanceClient getOrdonnance() {
        return ordonnance;
    }

    public void setOrdonnance(TOrdonnanceClient ordonnance) {
        this.ordonnance = ordonnance;
    }

    public String getStrNOMORIGINE() {
        return strNOMORIGINE;
    }

    public void setStrNOMORIGINE(String strNOMORIGINE) {
        this.strNOMORIGINE = strNOMORIGINE;
    }

    public String getStrTYPEMIME() {
        return strTYPEMIME;
    }

    public void setStrTYPEMIME(String strTYPEMIME) {
        this.strTYPEMIME = strTYPEMIME;
    }

    public long getIntTAILLE() {
        return intTAILLE;
    }

    public void setIntTAILLE(long intTAILLE) {
        this.intTAILLE = intTAILLE;
    }

    public String getStrCHEMIN() {
        return strCHEMIN;
    }

    public void setStrCHEMIN(String strCHEMIN) {
        this.strCHEMIN = strCHEMIN;
    }

    public String getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(String lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    public Date getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(Date dtCREATED) {
        this.dtCREATED = dtCREATED;
    }
}
