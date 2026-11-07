package rest.service.extranet.commun;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Faux extranet local (127.0.0.1, port libre) : les tests n'appellent jamais les vrais extranets. Chaque chemin renvoie
 * une reponse preparee ; chaque appel recu est note (methode, chemin, requete, en-tetes utiles).
 */
public final class FauxExtranet implements AutoCloseable {

    /** Reponse preparee. */
    public static final class Reponse {
        final int statut;
        final String type;
        final byte[] corps;
        final Map<String, String> entetes;

        public Reponse(int statut, String type, byte[] corps, Map<String, String> entetes) {
            this.statut = statut;
            this.type = type;
            this.corps = corps;
            this.entetes = entetes == null ? Map.of() : entetes;
        }

        public static Reponse json(String s) {
            return new Reponse(200, "application/json; charset=utf-8", s.getBytes(StandardCharsets.UTF_8), null);
        }

        public static Reponse html(String s) {
            return new Reponse(200, "text/html; charset=utf-8", s.getBytes(StandardCharsets.UTF_8), null);
        }
    }

    /** Appel recu. */
    public static final class Appel {
        public final String methode;
        public final String chemin;
        public final String requete;
        public final String cookie;
        public final String ajax;
        public final String referer;
        public final long instant;

        Appel(String methode, String chemin, String requete, String cookie, String ajax, String referer) {
            this.methode = methode;
            this.chemin = chemin;
            this.requete = requete;
            this.cookie = cookie;
            this.ajax = ajax;
            this.referer = referer;
            this.instant = System.currentTimeMillis();
        }
    }

    /** Fournit la reponse d'un chemin selon la requete (null : 404). */
    public interface Repondeur {
        Reponse repondre(String requete);
    }

    private final HttpServer serveur;
    private final Map<String, Repondeur> routes = new ConcurrentHashMap<>();
    private final List<Appel> appels = Collections.synchronizedList(new ArrayList<>());

    public FauxExtranet() throws IOException {
        serveur = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        serveur.createContext("/", ex -> {
            String chemin = ex.getRequestURI().getPath();
            String req = ex.getRequestURI().getRawQuery();
            appels.add(new Appel(ex.getRequestMethod(), chemin, req, ex.getRequestHeaders().getFirst("Cookie"),
                    ex.getRequestHeaders().getFirst("X-Requested-With"), ex.getRequestHeaders().getFirst("Referer")));
            Repondeur r = routes.get(chemin);
            Reponse rep = r == null ? null : r.repondre(req);
            if (rep == null) {
                rep = new Reponse(404, "text/plain", "absent".getBytes(StandardCharsets.UTF_8), null);
            }
            ex.getResponseHeaders().add("Content-Type", rep.type);
            rep.entetes.forEach((k, v) -> ex.getResponseHeaders().add(k, v));
            ex.sendResponseHeaders(rep.statut, rep.corps.length == 0 ? -1 : rep.corps.length);
            if (rep.corps.length > 0) {
                try (OutputStream o = ex.getResponseBody()) {
                    o.write(rep.corps);
                }
            }
            ex.close();
        });
        serveur.start();
    }

    public String adresse() {
        return "http://127.0.0.1:" + serveur.getAddress().getPort();
    }

    public FauxExtranet route(String chemin, Repondeur r) {
        routes.put(chemin, r);
        return this;
    }

    public FauxExtranet route(String chemin, Reponse r) {
        return route(chemin, q -> r);
    }

    public List<Appel> appels() {
        synchronized (appels) {
            return new ArrayList<>(appels);
        }
    }

    /** Transport vers ce faux extranet, sans pause, avec une session deja saisie. */
    public TransportExtranet transport(SourceExtranet s, int pauseMs, String cookies) {
        SessionExtranet session = new SessionExtranet(s);
        if (cookies != null) {
            session.definir(cookies, "test");
        }
        return new TransportExtranet(session, ExtranetConfiguration
                .de(Map.of(s.prefixeCle() + "_URL", adresse(), s.prefixeCle() + "_PAUSE_MS", String.valueOf(pauseMs))));
    }

    @Override
    public void close() {
        serveur.stop(0);
    }
}
