/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package job;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.PostConstruct;
import javax.annotation.Resource;
import javax.annotation.security.PermitAll;
import javax.ejb.DependsOn;
import javax.ejb.EJB;
import javax.ejb.Singleton;
import javax.ejb.Startup;
import javax.ejb.Timeout;
import javax.ejb.TimerConfig;
import javax.ejb.TimerService;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import rest.service.SupportCoherenceService;
import rest.service.SupportEventService;

/**
 * Rattrapage au demarrage des jobs nocturnes du Centre de Support. Dans les officines qui eteignent le serveur la nuit,
 * la purge (03:45) et le veilleur de coherence (04:15) ne peuvent jamais s'executer a leur heure planifiee. Ce bean
 * verifie, quelques minutes apres le demarrage de l'application, si ces jobs ont tourne dans les dernieres 24 h (via
 * t_support_job_run) et les execute immediatement si ce n'est pas le cas.
 *
 * Le differe de quelques minutes evite de ralentir le demarrage et laisse Flyway et les autres jobs d'initialisation se
 * terminer. La valorisation et le snapshot de stock ont deja leur propre rattrapage au demarrage
 * (StartupOrchestrationService, etape STOCK_JOURNALIER) et ne sont pas geres ici.
 *
 * @author koben
 */
@Singleton
@Startup
@PermitAll
@DependsOn("FlywayStartupBean")
public class SupportNightlyCatchUp {

    private static final Logger LOG = Logger.getLogger(SupportNightlyCatchUp.class.getName());

    /** Delai avant le rattrapage apres le demarrage (5 minutes). */
    private static final long DELAI_DEMARRAGE_MS = 5L * 60L * 1000L;
    /** Un job est a rattraper s'il n'a pas tourne depuis plus de 24 h. */
    private static final long AGE_MAX_MINUTES = 24L * 60L;

    @Resource
    private TimerService timerService;
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private SupportCoherenceService supportCoherenceService;
    @EJB
    private SupportEventService supportEventService;
    @EJB
    private VenteAttenteExpiration venteAttenteExpiration;

    @PostConstruct
    public void planifier() {
        try {
            timerService.createSingleActionTimer(DELAI_DEMARRAGE_MS,
                    new TimerConfig("support-rattrapage-nocturne", false));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "planifier", e);
        }
    }

    @Timeout
    public void rattraper() {
        try {
            if (aBesoinDeRattrapage("PURGE_SUPPORT")) {
                LOG.info("Rattrapage au demarrage : purge du Centre de Support (le job de 03:45 n'a pas tourne)");
                supportEventService.purgeOldEvents();
                supportEventService.recordJobRun("PURGE_SUPPORT");
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "rattrapage purge", e);
        }
        try {
            if (aBesoinDeRattrapage("COHERENCE_SUPPORT")) {
                LOG.info("Rattrapage au demarrage : veilleur de coherence (le job de 04:15 n'a pas tourne)");
                supportCoherenceService.runActiveChecks();
                supportEventService.recordJobRun("COHERENCE_SUPPORT");
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "rattrapage coherence", e);
        }
        try {
            if (aBesoinDeRattrapage(VenteAttenteExpiration.CODE_JOB)) {
                LOG.info("Rattrapage au demarrage : ventes en attente de la veille"
                        + " (le job de 00:10 n'a pas tourne)");
                venteAttenteExpiration.executer();
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "rattrapage ventes en attente", e);
        }
    }

    /** Vrai si le job n'a jamais tourne, ou pas depuis plus de 24 h (d'apres t_support_job_run). */
    private boolean aBesoinDeRattrapage(String code) {
        try {
            List<?> resultats = em.createNativeQuery("SELECT last_run_at FROM t_support_job_run WHERE code = ?1")
                    .setParameter(1, code).setMaxResults(1).getResultList();
            if (resultats == null || resultats.isEmpty() || resultats.get(0) == null) {
                return true;
            }
            Object valeur = resultats.get(0);
            if (!(valeur instanceof Timestamp)) {
                return true;
            }
            LocalDateTime dernier = ((Timestamp) valeur).toLocalDateTime();
            return ChronoUnit.MINUTES.between(dernier, LocalDateTime.now()) > AGE_MAX_MINUTES;
        } catch (Exception e) {
            // Table absente ou base indisponible : on ne force pas le rattrapage.
            LOG.log(Level.WARNING, "aBesoinDeRattrapage " + code, e);
            return false;
        }
    }
}
