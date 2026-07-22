/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package job;

import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
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

    @Schedule(hour = "3", minute = "45", second = "0", persistent = false)
    public void purge() {
        try {
            supportEventService.purgeOldEvents();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "purge", e);
        }
    }
}
