package rest.service.impl;

import dal.TParameters;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.Charset;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.TimeZone;
import java.util.concurrent.TimeUnit;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.json.JSONArray;
import org.json.JSONObject;
import util.horloge.ReferenceTemps;

/**
 * DATE ET HEURE DU SERVEUR (retours du 25/10, point 2). Employes qui reculent la date pour ressaisir des ventes, pile
 * CMOS faible (date perdue au demarrage), fuseau horaire change (souvent de 8 heures) : trois controles, sans rien
 * modifier :
 * <ul>
 * <li>ECART : l'horloge du serveur s'ecarte de plus de 2 minutes de l'heure d'Internet ;</li>
 * <li>RECUL : une operation de caisse est datee apres « maintenant » (fonctionne sans Internet) ;</li>
 * <li>FUSEAU : le fuseau du serveur n'a pas le decalage du fuseau attendu (parametre KEY_FUSEAU_HORAIRE, Africa/Abidjan
 * par defaut).</li>
 * </ul>
 * La synchronisation fait ce que fait Windows (« Synchroniser maintenant ») : w32tm /resync ; pour le fuseau, tzutil
 * vers le fuseau attendu et le fuseau de Prestige remis a jour sans redemarrage.
 */
@Stateless
public class HorlogeService {

    private static final Logger LOG = Logger.getLogger(HorlogeService.class.getName());
    static final String CLE_FUSEAU = "KEY_FUSEAU_HORAIRE";
    static final String FUSEAU_DEFAUT = "Africa/Abidjan";
    /** Essais d'ecran seulement : secondes ajoutees a l'ecart mesure (simule une horloge fausse). */
    static final String CLE_ESSAI = "KEY_HORLOGE_ESSAI_DECALAGE";
    static final long TOLERANCE_MS = 120_000L;
    private static final DateTimeFormatter FR = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private String parametre(String cle, String defaut) {
        try {
            TParameters p = em.find(TParameters.class, cle);
            return p != null && p.getStrVALUE() != null && !p.getStrVALUE().trim().isEmpty() ? p.getStrVALUE().trim()
                    : defaut;
        } catch (RuntimeException e) {
            return defaut;
        }
    }

    ZoneId fuseauAttendu() {
        try {
            return ZoneId.of(parametre(CLE_FUSEAU, FUSEAU_DEFAUT));
        } catch (RuntimeException e) {
            return ZoneId.of(FUSEAU_DEFAUT);
        }
    }

    private static String duree(long ms) {
        /* a la minute la plus proche : 59 min 37 s s'affiche « 1 h » */
        Duration d = Duration.ofMinutes(Math.round(Math.abs(ms) / 60000.0));
        long j = d.toDays(), h = d.toHours() % 24, m = d.toMinutes() % 60;
        StringBuilder s = new StringBuilder();
        if (j > 0) {
            s.append(j).append(j > 1 ? " jours " : " jour ");
        }
        if (h > 0) {
            s.append(h).append(" h ");
        }
        if (m > 0 || s.length() == 0) {
            s.append(m).append(" min");
        }
        return s.toString().trim();
    }

    public JSONObject etat() {
        LocalDateTime maintenant = LocalDateTime.now();
        ZoneOffset decalage = ZoneId.systemDefault().getRules().getOffset(java.time.Instant.now());
        ZoneId attendu = fuseauAttendu();
        ZoneOffset decalageAttendu = attendu.getRules().getOffset(java.time.Instant.now());
        JSONArray anomalies = new JSONArray();
        JSONObject r = new JSONObject().put("success", true).put("serveurMs", System.currentTimeMillis())
                .put("serveur", maintenant.format(FR)).put("fuseau", ZoneId.systemDefault().getId())
                .put("decalage", decalage.getId()).put("fuseauAttendu", attendu.getId());

        long essai = 0;
        try {
            essai = Long.parseLong(parametre(CLE_ESSAI, "0")) * 1000L;
        } catch (NumberFormatException e) {
            essai = 0;
        }
        ReferenceTemps.Mesure m = ReferenceTemps.mesurer();
        if (m != null) {
            long ecart = m.ecartMs + essai;
            r.put("reference", m.source).put("ecartSecondes", ecart / 1000);
            if (Math.abs(ecart) > TOLERANCE_MS) {
                anomalies.put(new JSONObject().put("code", "ECART").put("serveur", true).put("message",
                        "La date et l'heure du serveur sont fausses : " + (ecart > 0 ? "en avance" : "en retard")
                                + " de " + duree(ecart) + " sur l'heure d'Internet."));
            }
        } else {
            r.put("reference", JSONObject.NULL);
        }

        /* une operation de caisse datee apres maintenant : la date a ete reculee (ou la pile CMOS l'a perdue) */
        try {
            Object max = em.createNativeQuery("SELECT MAX(createdAt) FROM mvttransaction").getSingleResult();
            LocalDateTime derniere = max instanceof java.sql.Timestamp ? ((java.sql.Timestamp) max).toLocalDateTime()
                    : max instanceof LocalDateTime ? (LocalDateTime) max : null;
            if (derniere != null) {
                r.put("derniereOperation", derniere.format(FR));
                if (derniere.isAfter(maintenant.plusMinutes(5))) {
                    anomalies.put(new JSONObject().put("code", "RECUL").put("serveur", true).put("message",
                            "La date du serveur a reculé : la dernière opération de caisse est datée du "
                                    + derniere.format(FR) + ", après la date actuelle (" + maintenant.format(FR)
                                    + ")."));
                }
            }
        } catch (RuntimeException e) {
            LOG.log(Level.FINE, "derniere operation", e);
        }

        if (!decalage.equals(decalageAttendu)) {
            anomalies.put(new JSONObject().put("code", "FUSEAU").put("serveur", true).put("message",
                    "Le fuseau horaire du serveur est UTC" + libelle(decalage) + " au lieu de UTC"
                            + libelle(decalageAttendu) + " (" + attendu.getId() + ") : l'heure affichée est décalée de "
                            + duree((decalage.getTotalSeconds() - decalageAttendu.getTotalSeconds()) * 1000L) + "."));
        }
        return r.put("anomalies", anomalies);
    }

    private static String libelle(ZoneOffset o) {
        return "Z".equals(o.getId()) ? "+00:00" : o.getId();
    }

    /**
     * Synchronise l'horloge comme Windows, et remet le fuseau attendu s'il a change. Rend le compte rendu ; l'appelant
     * relit l'etat ensuite.
     */
    public JSONObject synchroniser() {
        JSONObject r = new JSONObject();
        if (!System.getProperty("os.name", "").toLowerCase().contains("win")) {
            return r.put("success", false).put("msg",
                    "Synchronisation automatique prévue pour un serveur Windows : réglez la date du serveur.");
        }
        StringBuilder compteRendu = new StringBuilder();
        boolean ok = true;
        ZoneId attendu = fuseauAttendu();
        ZoneOffset maintenant = ZoneId.systemDefault().getRules().getOffset(java.time.Instant.now());
        if (!maintenant.equals(attendu.getRules().getOffset(java.time.Instant.now()))) {
            String windows = nomWindows(attendu);
            if (windows != null) {
                String[] tz = executer("tzutil", "/s", windows);
                ok &= "0".equals(tz[0]);
                compteRendu.append("Fuseau Windows : ").append("0".equals(tz[0]) ? "remis à " + windows : tz[1])
                        .append(". ");
            }
            /* Prestige lit le fuseau au demarrage : il est remis a jour tout de suite, sans redemarrage */
            TimeZone.setDefault(TimeZone.getTimeZone(attendu));
            compteRendu.append("Fuseau de Prestige : ").append(attendu.getId()).append(". ");
        }
        String[] sync = executer("w32tm", "/resync", "/force");
        if (!"0".equals(sync[0])) {
            /* service de temps arrete : il est demarre, puis la synchronisation relancee */
            executer("net", "start", "w32time");
            sync = executer("w32tm", "/resync", "/force");
        }
        ok &= "0".equals(sync[0]);
        compteRendu.append("0".equals(sync[0]) ? "Heure synchronisée avec le serveur de temps de Windows."
                : "Synchronisation de l'heure refusée par Windows (" + sync[1].trim()
                        + ") : lancez Prestige avec les droits d'administrateur, ou synchronisez l'heure dans Windows.");
        LOG.log(Level.INFO, "Synchronisation de l''horloge : {0}", compteRendu);
        return r.put("success", ok).put("msg", compteRendu.toString().trim());
    }

    /** Fuseaux courants des officines : nom Windows du fuseau attendu, null si inconnu. */
    static String nomWindows(ZoneId z) {
        switch (z.getId()) {
        case "Africa/Abidjan":
        case "Africa/Dakar":
        case "Africa/Bamako":
        case "Africa/Ouagadougou":
        case "Africa/Conakry":
        case "Africa/Lome":
        case "Africa/Accra":
            return "Greenwich Standard Time";
        case "Africa/Lagos":
        case "Africa/Douala":
        case "Africa/Libreville":
        case "Africa/Kinshasa":
        case "Africa/Porto-Novo":
        case "Africa/Niamey":
            return "W. Central Africa Standard Time";
        case "Europe/Paris":
            return "Romance Standard Time";
        default:
            return null;
        }
    }

    /** Commande systeme fixe (aucun argument venu de l'utilisateur) : [code de sortie, sortie]. */
    private static String[] executer(String... commande) {
        try {
            Process p = new ProcessBuilder(commande).redirectErrorStream(true).start();
            ByteArrayOutputStream sortie = new ByteArrayOutputStream();
            try (InputStream in = p.getInputStream()) {
                byte[] b = new byte[4096];
                int n;
                while ((n = in.read(b)) > 0 && sortie.size() < 8192) {
                    sortie.write(b, 0, n);
                }
            }
            if (!p.waitFor(30, TimeUnit.SECONDS)) {
                p.destroyForcibly();
                return new String[] { "-1", "délai dépassé" };
            }
            return new String[] { String.valueOf(p.exitValue()), sortie.toString(Charset.forName("Cp850").name()) };
        } catch (IOException e) {
            return new String[] { "-1", e.getMessage() };
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new String[] { "-1", "interrompu" };
        }
    }
}
