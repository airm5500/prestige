package rest.service.impl;

import java.util.Iterator;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.function.Supplier;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.json.JSONObject;

/**
 * Retours du 10/10 (journal du support : « blocage » de 21 a 39 s sur l'envoi PharmaML) : l'envoi d'une commande au
 * grossiste ne retient plus l'ecran. Il part en arriere-plan ; l'ecran recoit un jeton et demande ou en est l'envoi
 * jusqu'a la reponse, qui est exactement celle d'avant (meme objet JSON).
 * <p>
 * Une commande deja en cours d'envoi n'est jamais renvoyee : une deuxieme demande pendant l'envoi reprend le meme jeton
 * (pas de commande en double chez le grossiste). Les envois termines sont gardes 30 minutes.
 */
public final class EnvoisPharmaMlEnCours {

    private static final Logger LOG = Logger.getLogger(EnvoisPharmaMlEnCours.class.getName());
    static final long CONSERVATION_MS = 30L * 60 * 1000;

    static final class Envoi {
        final String cle;
        final long debut = System.currentTimeMillis();
        volatile JSONObject resultat;
        volatile long fin;

        Envoi(String cle) {
            this.cle = cle;
        }
    }

    private static final Map<String, Envoi> ENVOIS = new ConcurrentHashMap<>();

    private EnvoisPharmaMlEnCours() {
    }

    /**
     * Lance l'envoi (cle : la commande ou la suggestion) ; rend le jeton a suivre. Si un envoi de cette cle est deja en
     * cours, rend son jeton sans rien relancer.
     */
    public static synchronized String lancer(String cle, ExecutorService executeur, Supplier<JSONObject> envoi) {
        purger();
        for (Map.Entry<String, Envoi> e : ENVOIS.entrySet()) {
            if (e.getValue().cle.equals(cle) && e.getValue().resultat == null) {
                return e.getKey();
            }
        }
        String jeton = UUID.randomUUID().toString();
        Envoi en = new Envoi(cle);
        ENVOIS.put(jeton, en);
        executeur.submit(() -> {
            JSONObject r;
            try {
                r = envoi.get();
                if (r == null) {
                    r = new JSONObject().put("success", false).put("msg", "L'envoi n'a pas abouti.");
                }
            } catch (RuntimeException | Error ex) {
                LOG.log(Level.SEVERE, "envoi PharmaML en arriere-plan", ex);
                r = new JSONObject().put("success", false).put("msg", "L'envoi n'a pas abouti (erreur du serveur).");
            }
            en.fin = System.currentTimeMillis();
            en.resultat = r;
        });
        return jeton;
    }

    /** Ou en est l'envoi : en cours (avec la duree), termine (resultat de l'envoi), ou inconnu. */
    public static JSONObject etat(String jeton) {
        Envoi en = jeton == null ? null : ENVOIS.get(jeton);
        if (en == null) {
            return new JSONObject().put("success", false).put("inconnu", true).put("msg",
                    "Cet envoi n'est plus suivi (serveur redémarré ?) : regardez le statut PharmaML de la commande.");
        }
        if (en.resultat == null) {
            return new JSONObject().put("success", true).put("enCours", true).put("secondes",
                    (System.currentTimeMillis() - en.debut) / 1000);
        }
        return new JSONObject(en.resultat.toString()).put("termine", true);
    }

    private static void purger() {
        long maintenant = System.currentTimeMillis();
        for (Iterator<Envoi> i = ENVOIS.values().iterator(); i.hasNext();) {
            Envoi e = i.next();
            if (e.resultat != null && maintenant - e.fin > CONSERVATION_MS) {
                i.remove();
            }
        }
    }
}
