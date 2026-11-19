package job;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import config.AppConfig;
import java.lang.reflect.Field;
import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;
import rest.service.LogService;
import rest.service.SalesStatsService;
import rest.service.SupportEventService;
import rest.service.extranet.ExtranetService;
import rest.service.mobile.MobileClientRefService;
import rest.service.paiements.PaiementsMobileService;

/**
 * Retour du 18/11 : « il y a des opérations qu'on n'a besoin de lancer que sur le serveur ». Chaque poste d'appaul a
 * son propre Payara sur la base commune : une tâche planifiée qui travaille sur toute la base doit tourner une seule
 * fois, sur le poste serveur ({@link AppConfig#isServerMode()}), et pas sur les caisses. Ces tâches n'avaient aucun
 * contrôle : purges, rafraîchissement des extranets, surveillance de la base (alerte « requêtes lentes » reçue en
 * double du serveur et de la caisse 5 le 16/11 à 08:35), contrôle des tâches, ventes en attente et paiements mobiles
 * expirés.
 *
 * Pour chaque tâche : sur une caisse, aucun service n'est appelé ; sur le serveur, la tâche appelle bien son service
 * (le test prouve donc qu'il passe par le vrai chemin).
 */
class TachesDuServeurSeulTest {

    /** Appels reçus par les doubles des services. */
    private final List<String> appels = Collections.synchronizedList(new ArrayList<>());

    private AppConfig poste(boolean serveur) {
        return new AppConfig() {
            @Override
            public boolean isServerMode() {
                return serveur;
            }
        };
    }

    @SuppressWarnings("unchecked")
    private <T> T espion(Class<T> type) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[] { type }, (p, m, a) -> {
            if (m.getDeclaringClass() == Object.class) {
                return "toString".equals(m.getName()) ? type.getSimpleName() : null;
            }
            appels.add(type.getSimpleName() + "." + m.getName());
            Class<?> r = m.getReturnType();
            if (r == boolean.class) {
                return false;
            }
            if (r == int.class || r == long.class) {
                return r == int.class ? (Object) 0 : (Object) 0L;
            }
            return null;
        });
    }

    private static void injecter(Object cible, Class<?> type, Object valeur) throws Exception {
        for (Class<?> c = cible.getClass(); c != null; c = c.getSuperclass()) {
            for (Field f : c.getDeclaredFields()) {
                if (f.getType() == type) {
                    f.setAccessible(true);
                    f.set(cible, valeur);
                    return;
                }
            }
        }
        throw new AssertionError(cible.getClass().getSimpleName() + " n'a pas de champ " + type.getSimpleName());
    }

    /** Lance chaque tâche sur un poste serveur ou caisse ; rend les appels faits aux services. */
    private List<String> lancer(boolean serveur) throws Exception {
        appels.clear();
        AppConfig cfg = poste(serveur);

        MobileClientRefPurgeScheduler purgeCles = new MobileClientRefPurgeScheduler();
        injecter(purgeCles, MobileClientRefService.class, new MobileClientRefService() {
            @Override
            public int purger() {
                appels.add("MobileClientRefService.purger");
                return 0;
            }
        });
        injecter(purgeCles, AppConfig.class, cfg);
        purgeCles.purger();

        JournalPurgeScheduler purgeJournal = new JournalPurgeScheduler();
        injecter(purgeJournal, LogService.class, espion(LogService.class));
        injecter(purgeJournal, AppConfig.class, cfg);
        purgeJournal.purger();

        RafraichissementExtranetsScheduler extranets = new RafraichissementExtranetsScheduler();
        injecter(extranets, ExtranetService.class, new ExtranetService() {
            @Override
            public List<String[]> listesARafraichir() {
                appels.add("ExtranetService.listesARafraichir");
                return Collections.emptyList();
            }
        });
        injecter(extranets, AppConfig.class, cfg);
        extranets.rafraichir();

        SupportDatabaseMonitor base = new SupportDatabaseMonitor();
        injecter(base, SupportEventService.class, espion(SupportEventService.class));
        injecter(base, AppConfig.class, cfg);
        base.verifier();

        SupportJobMonitor taches = new SupportJobMonitor();
        injecter(taches, SupportEventService.class, espion(SupportEventService.class));
        injecter(taches, AppConfig.class, cfg);
        taches.verifier();

        VenteAttenteExpiration attente = new VenteAttenteExpiration();
        injecter(attente, SalesStatsService.class, espion(SalesStatsService.class));
        injecter(attente, SupportEventService.class, espion(SupportEventService.class));
        injecter(attente, AppConfig.class, cfg);
        attente.executer();

        PaiementsMobileService paiements = new PaiementsMobileService() {
            @Override
            public boolean disponible() {
                appels.add("PaiementsMobileService.disponible");
                return false;
            }
        };
        injecter(paiements, AppConfig.class, cfg);
        paiements.expirer();

        SupportCoherenceScheduler veille = new SupportCoherenceScheduler();
        injecter(veille, rest.service.SupportCoherenceService.class,
                espion(rest.service.SupportCoherenceService.class));
        injecter(veille, SupportEventService.class, espion(SupportEventService.class));
        injecter(veille, AppConfig.class, cfg);
        veille.run();

        return new ArrayList<>(appels);
    }

    @Test
    void surUneCaisseAucuneTacheDeLaBaseNeTourne() throws Exception {
        assertEquals(Collections.emptyList(), lancer(false));
    }

    @Test
    void surLeServeurChaqueTacheTourne() throws Exception {
        List<String> a = lancer(true);
        for (String attendu : new String[] { "MobileClientRefService.purger", "LogService.purger",
                "ExtranetService.listesARafraichir", "SupportEventService.getParameter",
                "SalesStatsService.supprimerVentesAttenteExpirees", "PaiementsMobileService.disponible",
                "SupportCoherenceService.runActiveChecks" }) {
            assertTrue(a.contains(attendu), attendu + " absent de " + a);
        }
        assertTrue(a.stream().filter("SupportEventService.getParameter"::equals).count() >= 2,
                "surveillance de la base et contrôle des tâches : " + a);
    }
}
