package rest.service.extranet.commun;

import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.json.JSONObject;

/**
 * Lectures de listes en arriere-plan (retours 8 et 9 du 08/11) : la demande rend la main tout de suite, l'ecran suit
 * l'etat. Une seule lecture a la fois par liste (cle « famille/code ») : un second clic, d'un autre poste aussi, suit
 * la lecture deja lancee au lieu d'en lancer une autre (moins d'appels a l'extranet). Le resultat d'une lecture finie
 * reste consultable {@link #GARDE_SECONDES} secondes. Etat en memoire du serveur : rien n'est ecrit en base ici (la
 * collecte garde son propre journal). Le texte des resultats ne porte ni cookie ni identifiant (messages des
 * collectes).
 */
public final class EtatLectures {

    /** Duree pendant laquelle le resultat d'une lecture finie reste lisible. */
    public static final long GARDE_SECONDES = 1800;

    /** Une lecture : debut, demandeur, fin et resultat (null tant qu'elle tourne). */
    public static final class Lecture {
        public final String cle;
        public final String utilisateur;
        public final Instant debut;
        volatile Instant fin;
        volatile JSONObject resultat;
        /** appels a l'extranet deja faits, et total prevu (0 : inconnu) ; option A du 09/11 */
        final java.util.concurrent.atomic.AtomicInteger appels = new java.util.concurrent.atomic.AtomicInteger();
        volatile int prevus;

        Lecture(String cle, String utilisateur, Instant debut) {
            this.cle = cle;
            this.utilisateur = utilisateur;
            this.debut = debut;
        }

        public boolean enCours() {
            return fin == null;
        }

        public JSONObject toJson(Instant maintenant) {
            JSONObject o = new JSONObject().put("cle", cle).put("enCours", enCours()).put("debut", debut.toString())
                    .put("utilisateur", utilisateur == null ? JSONObject.NULL : utilisateur)
                    .put("secondes", java.time.Duration.between(debut, fin == null ? maintenant : fin).getSeconds())
                    .put("appels", appels.get()).put("prevus", prevus > 0 && appels.get() <= prevus ? prevus : 0);
            if (fin != null) {
                o.put("fin", fin.toString()).put("resultat", resultat == null ? new JSONObject() : resultat);
            }
            return o;
        }
    }

    private static final EtatLectures SERVEUR = new EtatLectures(Clock.systemUTC());

    private final Map<String, Lecture> lectures = new ConcurrentHashMap<>();
    private final Clock horloge;

    EtatLectures(Clock horloge) {
        this.horloge = horloge;
    }

    public static EtatLectures duServeur() {
        return SERVEUR;
    }

    public static String cle(String famille, String code) {
        return (famille == null ? "" : famille.trim().toLowerCase(java.util.Locale.ROOT)) + "/"
                + (code == null ? "" : code.trim().toUpperCase(java.util.Locale.ROOT));
    }

    /**
     * Demarre une lecture si aucune ne tourne pour cette cle.
     *
     * @return la nouvelle lecture, ou null si une lecture tourne deja (la suivre avec {@link #etat})
     */
    public Lecture demarrer(String cle, String utilisateur) {
        Lecture nouvelle = new Lecture(cle, utilisateur, horloge.instant());
        Lecture r = lectures.compute(cle,
                (k, ancienne) -> ancienne != null && ancienne.enCours() ? ancienne : nouvelle);
        return r == nouvelle ? nouvelle : null;
    }

    /** Fin d'une lecture : resultat garde ; sans effet si la lecture a deja ete terminee ou remplacee. */
    public void terminer(Lecture l, JSONObject resultat) {
        if (l == null || l.fin != null || lectures.get(l.cle) != l) {
            return;
        }
        l.resultat = resultat;
        l.fin = horloge.instant();
    }

    /**
     * Lecture faite sur ce fil sous la cle (rafraichissement automatique, option A du 09/11) : si une lecture de la
     * meme liste tourne deja (clic d'un poste, autre passage de la tache), rien n'est lance et null est rendu ; sinon
     * la lecture est suivie (avancement, ecran) comme une lecture lancee a l'ecran, et son resultat garde.
     */
    public JSONObject executer(String cle, String utilisateur, java.util.function.Supplier<JSONObject> lecture) {
        Lecture l = demarrer(cle, utilisateur);
        if (l == null) {
            return null;
        }
        JSONObject r = null;
        Avancement.suivre(l);
        try {
            r = lecture.get();
            return r;
        } catch (RuntimeException e) {
            r = new JSONObject().put("success", false).put("msg", "Erreur pendant la lecture : à relancer");
            throw e;
        } finally {
            Avancement.finir();
            terminer(l, r);
        }
    }

    /** Lecture en cours ou finie depuis moins de {@link #GARDE_SECONDES} ; null sinon. */
    public Lecture etat(String cle) {
        Lecture l = lectures.get(cle);
        if (l != null && l.fin != null && l.fin.plusSeconds(GARDE_SECONDES).isBefore(horloge.instant())) {
            lectures.remove(cle, l);
            return null;
        }
        return l;
    }

    public Instant maintenant() {
        return horloge.instant();
    }
}
