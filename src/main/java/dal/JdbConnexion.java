/*
 * JdbConnexion.java
 *
 * Created on 24 ao�t 2008, 05:10
 *
 * To change this template, choose Tools | Template Manager
 * and open the template in the editor.
 */
package dal;

import java.sql.*;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.logging.Level;
import java.util.logging.Logger;
import toolkits.parameters.commonparameter;
import toolkits.utils.jdom;

/**
 *
 * @author Administrateur
 */
public class JdbConnexion {

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
            Logger.getLogger(JdbConnexion.class.getName()).log(Level.SEVERE, null, ex);
        }
    }
    // fermeture de la connexion

    public void closeConnexion() {
        try {

            this.connexion.close();
            resultat.close();

        } catch (SQLException ex) {
            Logger.getLogger(JdbConnexion.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public Connection getConnection() {

        try {
            connexion = DriverManager.getConnection(urlConnexion);

        } catch (SQLException ex) {
            Logger.getLogger(JdbConnexion.class.getName()).log(Level.SEVERE, null, ex);
        }
        return connexion;
    }
}
