package rest.service.impl.serveur;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.json.JSONArray;
import org.junit.jupiter.api.Test;
import rest.service.impl.serveur.ReglagesServeur.Niveau;
import rest.service.impl.serveur.ReglagesServeur.Reglage;

/**
 * Reglages de Payara de chaque poste (demande du 02/11) : ligne d'un poste et alertes d'ensemble vues du serveur.
 */
class PostesReglagesTest {

    private static final LocalDateTime MAINTENANT = LocalDateTime.of(2026, 11, 2, 22, 0);

    private static PostesReglages.Poste poste(String hote, boolean serveur, int pool) {
        PostesReglages.Poste p = new PostesReglages.Poste();
        p.hote = hote;
        p.domaine = "domain1";
        p.serveur = serveur;
        p.mariadbLocale = serveur;
        p.pool = pool;
        p.releve = MAINTENANT.minusHours(1);
        return p;
    }

    @Test
    void ligneDuPosteDepuisLeCalcul() {
        CalculReglages c = new CalculReglages();
        c.serveur = false;
        c.mariadbLocale = false;
        c.ram = 8 * ReglagesServeur.GO;
        c.payara = new ConfigPayara();
        c.payara.lu = true;
        c.payara.poolMax = 32;
        c.payara.filsHttpMax = 5;
        Reglage fils = new Reglage("Payara", "fils", "Fils HTTP");
        fils.actuel = "5";
        fils.conseille = "50";
        fils.niveau = Niveau.CRITIQUE;
        Reglage pool = new Reglage("Payara", "pool", "Pool");
        pool.niveau = Niveau.OK;
        c.payaraReglages = Arrays.asList(fils, pool);
        PostesReglages.Poste p = PostesReglages.depuis("CAISSE-2", c, 4, 2 * ReglagesServeur.GO, MAINTENANT);
        assertEquals("CAISSE-2", p.hote);
        assertEquals(8192, p.ramMo);
        assertEquals(2048, p.heapMo);
        assertEquals(32, p.pool);
        assertEquals(5, p.filsHttp);
        assertEquals(1, p.aAjuster);
        assertEquals(1, p.critiques);
        assertEquals("50", new JSONArray(p.reglages).getJSONObject(0).getString("conseille"));
        assertTrue(!p.json().getBoolean("serveur"));
    }

    @Test
    void ensembleSainSansAlerte() {
        List<PostesReglages.Poste> l = Arrays.asList(poste("SERVEUR", true, 50), poste("CAISSE-2", false, 32));
        assertEquals(Collections.emptyList(), PostesReglages.alertes(l, 2, 151, MAINTENANT));
    }

    @Test
    void poolsAuDelaDeMariadb() {
        List<PostesReglages.Poste> l = Arrays.asList(poste("SERVEUR", true, 50), poste("CAISSE-2", false, 100));
        List<String> a = PostesReglages.alertes(l, 2, 151, MAINTENANT);
        assertTrue(a.stream().anyMatch(x -> x.contains("150 connexions") && x.contains("151")), a.toString());
    }

    @Test
    void plusDePostesQueDeclares() {
        List<PostesReglages.Poste> l = Arrays.asList(poste("SERVEUR", true, 50), poste("CAISSE-2", false, 32),
                poste("CAISSE-3", false, 32));
        List<String> a = PostesReglages.alertes(l, 2, 500, MAINTENANT);
        assertTrue(a.stream().anyMatch(x -> x.startsWith("3 machines relevées pour 2")), a.toString());
    }

    @Test
    void deuxDomainesDuMemePosteComptentPourUneMachine() {
        PostesReglages.Poste d2 = poste("SERVEUR", true, 50);
        d2.domaine = "domain2";
        List<String> a = PostesReglages.alertes(Arrays.asList(poste("SERVEUR", true, 50), d2), 1, 500, MAINTENANT);
        assertEquals(Collections.emptyList(), a);
    }

    @Test
    void caisseDeclareeServeurEtBaseAilleurs() {
        PostesReglages.Poste c = poste("CAISSE-2", true, 50);
        c.mariadbLocale = false;
        List<String> a = PostesReglages.alertes(Arrays.asList(poste("SERVEUR", true, 50), c), 2, 500, MAINTENANT);
        assertTrue(a.stream().anyMatch(x -> x.contains("« CAISSE-2 » se déclare serveur")), a.toString());
        assertTrue(a.stream().anyMatch(x -> x.contains("Plusieurs machines se déclarent serveur : SERVEUR, CAISSE-2")),
                a.toString());
    }

    @Test
    void posteSansNouvelles() {
        PostesReglages.Poste c = poste("CAISSE-2", false, 32);
        c.releve = MAINTENANT.minusDays(31);
        List<String> a = PostesReglages.alertes(Arrays.asList(poste("SERVEUR", true, 50), c), 2, 500, MAINTENANT);
        assertTrue(a.stream().anyMatch(x -> x.contains("Pas de relevé de « CAISSE-2 »") && x.contains("02/10/2026")),
                a.toString());
    }
}
