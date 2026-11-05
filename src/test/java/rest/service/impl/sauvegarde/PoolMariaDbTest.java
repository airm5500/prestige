package rest.service.impl.sauvegarde;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

class PoolMariaDbTest {

    private static final String DOMAINE = "<resources>"
            + "<jdbc-connection-pool datasource-classname=\"x\" name=\"autre_pool\"><property name=\"databaseName\" value=\"autre\"></property></jdbc-connection-pool>"
            + "<jdbc-connection-pool datasource-classname=\"com.mysql.jdbc.jdbc2.optional.MysqlDataSource\" name=\"laborex_pool\" res-type=\"javax.sql.DataSource\">"
            + "<property name=\"serverName\" value=\"127.0.0.1\"></property><property name=\"portNumber\" value=\"3307\"></property>"
            + "<property name=\"databaseName\" value=\"laborex\"></property><property name=\"User\" value=\"prestige\"></property>"
            + "<property name=\"Password\" value=\"a&quot;b\\c#d\"></property></jdbc-connection-pool>"
            + "<jdbc-resource pool-name=\"laborex_pool\" jndi-name=\"jdbc/__laborex_pool\"></jdbc-resource></resources>";

    @Test
    void litLePoolDeLaRessourceDePrestige() {
        PoolMariaDb p = PoolMariaDb.lire(DOMAINE);
        assertEquals("127.0.0.1", p.hote);
        assertEquals(3307, p.port);
        assertEquals("laborex", p.base);
        assertEquals("prestige", p.utilisateur);
        assertEquals("a\"b\\c#d", p.motDePasse);
        assertFalse(p.motDePasseProtege());
    }

    @Test
    void optionsEchappeesPourLeClientMariaDb() {
        String o = PoolMariaDb.lire(DOMAINE).options();
        assertTrue(o.startsWith("[client]\n"));
        assertTrue(o.contains("password=\"a\\\"b\\\\c#d\"\n"));
        assertTrue(o.contains("port=3307\n"));
    }

    /** Cas 4, lot 4.A : fichier d'options du compte de sauvegarde (valeurs nues ou entre guillemets, commentaires). */
    @Test
    void fichierDOptionsDuCompteDeSauvegarde() {
        PoolMariaDb p = PoolMariaDb
                .depuisOptions("# commentaire\n[mysqld]\nuser=pasmoi\n[client]\nuser=prestige_sauvegarde\n"
                        + "password=\"a\\\"b\\\\c#d\"\nhost=127.0.0.1\nport=3307\n; fin\n");
        assertEquals("prestige_sauvegarde", p.utilisateur);
        assertEquals("a\"b\\c#d", p.motDePasse);
        assertEquals("127.0.0.1", p.hote);
        assertEquals(3307, p.port);
        assertEquals("", p.base);
        assertEquals(
                "[client]\nuser=\"prestige_sauvegarde\"\npassword=\"a\\\"b\\\\c#d\"\nhost=\"127.0.0.1\"\nport=3307\n",
                p.options());
        PoolMariaDb nu = PoolMariaDb.depuisOptions("[client]\nuser=x\npassword=y z\n");
        assertEquals("y z", nu.motDePasse);
        assertEquals("localhost", nu.hote);
        assertEquals(3306, nu.port);
        assertNull(PoolMariaDb.depuisOptions("[mysqld]\nuser=x\n"));
        assertNull(PoolMariaDb.depuisOptions(null));
    }

    @Test
    void urlJdbcEtAlias() {
        PoolMariaDb p = PoolMariaDb.lire(
                "<jdbc-connection-pool name=\"laborex_pool\"><property name=\"url\" value=\"jdbc:mariadb://srv:3310/officine?x=1\"></property>"
                        + "<property name=\"password\" value=\"${ALIAS=mdp}\"></property></jdbc-connection-pool>");
        assertEquals("srv", p.hote);
        assertEquals(3310, p.port);
        assertEquals("officine", p.base);
        assertTrue(p.motDePasseProtege());
        assertNull(PoolMariaDb.lire("<resources></resources>"));
    }
}
