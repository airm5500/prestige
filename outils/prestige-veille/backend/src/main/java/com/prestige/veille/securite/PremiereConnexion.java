package com.prestige.veille.securite;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * La veille est consultable depuis le reseau : tant que l'utilisateur connecte a encore le mot de passe par defaut,
 * toute l'API lui est refusee sauf le changement de mot de passe (et la deconnexion).
 */
public class PremiereConnexion extends OncePerRequestFilter {

    static final Set<String> PERMIS = Set.of("/api/connexion", "/api/etat", "/api/moi", "/api/motdepasse", "/api/deconnexion");

    private final JdbcTemplate jdbc;

    public PremiereConnexion(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse rep, FilterChain suite)
            throws ServletException, IOException {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        String chemin = req.getRequestURI().substring(req.getContextPath().length());
        if (chemin.startsWith("/api/") && !PERMIS.contains(chemin) && a != null && a.isAuthenticated()
                && !(a instanceof AnonymousAuthenticationToken)) {
            Integer d = jdbc.queryForObject("SELECT COUNT(*) FROM utilisateur WHERE login = ? AND mdp_par_defaut = TRUE",
                    Integer.class, a.getName());
            if (d != null && d > 0) {
                rep.setStatus(HttpServletResponse.SC_FORBIDDEN);
                rep.setContentType("application/json");
                rep.setCharacterEncoding("UTF-8");
                rep.getWriter().write("{\"message\":\"Changez d'abord le mot de passe par défaut.\",\"motDePasseAChanger\":true}");
                return;
            }
        }
        suite.doFilter(req, rep);
    }
}
