package rest.service.posos;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Singleton;
import javax.ws.rs.client.Client;
import javax.ws.rs.client.ClientBuilder;
import javax.ws.rs.client.Entity;
import javax.ws.rs.core.Form;
import javax.ws.rs.core.HttpHeaders;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Passerelle vers Posos : obtention du jeton OAuth2 (client_credentials) et appel d'analyse.
 *
 * <p>
 * Tout passe par le serveur. Le navigateur n'appelle jamais Posos et ne voit jamais d'identifiant : il parle a
 * {@code v1/posos/analyse}, qui est authentifie comme le reste de l'application.
 *
 * <p>
 * Ce qui n'est JAMAIS journalise, par consigne de l'officine : le secret, le jeton, et le corps des echanges - la
 * demande porte des produits et un contexte clinique. Les journaux ne contiennent donc que l'adresse appelee, le code
 * de retour et le nombre de produits. En cas d'erreur, le message de Posos est remonte a l'ecran mais n'est pas ecrit
 * dans le journal, faute de pouvoir garantir qu'il ne repete pas la demande.
 */
@Singleton
public class PososClient {

    private static final Logger LOG = Logger.getLogger(PososClient.class.getName());

    /** Marge de securite : on renouvelle le jeton avant son echeance plutot que de risquer un 401. */
    static final long MARGE_EXPIRATION_S = 60;

    private volatile String jeton;
    private volatile Instant jetonExpireA;
    /**
     * Empreinte de la configuration qui a servi a obtenir le jeton en cache. Sans elle, changer les identifiants cote
     * serveur laissait la passerelle presenter l'ancien jeton jusqu'a son echeance - une heure durant laquelle une
     * revocation restait sans effet. C'est une empreinte, jamais les valeurs.
     */
    private volatile String empreinteConfig;

    /** Remplacable dans les tests pour eviter tout appel reseau. */
    private Appelant appelant = new AppelantHttp();

    /** Ce qui parle au reseau, isole pour que la logique soit testable sans serveur. */
    interface Appelant {
        Reponse poster(String url, Map<String, String> entetes, Form formulaire, int delaiMs);

        Reponse posterJson(String url, Map<String, String> entetes, String corps, int delaiMs);
    }

    static final class Reponse {
        final int statut;
        final String corps;

        Reponse(int statut, String corps) {
            this.statut = statut;
            this.corps = corps == null ? "" : corps;
        }
    }

    void setAppelant(Appelant appelant) {
        this.appelant = appelant;
    }

    /** Oublie le jeton en cache : utilise apres un 401, apres un changement de configuration, et par les tests. */
    void oublierJeton() {
        this.jeton = null;
        this.jetonExpireA = null;
        this.empreinteConfig = null;
    }

    /**
     * Empreinte de l'adresse et des identifiants. Sert uniquement a detecter un changement de configuration : ni
     * l'empreinte ni les valeurs ne sont journalisees, et l'empreinte ne permet pas de retrouver le secret.
     */
    private static String empreinte(PososConfiguration config) {
        String matiere = String.valueOf(config.url()) + '\n' + String.valueOf(config.clientId()) + '\n'
                + String.valueOf(config.clientSecret()) + '\n' + String.valueOf(config.urlJeton());
        try {
            byte[] digest = java.security.MessageDigest.getInstance("SHA-256")
                    .digest(matiere.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(digest);
        } catch (Exception e) {
            // Sans empreinte calculable, on prefere ne rien garder en cache que garder un jeton peut-etre perime.
            return null;
        }
    }

    /** Etat de la passerelle, sans aucun secret : de quoi diagnostiquer une configuration depuis l'ecran. */
    public Map<String, Object> statut(PososConfiguration config) {
        Map<String, Object> etat = new LinkedHashMap<>(config.diagnostic());
        etat.put("jetonEnCache", jetonValide(config));
        return etat;
    }

    private boolean jetonValide(PososConfiguration config) {
        if (jeton == null || jetonExpireA == null || !Instant.now().isBefore(jetonExpireA)) {
            return false;
        }
        String actuelle = empreinte(config);
        return actuelle != null && actuelle.equals(empreinteConfig);
    }

    /**
     * Jeton d'acces, pris en cache tant qu'il est valide. Renvoie {@code null} si Posos refuse : l'appelant doit alors
     * rendre un resultat indisponible, jamais laisser passer l'analyse en silence.
     */
    synchronized String jeton(PososConfiguration config) {
        if (jetonValide(config)) {
            return jeton;
        }
        // La configuration a change, ou le jeton a expire : on repart de zero plutot que de melanger.
        oublierJeton();
        Form formulaire = new Form().param("grant_type", "client_credentials");
        Map<String, String> entetes = new LinkedHashMap<>();
        if (config.jetonEnBasic()) {
            String paire = config.clientId() + ":" + config.clientSecret();
            entetes.put(HttpHeaders.AUTHORIZATION,
                    "Basic " + Base64.getEncoder().encodeToString(paire.getBytes(StandardCharsets.UTF_8)));
        } else {
            formulaire.param("client_id", config.clientId()).param("client_secret", config.clientSecret());
        }
        if (config.scope() != null) {
            formulaire.param("scope", config.scope());
        }
        Reponse reponse = appelant.poster(config.urlJeton(), entetes, formulaire, config.delaiMs());
        if (reponse == null || reponse.statut < 200 || reponse.statut >= 300) {
            // Ni le corps ni les identifiants : seulement l'adresse et le code.
            LOG.log(Level.WARNING, "Posos : jeton refuse par {0} (code {1})",
                    new Object[] { config.urlJeton(), reponse == null ? "aucune reponse" : reponse.statut });
            oublierJeton();
            return null;
        }
        try {
            JSONObject json = new JSONObject(reponse.corps);
            String valeur = premierTexte(json, "access_token", "accessToken", "token", "id_token");
            if (valeur == null || valeur.trim().isEmpty()) {
                LOG.log(Level.WARNING, "Posos : reponse de jeton sans access_token ({0})", config.urlJeton());
                oublierJeton();
                return null;
            }
            long duree = json.optLong("expires_in", json.optLong("expiresIn", 0L));
            if (duree <= 0) {
                duree = TimeUnit.MINUTES.toSeconds(5);
            }
            this.jeton = valeur.trim();
            this.jetonExpireA = Instant.now().plusSeconds(Math.max(1, duree - MARGE_EXPIRATION_S));
            this.empreinteConfig = empreinte(config);
            return this.jeton;
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Posos : reponse de jeton illisible ({0})", config.urlJeton());
            oublierJeton();
            return null;
        }
    }

    /**
     * Analyse une demande. Un refus, une panne ou une configuration absente donnent un resultat « indisponible » avec
     * un message lisible : jamais une exception qui remonterait a la caisse, et jamais un resultat vide qui laisserait
     * croire qu'il n'y a pas d'alerte.
     */
    public PososResultat analyser(PososConfiguration config, PososDemande demande) {
        if (config != null && config.modeDemonstration()) {
            /* Aucun appel reseau : les regles preparees, et l'avertissement sur chaque resultat. */
            PososDemonstration demo = PososDemonstration.chargee();
            PososResultat r = demo.analyser(demande);
            r.setDemonstration(true);
            r.setAvertissement(demo.avertissement());
            return r;
        }
        if (config == null || !config.estConfiguree()) {
            return PososResultat.indisponible("Posos n'est pas configuré sur ce poste. "
                    + "Voir le gestionnaire : adresse et identifiants sont à renseigner côté serveur.");
        }
        if (demande == null || demande.getProduits().isEmpty()) {
            return PososResultat.indisponible("Aucun produit à analyser.");
        }
        String acces = jeton(config);
        if (acces == null) {
            return PososResultat.indisponible("Posos a refusé la connexion. Vérifiez les identifiants côté serveur.");
        }
        PososResultat resultat = appeler(config, demande, acces);
        return resultat;
    }

    private PososResultat appeler(PososConfiguration config, PososDemande demande, String acces) {
        Map<String, String> entetes = new LinkedHashMap<>();
        entetes.put(HttpHeaders.AUTHORIZATION, "Bearer " + acces);
        String corps = corpsDeLaDemande(demande).toString();
        Reponse reponse = appelant.posterJson(config.urlAnalyse(), entetes, corps, config.delaiMs());
        if (reponse == null) {
            LOG.log(Level.WARNING, "Posos : aucune reponse de {0}", config.urlAnalyse());
            return PososResultat.indisponible("Posos n'a pas répondu. L'analyse n'a pas pu être faite.");
        }
        if (reponse.statut == 401 || reponse.statut == 403) {
            // Le jeton a pu expirer cote Posos avant son echeance annoncee : on le jette et on retente une fois.
            oublierJeton();
            String nouveau = jeton(config);
            if (nouveau != null) {
                entetes.put(HttpHeaders.AUTHORIZATION, "Bearer " + nouveau);
                reponse = appelant.posterJson(config.urlAnalyse(), entetes, corps, config.delaiMs());
            }
        }
        if (reponse == null || reponse.statut < 200 || reponse.statut >= 300) {
            int code = reponse == null ? 0 : reponse.statut;
            LOG.log(Level.WARNING, "Posos : analyse refusee par {0} (code {1})",
                    new Object[] { config.urlAnalyse(), code });
            return PososResultat.indisponible("Posos a refusé l'analyse (code " + code + ").");
        }
        try {
            LOG.log(Level.INFO, "Posos : analyse de {0} produit(s), code {1}",
                    new Object[] { demande.getProduits().size(), reponse.statut });
            return PososLecteur.lire(new JSONObject(reponse.corps));
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Posos : reponse d'analyse illisible ({0})", config.urlAnalyse());
            return PososResultat.indisponible("La réponse de Posos n'a pas pu être lue.");
        }
    }

    /**
     * Corps de la demande. Les produits sont identifies par leur NOM, choix de l'officine. Aucune donnee identifiante
     * du patient n'y figure : le contexte est clinique seulement.
     */
    static JSONObject corpsDeLaDemande(PososDemande demande) {
        JSONArray produits = new JSONArray();
        for (PososDemande.Produit p : demande.getProduits()) {
            if (p == null || p.getNom() == null || p.getNom().trim().isEmpty()) {
                continue;
            }
            JSONObject o = new JSONObject();
            o.put("name", p.getNom().trim());
            if (p.getQuantite() != null) {
                o.put("quantity", p.getQuantite());
            }
            if (p.getPosologie() != null && !p.getPosologie().trim().isEmpty()) {
                o.put("posology", p.getPosologie().trim());
            }
            if (p.getCip() != null && !p.getCip().trim().isEmpty()) {
                o.put("cip", p.getCip().trim());
            }
            produits.put(o);
        }
        JSONObject corps = new JSONObject();
        corps.put("products", produits);
        PososDemande.Contexte c = demande.getContexte();
        if (c != null) {
            JSONObject patient = new JSONObject();
            if (c.getAge() != null) {
                patient.put("age", c.getAge());
            }
            if (c.getSexe() != null && !c.getSexe().trim().isEmpty()) {
                patient.put("sex", c.getSexe().trim().toUpperCase());
            }
            ajouter(patient, "pregnant", c.getGrossesse());
            ajouter(patient, "breastfeeding", c.getAllaitement());
            ajouter(patient, "renalImpairment", c.getInsuffisanceRenale());
            ajouter(patient, "hepaticImpairment", c.getInsuffisanceHepatique());
            if (!patient.isEmpty()) {
                corps.put("patient", patient);
            }
        }
        return corps;
    }

    private static void ajouter(JSONObject cible, String cle, Boolean valeur) {
        if (valeur != null) {
            cible.put(cle, valeur.booleanValue());
        }
    }

    private static String premierTexte(JSONObject json, String... cles) {
        for (String cle : cles) {
            String v = json.optString(cle, null);
            if (v != null && !v.trim().isEmpty()) {
                return v;
            }
        }
        return null;
    }

    /** Appelant reel, sur le client JAX-RS - la pile deja utilisee par les autres passerelles du logiciel. */
    static final class AppelantHttp implements Appelant {

        @Override
        public Reponse poster(String url, Map<String, String> entetes, Form formulaire, int delaiMs) {
            Client client = null;
            try {
                client = client(delaiMs);
                javax.ws.rs.client.Invocation.Builder requete = client.target(url).request(MediaType.APPLICATION_JSON);
                entetes.forEach(requete::header);
                try (Response r = requete.post(Entity.entity(formulaire, MediaType.APPLICATION_FORM_URLENCODED_TYPE))) {
                    return new Reponse(r.getStatus(), r.readEntity(String.class));
                }
            } catch (Exception e) {
                LOG.log(Level.WARNING, "Posos : appel de jeton impossible ({0})", url);
                return null;
            } finally {
                fermer(client);
            }
        }

        @Override
        public Reponse posterJson(String url, Map<String, String> entetes, String corps, int delaiMs) {
            Client client = null;
            try {
                client = client(delaiMs);
                javax.ws.rs.client.Invocation.Builder requete = client.target(url).request(MediaType.APPLICATION_JSON);
                entetes.forEach(requete::header);
                try (Response r = requete.post(Entity.entity(corps, MediaType.APPLICATION_JSON_TYPE))) {
                    return new Reponse(r.getStatus(), r.readEntity(String.class));
                }
            } catch (Exception e) {
                LOG.log(Level.WARNING, "Posos : appel d'analyse impossible ({0})", url);
                return null;
            } finally {
                fermer(client);
            }
        }

        private static Client client(int delaiMs) {
            return ClientBuilder.newBuilder().connectTimeout(delaiMs, TimeUnit.MILLISECONDS)
                    .readTimeout(delaiMs, TimeUnit.MILLISECONDS).build();
        }

        private static void fermer(Client client) {
            if (client != null) {
                try {
                    client.close();
                } catch (Exception ignore) {
                    // rien a faire : la fermeture d'un client ne doit pas masquer le resultat de l'appel
                }
            }
        }
    }
}
