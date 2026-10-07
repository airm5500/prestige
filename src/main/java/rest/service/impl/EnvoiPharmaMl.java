package rest.service.impl;

import java.io.IOException;
import java.net.ConnectException;
import java.net.NoRouteToHostException;
import java.net.URI;
import java.net.UnknownHostException;
import java.net.http.HttpClient;
import java.net.http.HttpConnectTimeoutException;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.channels.UnresolvedAddressException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.apache.commons.lang3.StringUtils;

/**
 * Envoi HTTP d'un message PharmaML avec adresse de secours (retours du 07/10). L'adresse de secours n'est essayee que
 * si la principale est INJOIGNABLE (connexion impossible ou adresse introuvable : rien n'a pu partir). Une reponse,
 * meme en erreur, ou un depassement du delai de reponse ne declenchent jamais le secours : le grossiste a pu recevoir
 * le message, le renvoyer ailleurs risquerait une commande en double.
 */
public final class EnvoiPharmaMl {

    private static final Logger LOG = Logger.getLogger(EnvoiPharmaMl.class.getName());

    /** Resultat : la reponse et l'adresse qui l'a donnee. */
    public static final class Resultat {
        public final HttpResponse<String> reponse;
        public final String url;
        public final boolean secours;

        Resultat(HttpResponse<String> reponse, String url, boolean secours) {
            this.reponse = reponse;
            this.url = url;
            this.secours = secours;
        }
    }

    private EnvoiPharmaMl() {
    }

    /** Adresses a essayer, dans l'ordre, sans vide ni doublon. */
    public static List<String> adresses(String principale, String secours) {
        List<String> l = new ArrayList<>();
        for (String u : new String[] { principale, secours }) {
            String t = StringUtils.trimToEmpty(u);
            if (!t.isEmpty() && !l.contains(t)) {
                l.add(t);
            }
        }
        return l;
    }

    public static Resultat envoyer(List<String> adresses, String xml, Duration delaiConnexion, Duration delaiReponse)
            throws IOException, InterruptedException {
        HttpClient client = HttpClient.newBuilder().connectTimeout(delaiConnexion).build();
        IOException derniere = null;
        for (int i = 0; i < adresses.size(); i++) {
            String url = adresses.get(i);
            try {
                HttpResponse<String> r = client.send(
                        HttpRequest.newBuilder().uri(URI.create(url)).timeout(delaiReponse)
                                .header("Content-Type", "text/xml; charset=UTF-8")
                                .POST(HttpRequest.BodyPublishers.ofString(xml, StandardCharsets.UTF_8)).build(),
                        HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
                if (i > 0) {
                    LOG.log(Level.INFO, "PharmaML : message envoye par l''adresse de secours {0}", url);
                }
                return new Resultat(r, url, i > 0);
            } catch (IOException e) {
                if (!injoignable(e) || i == adresses.size() - 1) {
                    throw e;
                }
                LOG.log(Level.WARNING, "PharmaML : {0} injoignable ({1}), essai de l''adresse de secours",
                        new Object[] { url, e.getClass().getSimpleName() });
                derniere = e;
            }
        }
        throw derniere != null ? derniere : new ConnectException("aucune adresse PharmaML");
    }

    /** Rien n'a pu partir : connexion refusee ou trop longue, adresse introuvable, pas de route. */
    public static boolean injoignable(Throwable ex) {
        for (Throwable c = ex; c != null; c = c.getCause() == c ? null : c.getCause()) {
            if (c instanceof ConnectException || c instanceof HttpConnectTimeoutException
                    || c instanceof UnknownHostException || c instanceof NoRouteToHostException
                    || c instanceof UnresolvedAddressException) {
                return true;
            }
        }
        return false;
    }
}
