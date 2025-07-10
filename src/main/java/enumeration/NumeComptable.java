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
public enum NumeComptable {
    FOND("10800000000"), REGLEDIF("41800000000"), REGLETP("46700000000"), SORTIECAISSE("52000000000"),
    ENTREECAISSE("52100000000"), ACCOMPTE("58000000000"), AVOIRCLIENT("60010000000"), VO("70710000000"),
    VNO("70720000000");

    public final String value;

    public String getValue() {
        return value;
    }

    private NumeComptable(String value) {
        this.value = value;
    }

    public static NumeComptable getNumeComptableByString(String text) {
        for (NumeComptable nc : values()) {
            if (nc.value.equals(text)) {
                return nc;
            }
        }
        return null;
    }
}
