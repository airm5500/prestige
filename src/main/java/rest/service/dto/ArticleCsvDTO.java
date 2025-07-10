
package rest.service.dto;

/**
 *
 * @author koben
 */
public class ArticleCsvDTO {
    private final String codeCip;
    private final int qty;

    public ArticleCsvDTO(String codeCip, int qty) {
        this.codeCip = codeCip;
        this.qty = qty;
    }

    public String getCodeCip() {
        return codeCip;
    }

    public int getQty() {
        return qty;
    }

}
