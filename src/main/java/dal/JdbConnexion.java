/*
 * JdbConnexion.java
 *
 * Created on 24 août 2008, 05:10
 *
 * To change this template, choose Tools | Template Manager
 * and open the template in the editor.
 */
package dal;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.sql.DataSource;
import rest.service.impl.sauvegarde.PoolMariaDb;
import rest.service.impl.securite.IdentifiantsBaseService;
import toolkits.parameters.commonparameter;
import toolkits.utils.jdom;

/**
 * Connexion a la base des anciens ecrans (JSP, bll, etats Jasper), par {@link jconnexion}.
 * <p>
 * Cas 4, lot 4.A (S4) : quand KEY_SECURITE_BASE = 1, la connexion vient du pool JNDI de Payara
 * ({@link PoolMariaDb#JNDI}) : plus d'URL JDBC qui porte le mot de passe, donc plus de mot de passe possible dans
 * server.log, et des connexions rendues au pool au lieu d'etre ouvertes une a une. A 0 (defaut), ou hors Payara (lookup
 * impossible), l'ancien chemin reste : URL construite depuis la configuration XML lue par jdom, mais tout message
 * journalise est filtre : le mot de passe n'y apparait jamais.
 * </p>
 */
public class JdbConnexion {

    private static final Logger LOG = Logger.getLogger(JdbConnexion.class.getName());
    /** Dernier mode journalise (une ligne a chaque changement, jamais de secret) : null, pool ou direct. */
    private static volatile Boolean dernierModePool;

    private String host;
    private String user;
    private String password;
    private String database;

    private Connection connexion;
    private String urlConnexion;
    private ResultSet resultat;
    public String message;
    private int port;

    /**
     * Creates a new instance of jconnexion
     */
    public JdbConnexion() {
        jdom.InitRessource();
        jdom.LoadRessource();
        setDefaultParamConnexion();
    }

    private void setDefaultParamConnexion() {
        host = jdom.ars_database_host;
        password = jdom.ars_database_user_password;
        user = jdom.ars_database_user_name;
        database = jdom.ars_database_name;

        port = commonparameter.port_databases;
        urlConnexion = "jdbc:mysql://" + host + "/" + database + "?user=" + user + "&password=" + password;

    }

    public void openConnexion() {
        try {

            connexion = getConnection();
            message = "Connexion reussi";

        } catch (Exception ex) {
            LOG.log(Level.SEVERE, "Ouverture de la connexion : {0}", filtrer(ex.toString()));
        }
    }
    // fermeture de la connexion

    public void closeConnexion() {
        try {
            if (resultat != null) {
                resultat.close();
                resultat = null;
            }
        } catch (SQLException ex) {
            LOG.log(Level.SEVERE, "Fermeture du résultat : {0}", filtrer(ex.toString()));
        }
        try {
            if (connexion != null) {
                connexion.close();
                connexion = null;
            }
        } catch (SQLException ex) {
            LOG.log(Level.SEVERE, "Fermeture de la connexion : {0}", filtrer(ex.toString()));
        }
    }

    /**
     * La connexion de cet objet, ouverte si besoin (une connexion deja ouverte est rendue telle quelle : avant, chaque
     * appel en ouvrait une nouvelle, jamais fermee). null si la base ne repond pas (comme avant).
     */
    public Connection getConnection() {
        try {
            if (connexion != null && !connexion.isClosed()) {
                return connexion;
            }
        } catch (SQLException e) {
            LOG.log(Level.FINE, "etat de la connexion", e);
        }
        connexion = null;
        if (IdentifiantsBaseService.actifDepuisPool()) {
            DataSource pool = IdentifiantsBaseService.pool();
            if (pool != null) {
                signaler(true);
                try {
                    Connection c = pool.getConnection();
                    try {
                        if (!c.getAutoCommit()) {
                            c.setAutoCommit(true);
                        }
                    } catch (SQLException e) {
                        LOG.log(Level.FINE, "autocommit", e);
                    }
                    connexion = c;
                } catch (SQLException ex) {
                    LOG.log(Level.SEVERE, "Connexion par le pool " + PoolMariaDb.JNDI + " refusée : {0}",
                            filtrer(ex.toString()));
                }
                return connexion;
            }
        }
        signaler(false);
        try {
            connexion = DriverManager.getConnection(urlConnexion);
        } catch (SQLException ex) {
            LOG.log(Level.SEVERE, "Connexion directe à la base refusée : {0}", filtrer(ex.toString()));
        }
        return connexion;
    }

    /** Une ligne dans le journal a chaque changement de mode (sans secret) : utile au support. */
    private static void signaler(boolean pool) {
        Boolean precedent = dernierModePool;
        if (precedent == null || precedent != pool) {
            dernierModePool = pool;
            LOG.log(Level.INFO, pool
                    ? "Anciens écrans : connexions par le pool JNDI " + PoolMariaDb.JNDI + " (KEY_SECURITE_BASE = 1)"
                    : "Anciens écrans : connexion JDBC directe par la configuration XML (KEY_SECURITE_BASE = 0)");
        }
    }

    /** Le texte sans le mot de passe ni l'URL de connexion : seul texte qui peut aller dans le journal. */
    String filtrer(String texte) {
        return filtrer(texte, password, urlConnexion);
    }

    static String filtrer(String texte, String motDePasse, String url) {
        if (texte == null) {
            return "";
        }
        String t = texte;
        if (url != null && !url.isEmpty()) {
            t = t.replace(url, "jdbc:mysql://***");
        }
        if (motDePasse != null && !motDePasse.isEmpty()) {
            t = t.replace(motDePasse, "***");
        }
        return t.replaceAll("(?i)password=[^&\\s\"']*", "password=***");
    }
}
