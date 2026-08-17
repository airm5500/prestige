/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package job;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.security.PermitAll;
import javax.ejb.EJB;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import org.apache.commons.lang3.StringUtils;
import rest.service.SupportEventService;

/**
 * Surveillance proactive des ressources : verifie regulierement la memoire JVM et l'espace disque, et cree une alerte
 * AVANT le blocage (OutOfMemory / disque plein). Au plus une alerte par ressource et par jour (signature datee).
 *
 * @author koben
 */
@Singleton
@PermitAll
public class SupportResourceMonitor {

    private static final Logger LOG = Logger.getLogger(SupportResourceMonitor.class.getName());
    private static final long MO = 1024L * 1024L;
    private static final int PALIERS_MEMOIRE = 3; // nb de mesures consecutives au-dela du seuil avant alerte

    @EJB
    private SupportEventService supportEventService;

    private int depassementsMemoire = 0;

    @Schedule(hour = "*", minute = "*/5", persistent = false)
    public void verifier() {
        try {
            if (!"1".equals(StringUtils.trimToEmpty(supportEventService.getParameter("SUPPORT_MONITOR_ENABLED")))) {
                return;
            }
            verifierMemoire();
            verifierDisque();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "SupportResourceMonitor.verifier", e);
        }
    }

    private void verifierMemoire() {
        Runtime rt = Runtime.getRuntime();
        long max = rt.maxMemory();
        if (max <= 0) {
            return;
        }
        long utilisee = rt.totalMemory() - rt.freeMemory();
        int pct = (int) (utilisee * 100L / max);
        int seuil = intParam("SUPPORT_MEM_THRESHOLD_PCT", 85);
        if (pct >= seuil) {
            depassementsMemoire++;
            // On n'alerte qu'apres un depassement SOUTENU (evite le bruit d'un pic transitoire avant GC).
            if (depassementsMemoire >= PALIERS_MEMOIRE) {
                String message = "Memoire JVM elevee : " + pct + "% utilisee (" + (utilisee / MO) + " Mo / "
                        + (max / MO) + " Mo max)";
                String detail = "Utilisation memoire soutenue au-dessus du seuil.\n" + "Utilisee : " + (utilisee / MO)
                        + " Mo\n" + "Maximum  : " + (max / MO) + " Mo\n" + "Seuil    : " + seuil + " %\n\n"
                        + "Risque : un depassement continu mene a un OutOfMemoryError (crash du serveur).\n"
                        + "Pistes : augmenter la memoire max de la JVM (-Xmx), ou rechercher une fuite memoire "
                        + "(ecran/traitement recemment utilise).";
                supportEventService.recordServerIncident("memoire-" + LocalDate.now(), "WARN", message, detail);
                LOG.log(Level.WARNING, "Alerte memoire : {0}", message);
                depassementsMemoire = 0;
            }
        } else {
            depassementsMemoire = 0;
        }
    }

    private void verifierDisque() {
        int minMb = intParam("SUPPORT_DISK_MIN_MB", 1024);
        // On surveille le disque du dossier support ET celui des logs serveur (souvent des disques differents).
        verifierDisqueChemin(resolveStorageBase(), minMb, "dossier support");
        String logDir = StringUtils.trimToEmpty(supportEventService.getParameter("SUPPORT_SERVER_LOG_PATH"));
        if (StringUtils.isNotBlank(logDir)) {
            verifierDisqueChemin(Paths.get(logDir), minMb, "logs serveur");
        }
    }

    private void verifierDisqueChemin(Path cible, int minMb, String libelle) {
        try {
            Path existant = ancetreExistant(cible);
            if (existant == null) {
                return;
            }
            long libreMb = existant.toFile().getUsableSpace() / MO;
            if (libreMb <= 0) {
                return;
            }
            if (libreMb < minMb) {
                String racine = existant.getRoot() != null ? existant.getRoot().toString() : existant.toString();
                String message = "Espace disque faible (" + libelle + ") : " + libreMb + " Mo libres sur " + racine;
                String detail = "Espace disque libre sous le seuil.\n" + "Emplacement : " + existant + "\n" + "Libre : "
                        + libreMb + " Mo\n" + "Seuil : " + minMb + " Mo\n\n"
                        + "Risque : un disque plein bloque les ecritures (base de donnees, logs) et peut faire "
                        + "tomber le serveur.\n"
                        + "Action : liberer de l'espace (anciennes sauvegardes, logs, fichiers temporaires).";
                supportEventService.recordServerIncident("disque-" + libelle.replace(' ', '_') + "-" + LocalDate.now(),
                        "ERROR", message, detail);
                LOG.log(Level.WARNING, "Alerte disque : {0}", message);
            }
        } catch (Exception e) {
            LOG.log(Level.FINE, "verifierDisqueChemin " + libelle, e);
        }
    }

    private Path ancetreExistant(Path cible) {
        Path p = cible;
        while (p != null && !p.toFile().exists()) {
            p = p.getParent();
        }
        return p;
    }

    private Path resolveStorageBase() {
        String configured = StringUtils.trimToEmpty(supportEventService.getParameter("SUPPORT_STORAGE_DIR"));
        return StringUtils.isNotBlank(configured) ? Paths.get(configured)
                : util.StockageDisque.sousDossier("support");
    }

    private int intParam(String key, int defaut) {
        try {
            String v = StringUtils.trimToEmpty(supportEventService.getParameter(key));
            return StringUtils.isNotBlank(v) ? Integer.parseInt(v) : defaut;
        } catch (NumberFormatException e) {
            return defaut;
        }
    }
}
