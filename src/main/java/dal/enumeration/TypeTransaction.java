/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal.enumeration;

/**
 *
 * @author DICI
 */
public enum TypeTransaction {
    VENTE_COMPTANT("VNO"), VENTE_CREDIT("VO"), ACHAT("FACTURE FOURNISSEUR"), ENTREE("ENTREE DE CAISSE"),
    SORTIE("SORTIE DE CAISSE");

    private final String value;

    public String getValue() {
        return value;
    }

    private TypeTransaction(String value) {
        this.value = value;
    }

}
