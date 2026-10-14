package com.prestige.veille.securite;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;

/**
 * Securite : connexion par identifiant et mot de passe (BCrypt), session du navigateur, protection CSRF (jeton lu dans
 * le cookie XSRF-TOKEN et renvoye dans l'en-tete X-XSRF-TOKEN). Seuls l'ecran de connexion, l'etat public et les
 * fichiers de l'interface sont accessibles sans session. Tant que le mot de passe par defaut n'est pas change, seule
 * la page de changement est permise (voir {@link PremiereConnexion}).
 */
@Configuration
public class Securite {

    @Bean
    PasswordEncoder chiffrement() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    UserDetailsService utilisateurs(JdbcTemplate jdbc) {
        return login -> jdbc.query("SELECT login, mot_de_passe, actif FROM utilisateur WHERE login = ?", rs -> {
            if (!rs.next()) {
                throw new UsernameNotFoundException("inconnu");
            }
            return User.withUsername(rs.getString(1)).password(rs.getString(2)).disabled(!rs.getBoolean(3))
                    .roles("VEILLE").build();
        }, login);
    }

    @Bean
    AuthenticationManager authentification(UserDetailsService u, PasswordEncoder p) {
        DaoAuthenticationProvider d = new DaoAuthenticationProvider();
        d.setUserDetailsService(u);
        d.setPasswordEncoder(p);
        return new ProviderManager(d);
    }

    @Bean
    SecurityContextRepository contexte() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    SecurityFilterChain filtres(HttpSecurity http, SecurityContextRepository contexte, JdbcTemplate jdbc) throws Exception {
        CsrfTokenRequestAttributeHandler csrf = new CsrfTokenRequestAttributeHandler();
        csrf.setCsrfRequestAttributeName(null);
        http.csrf(c -> c.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()).csrfTokenRequestHandler(csrf))
                .securityContext(s -> s.securityContextRepository(contexte))
                .authorizeHttpRequests(a -> a.requestMatchers("/api/connexion", "/api/etat").permitAll()
                        .requestMatchers("/api/**").authenticated().anyRequest().permitAll())
                .addFilterAfter(new PremiereConnexion(jdbc), AnonymousAuthenticationFilter.class)
                .exceptionHandling(e -> e.authenticationEntryPoint((req, rep, ex) -> {
                    rep.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    rep.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    rep.setCharacterEncoding("UTF-8");
                    rep.getWriter().write("{\"message\":\"Session expirée : reconnectez-vous.\"}");
                }))
                .headers(h -> h.frameOptions(f -> f.deny()).contentSecurityPolicy(c -> c.policyDirectives(
                        "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'")))
                .formLogin(f -> f.disable()).httpBasic(b -> b.disable()).logout(l -> l.disable());
        return http.build();
    }
}
