package com.prestige.veille;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Prestige Veille : surveille Prestige depuis l'exterieur (Payara, MariaDB, postes de caisse, services Windows,
 * machine), garde l'historique dans sa propre base, ouvre des incidents, alerte et peut agir (vider le pool,
 * redemarrer le service Payara). Fonctionne meme quand Prestige est tombe.
 */
@SpringBootApplication
@EnableScheduling
public class VeilleApplication {

    public static void main(String[] args) {
        SpringApplication.run(VeilleApplication.class, args);
    }
}
