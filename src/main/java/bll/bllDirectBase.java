package bll;

import dal.*;
import java.sql.Connection;
import java.sql.SQLException;
import toolkits.utils.date;

import toolkits.utils.jdom;

import toolkits.utils.logger;

/**
 *
 * @author Administrator
 */
public class bllDirectBase extends bll.bllBase {

    private date key = new date();
    protected jconnexion Ojconnexion;
    protected java.sql.Connection oConnection;

    public jconnexion getOjconnexion() {
        return Ojconnexion;
    }

    public void setOjconnexion(jconnexion Ojconnexion) {
        this.Ojconnexion = Ojconnexion;
    }

    public Connection getoConnection() {
        return oConnection;
    }

    public void setoConnection(Connection oConnection) {
        this.oConnection = oConnection;
    }

    public bllDirectBase() {

        jdom.InitRessource();
        jdom.LoadRessource();
    }

    public void initAll() {
        if (Ojconnexion == null) {
            Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
        }
        try {
            Ojconnexion.initConnexion();
        } catch (Exception e) {
        }

        try {
            Ojconnexion.OpenConnexion();
        } catch (Exception e) {
        }

        oConnection = Ojconnexion.get_StringConnexion();

    }

    public void closeConnexion() {
        try {
            oConnection.close();
        } catch (SQLException ex) {
            new logger().OCategory.fatal("Error code= " + ex.getErrorCode() + " " + ex.getSQLState() + ex.getMessage());
        }
    }

    public date getKey() {
        return key;
    }

    /**
     * @param key
     *            the key to set
     */
    public void setKey(date key) {
        this.key = key;
    }
}
