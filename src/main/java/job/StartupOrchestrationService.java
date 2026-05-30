package job;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.PostConstruct;
import javax.ejb.DependsOn;
import javax.ejb.Singleton;
import javax.ejb.Startup;
import javax.inject.Inject;

/**
 * Orchestrateur centralisé des jobs au démarrage.
 *
 * <p>
 * Garantit l'ordre d'initialisation suivant :
 * <ol>
 * <li>FlywayStartupBean (migrations DB) — via {@code @DependsOn}</li>
 * <li>Calendrier &amp; nettoyage (synchrone)</li>
 * <li>Réapprovisionnement stock (synchrone)</li>
 * <li>Lots en cours de péremption (synchrone)</li>
 * <li>Stock journalier — snapshot + valorisation (asynchrone)</li>
 * <li>Notifications SMS en attente (asynchrone)</li>
 * <li>Notifications email en attente (asynchrone)</li>
 * </ol>
 *
 * <p>
 * Remplace les {@code @PostConstruct} individuels de {@link JobCalendar}, {@link StockReapproJob},
 * {@link StockDailyScheduler} et {@link NotificationScheduler} qui démarraient tous simultanément et provoquaient des
 * {@code Lock wait timeout exceeded}.
 *
 * <p>
 * {@link NotificationJob} reste indépendant : son timer persistant {@code TimerService} et son {@code @Timeout} sont
 * liés au bean et ne peuvent pas être délégués.
 *
 * <p>
 * Les {@code @Schedule} périodiques restent dans leurs beans respectifs.
 */
@Singleton
@Startup
@DependsOn({ "FlywayStartupBean", "AppConfig" })
public class StartupOrchestrationService {

    private static final Logger LOG = Logger.getLogger(StartupOrchestrationService.class.getName());

    private final AtomicBoolean pipelineRunning = new AtomicBoolean(false);

    @Inject
    private config.AppConfig appConfig;

    @Inject
    private JobCalendar jobCalendar;

    @Inject
    private StockDailyScheduler stockDailyScheduler;

    @Inject
    private NotificationScheduler notificationScheduler;

    @Inject
    private StockReapproJob stockReapproJob;

    @Inject
    private JobLot jobLot;

    @Inject
    private SemoisService semoisService;

    // ── Types ────────────────────────────────────────────────────────────────────

    public enum JobStep {
        CALENDRIER("Calendrier & nettoyage"), STOCK_REAPPRO("Réapprovisionnement stock (mode default)"),
        STOCK_REAPPRO_SEMOIS("Réapprovisionnement stock (mode semois)"), LOT_PEREMPTION("Lots en cours de péremption"),
        STOCK_JOURNALIER("Stock journalier (snapshot + valorisation)"), NOTIFICATIONS_SMS("Envoi SMS en attente"),
        NOTIFICATIONS_EMAIL("Envoi emails en attente");

        private final String label;

        JobStep(String label) {
            this.label = label;
        }

        public String getLabel() {
            return label;
        }
    }

    public static final class StepResult {

        private final JobStep step;
        private final boolean success;
        private final String message;
        private final Duration duration;

        public StepResult(JobStep step, boolean success, String message, Duration duration) {
            this.step = step;
            this.success = success;
            this.message = message;
            this.duration = duration;
        }

        public boolean isSuccess() {
            return success;
        }

        public JobStep getStep() {
            return step;
        }

        public String getMessage() {
            return message;
        }

        public Duration getDuration() {
            return duration;
        }
    }

    // ── Pipeline ─────────────────────────────────────────────────────────────────

    private List<JobStep> buildSteps() {
        List<JobStep> steps = new ArrayList<>();
        steps.add(JobStep.CALENDRIER);
        steps.add(appConfig.isSemoisReapproMode() ? JobStep.STOCK_REAPPRO_SEMOIS : JobStep.STOCK_REAPPRO);
        steps.add(JobStep.LOT_PEREMPTION);
        steps.add(JobStep.STOCK_JOURNALIER);
        steps.add(JobStep.NOTIFICATIONS_SMS);
        steps.add(JobStep.NOTIFICATIONS_EMAIL);
        return steps;
    }

    /**
     * Déclenché au démarrage de l'application, après Flyway. L'injection de {@link JobCalendar},
     * {@link StockDailyScheduler} et {@link NotificationScheduler} par le conteneur suffit à enregistrer leurs
     * {@code @Schedule} périodiques.
     */
    @PostConstruct
    public void onStartup() {
        executePipeline("STARTUP");
    }

    /**
     * Exécute le pipeline complet de façon séquentielle.
     *
     * @param trigger
     *            identifiant du déclencheur (pour les logs)
     */
    public void executePipeline(String trigger) {
        if (!appConfig.isServerMode()) {
            LOG.info("[PIPELINE-" + trigger + "] Mode '" + appConfig.getApplicationMode()
                    + "' — pipeline désactivé (server uniquement)");
            return;
        }

        if (!pipelineRunning.compareAndSet(false, true)) {
            LOG.warning("[PIPELINE-" + trigger + "] Pipeline déjà en cours — skip");
            return;
        }

        List<JobStep> steps = buildSteps();
        LOG.info("[PIPELINE-" + trigger + "] Démarrage — " + steps.size() + " étape(s)");
        Instant pipelineStart = Instant.now();
        List<StepResult> results = new ArrayList<>();

        try {
            for (JobStep step : steps) {
                StepResult result = executeStep(step);
                results.add(result);
                if (!result.isSuccess()) {
                    LOG.warning(
                            "[PIPELINE-" + trigger + "] Étape «" + step.getLabel() + "» échouée — pipeline continue");
                }
            }
        } finally {
            pipelineRunning.set(false);
        }

        Duration totalDuration = Duration.between(pipelineStart, Instant.now());
        long successCount = results.stream().filter(StepResult::isSuccess).count();
        LOG.info("[PIPELINE-" + trigger + "] Terminé en " + formatDuration(totalDuration) + " — " + successCount + "/"
                + results.size() + " étapes réussies");
    }

    // ── Exécution d'une étape ────────────────────────────────────────────────────

    private StepResult executeStep(JobStep step) {
        LOG.info("[PIPELINE] ▸ Étape: " + step.getLabel());
        Instant start = Instant.now();
        try {
            switch (step) {
            case CALENDRIER:
                jobCalendar.exec();
                jobCalendar.removeFacture();
                jobCalendar.removeSuggestionO();
                break;
            case STOCK_REAPPRO:
                stockReapproJob.runOnStartup();
                break;
            case STOCK_REAPPRO_SEMOIS:
                semoisService.execute();
                break;
            case LOT_PEREMPTION:
                jobLot.execute();
                break;
            case STOCK_JOURNALIER:
                stockDailyScheduler.runOnStartup();
                break;
            case NOTIFICATIONS_SMS:
                notificationScheduler.runSmsOnStartup();
                break;
            case NOTIFICATIONS_EMAIL:
                notificationScheduler.runEmailOnStartup();
                break;
            }
            Duration duration = Duration.between(start, Instant.now());
            LOG.info("[PIPELINE]   " + step.getLabel() + " — OK en " + formatDuration(duration));
            return new StepResult(step, true, "OK", duration);
        } catch (Exception e) {
            Duration duration = Duration.between(start, Instant.now());
            LOG.log(Level.SEVERE, "[PIPELINE]   " + step.getLabel() + " — ERREUR en " + formatDuration(duration), e);
            return new StepResult(step, false, e.getMessage(), duration);
        }
    }

    // ── Utilitaire ───────────────────────────────────────────────────────────────

    private static String formatDuration(Duration d) {
        if (d.toMinutes() > 0) {
            return d.toMinutes() + "m" + (d.getSeconds() % 60) + "s";
        }
        return d.getSeconds() + "." + String.format("%03d", d.toMillis() % 1000) + "s";
    }
}
