package rest.service.pharmaMl.response.enumeration;

/**
 *
 * @author koben
 */
public enum CodeReponse {
    PRODUIT_INCONNU("0001", "Produit Inconnu"), PAS_EN_STOCK("0002", "Pas en Stock = Ne tenons pas"),
    NE_SE_FAIT_PLUS("0003", "Ne se fait plus"), MANQUE_FABRICANT("0004", "Manque Fabricant"),
    MANQUE_RAYON("0005", "Manque rayon"), RETRAIT_DE_PRODUIT("0006", "Retrait de produit"),
    NON_AUTORISE("0007", "Non autorisé");

    private final String code;
    private final String signification;

    private CodeReponse(String code, String signification) {
        this.code = code;
        this.signification = signification;
    }

    public String getCode() {
        return code;
    }

    public String getSignification() {
        return signification;
    }

}
