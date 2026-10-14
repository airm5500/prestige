package com.prestige.veille;

import java.awt.Desktop;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URI;
import java.util.Arrays;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Prestige Veille : surveille Prestige depuis l'exterieur (Payara, MariaDB, postes de caisse, services Windows,
 * machine), garde l'historique dans sa propre base, ouvre des incidents, alerte et peut agir (vider le pool,
 * redemarrer le service Payara). Fonctionne meme quand Prestige est tombe.
 * <p>
 * Sur le serveur, la veille tourne en tache planifiee (compte SYSTEM, argument --service). Le raccourci du menu
 * Demarrer lance le meme programme sans --service : si la veille tourne deja, il ouvre seulement le tableau de bord
 * dans le navigateur (pas de second exemplaire sur le meme port).
 */
@SpringBootApplication
@EnableScheduling
public class VeilleApplication {

    public static void main(String[] args) {
        boolean service = Arrays.asList(args).contains("--service");
        String[] reste = Arrays.stream(args).filter(a -> !"--service".equals(a)).toArray(String[]::new);
        int port = port();
        if (!service && dejaLancee(port)) {
            ouvrirNavigateur(port);
            return;
        }
        SpringApplication.run(VeilleApplication.class, reste);
        if (!service) {
            ouvrirNavigateur(port);
        }
    }

    static int port() {
        String p = System.getProperty("VEILLE_PORT", System.getenv("VEILLE_PORT"));
        try {
            return p == null || p.isBlank() ? 8099 : Integer.parseInt(p.trim());
        } catch (NumberFormatException e) {
            return 8099;
        }
    }

    static boolean dejaLancee(int port) {
        try (Socket s = new Socket()) {
            s.connect(new InetSocketAddress("127.0.0.1", port), 500);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private static void ouvrirNavigateur(int port) {
        try {
            System.setProperty("java.awt.headless", "false");
            if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
                Desktop.getDesktop().browse(URI.create("http://127.0.0.1:" + port + "/"));
            }
        } catch (Exception | Error e) {
            /* poste sans bureau (serveur, Linux sans affichage) : le tableau de bord reste joignable a l'adresse */
        }
    }
}
