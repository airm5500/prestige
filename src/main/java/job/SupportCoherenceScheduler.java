/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package job;

import config.AppConfig;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.inject.Inject;
import rest.service.SupportCoherenceService;
import rest.service.SupportEventService;

/**
 * Passe quotidienne du veilleur de coherence du Centre de Support. Execute les controles SQL actifs et journalise les
 * anomalies (+ ticket de synthese pour les controles non dry_run). Purement en lecture : n'impacte pas les flux metier.
 *
 * @author koben
 */
@Singleton
public class SupportCoherenceScheduler {

    private static final Logger LOG = Logger.getLogger(SupportCoherenceScheduler.class.getName());

    @EJB
    private SupportCoherenceService supportCoherenceService;
    @EJB
    private SupportEventService supportEventService;
    @Inject
    private AppConfig appConfig;

    @Schedule(hour = "4", minute = "15", second = "0", persistent = false)
    public void run() {
        /*
         * rapport du 26/10 (SC3) : chaque caisse fait tourner son propre serveur sur la base commune ; ce travail sur
         * toute la base ne se fait qu'une fois, sur le poste serveur, comme les taches metier (JobLot, releve de stock)
         */
        if (!appConfig.isServerMode()) {
            return;
        }
        try {
            supportCoherenceService.runActiveChecks();
            supportEventService.recordJobRun("COHERENCE_SUPPORT");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "run", e);
        }
    }
}
