package job;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.security.PermitAll;
import javax.ejb.EJB;
import javax.ejb.Singleton;
import javax.ejb.ConcurrencyManagement;
import javax.ejb.ConcurrencyManagementType;
import org.apache.commons.lang3.StringUtils;
import rest.service.SupportEventService;

/**
 * Duree des clotures de vente.
 *
 * <p>
 * L'officine remonte un « Veuillez patienter » qui tourne longtemps sans rien donner, surtout en fin de journee, suivi
 * d'une erreur sur une vente pourtant encaissee. L'hypothese est un ralentissement general, pas un defaut de la cloture
 * ; mais personne ne mesure la duree reelle d'une cloture, on ne peut donc rien trancher.
 *
 * <p>
 * Ce compteur repond a une question simple : <b>combien de temps prend une cloture, et a quelle heure ?</b> Il retient
 * le nombre de clotures, la duree la plus longue et l'heure ou elle a eu lieu, et signale au support celles qui
 * depassent le seuil. Si les depassements se concentrent a 18 h, la cause est le ralentissement, et non la caisse.
 *
 * <p>
 * Rien ici ne doit peser sur une vente : les compteurs sont en memoire, l'enregistrement de l'evenement est laisse au
 * service du support, qui est asynchrone, et toute erreur de mesure est avalee.
 *
 * @author koben
 */
@Singleton
@ConcurrencyManagement(ConcurrencyManagementType.BEAN)
@PermitAll
public class SupportClotureMonitor {

    private static final Logger LOG = Logger.getLogger(SupportClotureMonitor.class.getName());

    /** Seuil par defaut, en millisecondes. Au-dela, la caissiere attend visiblement. */
    private static final int SEUIL_DEFAUT_MS = 5000;

    @EJB
    private SupportEventService supportEventService;
    @javax.inject.Inject
    private config.AppConfig appConfig;

    private final AtomicLong nombre = new AtomicLong();
    private final AtomicLong nombreLentes = new AtomicLong();
    private final AtomicLong cumulMs = new AtomicLong();
    private final AtomicLong plusLongueMs = new AtomicLong();
    private volatile String heurePlusLongue = "";
    private volatile String cheminPlusLongue = "";

    /** Nombre de clotures lentes par heure de la journee : c'est la repartition qui fait le diagnostic. */
    private final Map<Integer, AtomicLong> lentesParHeure = new ConcurrentHashMap<>();

    /**
     * Enregistre la duree d'une cloture. Appele depuis le point d'entree REST, dans un {@code finally} : la mesure est
     * prise que la cloture ait abouti ou non.
     *
     * @param chemin
     *            le point d'entree concerne, pour distinguer comptant et assurance
     * @param dureeMs
     *            duree mesuree cote serveur, en millisecondes
     */
    public void enregistrer(String chemin, long dureeMs) {
        try {
            if (dureeMs < 0) {
                return;
            }
            nombre.incrementAndGet();
            cumulMs.addAndGet(dureeMs);
            majPlusLongue(chemin, dureeMs);

            int seuil = seuilMs();
            if (dureeMs < seuil) {
                return;
            }
            nombreLentes.incrementAndGet();
            int heure = java.time.LocalTime.now().getHour();
            lentesParHeure.computeIfAbsent(heure, h -> new AtomicLong()).incrementAndGet();
            signaler(chemin, dureeMs, seuil, heure);
        } catch (Exception e) {
            // Une mesure ne doit jamais peser sur une vente.
            LOG.log(Level.FINE, "SupportClotureMonitor.enregistrer", e);
        }
    }

    private void majPlusLongue(String chemin, long dureeMs) {
        long courante;
        do {
            courante = plusLongueMs.get();
            if (dureeMs <= courante) {
                return;
            }
        } while (!plusLongueMs.compareAndSet(courante, dureeMs));
        heurePlusLongue = java.time.LocalDateTime.now().toString();
        cheminPlusLongue = chemin;
    }

    /**
     * Signale la cloture lente au Centre de Support.
     *
     * <p>
     * L'evenement est UNIQUE par jour et compte ses occurrences : le message ne porte ni duree ni reference, ce sont
     * elles qui creeraient un evenement different a chaque vente. La date fait partie de la signature pour que chaque
     * journee ait son propre compteur - c'est justement la comparaison d'un jour a l'autre, et d'une heure a l'autre,
     * qui repond a la question posee.
     */
    private void signaler(String chemin, long dureeMs, int seuil, int heure) {
        /*
         * Le poste entre dans le code, donc dans la signature de l'evenement. Chaque caisse a son propre serveur
         * d'application : sans cela, la premiere a signaler masquerait les autres, et on saurait qu'une caisse rame
         * sans savoir laquelle.
         */
        String poste = poste();
        supportEventService.recordServerIncident("CLOTURE_LENTE-" + poste + "-" + LocalDate.now(),
                dureeMs >= seuil * 4L ? dal.ApplicationEvent.NIVEAU_ERROR : dal.ApplicationEvent.NIVEAU_WARN,
                "Cloture de vente anormalement longue (" + poste + ")",
                "Poste : " + poste + "\n\n" + detail(chemin, dureeMs, seuil, heure));
        LOG.log(Level.WARNING, "Cloture de vente en {0} ms sur {1} ({2})", new Object[] { dureeMs, poste, chemin });
    }

    /** Nom du poste qui a fait la cloture : chaque caisse a son propre serveur d'application. */
    private String poste() {
        try {
            return PosteLocal.identifiant(appConfig != null && appConfig.isServerMode());
        } catch (Exception e) {
            return PosteLocal.nomMachine();
        }
    }

    private String detail(String chemin, long dureeMs, int seuil, int heure) {
        StringBuilder sb = new StringBuilder();
        sb.append("Une cloture a demande ").append(dureeMs).append(" ms (seuil ").append(seuil).append(" ms),")
                .append(" sur ").append(chemin).append(", vers ").append(heure).append(" h.\n\n")
                .append("Pendant ce temps la caissiere voit « Veuillez patienter ». Si le poste abandonne avant la")
                .append(" reponse, elle ne recoit pas son ticket et revalide : c'est de la que vient l'erreur sur")
                .append(" une vente pourtant encaissee.\n\n")
                .append("Ce n'est pas la cloture qui est en cause, mais ce qui la ralentit. A regarder :\n")
                .append("- le pool de connexions (alerte POOL_ATTENTE, meme journal) ;\n")
                .append("- les requetes lentes et les attentes de verrou (alertes de la base) ;\n")
                .append("- ce qui tourne sur le serveur a cette heure-la : sauvegarde, editions de fin de journee.\n\n")
                .append("Repartition des clotures lentes par heure depuis le demarrage :\n");
        lentesParHeure.entrySet().stream().sorted(Map.Entry.comparingByKey()).forEach(e -> sb.append("  ")
                .append(String.format("%02d", e.getKey())).append(" h : ").append(e.getValue().get()).append('\n'));
        sb.append('\n').append("Total depuis le demarrage : ").append(nombre.get()).append(" cloture(s), dont ")
                .append(nombreLentes.get()).append(" au-dela du seuil. Duree moyenne ").append(moyenneMs())
                .append(" ms, la plus longue ").append(plusLongueMs.get()).append(" ms.");
        return sb.toString();
    }

    private int seuilMs() {
        try {
            String valeur = StringUtils.trimToEmpty(supportEventService.getParameter("SUPPORT_CLOTURE_SEUIL_MS"));
            return StringUtils.isNotBlank(valeur) ? Integer.parseInt(valeur) : SEUIL_DEFAUT_MS;
        } catch (NumberFormatException e) {
            return SEUIL_DEFAUT_MS;
        }
    }

    long moyenneMs() {
        long n = nombre.get();
        return n > 0 ? cumulMs.get() / n : 0L;
    }

    /**
     * Mesures brutes, pour consultation a la demande depuis le Centre de Support. Les compteurs sont en memoire : ils
     * repartent de zero a chaque demarrage, ce que le champ « depuis » rappelle.
     */
    public Map<String, Object> mesures() {
        Map<String, Object> mesures = new LinkedHashMap<>();
        mesures.put("poste", poste());
        mesures.put("clotures", nombre.get());
        mesures.put("cloturesLentes", nombreLentes.get());
        mesures.put("seuilMs", seuilMs());
        mesures.put("moyenneMs", moyenneMs());
        mesures.put("plusLongueMs", plusLongueMs.get());
        mesures.put("plusLongueLe", heurePlusLongue);
        mesures.put("plusLongueSur", cheminPlusLongue);
        Map<String, Long> parHeure = new LinkedHashMap<>();
        lentesParHeure.entrySet().stream().sorted(Map.Entry.comparingByKey())
                .forEach(e -> parHeure.put(String.format("%02d h", e.getKey()), e.getValue().get()));
        mesures.put("lentesParHeure", parHeure);
        return mesures;
    }
}
