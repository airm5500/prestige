package rest.service.extranet.commun;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;

/**
 * Connexion automatique a un extranet avec l'identifiant et le mot de passe saisis par l'administrateur (decision du
 * 07/11). Le formulaire n'est pas suppose : il est LU sur la page de connexion de l'extranet (le formulaire qui porte
 * un champ mot de passe), avec ses champs caches (jeton anti-falsification), puis poste a sa propre adresse.
 *
 * <ul>
 * <li>seul POST du connecteur, et seulement vers l'action du formulaire de connexion, sur le meme site ;</li>
 * <li>un captcha arrete tout : il n'est jamais contourne ;</li>
 * <li>des identifiants refuses ne sont pas retentes tant qu'ils n'ont pas ete modifies (pas de blocage du compte)
 * ;</li>
 * <li>journal : chemin et statut seulement ; jamais l'identifiant, le mot de passe, un cookie ni un corps.</li>
 * </ul>
 */
public final class ConnexionExtranet {

    private static final Logger LOG = Logger.getLogger(ConnexionExtranet.class.getName());
    private static final int REDIRECTIONS_MAX = 5;

    /** Identifiants en clair, en memoire du serveur seulement. {@code empreinte} change a chaque modification. */
    public static final class Identifiants {
        final String identifiant;
        final String motDePasse;
        final String empreinte;

        public Identifiants(String identifiant, String motDePasse, String empreinte) {
            this.identifiant = identifiant;
            this.motDePasse = motDePasse;
            this.empreinte = empreinte;
        }

        @Override
        public String toString() {
            return "Identifiants[masques]";
        }
    }

    /** Formulaire de connexion lu sur la page. */
    static final class Formulaire {
        String action;
        String champIdentifiant;
        String champMotDePasse;
        final Map<String, String> autres = new LinkedHashMap<>();
        boolean captcha;
    }

    private final SessionExtranet session;
    private final ExtranetConfiguration conf;
    private final URI origine;
    private final int pauseMs;
    private final Duration delai;
    private final HttpClient client;
    private volatile Identifiants identifiants;
    private String empreinteRefusee;
    private long dernierAppel;

    public ConnexionExtranet(SessionExtranet session, ExtranetConfiguration conf) {
        this.session = session;
        this.conf = conf;
        SourceExtranet s = session.source();
        this.origine = URI.create(conf.adresse(s) + "/");
        this.pauseMs = conf.pauseMs(s);
        this.delai = Duration.ofMillis(conf.delaiMs(s));
        this.client = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER).connectTimeout(delai).build();
    }

    /** Identifiants a utiliser (null : aucun). Une modification leve le blocage apres refus. */
    public synchronized void identifiants(Identifiants id) {
        this.identifiants = id;
        if (id == null || !Objects.equals(id.empreinte, empreinteRefusee)) {
            empreinteRefusee = null;
        }
    }

    public boolean disponible() {
        return identifiants != null;
    }

    /**
     * Se connecte et remplace la session par les cookies obtenus.
     *
     * @throws ExtranetException
     *             CONNEXION_REFUSEE (identifiants, captcha, formulaire), SESSION_ABSENTE (aucun identifiant) ou
     *             TRANSPORT
     */
    public synchronized void connecter() throws ExtranetException {
        Identifiants id = identifiants;
        if (id == null) {
            throw new ExtranetException(ExtranetException.Nature.SESSION_ABSENTE,
                    "Aucun identifiant enregistré pour " + session.source());
        }
        try {
            if (id.empreinte != null && id.empreinte.equals(empreinteRefusee)) {
                throw refus("Identifiants déjà refusés par l'extranet : corrigez-les avant un nouvel essai");
            }
            Map<String, String> pot = new LinkedHashMap<>();
            String chemin = conf.cheminConnexion(session.source());
            Page page = suivre(get(origine.resolve(chemin.substring(1)), null, pot), pot);
            Formulaire f = lireFormulaire(page.corps, conf.champIdentifiant(session.source()));
            if (f == null) {
                throw refus("Formulaire de connexion introuvable sur " + chemin + " (réglage "
                        + session.source().prefixeCle() + "_CHEMIN_CONNEXION)");
            }
            if (f.captcha) {
                throw refus("L'extranet demande un captcha : connexion automatique impossible, collez un cookie");
            }
            URI action = f.action == null || f.action.trim().isEmpty() ? page.uri : page.uri.resolve(f.action.trim());
            verifierMemeSite(action);
            Map<String, String> champs = new LinkedHashMap<>(f.autres);
            champs.put(f.champIdentifiant, id.identifiant);
            champs.put(f.champMotDePasse, id.motDePasse);
            Page apres = suivre(post(action, page.uri, champs, pot), pot);
            if (apres.statut >= 400) {
                throw new ExtranetException(ExtranetException.Nature.TRANSPORT,
                        "Connexion : statut " + apres.statut + " sur " + apres.uri.getPath());
            }
            if (DetecteurPageConnexion.estPageConnexion(apres.corps)) {
                empreinteRefusee = id.empreinte;
                throw refus("Identifiant ou mot de passe refusé par l'extranet");
            }
            if (pot.isEmpty()) {
                throw refus("L'extranet n'a ouvert aucune session (aucun cookie reçu)");
            }
            session.definirParConnexion(pot);
        } catch (ExtranetException e) {
            session.connexionEchouee(e.getMessage());
            throw e;
        }
    }

    private static ExtranetException refus(String m) {
        return new ExtranetException(ExtranetException.Nature.CONNEXION_REFUSEE, m);
    }

    /* ============================================================ lecture du formulaire (sans reseau) */

    /** Formulaire qui porte un champ mot de passe ; null s'il n'y en a pas ou s'il n'a pas de champ identifiant. */
    static Formulaire lireFormulaire(String html, String champIdentifiantForce) {
        if (html == null) {
            return null;
        }
        Document d = Jsoup.parse(html);
        Element mdp = d.selectFirst("form input[type=password]");
        if (mdp == null || mdp.attr("name").isEmpty()) {
            return null;
        }
        Element form = mdp.closest("form");
        Formulaire f = new Formulaire();
        f.action = form.attr("action");
        f.champMotDePasse = mdp.attr("name");
        f.captcha = form.outerHtml().toLowerCase().contains("captcha")
                || !d.select(".g-recaptcha, .h-captcha, [data-sitekey]").isEmpty();
        for (Element e : form.select("input[name]")) {
            String nom = e.attr("name");
            String type = e.attr("type").toLowerCase();
            if (e == mdp || nom.equals(f.champMotDePasse)) {
                continue;
            }
            if (champIdentifiantForce != null) {
                if (nom.equals(champIdentifiantForce)) {
                    f.champIdentifiant = nom;
                    continue;
                }
            } else if (f.champIdentifiant == null
                    && (type.isEmpty() || type.equals("text") || type.equals("email") || type.equals("tel"))) {
                f.champIdentifiant = nom;
                continue;
            }
            if (type.equals("hidden") || ((type.isEmpty() || type.equals("text")) && e.hasAttr("value"))) {
                f.autres.put(nom, e.attr("value"));
            } else if ((type.equals("checkbox") || type.equals("radio")) && e.hasAttr("checked")) {
                f.autres.put(nom, e.hasAttr("value") ? e.attr("value") : "on");
            }
        }
        return f.champIdentifiant == null ? null : f;
    }

    /* ============================================================ HTTP */

    private static final class Page {
        final URI uri;
        final int statut;
        final String location;
        final String corps;

        Page(URI uri, int statut, String location, String corps) {
            this.uri = uri;
            this.statut = statut;
            this.location = location;
            this.corps = corps;
        }
    }

    private void verifierMemeSite(URI u) throws ExtranetException {
        if (!Objects.equals(u.getScheme(), origine.getScheme()) || !Objects.equals(u.getHost(), origine.getHost())
                || u.getPort() != origine.getPort()) {
            throw refus("Le formulaire de connexion envoie vers un autre site : refusé");
        }
    }

    private Page suivre(Page p, Map<String, String> pot) throws ExtranetException {
        for (int i = 0; i < REDIRECTIONS_MAX && DetecteurPageConnexion.estRedirection(p.statut)
                && p.location != null; i++) {
            p = get(p.uri.resolve(p.location), p.uri, pot);
        }
        return p;
    }

    private Page get(URI u, URI referer, Map<String, String> pot) throws ExtranetException {
        verifierMemeSite(u);
        return envoyer(HttpRequest.newBuilder(u).GET(), u, referer, pot);
    }

    private Page post(URI u, URI referer, Map<String, String> champs, Map<String, String> pot)
            throws ExtranetException {
        StringBuilder corps = new StringBuilder();
        champs.forEach((k, v) -> {
            if (corps.length() > 0) {
                corps.append('&');
            }
            corps.append(URLEncoder.encode(k, StandardCharsets.UTF_8)).append('=')
                    .append(URLEncoder.encode(v == null ? "" : v, StandardCharsets.UTF_8));
        });
        HttpRequest.Builder b = HttpRequest.newBuilder(u)
                .POST(HttpRequest.BodyPublishers.ofString(corps.toString(), StandardCharsets.UTF_8))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .header("Origin", origine.getScheme() + "://" + origine.getRawAuthority());
        return envoyer(b, u, referer, pot);
    }

    private Page envoyer(HttpRequest.Builder b, URI u, URI referer, Map<String, String> pot) throws ExtranetException {
        b.timeout(delai).header("User-Agent", "Prestige").header("Accept", TransportExtranet.ACCEPT_HTML);
        if (referer != null) {
            b.header("Referer", referer.toString());
        }
        if (!pot.isEmpty()) {
            StringBuilder c = new StringBuilder();
            pot.forEach((k, v) -> c.append(c.length() == 0 ? "" : "; ").append(k).append('=').append(v));
            b.header("Cookie", c.toString());
        }
        long reste = dernierAppel + pauseMs - System.currentTimeMillis();
        try {
            if (dernierAppel > 0 && reste > 0) {
                Thread.sleep(reste);
            }
            HttpResponse<byte[]> r = client.send(b.build(), HttpResponse.BodyHandlers.ofByteArray());
            LOG.log(Level.INFO, "Extranet {0} connexion {1} : {2}",
                    new Object[] { session.source(), u.getPath(), r.statusCode() });
            garderCookies(r.headers().allValues("Set-Cookie"), pot);
            return new Page(u, r.statusCode(), r.headers().firstValue("Location").orElse(null),
                    new String(r.body(), StandardCharsets.UTF_8));
        } catch (IOException e) {
            throw new ExtranetException(ExtranetException.Nature.TRANSPORT, "Extranet injoignable pendant la connexion",
                    e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ExtranetException(ExtranetException.Nature.TRANSPORT, "Connexion interrompue", e);
        } finally {
            dernierAppel = System.currentTimeMillis();
        }
    }

    static void garderCookies(List<String> setCookie, Map<String, String> pot) {
        for (String sc : setCookie) {
            String premier = sc.split(";", 2)[0];
            int eg = premier.indexOf('=');
            if (eg <= 0) {
                continue;
            }
            String nom = premier.substring(0, eg).trim();
            String val = premier.substring(eg + 1).trim();
            String bas = sc.toLowerCase();
            if (val.isEmpty() || bas.contains("max-age=0") || bas.contains("expires=thu, 01 jan 1970")) {
                pot.remove(nom);
            } else if (SessionExtranet.cookieValide(nom, val)) {
                pot.put(nom, val);
            }
        }
    }
}
