package com.prestige.etiquettage.web;

import java.nio.charset.StandardCharsets;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Adresses de l'interface Angular (navigation dans le navigateur) : servies par index.html, qui choisit l'ecran. Les
 * fichiers de l'interface sont servis tels quels depuis static/.
 */
@Controller
public class Interface {

    @GetMapping({ "/", "/connexion", "/catalogue", "/produit/nouveau", "/produit/{cip}", "/import", "/impression",
            "/personnalisation", "/compte" })
    public ResponseEntity<Resource> index() {
        Resource r = new ClassPathResource("static/index.html");
        if (!r.exists()) {
            return ResponseEntity.status(503).contentType(MediaType.TEXT_PLAIN).body(new ByteArrayResource(
                    "Interface absente : construisez le frontend (construire.sh).".getBytes(StandardCharsets.UTF_8)));
        }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .contentType(MediaType.TEXT_HTML).body(r);
    }
}
