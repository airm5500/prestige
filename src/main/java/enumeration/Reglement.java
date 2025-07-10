/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package enumeration;

/**
 *
 * @author Kobena
 */
public enum Reglement {
    ESPECE("1"), CHEQUE("2"), CARTE_BANQUAIRE("3"), VIREMENT("6"), DIFFERE("4"), DEVISE("5");

    private final String value;

    public String getValue() {
        return value;
    }

    private Reglement(String value) {
        this.value = value;
    }

    public static Reglement getByString(String text) {
        for (Reglement nc : values()) {
            if (nc.value.equals(text)) {
                return nc;
            }
        }
        return null;
    }
}
