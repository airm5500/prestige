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

    /** Retour du 03/11 : un seul serveur par reseau, celui qui heberge la base ; les autres sont des caisses. */
    @Test
    void caisseConfigureeEnServeurNommeeAvecLeVraiServeur() {
        PostesReglages.Poste c = poste("CAISSE-2", true, 50);
        c.mariadbLocale = false;
        List<String> a = PostesReglages.alertes(Arrays.asList(poste("SERVEUR", true, 50), c), 2, 500, MAINTENANT);
        assertTrue(a.stream().anyMatch(x -> x.startsWith("« CAISSE-2 » est configuré en serveur")
                && x.contains("la base est sur « SERVEUR »") && x.contains("application.mode=client")
                && x.contains("en double")), a.toString());
        assertEquals(1, a.size(), a.toString());
    }

    @Test
    void machineDeLaBaseConfigureeEnClient() {
        PostesReglages.Poste s = poste("SERVEUR", false, 32);
        s.mariadbLocale = true;
        List<String> a = PostesReglages.alertes(Arrays.asList(s, poste("CAISSE-2", false, 32)), 2, 500, MAINTENANT);
        assertTrue(a.stream().anyMatch(x -> x.startsWith("« SERVEUR » héberge la base mais est configuré en client")
                && x.contains("application.mode=server")), a.toString());
    }

    @Test
    void serveurPasEncoreReleve() {
        List<String> a = PostesReglages.alertes(Arrays.asList(poste("CAISSE-2", false, 32)), 2, 500, MAINTENANT);
        assertTrue(a.stream().anyMatch(x -> x.startsWith("Aucun relevé de la machine qui héberge la base")), a.toString());
    }

    @Test
    void plusieursServeursSansMachineDeLaBaseConnue() {
        PostesReglages.Poste a1 = poste("PC-1", true, 50), a2 = poste("PC-2", true, 50);
        a1.mariadbLocale = false;
        a2.mariadbLocale = false;
        List<String> a = PostesReglages.alertes(Arrays.asList(a1, a2), 2, 500, MAINTENANT);
        assertTrue(a.stream().anyMatch(x -> x.startsWith("Plusieurs machines sont configurées en serveur : PC-1, PC-2")),
                a.toString());
    }

    /**
     * Retour du 03/11 : une caisse configuree en serveur ne lance pas les taches planifiees quand la machine qui heberge
     * la base est connue comme serveur ; dans le doute, rien ne change.
     */
    @Test
    void tachesDuServeurSeulementSurLeVraiServeur() {
        assertTrue(PostesReglages.tachesDuServeurIci(true, true, true), "serveur avec la base : taches lancees");
        assertTrue(PostesReglages.tachesDuServeurIci(true, true, false));
        assertTrue(!PostesReglages.tachesDuServeurIci(true, false, true),
                "configure en serveur, base ailleurs, vrai serveur connu : caisse, pas de taches");
        assertTrue(PostesReglages.tachesDuServeurIci(true, false, false),
                "base ailleurs mais aucun serveur connu (base sur une machine sans Payara) : comme avant");
        assertTrue(!PostesReglages.tachesDuServeurIci(false, true, false), "configure en client : jamais");
        assertTrue(!PostesReglages.tachesDuServeurIci(false, false, true));
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
