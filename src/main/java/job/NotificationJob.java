package job;

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
    @EJB
    private config.AppConfig appConfig;
    @Resource
    private TimerService timerService;

    @PostConstruct
    public void init() {

        createTimer();

    }

    public void createTimer() {
        // Annule les timers persistants existants avant d'en créer un nouveau,
        // pour éviter l'accumulation de doublons à chaque redémarrage du serveur.
        for (Timer t : timerService.getTimers()) {
            if ("recapActivity".equals(t.getInfo())) {
                t.cancel();
            }
        }
        TimerConfig recapActivity = new TimerConfig("recapActivity", true);
        timerService.createCalendarTimer(
                new ScheduleExpression().hour(findHeureEnvoiSmsRecap()).dayOfMonth("*").year("*"), recapActivity);
    }

    public String findHeureEnvoiSmsRecap() {
        try {
            TParameters parameters = em.find(TParameters.class, Constant.KEY_HEURE_ENVOI_SMS_RECAP_ACTIVITE);
            return heuresValides(parameters.getStrVALUE(), "18,19");
        } catch (Exception e) {
            return "18,19";
        }
    }

    /**
     * Heures d'envoi « 0,18,19 » : une valeur vide ou mal formee (« 25 », « 18h ») empechait le demarrage de toute
     * l'application (timer refuse) ; elle est remplacee par la valeur par defaut.
     */
    static String heuresValides(String valeur, String defaut) {
        String v = valeur == null ? "" : valeur.replace(" ", "");
        if (!v.matches("\\d{1,2}(,\\d{1,2})*")) {
            return defaut;
        }
        for (String h : v.split(",")) {
            if (Integer.parseInt(h) > 23) {
                return defaut;
            }
        }
        return v;
    }

    @Timeout
    public void timeout(Timer timer) {
        if (!appConfig.isServerMode()) {
            return;
        }
        if ("recapActivity".equals(timer.getInfo())) {
            notificationService.sendPointActivite(new ActiviteParam(LocalDate.now().toString(), Canal.SMS));
        }
    }
}
