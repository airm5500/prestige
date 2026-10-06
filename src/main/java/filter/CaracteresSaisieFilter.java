package filter;

import java.util.regex.Pattern;
import javax.annotation.Priority;
import javax.ws.rs.Priorities;
import javax.ws.rs.container.ContainerRequestContext;
import javax.ws.rs.container.ContainerRequestFilter;
import javax.ws.rs.container.PreMatching;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.ext.Provider;
import org.json.JSONObject;

/**
 * Controle de saisie (07/10) : la base est en utf8mb3 et ne sait pas comparer ni stocker les caracteres sur 4 octets
 * (emojis, certains symboles). Une recherche qui en contient faisait echouer la requete SQL, parfois apres avoir annule
 * la transaction d'un export (erreur interne sans cause lisible). Ces caracteres sont refuses ici, avant tout
 * traitement, avec un message clair. Seuls l'adresse et ses parametres sont controles (pas le corps des envois).
 */
@Provider
@PreMatching
@Priority(Priorities.AUTHENTICATION - 10)
public class CaracteresSaisieFilter implements ContainerRequestFilter {

    /** Debut d'un caractere UTF-8 sur 4 octets, encode dans l'adresse (%F0 a %F4). */
    private static final Pattern QUATRE_OCTETS = Pattern.compile("%F[0-4]", Pattern.CASE_INSENSITIVE);

    static boolean refuse(String adresseBrute) {
        return adresseBrute != null
                && (QUATRE_OCTETS.matcher(adresseBrute).find() || adresseBrute.codePoints().anyMatch(c -> c > 0xFFFF));
    }

    @Override
    public void filter(ContainerRequestContext requete) {
        String brute = requete.getUriInfo().getRequestUri().getRawPath() + "?"
                + requete.getUriInfo().getRequestUri().getRawQuery();
        if (refuse(brute)) {
            String m = "Les émojis et symboles spéciaux ne sont pas acceptés dans la saisie.";
            requete.abortWith(Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JSONObject().put("success", false).put("msg", m).put("message", m).toString())
                    .type(MediaType.APPLICATION_JSON).build());
        }
    }
}
