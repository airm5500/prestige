package com.prestige.etiquettage;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.URI;
import java.nio.charset.StandardCharsets;

/**
 * Une seule instance par poste. Au lancement, sur le port prevu (8095 ou ETIQUETTAGE_PORT) :
 * <ul>
 * <li>Etiquettage Pro repond deja : on ouvre le navigateur sur lui et ce lancement s'arrete ;</li>
 * <li>port libre : on le prend ;</li>
 * <li>port pris par un autre programme : un port libre est choisi (le navigateur s'ouvre sur lui).</li>
 * </ul>
 */
final class Instance {

    private Instance() {
    }

    static int portPrevu() {
        String p = System.getProperty("server.port", System.getenv("ETIQUETTAGE_PORT"));
        try {
            return p == null || p.isBlank() ? 8095 : Integer.parseInt(p.trim());
        } catch (NumberFormatException e) {
            return 8095;
        }
    }

    /** Vrai : ce lancement continue ; faux : une instance tourne deja (navigateur ouvert sur elle). */
    static boolean choisirPort() {
        int port = portPrevu();
        if (port == 0 || libre(port)) {
            return true;
        }
        if (estEtiquettage(port)) {
            System.out.println("Étiquettage Pro est déjà lancé : ouverture du navigateur.");
            if (!"false".equalsIgnoreCase(System.getenv("ETIQUETTAGE_NAVIGATEUR"))) {
                EtiquettageProApplication.ouvrir("http://127.0.0.1:" + port + "/");
            }
            return false;
        }
        System.out.println("Port " + port + " occupé par un autre programme : un port libre est choisi.");
        System.setProperty("server.port", "0");
        return true;
    }

    static boolean libre(int port) {
        try (ServerSocket s = new ServerSocket(port, 1, InetAddress.getLoopbackAddress())) {
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    /** Etiquettage Pro repond-il sur ce port (ecran d'etat public). */
    static boolean estEtiquettage(int port) {
        try {
            HttpURLConnection c = (HttpURLConnection) URI.create("http://127.0.0.1:" + port + "/api/etat").toURL()
                    .openConnection();
            c.setConnectTimeout(1500);
            c.setReadTimeout(1500);
            if (c.getResponseCode() != 200) {
                return false;
            }
            String corps = new String(c.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            return corps.contains("\"premierLancement\"");
        } catch (IOException | RuntimeException e) {
            return false;
        }
    }
}
