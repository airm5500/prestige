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
public enum NatureVente {
    DIFFERE("Différé"), VO("Assurance"), DEPOT("Dépôt"), VNO("Comptant");

    private final String value;

    private NatureVente(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    @Override
    public String toString() {
        return value;
    }
}
