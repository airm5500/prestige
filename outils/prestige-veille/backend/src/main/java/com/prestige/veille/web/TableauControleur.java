package com.prestige.veille.web;

import com.prestige.veille.service.Actions;
import com.prestige.veille.service.Alertes;
import com.prestige.veille.service.Journal;
import com.prestige.veille.service.Reglages;
import com.prestige.veille.sonde.Incidents;
import com.prestige.veille.sonde.Mesures;
import com.prestige.veille.sonde.Sondes;
import java.security.Principal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** API du tableau de bord (connexion requise, mot de passe par defaut change). */
@RestController
public class TableauControleur {

    private final Mesures mesures;
    private final Incidents incidents;
    private final Sondes sondes;
    private final Reglages reglages;
    private final Actions actions;
    private final Alertes alertes;
    private final Journal journal;

    public TableauControleur(Mesures mesures, Incidents incidents, Sondes sondes, Reglages reglages, Actions actions,
            Alertes alertes, Journal journal) {
        this.mesures = mesures;
        this.incidents = incidents;
        this.sondes = sondes;
        this.reglages = reglages;
        this.actions = actions;
        this.alertes = alertes;
        this.journal = journal;
    }

    @GetMapping("/api/tableau")
    public Map<String, Object> tableau() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("cibles", mesures.dernieres());
        m.put("ouverts", incidents.ouverts());
        m.put("disponibilite24h", mesures.disponibilite(24));
        m.put("derniereSonde", sondes.getDerniereSonde() == null ? "" : sondes.getDerniereSonde().toString().replace('T', ' ').substring(0, 19));
        m.put("redemarrageAuto", reglages.oui("redemarrage.auto"));
        return m;
    }

    @GetMapping("/api/serie")
    public List<Map<String, Object>> serie(@RequestParam String cible, @RequestParam(defaultValue = "24") int heures) {
        return mesures.serie(cible, heures);
    }

    @GetMapping("/api/incidents")
    public List<Map<String, Object>> incidents(@RequestParam(defaultValue = "7") int jours) {
        return incidents.liste(jours);
    }

    @GetMapping("/api/journal")
    public List<Map<String, Object>> journal() {
        return journal.derniers(200);
    }

    @GetMapping("/api/reglages")
    public List<Map<String, Object>> reglages() {
        return reglages.pourEcran();
    }

    @PutMapping("/api/reglages")
    public ResponseEntity<Map<String, Object>> enregistrer(@RequestBody Map<String, String> valeurs, Principal p) {
        try {
            int n = reglages.enregistrer(valeurs);
            journal.noter(p.getName(), "REGLAGES", n + " réglage(s) modifié(s)");
            return ResponseEntity.ok(Map.of("modifies", n));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/api/sonder")
    public Map<String, Object> sonder() {
        sondes.sonder();
        return tableau();
    }

    @PostMapping("/api/actions/vider-pool")
    public Map<String, Object> viderPool(Principal p) {
        String r = actions.viderPool();
        journal.noter(p.getName(), "VIDER_POOL", r);
        return Map.of("resultat", r);
    }

    @PostMapping("/api/actions/redemarrer-payara")
    public Map<String, Object> redemarrer(Principal p) {
        String r = actions.redemarrerPayara();
        journal.noter(p.getName(), "REDEMARRER_PAYARA", r);
        return Map.of("resultat", r);
    }

    @PostMapping("/api/actions/tester-alerte")
    public Map<String, Object> testerAlerte(Principal p) {
        return Map.of("resultat", alertes.envoyer("Essai", "Alerte d'essai demandée par " + p.getName() + "."));
    }
}
