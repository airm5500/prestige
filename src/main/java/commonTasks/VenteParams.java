/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.io.Serializable;

/**
 *
 * @author Kobena
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class VenteParams implements Serializable {

    /**
     *
     */
    private static final long serialVersionUID = 1L;
    private String natureVente;
    private String typeVente;
    private String lg_FAMILLE_ID;
    private Integer int_AMOUNT_RECU = 0;
    private Integer int_AMOUNT_REMIS = 0;
    private int int_QUANTITY_SERVED = 0;
    private int int_QUANTITY = 0;
    private String lg_COMPTE_CLIENT_ID;
    private String lg_AYANTS_DROITS_ID;
    private String str_REF_BON;
    private String lg_REMISE_ID;
    private Integer int_TOTAL_VENTE_RECAP = 0;
    private Integer int_PRICE_DETAIL = 0;
    private String lg_USER_VENDEUR_ID;
    private int int_TAUX = 0;
    private Boolean b_WITHOUT_BON = true;
    private String commentaire = "";
    private String lg_PREENREGISTREMENT_ID;
    private String isDevis;

    public String getLg_PREENREGISTREMENT_ID() {
        return lg_PREENREGISTREMENT_ID;
    }

    public void setLg_PREENREGISTREMENT_ID(String lg_PREENREGISTREMENT_ID) {
        this.lg_PREENREGISTREMENT_ID = lg_PREENREGISTREMENT_ID;
    }

    public String getIsDevis() {
        return isDevis;
    }

    public void setIsDevis(String isDevis) {
        this.isDevis = isDevis;
    }

    public String getNatureVente() {
        return natureVente;
    }

    public String getCommentaire() {
        return commentaire;
    }

    public void setCommentaire(String commentaire) {
        this.commentaire = commentaire;
    }

    public void setNatureVente(String natureVente) {
        this.natureVente = natureVente;
    }

    public String getTypeVente() {
        return typeVente;
    }

    public void setTypeVente(String typeVente) {
        this.typeVente = typeVente;
    }

    public Boolean getB_WITHOUT_BON() {
        return b_WITHOUT_BON;
    }

    public void setB_WITHOUT_BON(Boolean b_WITHOUT_BON) {
        this.b_WITHOUT_BON = b_WITHOUT_BON;
    }

    public String getLg_FAMILLE_ID() {
        return lg_FAMILLE_ID;
    }

    public void setLg_FAMILLE_ID(String lg_FAMILLE_ID) {
        this.lg_FAMILLE_ID = lg_FAMILLE_ID;
    }

    public Integer getInt_AMOUNT_RECU() {
        return int_AMOUNT_RECU;
    }

    public void setInt_AMOUNT_RECU(Integer int_AMOUNT_RECU) {
        this.int_AMOUNT_RECU = int_AMOUNT_RECU;
    }

    public Integer getInt_AMOUNT_REMIS() {
        return int_AMOUNT_REMIS;
    }

    public void setInt_AMOUNT_REMIS(Integer int_AMOUNT_REMIS) {
        this.int_AMOUNT_REMIS = int_AMOUNT_REMIS;
    }

    public int getInt_QUANTITY_SERVED() {
        return int_QUANTITY_SERVED;
    }

    public void setInt_QUANTITY_SERVED(int int_QUANTITY_SERVED) {
        this.int_QUANTITY_SERVED = int_QUANTITY_SERVED;
    }

    public int getInt_QUANTITY() {
        return int_QUANTITY;
    }

    public void setInt_QUANTITY(int int_QUANTITY) {
        this.int_QUANTITY = int_QUANTITY;
    }

    public String getLg_COMPTE_CLIENT_ID() {
        return lg_COMPTE_CLIENT_ID;
    }

    public void setLg_COMPTE_CLIENT_ID(String lg_COMPTE_CLIENT_ID) {
        this.lg_COMPTE_CLIENT_ID = lg_COMPTE_CLIENT_ID;
    }

    public String getLg_AYANTS_DROITS_ID() {
        return lg_AYANTS_DROITS_ID;
    }

    public void setLg_AYANTS_DROITS_ID(String lg_AYANTS_DROITS_ID) {
        this.lg_AYANTS_DROITS_ID = lg_AYANTS_DROITS_ID;
    }

    public String getStr_REF_BON() {
        return str_REF_BON;
    }

    public void setStr_REF_BON(String str_REF_BON) {
        this.str_REF_BON = str_REF_BON;
    }

    public String getLg_REMISE_ID() {
        return lg_REMISE_ID;
    }

    public void setLg_REMISE_ID(String lg_REMISE_ID) {
        this.lg_REMISE_ID = lg_REMISE_ID;
    }

    public Integer getInt_TOTAL_VENTE_RECAP() {
        return int_TOTAL_VENTE_RECAP;
    }

    public void setInt_TOTAL_VENTE_RECAP(Integer int_TOTAL_VENTE_RECAP) {
        this.int_TOTAL_VENTE_RECAP = int_TOTAL_VENTE_RECAP;
    }

    public Integer getInt_PRICE_DETAIL() {
        return int_PRICE_DETAIL;
    }

    public void setInt_PRICE_DETAIL(Integer int_PRICE_DETAIL) {
        this.int_PRICE_DETAIL = int_PRICE_DETAIL;
    }

    public String getLg_USER_VENDEUR_ID() {
        return lg_USER_VENDEUR_ID;
    }

    public void setLg_USER_VENDEUR_ID(String lg_USER_VENDEUR_ID) {
        this.lg_USER_VENDEUR_ID = lg_USER_VENDEUR_ID;
    }

    public int getInt_TAUX() {
        return int_TAUX;
    }

    public void setInt_TAUX(int int_TAUX) {
        this.int_TAUX = int_TAUX;
    }

    public VenteParams() {
    }

    @JsonCreator
    public VenteParams(@JsonProperty("lg_FAMILLE_ID") String lg_FAMILLE_ID,
            @JsonProperty("lg_PREENREGISTREMENT_ID") String lg_PREENREGISTREMENT_ID,
            @JsonProperty("int_QUANTITY_SERVED") int int_QUANTITY_SERVED,
            @JsonProperty("int_QUANTITY") int int_QUANTITY,
            @JsonProperty("lg_USER_VENDEUR_ID") String lg_USER_VENDEUR_ID,
            @JsonProperty("lg_NATURE_VENTE_ID") String lg_NATURE_VENTE_ID,
            @JsonProperty("lg_REMISE_ID") String lg_REMISE_ID,
            @JsonProperty("lg_TYPE_VENTE_ID") String lg_TYPE_VENTE_ID, @JsonProperty("isDevis") String isDevis) {
        this.lg_FAMILLE_ID = lg_FAMILLE_ID;
        this.lg_PREENREGISTREMENT_ID = lg_PREENREGISTREMENT_ID;
        this.int_QUANTITY_SERVED = int_QUANTITY_SERVED;
        this.int_QUANTITY = int_QUANTITY;
        this.lg_USER_VENDEUR_ID = lg_USER_VENDEUR_ID;
        this.natureVente = lg_NATURE_VENTE_ID;
        this.lg_REMISE_ID = lg_REMISE_ID;
        this.typeVente = lg_TYPE_VENTE_ID;
        this.isDevis = isDevis;
    }

    @Override
    public String toString() {
        return "VenteParams{" + "natureVente=" + natureVente + "\n, typeVente=" + typeVente + "\n, lg_FAMILLE_ID="
                + lg_FAMILLE_ID + "\n, int_AMOUNT_RECU=" + int_AMOUNT_RECU + "\n, int_AMOUNT_REMIS=" + int_AMOUNT_REMIS
                + "\n, int_QUANTITY_SERVED=" + int_QUANTITY_SERVED + "\n, int_QUANTITY=" + int_QUANTITY
                + "\n, lg_COMPTE_CLIENT_ID=" + lg_COMPTE_CLIENT_ID + "\n, lg_AYANTS_DROITS_ID=" + lg_AYANTS_DROITS_ID
                + "\n, str_REF_BON=" + str_REF_BON + "\n, lg_REMISE_ID=" + lg_REMISE_ID + "\n, int_TOTAL_VENTE_RECAP="
                + int_TOTAL_VENTE_RECAP + "\n, int_PRICE_DETAIL=" + int_PRICE_DETAIL + "\n, lg_USER_VENDEUR_ID="
                + lg_USER_VENDEUR_ID + "\n, int_TAUX=" + int_TAUX + "\n, b_WITHOUT_BON=" + b_WITHOUT_BON
                + "\n, commentaire=" + commentaire + "\n, lg_PREENREGISTREMENT_ID=" + lg_PREENREGISTREMENT_ID + '}';
    }

    public VenteParams(@JsonProperty("lg_FAMILLE_ID") String lg_FAMILLE_ID,
            @JsonProperty("lg_PREENREGISTREMENT_ID") String lg_PREENREGISTREMENT_ID,
            @JsonProperty("int_QUANTITY") int int_QUANTITY, @JsonProperty("isDevis") String isDevis) {
        this.lg_FAMILLE_ID = lg_FAMILLE_ID;
        this.lg_PREENREGISTREMENT_ID = lg_PREENREGISTREMENT_ID;
        this.int_QUANTITY = int_QUANTITY;
        this.isDevis = isDevis;
    }

}
