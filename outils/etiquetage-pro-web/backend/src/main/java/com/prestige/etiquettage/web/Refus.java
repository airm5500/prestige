package com.prestige.etiquettage.web;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;

/**
 * Demande refusee, avec un message pour l'utilisateur et, pour un formulaire, l'erreur de chaque champ. Rendue en JSON
 * {@code {message, erreurs}} par {@link Erreurs}.
 */
public class Refus extends RuntimeException {

    private static final long serialVersionUID = 1L;
    private final HttpStatus statut;
    private final Map<String, String> erreurs;

    public Refus(HttpStatus statut, String message) {
        this(statut, message, Collections.emptyMap());
    }

    public Refus(HttpStatus statut, String message, Map<String, String> erreurs) {
        super(message, null, false, false);
        this.statut = statut;
        this.erreurs = new LinkedHashMap<>(erreurs);
    }

    public static Refus requete(String message) {
        return new Refus(HttpStatus.BAD_REQUEST, message);
    }

    public static Refus introuvable(String message) {
        return new Refus(HttpStatus.NOT_FOUND, message);
    }

    public HttpStatus getStatut() {
        return statut;
    }

    public Map<String, String> getErreurs() {
        return erreurs;
    }
}
