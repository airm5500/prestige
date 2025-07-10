
package rest.service.dto;

/**
 *
 * @author koben
 */
public class CommandeCsvDTO {
    private final String code;
    private final int qte;

    public String getCode() {
        return code;
    }

    public int getQte() {
        return qte;
    }

    public CommandeCsvDTO(String code, int qte) {
        this.code = code;
        this.qte = qte;
    }

}
