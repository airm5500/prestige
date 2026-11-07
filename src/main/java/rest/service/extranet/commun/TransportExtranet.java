package rest.service.extranet.commun;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Transport HTTP vers UN extranet. LECTURE SEULE PAR CONSTRUCTION : la seule methode d'appel est {@link #lire}, un GET
 * ; aucune commande ni reclamation ne peut partir d'ici (un test le verifie).
 *
 * <ul>
 * <li>les redirections ne sont pas suivies : une redirection vers la page de connexion se voit ;</li>
 * <li>seul un chemin relatif a l'extranet est accepte : le cookie ne part jamais vers un autre domaine ;</li>
 * <li>un appel a la fois, avec une pause minimale entre deux appels ;</li>
 * <li>le type de la reponse est controle avant tout traitement (JSON, HTML, PDF) ;</li>
 * <li>journal : chemin sans parametres, statut, duree, taille. Jamais de cookie, de parametre ni de corps.</li>
 * </ul>
 */
public final class TransportExtranet {

    private static final Logger LOG = Logger.getLogger(TransportExtranet.class.getName());

    public enum Attendu {
        JSON, HTML, PDF, IMAGE
    }

    static final String ACCEPT_JSON = "application/json, text/javascript, */*; q=0.01";
    static final String ACCEPT_HTML = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";

    private final SessionExtranet session;
    private final String adresse;
    private final int pauseMs;
    private final Duration delai;
    private final HttpClient client;
    private final Object verrou = new Object();
    private long dernierAppel;
    private int appels;
    /** Connexion automatique (identifiants enregistres) ; null : session collee seulement. */
    private volatile ConnexionExtranet connexion;

    public TransportExtranet(SessionExtranet session, ExtranetConfiguration conf) {
        this.session = session;
        SourceExtranet s = session.source();
        this.adresse = conf.adresse(s);
        this.pauseMs = conf.pauseMs(s);
        this.delai = Duration.ofMillis(conf.delaiMs(s));
        this.client = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER).connectTimeout(delai).build();
    }

    void connexion(ConnexionExtranet c) {
        this.connexion = c;
    }

    public SessionExtranet session() {
        return session;
    }

    /** Nombre d'appels reellement envoyes (pour les tests et le compte rendu de collecte). */
    public int appels() {
        synchronized (verrou) {
            return appels;
        }
    }

    /**
     * GET d'un chemin de l'extranet.
     *
     * @param chemin
     *            chemin relatif, commencant par « / » (ex. /SavoirPlusJSON)
     * @param parametres
     *            parametres de requete, dans l'ordre (LinkedHashMap conseille) ; null si aucun
     * @param referer
     *            chemin de la page d'origine, ou null
     */
    public ReponseExtranet lire(String chemin, Map<String, String> parametres, Attendu attendu, String referer)
            throws ExtranetException {
        verifierChemin(chemin);
        if (referer != null) {
            verifierChemin(referer);
        }
        ConnexionExtranet c = connexion;
        if (!session.utilisable()) {
            if (c == null || !c.disponible()) {
                throw new ExtranetException(ExtranetException.Nature.SESSION_ABSENTE, "Aucune session valide pour "
                        + session.source() + " : un administrateur doit renseigner les identifiants ou un cookie");
            }
            c.connecter();
            return envoyer(chemin, parametres, attendu, referer);
        }
        try {
            return envoyer(chemin, parametres, attendu, referer);
        } catch (ExtranetException e) {
            /* session expiree : une seule reconnexion avec les identifiants enregistres, puis le meme appel */
            if (e.nature() != ExtranetException.Nature.SESSION_EXPIREE || c == null || !c.disponible()) {
                throw e;
            }
            c.connecter();
            return envoyer(chemin, parametres, attendu, referer);
        }
    }

    private ReponseExtranet envoyer(String chemin, Map<String, String> parametres, Attendu attendu, String referer)
            throws ExtranetException {
        URI uri = URI.create(adresse + chemin + requete(parametres));
        HttpRequest.Builder b = HttpRequest.newBuilder(uri).GET().timeout(delai).header("User-Agent", "Prestige")
                .header("Cookie", session.enTeteCookie());
        if (attendu == Attendu.JSON) {
            b.header("Accept", ACCEPT_JSON).header("X-Requested-With", "XMLHttpRequest");
        } else if (attendu == Attendu.HTML) {
            b.header("Accept", ACCEPT_HTML);
        }
        if (referer != null) {
            b.header("Referer", adresse + referer);
        }
        HttpResponse<byte[]> r;
        long debut;
        synchronized (verrou) {
            attendre();
            debut = System.currentTimeMillis();
            try {
                r = client.send(b.build(), HttpResponse.BodyHandlers.ofByteArray());
            } catch (HttpTimeoutException e) {
                throw new ExtranetException(ExtranetException.Nature.TRANSPORT, "Délai dépassé sur " + chemin, e);
            } catch (IOException e) {
                throw new ExtranetException(ExtranetException.Nature.TRANSPORT, "Extranet injoignable (" + chemin + ")",
                        e);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new ExtranetException(ExtranetException.Nature.TRANSPORT, "Appel interrompu", e);
            } finally {
                dernierAppel = System.currentTimeMillis();
                appels++;
            }
        }
        ReponseExtranet rep = new ReponseExtranet(r.statusCode(), r.headers().firstValue("Content-Type").orElse(""),
                r.headers().firstValue("Location").orElse(null), r.body(), chemin);
        LOG.log(Level.INFO, "Extranet {0} {1} : {2}, {3} ms, {4} octets", new Object[] { session.source(), chemin,
                rep.statut(), System.currentTimeMillis() - debut, rep.taille() });
        session.recevoir(r.headers().allValues("Set-Cookie"));
        controler(rep, attendu);
        session.reussite();
        return rep;
    }

    /** Controle commun ; leve SESSION_EXPIREE (et efface la session) si une page de connexion est reconnue. */
    void controler(ReponseExtranet rep, Attendu attendu) throws ExtranetException {
        int st = rep.statut();
        if (DetecteurPageConnexion.estRedirection(st) || DetecteurPageConnexion.estRefus(st)) {
            session.expiree();
            throw new ExtranetException(ExtranetException.Nature.SESSION_EXPIREE,
                    "Session " + session.source() + " expirée (statut " + st + " sur " + rep.chemin() + ")");
        }
        if (st != 200) {
            throw new ExtranetException(ExtranetException.Nature.TRANSPORT, "Statut " + st + " sur " + rep.chemin());
        }
        boolean conforme;
        switch (attendu) {
        case JSON:
            char c = rep.premierCaractere();
            conforme = rep.typeJson() && (c == '{' || c == '[');
            break;
        case HTML:
            conforme = rep.typeHtml() && !DetecteurPageConnexion.estPageConnexion(rep.texte());
            break;
        case PDF:
            conforme = rep.signaturePdf();
            break;
        default:
            conforme = rep.typeContenu().toLowerCase().startsWith("image/");
        }
        if (conforme) {
            return;
        }
        if ((rep.typeHtml() || rep.premierCaractere() == '<') && DetecteurPageConnexion.estPageConnexion(rep.texte())) {
            session.expiree();
            throw new ExtranetException(ExtranetException.Nature.SESSION_EXPIREE,
                    "Session " + session.source() + " expirée : page de connexion reçue sur " + rep.chemin());
        }
        throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE, "Réponse inattendue sur "
                + rep.chemin() + " : " + attendu + " attendu, « " + rep.typeContenu() + " » reçu");
    }

    private void attendre() throws ExtranetException {
        long reste = dernierAppel + pauseMs - System.currentTimeMillis();
        if (dernierAppel > 0 && reste > 0) {
            try {
                Thread.sleep(reste);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new ExtranetException(ExtranetException.Nature.TRANSPORT, "Appel interrompu", e);
            }
        }
    }

    static void verifierChemin(String chemin) throws ExtranetException {
        if (chemin == null || !chemin.startsWith("/") || chemin.startsWith("//") || chemin.contains("://")
                || chemin.contains("\\") || chemin.contains("?") || chemin.contains("#")
                || chemin.chars().anyMatch(ch -> ch < 0x21 || ch > 0x7E)) {
            throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE, "Chemin refusé");
        }
    }

    static String requete(Map<String, String> p) {
        if (p == null || p.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        p.forEach((k, v) -> {
            sb.append(sb.length() == 0 ? '?' : '&');
            sb.append(URLEncoder.encode(k, StandardCharsets.UTF_8)).append('=')
                    .append(URLEncoder.encode(v == null ? "" : v, StandardCharsets.UTF_8));
        });
        return sb.toString();
    }
}
