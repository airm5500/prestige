/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package util;

import com.fazecast.jSerialComm.SerialPort;

import java.io.IOException;
import java.io.OutputStream;
import java.util.logging.Level;
import java.util.logging.Logger;
import toolkits.utils.jdom;

/**
 *
 * @author kkoffi
 */
public class Afficheur {

    private static final Logger LOG = Logger.getLogger(Afficheur.class.getName());
    private OutputStream outStream;
    private SerialPort serialPort; // le port série
    private static Afficheur INSTANCE = null;
    private static final String PORT_NUM = jdom.com_port_displayer;

    public static Afficheur getInstance() {
        if (INSTANCE == null) {
            INSTANCE = new Afficheur();
        }
        return INSTANCE;
    }

    private Afficheur() {
        getPort();
    }

    private void getPort() {
        if (org.apache.commons.lang3.StringUtils.isNoneEmpty(PORT_NUM)) {
            try {
                serialPort = SerialPort.getCommPort(PORT_NUM);
                outStream = serialPort.getOutputStream();
            } catch (Exception e) {
                LOG.log(Level.SEVERE, e.getLocalizedMessage());
            }

        }
    }

    public void communique(char envoie) {
        if (org.apache.commons.lang3.StringUtils.isNoneEmpty(PORT_NUM)) {
            open();
            try {
                // affiche un caractere a l'ecran
                outStream.write(envoie);
            } catch (IOException e) {
                LOG.log(Level.SEVERE, e.getLocalizedMessage());
                close();
            }
        }

    }

    /**
     * Méthode de fermeture des flux et port.
     */
    public void close() {
        try {
            serialPort.closePort();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, e.getLocalizedMessage());
        }

    }

    public void open() {
        try {
            if (!serialPort.isOpen()) {
                serialPort.openPort();
            }

        } catch (Exception e) {
            LOG.log(Level.SEVERE, e.getLocalizedMessage());

        }
        // règle les paramètres de la connexion

        // sPort.setSerialPortParams(9600, SerialPort.DATABITS_8, SerialPort.STOPBITS_1, SerialPort.PARITY_NONE);
    }

    public void affichage(String data, String position) {
        open();
        String remain = "";
        try {
            for (int i = 0; i < (20 - data.length()); i++) {
                remain += " ";
            }
            if (position.equals("begin")) {
                data = remain + data;
            } else {
                data = data + remain;
            }

            String[] tab = data.split("");

            for (String tab1 : tab) {
                communique(tab1.charAt(0));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, e.getLocalizedMessage());
        }
    }

    public void affichage(String data) {
        open();
        String remain = "";
        try {
            for (int i = 0; i < (20 - data.length()); i++) {
                remain += " ";
            }
            data = data + remain;
            String[] tab = data.split("");

            for (String tab1 : tab) {
                communique(tab1.charAt(0));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, e.getLocalizedMessage());
        }
    }
}
