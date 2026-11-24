package rest.service.impl.securite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import javax.sql.DataSource;

import org.junit.jupiter.api.Test;

/**
 * Essai du cas 4 sur plan/21112026 (24/11) : sur un pool sans verification des connexions, la premiere connexion
 * demandee apres un changement du mot de passe (ou un compte verrouille puis deverrouille) est morte. L'onglet Securite
 * se croyait alors inactif (actif = false) et la date de la derniere rotation n'etait pas enregistree. Le pool simule
 * ici rend d'abord des connexions mortes, de deux facons : refus a l'allocation, ou connexion rendue mais invalide.
 */
public class ConnexionPoolMorteTest {

    /** Pool simule : les « mortes » premieres demandes echouent (une sur deux par exception), puis tout repond. */
    static final class PoolSimule {
        final List<Boolean> fermees = new ArrayList<>();
        int demandes;
        final int mortes;
        final String valeur;

        PoolSimule(int mortes, String valeur) {
            this.mortes = mortes;
            this.valeur = valeur;
        }

        DataSource source() {
            return (DataSource) Proxy.newProxyInstance(getClass().getClassLoader(), new Class<?>[] { DataSource.class },
                    (p, m, a) -> {
                        if (!"getConnection".equals(m.getName())) {
                            throw new UnsupportedOperationException(m.getName());
                        }
                        int n = demandes++;
                        if (n < mortes && n % 2 == 0) {
                            throw new SQLException("Error in allocating a connection. Cause: This Managed Connection"
                                    + " is not valid as the physical connection is not usable");
                        }
                        return connexion(n >= mortes);
                    });
        }

        private Connection connexion(boolean vivante) {
            int indice = fermees.size();
            fermees.add(false);
            return (Connection) Proxy.newProxyInstance(getClass().getClassLoader(), new Class<?>[] { Connection.class },
                    (p, m, a) -> {
                        switch (m.getName()) {
                        case "isValid":
                            return vivante;
                        case "close":
                            fermees.set(indice, true);
                            return null;
                        case "prepareStatement":
                            if (!vivante) {
                                throw new SQLException("connexion morte");
                            }
                            return requete();
                        default:
                            throw new UnsupportedOperationException(m.getName());
                        }
                    });
        }

        private PreparedStatement requete() {
            return (PreparedStatement) Proxy.newProxyInstance(getClass().getClassLoader(),
                    new Class<?>[] { PreparedStatement.class }, (p, m, a) -> {
                        switch (m.getName()) {
                        case "setString":
                        case "close":
                            return null;
                        case "executeQuery":
                            return resultat();
                        default:
                            throw new UnsupportedOperationException(m.getName());
                        }
                    });
        }

        private ResultSet resultat() {
            boolean[] lu = new boolean[1];
            return (ResultSet) Proxy.newProxyInstance(getClass().getClassLoader(), new Class<?>[] { ResultSet.class },
                    (p, m, a) -> {
                        switch (m.getName()) {
                        case "next":
                            boolean premier = !lu[0];
                            lu[0] = true;
                            return premier && valeur != null;
                        case "getString":
                            return valeur;
                        case "close":
                            return null;
                        default:
                            throw new UnsupportedOperationException(m.getName());
                        }
                    });
        }
    }

    @Test
    public void lOngletResteActifApresUneConnexionMorte() {
        for (int mortes = 0; mortes < IdentifiantsBaseService.ESSAIS_CONNEXION; mortes++) {
            PoolSimule pool = new PoolSimule(mortes, "1");
            assertTrue(IdentifiantsBaseService.actif(pool.source()), mortes + " connexion(s) morte(s)");
            assertEquals(mortes + 1, pool.demandes, "une demande de plus par connexion morte, pas davantage");
        }
    }

    @Test
    public void lesConnexionsMortesSontRenduesAuPool() throws SQLException {
        PoolSimule pool = new PoolSimule(2, "1");
        try (Connection c = IdentifiantsBaseService.connexion(pool.source())) {
            assertTrue(c.isValid(1));
        }
        assertTrue(pool.fermees.stream().allMatch(f -> f), "connexions fermees : " + pool.fermees);
    }

    @Test
    public void unPoolEnPanneResteEnPanne() {
        PoolSimule pool = new PoolSimule(100, "1");
        assertThrows(SQLException.class, () -> IdentifiantsBaseService.connexion(pool.source()));
        assertEquals(IdentifiantsBaseService.ESSAIS_CONNEXION, pool.demandes, "nombre d'essais borne");
        assertFalse(IdentifiantsBaseService.actif(new PoolSimule(100, "1").source()), "base injoignable : inactif");
    }

    /**
     * Coherence : 5 000 pools tires au hasard (graine fixe) ; actif si et seulement si une connexion vivante arrive a
     * temps et le parametre vaut 1.
     */
    @Test
    public void coherenceSurDesMilliersDePools() {
        Random r = new Random(20261124L);
        String[] valeurs = { "1", "0", null, " 1 ", "2" };
        for (int i = 0; i < 5000; i++) {
            int mortes = r.nextInt(6);
            String v = valeurs[r.nextInt(valeurs.length)];
            PoolSimule pool = new PoolSimule(mortes, v);
            boolean attendu = mortes < IdentifiantsBaseService.ESSAIS_CONNEXION && v != null && "1".equals(v.trim());
            assertEquals(attendu, IdentifiantsBaseService.actif(pool.source()), "mortes=" + mortes + " valeur=" + v);
            assertTrue(pool.demandes <= IdentifiantsBaseService.ESSAIS_CONNEXION);
            assertTrue(
                    pool.fermees.subList(0, Math.max(0, pool.fermees.size() - 1)).stream().allMatch(f -> f) || !attendu,
                    "connexions mortes rendues");
        }
    }
}
