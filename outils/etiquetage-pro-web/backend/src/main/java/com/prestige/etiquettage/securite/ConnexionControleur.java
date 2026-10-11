package com.prestige.etiquettage.securite;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.security.Principal;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Connexion, deconnexion, utilisateur courant, changement de mot de passe. */
@RestController
public class ConnexionControleur {

    private final AuthenticationManager authentification;
    private final SecurityContextRepository contexte;
    private final JdbcTemplate jdbc;
    private final PasswordEncoder chiffrement;

    public ConnexionControleur(AuthenticationManager a, SecurityContextRepository c, JdbcTemplate j, PasswordEncoder p) {
        this.authentification = a;
        this.contexte = c;
        this.jdbc = j;
        this.chiffrement = p;
    }

    public record Identifiants(String login, String motDePasse) {
    }

    public record NouveauMotDePasse(String actuel, String nouveau) {
    }

    /** Etat public : pour l'ecran de connexion (premier lancement : admin / admin encore actif). */
    @GetMapping("/api/etat")
    public Map<String, Object> etat() {
        Integer defaut = jdbc.queryForObject("SELECT COUNT(*) FROM utilisateur WHERE mdp_par_defaut = 1", Integer.class);
        return Map.of("premierLancement", defaut != null && defaut > 0, "version", "1.0");
    }

    @PostMapping("/api/connexion")
    public ResponseEntity<Map<String, Object>> connexion(@RequestBody Identifiants i, HttpServletRequest req,
            HttpServletResponse rep) {
        try {
            Authentication a = authentification.authenticate(UsernamePasswordAuthenticationToken
                    .unauthenticated(i.login() == null ? "" : i.login().trim(), i.motDePasse() == null ? "" : i.motDePasse()));
            req.getSession(true);
            req.changeSessionId();
            SecurityContext sc = SecurityContextHolder.createEmptyContext();
            sc.setAuthentication(a);
            SecurityContextHolder.setContext(sc);
            contexte.saveContext(sc, req, rep);
            return ResponseEntity.ok(moi(a.getName()));
        } catch (AuthenticationException e) {
            return ResponseEntity.status(401).body(Map.of("message", "Identifiant ou mot de passe incorrect."));
        }
    }

    @PostMapping("/api/deconnexion")
    public Map<String, Object> deconnexion(HttpServletRequest req) {
        if (req.getSession(false) != null) {
            req.getSession(false).invalidate();
        }
        SecurityContextHolder.clearContext();
        return Map.of("ok", true);
    }

    @GetMapping("/api/moi")
    public Map<String, Object> moi(Principal p) {
        return moi(p.getName());
    }

    private Map<String, Object> moi(String login) {
        Boolean defaut = jdbc.queryForObject("SELECT mdp_par_defaut FROM utilisateur WHERE login = ?", Boolean.class, login);
        return Map.of("login", login, "motDePasseParDefaut", Boolean.TRUE.equals(defaut));
    }

    @PostMapping("/api/mot-de-passe")
    public ResponseEntity<Map<String, Object>> changer(@RequestBody NouveauMotDePasse m, Principal p) {
        String hash = jdbc.queryForObject("SELECT mot_de_passe FROM utilisateur WHERE login = ?", String.class, p.getName());
        if (m.actuel() == null || !chiffrement.matches(m.actuel(), hash)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Mot de passe actuel incorrect."));
        }
        String n = m.nouveau() == null ? "" : m.nouveau();
        if (n.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le nouveau mot de passe doit faire au moins 6 caractères."));
        }
        if (n.equals(m.actuel())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le nouveau mot de passe doit être différent de l'actuel."));
        }
        jdbc.update("UPDATE utilisateur SET mot_de_passe = ?, mdp_par_defaut = 0 WHERE login = ?", chiffrement.encode(n),
                p.getName());
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
