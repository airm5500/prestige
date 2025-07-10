/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.io.Serializable;

/**
 *
 * @author Kobena
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class VenteDepotParams implements Serializable {

    private static final long serialVersionUID = 1L;
    String lg_PREENREGISTREMENT_ID, lg_EMPLACEMENT_ID, lg_PREENREGISTREMENT_DETAIL_ID;
    String lg_COMPTE_CLIENT_ID;
    String lg_USER_VENDEUR_ID;
    String lg_FAMILLE_ID;
    int int_PRICE = 0;
    int int_quantite = 0, int_PRICE_DETAIL;
    int int_quantite_served = 0;
    Integer int_TOTAL_VENTE_RECAP = 0;
    String lg_type_vente_id;
    String lg_REMISE_ID;

    public String getLg_PREENREGISTREMENT_ID() {
        return lg_PREENREGISTREMENT_ID;
    }

    public void setLg_PREENREGISTREMENT_ID(String lg_PREENREGISTREMENT_ID) {
        this.lg_PREENREGISTREMENT_ID = lg_PREENREGISTREMENT_ID;
    }

    public String getLg_COMPTE_CLIENT_ID() {
        return lg_COMPTE_CLIENT_ID;
    }

    public void setLg_COMPTE_CLIENT_ID(String lg_COMPTE_CLIENT_ID) {
        this.lg_COMPTE_CLIENT_ID = lg_COMPTE_CLIENT_ID;
    }

    public String getLg_USER_VENDEUR_ID() {
        return lg_USER_VENDEUR_ID;
    }

    public void setLg_USER_VENDEUR_ID(String lg_USER_VENDEUR_ID) {
        this.lg_USER_VENDEUR_ID = lg_USER_VENDEUR_ID;
    }

    public String getLg_FAMILLE_ID() {
        return lg_FAMILLE_ID;
    }

    public void setLg_FAMILLE_ID(String lg_FAMILLE_ID) {
        this.lg_FAMILLE_ID = lg_FAMILLE_ID;
    }

    public int getInt_PRICE() {
        return int_PRICE;
    }

    public void setInt_PRICE(int int_PRICE) {
        this.int_PRICE = int_PRICE;
    }

    public int getInt_quantite() {
        return int_quantite;
    }

    public void setInt_quantite(int int_quantite) {
        this.int_quantite = int_quantite;
    }

    public int getInt_quantite_served() {
        return int_quantite_served;
    }

    public void setInt_quantite_served(int int_quantite_served) {
        this.int_quantite_served = int_quantite_served;
    }

    public String getLg_type_vente_id() {
        return lg_type_vente_id;
    }

    public void setLg_type_vente_id(String lg_type_vente_id) {
        this.lg_type_vente_id = lg_type_vente_id;
    }

    public String getLg_REMISE_ID() {
        return lg_REMISE_ID;
    }

    public void setLg_REMISE_ID(String lg_REMISE_ID) {
        this.lg_REMISE_ID = lg_REMISE_ID;
    }

    public String getLg_EMPLACEMENT_ID() {
        return lg_EMPLACEMENT_ID;
    }

    public void setLg_EMPLACEMENT_ID(String lg_EMPLACEMENT_ID) {
        this.lg_EMPLACEMENT_ID = lg_EMPLACEMENT_ID;
    }

    public int getInt_PRICE_DETAIL() {
        return int_PRICE_DETAIL;
    }

    public void setInt_PRICE_DETAIL(int int_PRICE_DETAIL) {
        this.int_PRICE_DETAIL = int_PRICE_DETAIL;
    }

    public Integer getInt_TOTAL_VENTE_RECAP() {
        return int_TOTAL_VENTE_RECAP;
    }

    public void setInt_TOTAL_VENTE_RECAP(Integer int_TOTAL_VENTE_RECAP) {
        this.int_TOTAL_VENTE_RECAP = int_TOTAL_VENTE_RECAP;
    }

    public String getLg_PREENREGISTREMENT_DETAIL_ID() {
        return lg_PREENREGISTREMENT_DETAIL_ID;
    }

    public void setLg_PREENREGISTREMENT_DETAIL_ID(String lg_PREENREGISTREMENT_DETAIL_ID) {
        this.lg_PREENREGISTREMENT_DETAIL_ID = lg_PREENREGISTREMENT_DETAIL_ID;
    }

    public VenteDepotParams(@JsonProperty("lg_PREENREGISTREMENT_ID") String lg_PREENREGISTREMENT_ID,
            @JsonProperty("lg_EMPLACEMENT_ID") String lg_EMPLACEMENT_ID,
            @JsonProperty("lg_USER_VENDEUR_ID") String lg_USER_VENDEUR_ID,
            @JsonProperty("lg_FAMILLE_ID") String lg_FAMILLE_ID, @JsonProperty("lg_REMISE_ID") String lg_REMISE_ID,
            @JsonProperty("int_QUANTITY") int int_QUANTITY) {
        this.lg_PREENREGISTREMENT_ID = lg_PREENREGISTREMENT_ID;
        this.lg_EMPLACEMENT_ID = lg_EMPLACEMENT_ID;
        this.lg_USER_VENDEUR_ID = lg_USER_VENDEUR_ID;
        this.lg_FAMILLE_ID = lg_FAMILLE_ID;
        this.lg_REMISE_ID = lg_REMISE_ID;
        this.int_quantite = int_QUANTITY;
    }

    public VenteDepotParams(@JsonProperty("lg_PREENREGISTREMENT_DETAIL_ID") String lg_PREENREGISTREMENT_DETAIL_ID,
            @JsonProperty("lg_FAMILLE_ID") String lg_FAMILLE_ID, @JsonProperty("int_PRICE_DETAIL") int int_PRICE_DETAIL,
            @JsonProperty("lg_REMISE_ID") String lg_REMISE_ID, @JsonProperty("int_QUANTITY") int int_QUANTITY) {
        this.lg_PREENREGISTREMENT_DETAIL_ID = lg_PREENREGISTREMENT_DETAIL_ID;
        this.lg_FAMILLE_ID = lg_FAMILLE_ID;
        this.int_PRICE_DETAIL = int_PRICE_DETAIL;
        this.lg_REMISE_ID = lg_REMISE_ID;
        this.int_quantite = int_QUANTITY;
    }

}
