/*
 * jconnexion.java
 *
 * Created on 24 ao�t 2008, 05:10
 *
 * To change this template, choose Tools | Template Manager
 * and open the template in the editor.
 */
package dal;

import java.sql.*;
import java.sql.Connection;

/**
 *
 * @author Administrateur
 */
public class jconnexion {

    private Connection StringConnexion;

    private ResultSet resultat;
    public String message;

    private final JdbConnexion jdbConnexion;

    /**
     * Creates a new instance of jconnexion
     */
    public jconnexion() {
        jdbConnexion = new JdbConnexion();
        StringConnexion = jdbConnexion.getConnection();

    }

    public void initConnexion() {

    }

    public Connection get_StringConnexion() {
        return StringConnexion;
    }

    public String get_message() {
        return message;
    }

    public void set_Request(String request) {

        String Request = request;
        try {
            Statement stmt = StringConnexion.createStatement();
            // new logger().OCategory.info(MyRequest);
            resultat = stmt.executeQuery(Request);
        } catch (Exception ex) {
            System.out.println(ex.getMessage());
        }
    }

    public ResultSet get_resultat() {
        return resultat;
    }
    // pilote JDBC Mysql

    public void LoadDriver() {

    }

    public void OpenConnexion() {
        if (StringConnexion == null) {
            StringConnexion = jdbConnexion.getConnection();
        }

    }
    // fermeture de la connexion

    public void CloseConnexion() {
        try {

            this.StringConnexion.close();

            resultat.close();

            jdbConnexion.getConnection().close();
        } catch (Exception MysqlEx) {
            message = "Impossible de fermer " + MysqlEx.getMessage();
            // ars_logger.oCategory.warn(date.GetDateNow(date.formatterUI)+ " "+message);
            System.out.println(message);
        }
    }

    public Connection getConnection() {
        if (StringConnexion != null) {
            return StringConnexion;
        }
        return jdbConnexion.getConnection();
    }
}
