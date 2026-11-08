package rest.service.dto;

import dal.TUser;
import util.BadgePin;

/**
 * Plan du 08/11, point 14 : issue d'une connexion par badge. {@code user} n'est rempli que si la session est ouverte ;
 * {@code etat} est {@code null} si le badge n'est pas reconnu (refus sans motif, comme avant).
 */
public final class ResultatConnexionBadge {

    public static final ResultatConnexionBadge REFUS = new ResultatConnexionBadge(null, null);

    private final TUser user;
    private final BadgePin.Etat etat;

    public ResultatConnexionBadge(TUser user, BadgePin.Etat etat) {
        this.user = user;
        this.etat = etat;
    }

    public TUser getUser() {
        return user;
    }

    public BadgePin.Etat getEtat() {
        return etat;
    }
}
