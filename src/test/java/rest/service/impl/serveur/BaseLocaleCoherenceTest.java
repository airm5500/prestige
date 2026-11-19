package rest.service.impl.serveur;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Retour du 18/11 : « la veille de cohérence doit venir uniquement du serveur, pas de chaque poste ». Chez appaul, le
 * pool de chaque Payara donne l'adresse de la base par la propriété serverName, sans url. La règle « base locale » ne
 * lisait que l'url : sans elle, chaque poste se croyait l'hôte de la base (t_serveur_poste : mariadb_locale = 1 sur les
 * 7 postes), et SERVEURLENOVO, déclaré serveur, lançait les tâches du serveur (veille de cohérence du 16/11 04:15 et du
 * 18/11 07:38).
 */
class BaseLocaleCoherenceTest {

    /** domain.xml réduit : le pool de Prestige déclaré par les propriétés données, et une configuration lue. */
    static String domaine(String proprietes) {
        return "<domain><resources>"
                + "<jdbc-connection-pool datasource-classname=\"org.mariadb.jdbc.MariaDbDataSource\" name=\"laborex_pool\" res-type=\"javax.sql.DataSource\">"
                + "<property name=\"password\" value=\"secret\"></property>" + proprietes + "</jdbc-connection-pool>"
                + "<jdbc-resource pool-name=\"laborex_pool\" jndi-name=\"jdbc/__laborex_pool\"></jdbc-resource></resources><configs>"
                + "<config name=\"server-config\"><java-config><jvm-options>-server</jvm-options></java-config>"
                + "<thread-pools><thread-pool name=\"http-thread-pool\"></thread-pool></thread-pools></config>"
                + "</configs></domain>";
    }

    static String serverName(String hote) {
        return "<property name=\"databaseName\" value=\"appaul\"></property><property name=\"serverName\" value=\""
                + hote + "\"></property><property name=\"portNumber\" value=\"3306\"></property>";
    }

    static String url(String hote) {
        return "<property name=\"url\" value=\"jdbc:mariadb://" + hote
                + ":3306/appaul?useUnicode=true&amp;characterEncoding=UTF-8\"></property>";
    }

    private static boolean locale(String xml, String poste, List<String> adresses) {
        return CalculReglages.baseLocale(ConfigPayara.lire(xml), poste, adresses);
    }

    @Test
    void caisseDAppaulBrancheeSurLeServeurParServerName() {
        List<String> caisse44 = Arrays.asList("192.168.1.91", "127.0.0.1", "fe80:0:0:0:bc2:70c3:acfc:13fe");
        assertFalse(locale(domaine(serverName("192.168.1.150")), "CAISSE44", caisse44),
                "la base est sur le serveur : la caisse n'est pas l'hôte de la base");
        assertFalse(locale(domaine(serverName("SERVEUR")), "SERVEURLENOVO", Collections.emptyList()));
    }

    @Test
    void serveurDAppaul() {
        List<String> serveur = Arrays.asList("192.168.1.150", "127.0.0.1");
        assertTrue(locale(domaine(serverName("localhost")), "SERVEUR", serveur));
        assertTrue(locale(domaine(serverName("127.0.0.1")), "SERVEUR", serveur));
        assertTrue(locale(domaine(serverName("192.168.1.150")), "SERVEUR", serveur), "sa propre adresse");
        assertTrue(locale(domaine(serverName("serveur")), "SERVEUR", serveur), "son nom, sans casse");
    }

    @Test
    void dansLeDouteLePosteResteServeur() {
        assertTrue(locale(domaine(""), "CAISSE11", Collections.emptyList()), "pool sans adresse");
        assertTrue(locale("", "CAISSE11", Collections.emptyList()), "domain.xml illisible");
    }

    @Test
    void lUrlPrimeSurServerName() {
        assertFalse(locale(domaine(url("192.168.1.150") + serverName("localhost")), "CAISSE44",
                Arrays.asList("192.168.1.91")));
        assertTrue(locale(domaine(url("127.0.0.1") + serverName("192.168.1.150")), "CAISSE44",
                Arrays.asList("192.168.1.91")));
    }

    /**
     * Cohérence : 5 000 domain.xml tirés au hasard (graine fixe). Règle : l'hôte de la base est celui de l'url, sinon
     * serverName ; le poste l'héberge si cet hôte est une adresse de bouclage, son nom (sans casse) ou une de ses
     * adresses ; sans hôte, il est pris pour l'hôte (dans le doute).
     */
    @Test
    void reglesSurDesMilliersDeCas() {
        Random r = new Random(20261118L);
        String[] postes = { "SERVEUR", "CAISSE11", "CAISSE44", "SERVEURLENOVO", "DESKTOP-CEPK07B" };
        String[] distants = { "192.168.1.150", "192.168.1.93", "10.0.0.5", "SERVEUR", "serveur-bd", "CAISSE22" };
        int locales = 0, distantes = 0;
        for (int i = 0; i < 5000; i++) {
            String poste = postes[r.nextInt(postes.length)];
            List<String> adresses = Arrays.asList("192.168.1." + (90 + r.nextInt(70)), "127.0.0.1");
            String[] candidats = { "localhost", "127.0.0.1", poste, poste.toLowerCase(Locale.ROOT), adresses.get(0),
                    distants[r.nextInt(distants.length)], distants[r.nextInt(distants.length)] };
            String hoteUrl = r.nextInt(3) == 0 ? candidats[r.nextInt(candidats.length)] : null;
            String hoteNom = r.nextInt(4) > 0 ? candidats[r.nextInt(candidats.length)] : null;
            String props = (hoteUrl == null ? "" : url(hoteUrl)) + (hoteNom == null ? "" : serverName(hoteNom));
            String hote = hoteUrl != null ? hoteUrl : hoteNom;
            boolean attendu = hote == null || hote.equals("localhost") || hote.equals("127.0.0.1")
                    || hote.equalsIgnoreCase(poste) || adresses.contains(hote);
            assertEquals(attendu, locale(domaine(props), poste, adresses),
                    "cas " + i + " : poste " + poste + " " + adresses + ", url " + hoteUrl + ", serverName " + hoteNom);
            if (attendu) {
                locales++;
            } else {
                distantes++;
            }
        }
        assertTrue(locales > 1000 && distantes > 1000, "jeu varié : " + locales + " / " + distantes);
    }
}
