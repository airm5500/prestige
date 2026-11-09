package rest.service.extranet.commun;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.util.Random;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import rest.service.extranet.commun.FauxExtranet.Reponse;
import rest.service.extranet.commun.TransportExtranet.Attendu;

/**
 * Option A du 09/11 : avancement des lectures et verrou commun avec le rafraichissement automatique.
 * <ul>
 * <li>appels comptes = appels faits sur le fil de la lecture suivie, ni plus ni moins (autres fils, hors lecture :
 * jamais comptes) ; total prevu = deja faits + restants annonces ; un total depasse n'est plus affiche ;</li>
 * <li>parcours DataTables : total annonce = ⌈lignes / longueur⌉ pages, atteint exactement a la fin ;</li>
 * <li>executer (tache planifiee) : jamais deux lectures de la meme liste, ni avec une lecture lancee a l'ecran, ni
 * l'inverse ; resultat garde ; erreur : resultat « a relancer » garde, verrou libere, avancement retire du fil.</li>
 * </ul>
 * Jeux tires au hasard, graine fixe.
 */
class AvancementLecturesCoherenceTest {

    private static final long GRAINE = 9112026L;

    @Test
    void appelsComptesSurLeFilDeLaLecture_hasard() throws Exception {
        Random r = new Random(GRAINE);
        try (FauxExtranet f = new FauxExtranet()) {
            f.route("/p", Reponse.html("<html><body>ok</body></html>"));
            TransportExtranet t = f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=x");
            for (int k = 0; k < 60; k++) {
                EtatLectures e = new EtatLectures(Clock.systemUTC());
                EtatLectures.Lecture l = e.demarrer(EtatLectures.cle("ubipharm", "L" + k), "u");
                int avant = r.nextInt(4), suivis = r.nextInt(25), apres = r.nextInt(4);
                for (int i = 0; i < avant; i++) {
                    t.lire("/p", null, Attendu.HTML, null);
                }
                Avancement.suivre(l);
                int restants = -1;
                try {
                    for (int i = 0; i < suivis; i++) {
                        if (i == suivis / 2 && r.nextBoolean()) {
                            restants = suivis - i + (r.nextInt(3) - 1);
                            Avancement.restants(restants);
                            restants = i + restants;
                        }
                        t.lire("/p", null, Attendu.HTML, null);
                    }
                    /* un autre fil (autre lecture, autre ecran) n'est jamais compte ici */
                    ExecutorService x = Executors.newSingleThreadExecutor();
                    x.submit(() -> t.lire("/p", null, Attendu.HTML, null)).get(10, TimeUnit.SECONDS);
                    x.shutdown();
                } finally {
                    Avancement.finir();
                }
                for (int i = 0; i < apres; i++) {
                    t.lire("/p", null, Attendu.HTML, null);
                }
                JSONObject j = l.toJson(e.maintenant());
                assertEquals(suivis, j.getInt("appels"), "essai " + k);
                if (restants < 0) {
                    assertEquals(0, j.getInt("prevus"), "total inconnu");
                } else if (restants >= suivis) {
                    assertEquals(restants, j.getInt("prevus"), "total = faits + restants");
                } else {
                    assertEquals(0, j.getInt("prevus"), "total depasse : plus affiche");
                }
            }
        }
    }

    @Test
    void parcoursDataTablesAnnonceLeTotal_hasard() throws Exception {
        Random r = new Random(GRAINE + 1);
        for (int k = 0; k < 400; k++) {
            int total = r.nextInt(6) == 0 ? r.nextInt(3) : r.nextInt(3000);
            int longueur = new int[] { 10, 25, 50, 100 }[r.nextInt(4)];
            EtatLectures e = new EtatLectures(Clock.systemUTC());
            EtatLectures.Lecture l = e.demarrer("ubipharm/X", "u");
            AtomicInteger pages = new AtomicInteger();
            int[] prevuApresPremiere = { -1 };
            ParcoursDataTables.Page page = (start, length, draw) -> {
                /* chaque page est un appel a l'extranet */
                Avancement.appel();
                if (pages.incrementAndGet() == 2) {
                    prevuApresPremiere[0] = l.toJson(e.maintenant()).getInt("prevus");
                }
                JSONArray data = new JSONArray();
                for (int i = start; i < Math.min(total, start + length); i++) {
                    data.put(new JSONArray().put("P" + i));
                }
                return new JSONObject().put("recordsTotal", total).put("recordsFiltered", total).put("data", data)
                        .put("draw", String.valueOf(draw));
            };
            Avancement.suivre(l);
            try {
                ParcoursDataTables.parcourir(page, longueur, 10000, (p, c) -> {
                });
            } finally {
                Avancement.finir();
            }
            int attendues = Math.max(1, (total + longueur - 1) / longueur);
            JSONObject j = l.toJson(e.maintenant());
            assertEquals(attendues, j.getInt("appels"), total + " / " + longueur);
            assertEquals(attendues, j.getInt("prevus"), "total annonce atteint exactement");
            if (attendues > 1) {
                assertEquals(attendues, prevuApresPremiere[0], "total connu des la premiere page");
            }
        }
    }

    @Test
    void tachePlanifieeEtEcranNeLisentJamaisDeuxFois() throws Exception {
        EtatLectures e = new EtatLectures(Clock.systemUTC());
        String cle = EtatLectures.cle("COPHARMED", "COPHARMED_CATALOGUE");
        assertEquals("copharmed/COPHARMED_CATALOGUE", cle, "meme cle que l'ecran (famille en minuscules)");

        /* 1. lecture lancee a l'ecran : la tache planifiee ne lance rien */
        EtatLectures.Lecture ecran = e.demarrer(cle, "caisse1");
        AtomicInteger lancees = new AtomicInteger();
        assertNull(e.executer(cle, "rafraichissement automatique", () -> {
            lancees.incrementAndGet();
            return new JSONObject().put("success", true);
        }));
        assertEquals(0, lancees.get());
        assertSame(ecran, e.etat(cle), "la lecture de l'ecran reste celle suivie");
        e.terminer(ecran, new JSONObject().put("success", true));

        /* 2. tache planifiee en cours : un clic a l'ecran suit la lecture au lieu d'en lancer une autre */
        CountDownLatch dedans = new CountDownLatch(1), sortir = new CountDownLatch(1);
        ExecutorService x = Executors.newSingleThreadExecutor();
        Future<JSONObject> tache = x.submit(() -> e.executer(cle, "rafraichissement automatique", () -> {
            dedans.countDown();
            try {
                sortir.await(10, TimeUnit.SECONDS);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
            }
            return new JSONObject().put("success", true).put("lignes", 9426);
        }));
        assertTrue(dedans.await(10, TimeUnit.SECONDS));
        assertNull(e.demarrer(cle, "caisse2"), "clic pendant la tache : suivie, pas relancee");
        JSONObject enCours = e.etat(cle).toJson(e.maintenant());
        assertTrue(enCours.getBoolean("enCours"));
        assertEquals("rafraichissement automatique", enCours.getString("utilisateur"));
        assertNull(e.executer(cle, "rafraichissement automatique", () -> {
            lancees.incrementAndGet();
            return null;
        }), "second passage de la tache : rien");
        sortir.countDown();
        assertEquals(9426, tache.get(10, TimeUnit.SECONDS).getInt("lignes"));
        x.shutdown();
        JSONObject fini = e.etat(cle).toJson(e.maintenant());
        assertFalse(fini.getBoolean("enCours"));
        assertEquals(9426, fini.getJSONObject("resultat").getInt("lignes"));
        assertEquals(0, lancees.get());

        /* 3. erreur pendant la tache : resultat « a relancer », verrou libere, fil nettoye */
        assertThrows(IllegalStateException.class, () -> e.executer(cle, "rafraichissement automatique", () -> {
            throw new IllegalStateException("panne");
        }));
        JSONObject err = e.etat(cle).toJson(e.maintenant());
        assertFalse(err.getBoolean("enCours"));
        assertFalse(err.getJSONObject("resultat").getBoolean("success"));
        assertNotNull(e.demarrer(cle, "caisse1"), "verrou libere apres l'erreur");
        try (FauxExtranet f = new FauxExtranet()) {
            f.route("/p", Reponse.html("<html><body>ok</body></html>"));
            EtatLectures.Lecture l = e.etat(cle);
            f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=x").lire("/p", null, Attendu.HTML, null);
            assertEquals(0, l.toJson(e.maintenant()).getInt("appels"), "plus aucun avancement suivi sur ce fil");
        }
    }
}
