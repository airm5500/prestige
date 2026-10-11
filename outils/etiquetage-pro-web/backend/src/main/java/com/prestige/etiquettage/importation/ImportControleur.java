package com.prestige.etiquettage.importation;

import com.prestige.etiquettage.web.Refus;
import java.io.IOException;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** API de l'import du catalogue (4 etapes) et journal des imports. */
@RestController
@RequestMapping("/api/imports")
public class ImportControleur {

    private final ImportService service;

    public ImportControleur(ImportService service) {
        this.service = service;
    }

    public record Correspondance(List<ImportService.Colonne> colonnes) {
    }

    public record Relecture(String feuille, Boolean avecTitres) {
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> analyser(@RequestPart("fichier") MultipartFile fichier,
            @RequestParam(required = false) String feuille, @RequestParam(defaultValue = "true") boolean avecTitres,
            Principal p) throws IOException {
        if (fichier.isEmpty()) {
            throw Refus.requete("Le fichier est vide.");
        }
        return service.analyser(fichier.getOriginalFilename(), fichier.getBytes(), feuille, avecTitres, p.getName());
    }

    @PostMapping("/{id}/relire")
    public Map<String, Object> relire(@PathVariable String id, @RequestBody Relecture r, Principal p) {
        return service.relire(id, r.feuille(), r.avecTitres() == null || r.avecTitres(), p.getName());
    }

    @PostMapping("/{id}/controle")
    public ImportService.Controle controler(@PathVariable String id, @RequestBody Correspondance c, Principal p) {
        return service.controler(id, c.colonnes(), p.getName());
    }

    @GetMapping("/{id}/erreurs.csv")
    public ResponseEntity<byte[]> erreurs(@PathVariable String id, Principal p) {
        return ResponseEntity.ok().contentType(new MediaType("text", "csv", java.nio.charset.StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"erreurs-import.csv\"")
                .body(service.erreursCsv(id, p.getName()));
    }

    @PostMapping("/{id}/appliquer")
    public Map<String, Object> appliquer(@PathVariable String id, @RequestBody Correspondance c, Principal p) {
        return service.appliquer(id, c.colonnes(), p.getName());
    }

    @GetMapping("/journal")
    public List<Map<String, Object>> journal() {
        return service.journal();
    }
}
