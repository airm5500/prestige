package com.prestige.etiquettage;

import com.prestige.etiquettage.base.BaseEmbarquee;
import java.awt.Desktop;
import java.net.URI;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.Environment;

/**
 * Etiquettage Pro, version web autonome. Au lancement : la base MariaDB embarquee demarre (bd_etiquette, creee au premier
 * lancement dans le dossier de donnees de l'utilisateur), puis l'application, puis le navigateur s'ouvre sur l'ecran de
 * connexion. L'application n'ecoute que sur le poste (127.0.0.1).
 */
@SpringBootApplication
public class EtiquettageProApplication {

    public static void main(String[] args) {
        if (!Instance.choisirPort()) {
            /* deja lance sur ce poste : le raccourci ouvre seulement le navigateur */
            return;
        }
        BaseEmbarquee.demarrerSiDemande();
        SpringApplication app = new SpringApplication(EtiquettageProApplication.class);
        app.addListeners((ApplicationReadyEvent e) -> ouvrirNavigateur(e.getApplicationContext()));
        app.run(args);
    }

    static void ouvrirNavigateur(ConfigurableApplicationContext ctx) {
        Environment env = ctx.getEnvironment();
        if (!env.getProperty("etiquettage.ouvrir-navigateur", Boolean.class, false)) {
            return;
        }
        ouvrir("http://127.0.0.1:" + env.getProperty("local.server.port", "8095") + "/");
    }

    static void ouvrir(String url) {
        try {
            if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
                Desktop.getDesktop().browse(URI.create(url));
            } else if (System.getProperty("os.name", "").toLowerCase().contains("win")) {
                new ProcessBuilder("rundll32", "url.dll,FileProtocolHandler", url).start();
            }
        } catch (Exception e) {
            System.out.println("Ouvrez votre navigateur sur " + url);
        }
    }
}
