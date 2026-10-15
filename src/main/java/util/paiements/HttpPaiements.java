package util.paiements;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

/** Appels HTTP vers l'agrégateur (remplaçable dans les tests). Délais courts : jamais d'attente sans fin. */
public interface HttpPaiements {

    final class Reponse {
        public final int statut;
        public final String corps;

        public Reponse(int statut, String corps) {
            this.statut = statut;
            this.corps = corps;
        }
    }

    Reponse envoyer(String methode, String url, Map<String, String> entetes, String corps) throws IOException;

    /** Implémentation Java 11 (java.net.http). */
    static HttpPaiements java() {
        HttpClient c = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
        return (methode, url, entetes, corps) -> {
            HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(15));
            entetes.forEach(b::header);
            b.method(methode,
                    corps == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(corps));
            try {
                HttpResponse<String> r = c.send(b.build(), HttpResponse.BodyHandlers.ofString());
                return new Reponse(r.statusCode(), r.body());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IOException("Appel interrompu", e);
            }
        };
    }
}
