package com.prestige.etiquettage.catalogue;

import com.prestige.etiquettage.web.Refus;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** API du catalogue : champs, liste, fiche produit, historique. */
@RestController
@RequestMapping("/api")
public class CatalogueControleur {

    private final CatalogueService service;

    public CatalogueControleur(CatalogueService service) {
        this.service = service;
    }

    public record Selection(List<String> cips) {
    }

    @GetMapping("/champs")
    public List<Champ> champs() {
        return service.champs();
    }

    private static CatalogueService.Filtre filtre(String q, String peremption, boolean dernierImport, String tri,
            String sens) {
        return new CatalogueService.Filtre(q, peremption, dernierImport, tri, sens);
    }

    @GetMapping("/produits")
    public CatalogueService.Page lister(@RequestParam(required = false) String q,
            @RequestParam(required = false) String peremption,
            @RequestParam(defaultValue = "false") boolean dernierImport, @RequestParam(required = false) String tri,
            @RequestParam(required = false) String sens, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int taille) {
        return service.lister(filtre(q, peremption, dernierImport, tri, sens), page, taille);
    }

    @GetMapping("/produits/cips")
    public List<String> cips(@RequestParam(required = false) String q,
            @RequestParam(required = false) String peremption,
            @RequestParam(defaultValue = "false") boolean dernierImport, @RequestParam(required = false) String tri,
            @RequestParam(required = false) String sens) {
        return service.cips(filtre(q, peremption, dernierImport, tri, sens));
    }

    /** Controle d'une fiche en cours de saisie (sans enregistrer) ; {@code cip} : fiche en modification. */
    @PostMapping("/produits/controle")
    public CatalogueService.Controle controler(@RequestBody Map<String, String> saisie,
            @RequestParam(required = false) String cip) {
        return service.controler(saisie, cip);
    }

    private static String cipValide(String cip) {
        if (cip == null || !cip.matches("\\d{7}|\\d{13}")) {
            throw Refus.introuvable("Produit introuvable.");
        }
        return cip;
    }

    @GetMapping("/produits/{cip}")
    public Produit lire(@PathVariable String cip) {
        return service.lire(cipValide(cip));
    }

    @PostMapping("/produits")
    @ResponseStatus(HttpStatus.CREATED)
    public Produit creer(@RequestBody Map<String, String> saisie, Principal p) {
        return service.creer(saisie, p.getName());
    }

    @PutMapping("/produits/{cip}")
    public Produit modifier(@PathVariable String cip, @RequestBody Map<String, String> saisie, Principal p) {
        return service.modifier(cipValide(cip), saisie, p.getName());
    }

    @DeleteMapping("/produits/{cip}")
    public Map<String, Object> supprimer(@PathVariable String cip, Principal p) {
        if (service.supprimer(List.of(cipValide(cip)), p.getName()) == 0) {
            throw Refus.introuvable("Produit " + cip + " introuvable.");
        }
        return Map.of("supprimes", 1);
    }

    @PostMapping("/produits/suppression")
    public Map<String, Object> supprimerSelection(@RequestBody Selection s, Principal p) {
        if (s.cips() == null || s.cips().isEmpty()) {
            throw Refus.requete("Aucun produit coché.");
        }
        return Map.of("supprimes", service.supprimer(s.cips(), p.getName()));
    }

    /** Plusieurs produits d'un coup (apercu d'impression), dans l'ordre demande ; 500 au plus, inconnus omis. */
    @PostMapping("/produits/lot")
    public List<Produit> lot(@RequestBody Selection s) {
        if (s.cips() == null || s.cips().size() > CatalogueService.TAILLE_MAX) {
            throw Refus.requete("De 0 à " + CatalogueService.TAILLE_MAX + " produits par demande.");
        }
        return service.lot(s.cips());
    }

    @GetMapping("/produits/{cip}/historique")
    public List<Map<String, Object>> historique(@PathVariable String cip) {
        return service.historique(cipValide(cip));
    }
}
