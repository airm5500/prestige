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
import rest.service.SupportEventService;

/**
 * Purge quotidienne des evenements applicatifs du Centre de Support selon les durees de retention configurees
 * (SUPPORT_RETENTION_*). Les evenements rattaches a un ticket sont conserves.
 *
 * @author koben
 */
@Singleton
public class SupportPurgeScheduler {

    private static final Logger LOG = Logger.getLogger(SupportPurgeScheduler.class.getName());

    @EJB
    private SupportEventService supportEventService;
    @Inject
    private AppConfig appConfig;

    @Schedule(hour = "3", minute = "45", second = "0", persistent = false)
    public void purge() {
        /*
         * rapport du 26/10 (SC3) : chaque caisse fait tourner son propre serveur sur la base commune ; ce travail sur
         * toute la base ne se fait qu'une fois, sur le poste serveur, comme les taches metier (JobLot, releve de stock)
         */
        if (!appConfig.isServerMode()) {
            return;
        }
        try {
            supportEventService.purgeOldEvents();
            supportEventService.recordJobRun("PURGE_SUPPORT");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "purge", e);
        }
    }
}
