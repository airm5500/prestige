/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package util;

import javax.servlet.http.HttpServletRequest;
import org.apache.commons.lang3.StringUtils;

/**
 * Identification du poste client qui constate un evenement : adresse IP et nom du poste. Meme mecanique que
 * l'authentification (UserServiceImpl.getHostName) : si la requete vient du serveur lui-meme, le nom de la machine
 * serveur est utilise ; sinon le nom reseau du poste, resolu de facon bornee et memoisee par {@link NomDePoste} (qui
 * retombe sur l'IP si le nom n'est pas connu a temps).
 *
 * @author koben
 */
public final class PosteClient {

    private PosteClient() {
    }

    /**
     * Ex. "IP 192.168.1.24 - poste CAISSE-01". Retourne une chaine vide si la requete est absente. Ne leve jamais
     * d'exception (l'identification du poste ne doit pas perturber la capture).
     */
    public static String infoPoste(HttpServletRequest request) {
        try {
            if (request == null) {
                return "";
            }
            String ip = StringUtils.defaultString(request.getRemoteAddr());
            String poste = NomDePoste.depuis(request);
            String info = "IP " + ip;
            if (StringUtils.isNotBlank(poste) && !poste.equals(ip)) {
                info += " - poste " + poste;
            }
            return info;
        } catch (Exception e) {
            return "";
        }
    }

    /**
     * Concatene le libelle utilisateur et l'info poste : "Prenom Nom (login) [IP x - poste y]".
     */
    public static String utilisateurAvecPoste(String utilisateur, HttpServletRequest request) {
        String info = infoPoste(request);
        if (StringUtils.isBlank(info)) {
            return utilisateur;
        }
        if (StringUtils.isBlank(utilisateur)) {
            return "[" + info + "]";
        }
        return utilisateur + " [" + info + "]";
    }
}
