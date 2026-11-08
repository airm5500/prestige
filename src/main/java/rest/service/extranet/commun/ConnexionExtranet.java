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
 * <li>seul POST du connecteur, et seulement vers l'action du formulaire de connexion, sur le domaine de l'extranet (ex.
 * auth.ubipharm.com pour client-cotedivoire.ubipharm.com : connexion unique) ;</li>
 * <li>cookies ranges par serveur : ceux du serveur d'authentification ne partent jamais vers l'extranet ;</li>
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
        /** Page qui porte le formulaire (chemin, « / » si vide) et champ identifiant impose (null : detection). */
        final String pageConnexion;
        final String champIdentifiant;

        public Identifiants(String identifiant, String motDePasse, String empreinte) {
            this(identifiant, motDePasse, empreinte, null, null);
        }

        public Identifiants(String identifiant, String motDePasse, String empreinte, String pageConnexion,
                String champIdentifiant) {
            this.identifiant = identifiant;
            this.motDePasse = motDePasse;
            this.empreinte = empreinte;
            this.pageConnexion = pageConnexion == null || pageConnexion.trim().isEmpty() ? "/" : pageConnexion.trim();
            this.champIdentifiant = champIdentifiant == null || champIdentifiant.trim().isEmpty() ? null
                    : champIdentifiant.trim();
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
        return identifiants != null || passerelle != null;
    }

    /**
     * Entree par un autre extranet (Mayite par Ubipharm) : rend le HTML de la page de l'autre extranet qui porte le
     * formulaire cache vers celui-ci. Lue avec la session de l'autre extranet (reconnexion comprise).
     */
    public interface Passerelle {
        String page() throws ExtranetException;
    }

    private volatile Passerelle passerelle;

    public void passerelle(Passerelle p) {
        this.passerelle = p;
    }

    /**
     * Connexion par passerelle : le formulaire cache rendu par l'autre extranet est envoye tel quel (aucune valeur
     * ajoutee ni journalisee), seulement s'il vise ce site ; la session est faite des cookies recus.
     */
    private void connecterParPasserelle(Passerelle p) throws ExtranetException {
        Document d = Jsoup.parse(p.page());
        Element f = d.selectFirst("form[action]");
        if (f == null) {
            throw refus("Passerelle " + session.source() + " : formulaire d'entrée introuvable");
        }
        URI action;
        try {
            action = URI.create(f.attr("action").trim());
        } catch (IllegalArgumentException e) {
            throw refus("Passerelle " + session.source() + " : adresse d'entrée illisible");
        }
        if (!action.isAbsolute() || !memeDomaine(origine, action)) {
            throw refus("Passerelle " + session.source() + " : le formulaire envoie vers un autre site, refusé");
        }
        Map<String, String> champs = new LinkedHashMap<>();
        for (Element e : f.select("input[name]")) {
            champs.put(e.attr("name"), e.attr("value"));
        }
        if (champs.isEmpty()) {
            throw refus("Passerelle " + session.source() + " : formulaire d'entrée vide");
        }
        Bocal pot = new Bocal();
        Page apres = suivre(post(action, origine, champs, pot), pot);
        if (apres.statut >= 400) {
            throw new ExtranetException(ExtranetException.Nature.TRANSPORT,
                    "Entrée " + session.source() + " : statut " + apres.statut + " sur " + apres.uri.getPath());
        }
        if (DetecteurPageConnexion.estPageConnexion(apres.corps)) {
            throw refus(session.source() + " a refusé l'entrée transmise par " + session.source().passerelle());
        }
        Map<String, String> ouverte = pot.pour(origine.getHost());
        if (ouverte.isEmpty()) {
            throw refus(session.source() + " n'a ouvert aucune session (aucun cookie reçu)");
        }
        session.definirParConnexion(ouverte);
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
        Passerelle pas = passerelle;
        if (id == null && pas != null) {
            try {
                connecterParPasserelle(pas);
                return;
            } catch (ExtranetException e) {
                session.connexionEchouee(e.getMessage());
                throw e;
            }
        }
        if (id == null) {
            throw new ExtranetException(ExtranetException.Nature.SESSION_ABSENTE,
                    "Aucun identifiant enregistré pour " + session.source());
        }
        try {
            if (id.empreinte != null && id.empreinte.equals(empreinteRefusee)) {
                throw refus("Identifiants déjà refusés par l'extranet : corrigez-les avant un nouvel essai");
            }
            Bocal pot = new Bocal();
            String chemin = id.pageConnexion;
            URI depart = chemin.startsWith("/") ? origine.resolve(chemin.substring(1)) : URI.create(chemin);
            Page page = suivre(get(depart, null, pot), pot);
            Formulaire f = lireFormulaire(page.corps, id.champIdentifiant);
            if (f == null) {
                throw refus("Formulaire de connexion introuvable sur " + chemin
                        + " : indiquez la page de connexion dans l'onglet Sessions");
            }
            if (f.captcha) {
                throw refus("L'extranet demande un captcha : connexion automatique impossible, collez un cookie");
            }
            boolean sansAction = f.action == null || f.action.trim().isEmpty();
            String ajax = session.source().actionConnexionAjax();
            boolean json = sansAction && ajax != null;
            URI action = json ? page.uri.resolve(ajax) : sansAction ? page.uri : page.uri.resolve(f.action.trim());
            verifierMemeSite(action);
            Map<String, String> champs = new LinkedHashMap<>(f.autres);
            champs.put(f.champIdentifiant, id.identifiant);
            champs.put(f.champMotDePasse, id.motDePasse);
            if (json) {
                /* envoi du site en AJAX : reponse JSON, pas de page a suivre */
                lireReponseJson(post(action, page.uri, champs, pot, true), id);
                Map<String, String> ouverte = pot.pour(origine.getHost());
                if (ouverte.isEmpty()) {
                    throw refus("L'extranet n'a ouvert aucune session (aucun cookie reçu)");
                }
                session.definirParConnexion(ouverte);
                return;
            }
            Page apres = suivre(post(action, page.uri, champs, pot), pot);
            if (apres.statut >= 400) {
                throw new ExtranetException(ExtranetException.Nature.TRANSPORT,
                        "Connexion : statut " + apres.statut + " sur " + apres.uri.getPath());
            }
            if (DetecteurPageConnexion.estPageConnexion(apres.corps)) {
                empreinteRefusee = id.empreinte;
                throw refus("Identifiant ou mot de passe refusé par l'extranet");
            }
            Map<String, String> session0 = pot.pour(origine.getHost());
            if (session0.isEmpty()) {
                throw refus("L'extranet n'a ouvert aucune session (aucun cookie reçu)");
            }
            session.definirParConnexion(session0);
        } catch (ExtranetException e) {
            session.connexionEchouee(e.getMessage());
            throw e;
        }
    }

    /**
     * Reponse JSON d'une connexion AJAX (TEDIS) : {succes} connecte ; {error} identifiants refuses (plus retentes avant
     * modification) ; {errorServer} ou {erreurServeurIndisponible} panne de l'extranet (nouvel essai permis) ; tout
     * autre contenu refuse. Le message de l'extranet n'est jamais journalise.
     */
    private void lireReponseJson(Page r, Identifiants id) throws ExtranetException {
        if (r.statut >= 400) {
            throw new ExtranetException(ExtranetException.Nature.TRANSPORT,
                    "Connexion : statut " + r.statut + " sur " + r.uri.getPath());
        }
        org.json.JSONObject o;
        try {
            o = new org.json.JSONObject(r.corps == null ? "" : r.corps.trim());
        } catch (org.json.JSONException e) {
            throw refus("Réponse de connexion inattendue (pas du JSON) : connexion impossible");
        }
        String msg = o.optString("msg", "").trim();
        msg = msg.length() > 200 ? msg.substring(0, 200) : msg;
        if (o.optBoolean("errorServer") || o.optBoolean("erreurServeurIndisponible")) {
            throw new ExtranetException(ExtranetException.Nature.TRANSPORT,
                    "Extranet indisponible" + (msg.isEmpty() ? "" : " : " + msg));
        }
        if (o.optBoolean("error")) {
            empreinteRefusee = id.empreinte;
            throw refus("Identifiant ou mot de passe refusé par l'extranet" + (msg.isEmpty() ? "" : " : " + msg));
        }
        if (!o.optBoolean("succes")) {
            throw refus("Réponse de connexion inattendue : connexion impossible");
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
            boolean saisissable = type.isEmpty() || type.equals("text") || type.equals("email") || type.equals("tel");
            if (champIdentifiantForce != null) {
                if (saisissable && nom.equals(champIdentifiantForce)) {
                    f.champIdentifiant = nom;
                    continue;
                }
            } else if (f.champIdentifiant == null && saisissable) {
                f.champIdentifiant = nom;
                continue;
            }
            if (type.equals("hidden") || ((type.isEmpty() || type.equals("text")) && e.hasAttr("value"))) {
                f.autres.put(nom, e.attr("value"));
            } else if ((type.equals("checkbox") || type.equals("radio")) && e.hasAttr("checked")) {
                f.autres.put(nom, e.hasAttr("value") ? e.attr("value") : "on");
            }
        }
        if (f.champIdentifiant == null && champIdentifiantForce != null) {
            /* case reglee absente de ce formulaire (reglage errone) : detection automatique */
            return lireFormulaire(html, null);
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
        if (!memeDomaine(origine, u)) {
            throw refus("La connexion envoie vers un autre site (" + u.getHost() + ") : refusé");
        }
    }

    /**
     * Vrai si {@code u} est sur le site de l'extranet, ou sur un autre serveur du meme domaine avec le meme schema (ex.
     * auth.ubipharm.com et client-cotedivoire.ubipharm.com). Une adresse IP ne vaut que pour elle-meme.
     */
    public static boolean memeDomaine(URI extranet, URI u) {
        if (u == null || u.getHost() == null || !Objects.equals(u.getScheme(), extranet.getScheme())) {
            return false;
        }
        String a = extranet.getHost().toLowerCase(), b = u.getHost().toLowerCase();
        if (a.equals(b)) {
            return u.getPort() == extranet.getPort();
        }
        String d = domaine(a);
        return d != null && d.equals(domaine(b));
    }

    /** Deux derniers libelles du nom (ubipharm.com) ; null pour une adresse IP ou un nom sans point. */
    static String domaine(String hote) {
        if (hote == null || hote.matches("[0-9.]+") || hote.contains(":")) {
            return null;
        }
        String[] l = hote.split("\\.");
        return l.length < 2 ? null : l[l.length - 2] + "." + l[l.length - 1];
    }

    /** Cookies de la connexion, ranges par serveur (et par domaine pour un cookie « Domain= »). */
    static final class Bocal {
        private final Map<String, Map<String, String>> parCle = new LinkedHashMap<>();

        void recevoir(URI u, List<String> setCookie) {
            String hote = u.getHost().toLowerCase();
            for (String sc : setCookie) {
                String cle = hote;
                for (String attr : sc.split(";")) {
                    String x = attr.trim().toLowerCase();
                    if (x.startsWith("domain=")) {
                        String dom = x.substring(7).trim();
                        while (dom.startsWith(".")) {
                            dom = dom.substring(1);
                        }
                        /* un serveur ne pose un cookie que pour son propre domaine, jamais pour « com » */
                        if (dom.contains(".") && (hote.equals(dom) || hote.endsWith("." + dom))) {
                            cle = "." + dom;
                        }
                    }
                }
                garderCookies(List.of(sc), parCle.computeIfAbsent(cle, k -> new LinkedHashMap<>()));
            }
        }

        /** Cookies a envoyer a ce serveur : ceux de son domaine, puis les siens. */
        Map<String, String> pour(String hote) {
            String h = hote.toLowerCase();
            Map<String, String> m = new LinkedHashMap<>();
            parCle.forEach((cle, v) -> {
                if (cle.startsWith(".") && (h.equals(cle.substring(1)) || h.endsWith(cle))) {
                    m.putAll(v);
                }
            });
            Map<String, String> propres = parCle.get(h);
            if (propres != null) {
                m.putAll(propres);
            }
            return m;
        }
    }

    private Page suivre(Page p, Bocal pot) throws ExtranetException {
        for (int i = 0; i < REDIRECTIONS_MAX && DetecteurPageConnexion.estRedirection(p.statut)
                && p.location != null; i++) {
            p = get(p.uri.resolve(p.location), p.uri, pot);
        }
        return p;
    }

    private Page get(URI u, URI referer, Bocal pot) throws ExtranetException {
        verifierMemeSite(u);
        return envoyer(HttpRequest.newBuilder(u).GET(), u, referer, pot);
    }

    private Page post(URI u, URI referer, Map<String, String> champs, Bocal pot) throws ExtranetException {
        return post(u, referer, champs, pot, false);
    }

    private Page post(URI u, URI referer, Map<String, String> champs, Bocal pot, boolean ajax)
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
                .header("Origin", referer.getScheme() + "://" + referer.getRawAuthority());
        if (ajax) {
            b.header("X-Requested-With", "XMLHttpRequest");
        }
        return envoyer(b, u, referer, pot, ajax ? "application/json, text/javascript, */*; q=0.01" : null);
    }

    private Page envoyer(HttpRequest.Builder b, URI u, URI referer, Bocal bocal) throws ExtranetException {
        return envoyer(b, u, referer, bocal, null);
    }

    private Page envoyer(HttpRequest.Builder b, URI u, URI referer, Bocal bocal, String accept)
            throws ExtranetException {
        Map<String, String> pot = bocal.pour(u.getHost());
        b.timeout(delai).header("User-Agent", "Prestige").header("Accept",
                accept != null ? accept : TransportExtranet.ACCEPT_HTML);
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
            LOG.log(Level.INFO, "Extranet {0} connexion {1}{2} : {3}",
                    new Object[] { session.source(), u.getHost(), u.getPath(), r.statusCode() });
            bocal.recevoir(u, r.headers().allValues("Set-Cookie"));
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
