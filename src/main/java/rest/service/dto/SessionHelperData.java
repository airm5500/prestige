package rest.service.dto;

/**
 *
 * @author koben
 */
public class SessionHelperData {

    private final boolean updateVentePrix;
    private final boolean showAllVente;
    private final boolean showAllActivity;

    public boolean isUpdateVentePrix() {
        return updateVentePrix;
    }

    public boolean isShowAllVente() {
        return showAllVente;
    }

    public boolean isShowAllActivity() {
        return showAllActivity;
    }

    public SessionHelperData(boolean updateVente, boolean showAllVente, boolean showAllActivity) {
        this.updateVentePrix = updateVente;
        this.showAllVente = showAllVente;
        this.showAllActivity = showAllActivity;
    }

}
