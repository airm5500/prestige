package job.ejb;

import dal.TParameters;
import dal.enumeration.Canal;
import java.time.LocalDate;
import javax.annotation.PostConstruct;
import javax.annotation.Resource;
import javax.ejb.EJB;
import javax.ejb.ScheduleExpression;
import javax.ejb.Singleton;
import javax.ejb.Startup;
import javax.ejb.Timeout;
import javax.ejb.Timer;
import javax.ejb.TimerConfig;
import javax.ejb.TimerService;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import rest.service.NotificationService;
import rest.service.v2.dto.ActiviteParam;
import util.Constant;

/**
 *
 * @author koben
 */
@Singleton
@Startup
public class NotificationJob {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private NotificationService notificationService;
    @Resource
    private TimerService timerService;

    @PostConstruct
    public void init() {

        createTimer();

    }

    public void createTimer() {
        TimerConfig recapActivity = new TimerConfig("recapActivity", true);
        timerService.createCalendarTimer(
                new ScheduleExpression().hour(findHeureEnvoiSmsRecap()).dayOfMonth("*").year("*"), recapActivity);
    }

    public String findHeureEnvoiSmsRecap() {
        try {
            TParameters parameters = em.find(TParameters.class, Constant.KEY_HEURE_ENVOI_SMS_RECAP_ACTIVITE);
            return parameters.getStrVALUE();
        } catch (Exception e) {
            return "18,19";
        }
    }

    @Timeout
    public void timeout(Timer timer) {

        if ("recapActivity".equals(timer.getInfo())) {
            notificationService.sendPointActivite(new ActiviteParam(LocalDate.now().toString(), Canal.SMS));

        }
    }
}
