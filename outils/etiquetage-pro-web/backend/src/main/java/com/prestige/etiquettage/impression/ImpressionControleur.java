package com.prestige.etiquettage.impression;

import java.security.Principal;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** API de l'impression : reglages, resume, PDF, page de test, personnalisation. */
@RestController
@RequestMapping("/api")
public class ImpressionControleur {

    private final ImpressionService impression;
    private final Personnalisation personnalisation;

    public ImpressionControleur(ImpressionService impression, Personnalisation personnalisation) {
        this.impression = impression;
        this.personnalisation = personnalisation;
    }

    public record Test(String modele, Map<String, String> planche) {
    }

    /** PDF affiche dans le navigateur (apercu, puis impression depuis le lecteur PDF). */
    static ResponseEntity<byte[]> pdf(byte[] contenu, String nom) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + nom + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-store").body(contenu);
    }

    @GetMapping("/impression/reglages")
    public Map<String, Object> reglages() {
        return impression.reglages();
    }

    @PutMapping("/impression/reglages")
    public Map<String, Object> enregistrer(@RequestBody ImpressionService.NouveauxReglages r) {
        return impression.enregistrer(r);
    }

    @PostMapping("/impression/resume")
    public Map<String, Object> resume(@RequestBody ImpressionService.Demande d) {
        return impression.resume(d);
    }

    @PostMapping("/impression/pdf")
    public ResponseEntity<byte[]> imprimer(@RequestBody ImpressionService.Demande d) {
        return pdf(impression.pdf(d), "etiquettes.pdf");
    }

    @PostMapping("/impression/test")
    public ResponseEntity<byte[]> test(@RequestBody Test t) {
        return pdf(impression.pageDeTest(t.modele(), t.planche()), "page-de-test.pdf");
    }

    @PostMapping(value = "/personnalisation/charger", produces = MediaType.APPLICATION_JSON_VALUE)
    public String charger(@RequestBody(required = false) String corps) {
        return personnalisation.charger(corps);
    }

    @PostMapping(value = "/personnalisation/controler", produces = MediaType.APPLICATION_JSON_VALUE)
    public String controler(@RequestBody String corps) {
        return personnalisation.controler(corps);
    }

    @PostMapping(value = "/personnalisation/enregistrer", produces = MediaType.APPLICATION_JSON_VALUE)
    public String enregistrerDisposition(@RequestBody String corps, Principal p) {
        return personnalisation.enregistrer(corps, p.getName());
    }

    @PostMapping(value = "/personnalisation/supprimer", produces = MediaType.APPLICATION_JSON_VALUE)
    public String supprimer(@RequestBody String corps) {
        return personnalisation.supprimer(corps);
    }

    @PostMapping("/personnalisation/essai")
    public ResponseEntity<byte[]> essai(@RequestBody String corps) {
        return pdf(personnalisation.essai(corps), "essai-etiquette.pdf");
    }
}
