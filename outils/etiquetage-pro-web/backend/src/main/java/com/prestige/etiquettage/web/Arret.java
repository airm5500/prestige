package com.prestige.etiquettage.web;

import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Arret de l'application depuis l'interface (avant une mise a jour, ou pour liberer le poste) : la reponse part, puis
 * l'application s'arrete proprement (la base embarquee est arretee avec elle).
 */
@RestController
public class Arret {

    private final ConfigurableApplicationContext contexte;

    public Arret(ConfigurableApplicationContext contexte) {
        this.contexte = contexte;
    }

    @PostMapping("/api/arret")
    public Map<String, Object> arreter() {
        Thread t = new Thread(() -> {
            try {
                Thread.sleep(500);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            System.exit(SpringApplication.exit(contexte, () -> 0));
        }, "arret-application");
        t.setDaemon(false);
        t.start();
        return Map.of("message", "Étiquettage Pro s'arrête. Pour le relancer : raccourci « Étiquettage Pro ».");
    }
}
