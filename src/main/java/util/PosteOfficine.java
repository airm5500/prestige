package util;

import java.net.InetAddress;
import java.net.UnknownHostException;

/**
 * Poste de l'officine (demande du 16/10) : une requete venue de la machine elle-meme ou du reseau interne (adresses
 * privees). Sert a n'afficher le QR de pointage que sur place. Le port public des avis renvoie deja 404 a toute l'API
 * (filter.PortPublicAvisFilter). Aucun en-tete (X-Forwarded-For...) n'est pris en compte : il se falsifie.
 */
public final class PosteOfficine {

    private PosteOfficine() {
    }

    public static boolean estLocal(String adresse) {
        if (adresse == null || adresse.isEmpty() || !adresse.matches("[0-9A-Fa-f:.%a-z]+")) {
            return false;
        }
        try {
            InetAddress a = InetAddress.getByName(adresse);
            return a.isLoopbackAddress() || a.isSiteLocalAddress() || a.isLinkLocalAddress()
                    || (a.getAddress().length == 16 && (a.getAddress()[0] & 0xfe) == 0xfc);
        } catch (UnknownHostException e) {
            return false;
        }
    }
}
