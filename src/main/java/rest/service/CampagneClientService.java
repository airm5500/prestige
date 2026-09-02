package rest.service;

import dal.TUser;
import java.io.IOException;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.dto.CampagneRequete;

/**
 * Campagnes SMS / WhatsApp depuis le suivi de consommation (point 2) : controle des numeros cote serveur, export des
 * anomalies, envoi SMS personnalise par le pipeline existant, liens WhatsApp assistes.
 */
@Local
public interface CampagneClientService {

    /**
     * Population relue en base (clients coches, sinon resultat des criteres), dedoublonnee, puis controle de chaque
     * numero. Reponse {success, total, nbConformes, nbNonConformes, conformes:[...], nonConformes:[{client, telephone,
     * motif}]}. Un client ayant refuse le contact est non conforme.
     */
    JSONObject controlerNumeros(CampagneRequete requete);

    /** Fichier Excel « numeros_non_conformes.xls » : Client, Telephone enregistre, Motif. */
    byte[] excelNonConformes(CampagneRequete requete) throws IOException;

    /**
     * Prepare une notification SMS par contact conforme, avec le message personnalise (variables du modele), sans
     * envoyer. Retourne les identifiants des notifications creees ; l'envoi est lance par {@link #lancerEnvois}.
     */
    List<String> preparerSms(TUser utilisateur, CampagneRequete requete);

    /** Lance l'envoi asynchrone des notifications preparees (apres validation de leur transaction). */
    void lancerEnvois(List<String> notificationIds);

    /**
     * Liens WhatsApp « wa.me » avec le message personnalise prerempli, un par contact conforme. Reponse {success,
     * total, liens:[{clientId, client, telephone, message, lien}]}.
     */
    JSONObject liensWhatsapp(CampagneRequete requete);
}
