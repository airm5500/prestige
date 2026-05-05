package rest.service.fne;

/**
 *
 * @author koben
 */
public class FneResponse {

    private String ncc;
    private String reference;
    private String token;
    private Boolean warning;

    public String getNcc() {
        return ncc;
    }

    public void setNcc(String ncc) {
        this.ncc = ncc;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public Boolean getWarning() {
        return warning;
    }

    public void setWarning(Boolean warning) {
        this.warning = warning;
    }

    @Override
    public String toString() {
        return "FneResponse{" + "ncc=" + ncc + ", reference=" + reference + ", token=" + token + ", warning=" + warning
                + '}';
    }

}
