/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal.enumeration;

/**
 *
 * @author Kobena
 */
public enum TypeVente {
    VNO("Comptant"), VO("Assurance"), DEPOT("Dépôt agrée"), EXTENSION("Dépôt extension"), VC("Carnet");

    private final String value;

    public String getValue() {
        return value;
    }

    private TypeVente(String value) {
        this.value = value;
    }
}
