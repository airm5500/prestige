package com.prestige.etiquettage.securite;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
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
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Securite : connexion par identifiant et mot de passe (BCrypt), session du navigateur, protection CSRF (jeton lu par
 * Angular dans le cookie XSRF-TOKEN). Seuls l'ecran de connexion et les fichiers de l'interface sont accessibles sans
 * session ; toute l'API exige une connexion.
 */
@Configuration
public class Securite {

    @Bean
    PasswordEncoder chiffrement() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    UserDetailsService utilisateurs(JdbcTemplate jdbc) {
        return login -> jdbc.query("SELECT login, mot_de_passe, actif FROM utilisateur WHERE login = ?",
                rs -> {
                    if (!rs.next()) {
                        throw new UsernameNotFoundException("inconnu");
                    }
                    return User.withUsername(rs.getString(1)).password(rs.getString(2)).disabled(!rs.getBoolean(3))
                            .roles("UTILISATEUR").build();
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
    SecurityFilterChain filtres(HttpSecurity http, SecurityContextRepository contexte) throws Exception {
        CsrfTokenRequestAttributeHandler csrf = new CsrfTokenRequestAttributeHandler();
        csrf.setCsrfRequestAttributeName(null);
        http.csrf(c -> c.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()).csrfTokenRequestHandler(csrf))
                .securityContext(s -> s.securityContextRepository(contexte))
                .authorizeHttpRequests(a -> a.requestMatchers("/api/connexion", "/api/etat").permitAll()
                        .requestMatchers("/api/**").authenticated().anyRequest().permitAll())
                .exceptionHandling(e -> e.authenticationEntryPoint((req, rep, ex) -> {
                    rep.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    rep.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    rep.setCharacterEncoding("UTF-8");
                    rep.getWriter().write("{\"message\":\"Session expirée : reconnectez-vous.\"}");
                }))
                .headers(h -> h.frameOptions(f -> f.deny()).contentSecurityPolicy(c -> c.policyDirectives(
                        "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; "
                                + "frame-src 'self' blob:; object-src 'self' blob:; frame-ancestors 'none'")))
                .formLogin(f -> f.disable()).httpBasic(b -> b.disable()).logout(l -> l.disable());
        return http.build();
    }
}
