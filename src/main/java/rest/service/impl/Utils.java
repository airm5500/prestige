package rest.service.impl;

import rest.service.v2.dto.VersionDTO;

/**
 *
 * @author koben
 */
public class Utils {

    public static Boolean plafondVenteIsActive;
    public static VersionDTO version;

    private Utils() {

    }

    public static int arrondiTauxCouverture(int taux) {

        int arrondi = Math.round(taux / 5f) * 5;

        return Math.min(100, arrondi);

    }

    public static double calculHt(int ttc, int tva) {
        return (ttc) * 1.0 / (1 + (tva / 100.f));
    }
}
