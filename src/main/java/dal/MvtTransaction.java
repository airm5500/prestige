/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import dal.enumeration.CategoryTransaction;
import dal.enumeration.TypeTransaction;
import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.xml.bind.annotation.XmlRootElement;

/**
 *
 * @author Kobena
 */
@Entity
@Table(name = "MvtTransaction", indexes = { @Index(name = "indexMvtTranstionmvdate", columnList = "mvtdate"),
        @Index(name = "indexMvtTranstype", columnList = "typeTransaction"),
        @Index(name = "indexMvtpkey", columnList = "pkey"), @Index(name = "indexMvtchecked", columnList = "checked"),
        @Index(name = "indexMvtcategorie", columnList = "categorie"),
        @Index(name = "indexMvtRef", columnList = "reference")

})
@XmlRootElement
public class MvtTransaction implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "uuid", nullable = false, length = 100)
    private String uuid = UUID.randomUUID().toString();
    private Integer montant = 0;
    private Integer montantRestant = 0;
    private Integer montantRegle = 0;
    private Integer montantCredit = 0;
    private Integer montantVerse = 0;
    @Column(name = "montantNet")
    private Integer montantNet = 0;
    @Column(name = "montantRemise")
    private Integer montantRemise = 0;
    @Column(name = "montantPaye")
    private Integer montantPaye = 0;// arrondi de la caisse
    @Column(name = "avoidAmount")
    private Integer avoidAmount = 0;
    @Column(name = "montantAcc")
    private Integer montantAcc = 0;
    @Column(name = "checked")
    private Boolean checked = true;
    @Column(name = "mvtdate", nullable = false)
    private LocalDate mvtDate = LocalDate.now();
    @Column(name = "createdAt", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID", nullable = false)
    @ManyToOne
    private TUser user;
    @JoinColumn(name = "lg_EMPLACEMENT_ID", referencedColumnName = "lg_EMPLACEMENT_ID", nullable = false)
    @ManyToOne
    private TEmplacement magasin;
    @JoinColumn(name = "typeReglementId", referencedColumnName = "lg_TYPE_REGLEMENT_ID", nullable = true)
    @ManyToOne
    private TTypeReglement reglement;
    @JoinColumn(name = "grossisteId", referencedColumnName = "lg_GROSSISTE_ID", nullable = true)
    @ManyToOne
    private TGrossiste grossiste;
    @JoinColumn(name = "typeMvtCaisseId", referencedColumnName = "lg_TYPE_MVT_CAISSE_ID", nullable = true)
    @ManyToOne
    private TTypeMvtCaisse tTypeMvtCaisse;
    @Enumerated(EnumType.ORDINAL)
    @Column(name = "typeTransaction", nullable = false)
    private TypeTransaction typeTransaction;
    @Enumerated(EnumType.ORDINAL)
    @Column(name = "categorie", nullable = false)
    private CategoryTransaction categoryTransaction;
    @Column(name = "pkey", nullable = false, length = 100)
    private String pkey;
    @Column(name = "reference", nullable = false, length = 100)
    private String reference;
    @JoinColumn(name = "caisse", referencedColumnName = "lg_USER_ID", nullable = false)
    @ManyToOne
    private TUser caisse;
    @Column(name = "montantTva")
    private Integer montantTva = 0;
    @Column(name = "marge")
    private Integer marge = 0;
    @Column(name = "organisme", length = 100)
    private String organisme;
    @Column(name = "margeug")
    private Integer margeug = 0;
    @Column(name = "montantttcug")
    private Integer montantttcug = 0;
    @Column(name = "montantnetug")
    private Integer montantnetug = 0;
    @Column(name = "montanttvaug")
    private Integer montantTvaUg = 0;
    @JoinColumn(name = "vente_id", referencedColumnName = "lg_PREENREGISTREMENT_ID")
    @ManyToOne
    private TPreenregistrement preenregistrement;
    @Column(name = "flag")
    private Boolean flaged = Boolean.FALSE;
    @ManyToOne
    private Flag flag;

    public TPreenregistrement getPreenregistrement() {
        return preenregistrement;
    }

    public void setPreenregistrement(TPreenregistrement preenregistrement) {
        this.preenregistrement = preenregistrement;
    }

    public String getOrganisme() {
        return organisme;
    }

    public void setOrganisme(String organisme) {
        this.organisme = organisme;
    }

    public TUser getCaisse() {
        return caisse;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

    public Integer getMontantTva() {
        return montantTva;
    }

    public Integer getMarge() {
        return marge;
    }

    public void setMarge(Integer marge) {
        this.marge = marge;
    }

    public void setMontantTva(Integer montantTva) {
        this.montantTva = montantTva;
    }

    public Integer getMontantPaye() {
        return montantPaye;
    }

    public void setMontantPaye(Integer montantPaye) {
        this.montantPaye = montantPaye;
    }

    public void setCaisse(TUser caisse) {
        this.caisse = caisse;
    }

    public Boolean getChecked() {
        return checked;
    }

    public void setChecked(Boolean checked) {
        this.checked = checked;
    }

    public Integer getAvoidAmount() {
        return avoidAmount;
    }

    public void setAvoidAmount(Integer avoidAmount) {
        this.avoidAmount = avoidAmount;
    }

    public Integer getMontantVerse() {
        return montantVerse;
    }

    public void setMontantVerse(Integer montantVerse) {
        this.montantVerse = montantVerse;
    }

    public String getUuid() {
        return uuid;
    }

    public CategoryTransaction getCategoryTransaction() {
        return categoryTransaction;
    }

    public void setCategoryTransaction(CategoryTransaction categoryTransaction) {
        this.categoryTransaction = categoryTransaction;
    }

    public void setUuid(String uuid) {
        this.uuid = uuid;
    }

    public Integer getMontant() {
        return montant;
    }

    public void setMontant(Integer montant) {
        this.montant = montant;
    }

    public Integer getMontantNet() {
        return montantNet;
    }

    public void setMontantNet(Integer montantNet) {
        this.montantNet = montantNet;
    }

    public Integer getMontantRemise() {
        return montantRemise;
    }

    public void setMontantRemise(Integer montantRemise) {
        this.montantRemise = montantRemise;
    }

    public Integer getMontantRestant() {
        return montantRestant;
    }

    public void setMontantRestant(Integer montantRestant) {
        this.montantRestant = montantRestant;
    }

    public Integer getMontantRegle() {
        return montantRegle;
    }

    public void setMontantRegle(Integer montantRegle) {
        this.montantRegle = montantRegle;
    }

    public Integer getMontantCredit() {
        return montantCredit;
    }

    public void setMontantCredit(Integer montantCredit) {
        this.montantCredit = montantCredit;
    }

    public LocalDate getMvtDate() {
        return mvtDate;
    }

    public void setMvtDate(LocalDate mvtDate) {
        this.mvtDate = mvtDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getPkey() {
        return pkey;
    }

    public void setPkey(String pkey) {
        this.pkey = pkey;
    }

    public TUser getUser() {
        return user;
    }

    public void setUser(TUser user) {
        this.user = user;
    }

    public TEmplacement getMagasin() {
        return magasin;
    }

    public void setMagasin(TEmplacement magasin) {
        this.magasin = magasin;
    }

    public TTypeReglement getReglement() {
        return reglement;
    }

    public void setReglement(TTypeReglement reglement) {
        this.reglement = reglement;
    }

    public TGrossiste getGrossiste() {
        return grossiste;
    }

    public void setGrossiste(TGrossiste grossiste) {
        this.grossiste = grossiste;
    }

    public TTypeMvtCaisse gettTypeMvtCaisse() {
        return tTypeMvtCaisse;
    }

    public Integer getMontantAcc() {
        return montantAcc;
    }

    public void setMontantAcc(Integer montantAcc) {
        this.montantAcc = montantAcc;
    }

    public void settTypeMvtCaisse(TTypeMvtCaisse tTypeMvtCaisse) {
        this.tTypeMvtCaisse = tTypeMvtCaisse;
    }

    public TypeTransaction getTypeTransaction() {
        return typeTransaction;
    }

    public void setTypeTransaction(TypeTransaction typeTransaction) {
        this.typeTransaction = typeTransaction;
    }

    public MvtTransaction() {
    }

    @Override
    public int hashCode() {
        int hash = 7;
        hash = 23 * hash + Objects.hashCode(this.uuid);
        return hash;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (getClass() != obj.getClass()) {
            return false;
        }
        final MvtTransaction other = (MvtTransaction) obj;
        return Objects.equals(this.uuid, other.uuid);
    }

    @Override
    public String toString() {
        return "MvtTransaction{" + "uuid=" + uuid + ", montant=" + montant + ", montantRestant=" + montantRestant
                + ", montantRegle=" + montantRegle + ", montantCredit=" + montantCredit + ", montantVerse="
                + montantVerse + ", montantNet=" + montantNet + ", montantRemise=" + montantRemise + ", montantPaye="
                + montantPaye + ", avoidAmount=" + avoidAmount + ", checked=" + checked + ", mvtDate=" + mvtDate
                + ", createdAt=" + createdAt + ", user=" + user + ", magasin=" + magasin + ", reglement=" + reglement
                + ", grossiste=" + grossiste + ", tTypeMvtCaisse=" + tTypeMvtCaisse + ", typeTransaction="
                + typeTransaction + ", categoryTransaction=" + categoryTransaction + ", pkey=" + pkey + ", reference="
                + reference + ", caisse=" + caisse + ", montantTva=" + montantTva + ", marge=" + marge + ", organisme="
                + organisme + '}';
    }

    public Integer getMargeug() {
        return margeug;
    }

    public void setMargeug(Integer margeug) {
        this.margeug = margeug;
    }

    public Integer getMontantttcug() {
        return montantttcug;
    }

    public void setMontantttcug(Integer montantttcug) {
        this.montantttcug = montantttcug;
    }

    public Integer getMontantnetug() {
        return montantnetug;
    }

    public void setMontantnetug(Integer montantnetug) {
        this.montantnetug = montantnetug;
    }

    public Integer getMontantTvaUg() {
        return montantTvaUg;
    }

    public void setMontantTvaUg(Integer montantTvaUg) {
        this.montantTvaUg = montantTvaUg;
    }

    public Boolean getFlaged() {
        return flaged;
    }

    public void setFlaged(Boolean flaged) {
        this.flaged = flaged;
    }

    public Flag getFlag() {
        return flag;
    }

    public void setFlag(Flag flag) {
        this.flag = flag;
    }

}
