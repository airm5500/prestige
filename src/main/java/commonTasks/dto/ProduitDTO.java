/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import java.io.Serializable;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 *
 * @author koben
 */
public class ProduitDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private String libelle;
    private int itemQuantity;
    private Integer quantity = 0;
    private Integer costAmount;
    private Integer regularUnitPrice;
    private Integer netUnitPrice;
    private Instant createdAt;
    private Instant updatedAt;
    private Integer itemQty = 1;
    private Integer itemCostAmount = 0;
    private Integer itemRegularUnitPrice = 0;
    private Long produitId;
    private String produitLibelle;
    private List<ProduitDTO> produits = new ArrayList<>();
    private Instant lastDateOfSale;
    private Instant lastOrderDate;
    private Instant lastInventoryDate;
    private Integer prixMnp = 0;
    public String codeCip;
    private Long parentId;
    private String parentLibelle;
    private Long laboratoireId;
    private String laboratoireLibelle;
    private Long formeId;
    private String formeLibelle;
    private Long typeEtyquetteId;
    private String typeEtyquetteLibelle;
    private Long familleId;
    private String familleLibelle;
    private Long gammeId;
    private String gammeLibelle;
    private Integer tvaTaux;
    private Set<FournisseurProduitDTO> fournisseurProduits = new HashSet<>();
    private FournisseurProduitDTO fournisseurProduit;
    private String qtyStatus;
    private Integer qtyAppro = 0;
    private Integer qtySeuilMini = 0;
    private Boolean dateperemption = false;
    private Boolean chiffre = true;
    private int totalQuantity;
    private int qtyUG;
    private Boolean deconditionnable = false;
    private String codeEan;
    private String rayonLibelle;
    private Long remiseId;
    private int qtyReserve;
    private LocalDate perimeAt;
    private int status;
    private int typeProduit;

    public int getQtyUG() {
        return qtyUG;
    }

    public void setQtyUG(int qtyUG) {
        this.qtyUG = qtyUG;
    }

    public int getTypeProduit() {
        return typeProduit;
    }

    public void setTypeProduit(int typeProduit) {
        this.typeProduit = typeProduit;
    }

    public int getStatus() {
        return status;
    }

    public void setStatus(int status) {
        this.status = status;
    }

    public String getLibelle() {
        return libelle;
    }

    public String getRayonLibelle() {
        return rayonLibelle;
    }

    public void setRayonLibelle(String rayonLibelle) {
        this.rayonLibelle = rayonLibelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public int getItemQuantity() {
        return itemQuantity;
    }

    public void setItemQuantity(int itemQuantity) {
        this.itemQuantity = itemQuantity;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public Integer getCostAmount() {
        return costAmount;
    }

    public void setCostAmount(Integer costAmount) {
        this.costAmount = costAmount;
    }

    public Integer getRegularUnitPrice() {
        return regularUnitPrice;
    }

    public void setRegularUnitPrice(Integer regularUnitPrice) {
        this.regularUnitPrice = regularUnitPrice;
    }

    public Integer getNetUnitPrice() {
        return netUnitPrice;
    }

    public void setNetUnitPrice(Integer netUnitPrice) {
        this.netUnitPrice = netUnitPrice;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Integer getItemQty() {
        return itemQty;
    }

    public void setItemQty(Integer itemQty) {
        this.itemQty = itemQty;
    }

    public Integer getItemCostAmount() {
        return itemCostAmount;
    }

    public void setItemCostAmount(Integer itemCostAmount) {
        this.itemCostAmount = itemCostAmount;
    }

    public Integer getItemRegularUnitPrice() {
        return itemRegularUnitPrice;
    }

    public void setItemRegularUnitPrice(Integer itemRegularUnitPrice) {
        this.itemRegularUnitPrice = itemRegularUnitPrice;
    }

    public Long getProduitId() {
        return produitId;
    }

    public void setProduitId(Long produitId) {
        this.produitId = produitId;
    }

    public String getProduitLibelle() {
        return produitLibelle;
    }

    public void setProduitLibelle(String produitLibelle) {
        this.produitLibelle = produitLibelle;
    }

    public List<ProduitDTO> getProduits() {
        return produits;
    }

    public void setProduits(List<ProduitDTO> produits) {
        this.produits = produits;
    }

    public Instant getLastDateOfSale() {
        return lastDateOfSale;
    }

    public void setLastDateOfSale(Instant lastDateOfSale) {
        this.lastDateOfSale = lastDateOfSale;
    }

    public Instant getLastOrderDate() {
        return lastOrderDate;
    }

    public void setLastOrderDate(Instant lastOrderDate) {
        this.lastOrderDate = lastOrderDate;
    }

    public Instant getLastInventoryDate() {
        return lastInventoryDate;
    }

    public void setLastInventoryDate(Instant lastInventoryDate) {
        this.lastInventoryDate = lastInventoryDate;
    }

    public Integer getPrixMnp() {
        return prixMnp;
    }

    public void setPrixMnp(Integer prixMnp) {
        this.prixMnp = prixMnp;
    }

    public String getCodeCip() {
        return codeCip;
    }

    public void setCodeCip(String codeCip) {
        this.codeCip = codeCip;
    }

    public Long getParentId() {
        return parentId;
    }

    public void setParentId(Long parentId) {
        this.parentId = parentId;
    }

    public String getParentLibelle() {
        return parentLibelle;
    }

    public void setParentLibelle(String parentLibelle) {
        this.parentLibelle = parentLibelle;
    }

    public Long getLaboratoireId() {
        return laboratoireId;
    }

    public void setLaboratoireId(Long laboratoireId) {
        this.laboratoireId = laboratoireId;
    }

    public String getLaboratoireLibelle() {
        return laboratoireLibelle;
    }

    public void setLaboratoireLibelle(String laboratoireLibelle) {
        this.laboratoireLibelle = laboratoireLibelle;
    }

    public Long getFormeId() {
        return formeId;
    }

    public void setFormeId(Long formeId) {
        this.formeId = formeId;
    }

    public String getFormeLibelle() {
        return formeLibelle;
    }

    public void setFormeLibelle(String formeLibelle) {
        this.formeLibelle = formeLibelle;
    }

    public Long getTypeEtyquetteId() {
        return typeEtyquetteId;
    }

    public void setTypeEtyquetteId(Long typeEtyquetteId) {
        this.typeEtyquetteId = typeEtyquetteId;
    }

    public String getTypeEtyquetteLibelle() {
        return typeEtyquetteLibelle;
    }

    public void setTypeEtyquetteLibelle(String typeEtyquetteLibelle) {
        this.typeEtyquetteLibelle = typeEtyquetteLibelle;
    }

    public Long getFamilleId() {
        return familleId;
    }

    public void setFamilleId(Long familleId) {
        this.familleId = familleId;
    }

    public String getFamilleLibelle() {
        return familleLibelle;
    }

    public void setFamilleLibelle(String familleLibelle) {
        this.familleLibelle = familleLibelle;
    }

    public Long getGammeId() {
        return gammeId;
    }

    public void setGammeId(Long gammeId) {
        this.gammeId = gammeId;
    }

    public String getGammeLibelle() {
        return gammeLibelle;
    }

    public void setGammeLibelle(String gammeLibelle) {
        this.gammeLibelle = gammeLibelle;
    }

    public Integer getTvaTaux() {
        return tvaTaux;
    }

    public void setTvaTaux(Integer tvaTaux) {
        this.tvaTaux = tvaTaux;
    }

    public Set<FournisseurProduitDTO> getFournisseurProduits() {
        return fournisseurProduits;
    }

    public void setFournisseurProduits(Set<FournisseurProduitDTO> fournisseurProduits) {
        this.fournisseurProduits = fournisseurProduits;
    }

    public FournisseurProduitDTO getFournisseurProduit() {
        return fournisseurProduit;
    }

    public void setFournisseurProduit(FournisseurProduitDTO fournisseurProduit) {
        this.fournisseurProduit = fournisseurProduit;
    }

    public String getQtyStatus() {
        return qtyStatus;
    }

    public void setQtyStatus(String qtyStatus) {
        this.qtyStatus = qtyStatus;
    }

    public Integer getQtyAppro() {
        return qtyAppro;
    }

    public void setQtyAppro(Integer qtyAppro) {
        this.qtyAppro = qtyAppro;
    }

    public Integer getQtySeuilMini() {
        return qtySeuilMini;
    }

    public void setQtySeuilMini(Integer qtySeuilMini) {
        this.qtySeuilMini = qtySeuilMini;
    }

    public Boolean getDateperemption() {
        return dateperemption;
    }

    public void setDateperemption(Boolean dateperemption) {
        this.dateperemption = dateperemption;
    }

    public Boolean getChiffre() {
        return chiffre;
    }

    public void setChiffre(Boolean chiffre) {
        this.chiffre = chiffre;
    }

    public int getTotalQuantity() {
        return totalQuantity;
    }

    public void setTotalQuantity(int totalQuantity) {
        this.totalQuantity = totalQuantity;
    }

    public Boolean getDeconditionnable() {
        return deconditionnable;
    }

    public void setDeconditionnable(Boolean deconditionnable) {
        this.deconditionnable = deconditionnable;
    }

    public String getCodeEan() {
        return codeEan;
    }

    public void setCodeEan(String codeEan) {
        this.codeEan = codeEan;
    }

    public Long getRemiseId() {
        return remiseId;
    }

    public void setRemiseId(Long remiseId) {
        this.remiseId = remiseId;
    }

    public int getQtyReserve() {
        return qtyReserve;
    }

    public void setQtyReserve(int qtyReserve) {
        this.qtyReserve = qtyReserve;
    }

    public LocalDate getPerimeAt() {
        return perimeAt;
    }

    public void setPerimeAt(LocalDate perimeAt) {
        this.perimeAt = perimeAt;
    }

}
