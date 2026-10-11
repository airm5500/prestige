package com.prestige.etiquettage.web;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

/** Refus et erreurs de requete rendus en JSON {@code {message, erreurs}} (jamais de pile ni de page d'erreur). */
@RestControllerAdvice
public class Erreurs {

    @ExceptionHandler(Refus.class)
    public ResponseEntity<Map<String, Object>> refus(Refus r) {
        Map<String, Object> corps = new LinkedHashMap<>();
        corps.put("message", r.getMessage());
        if (!r.getErreurs().isEmpty()) {
            corps.put("erreurs", r.getErreurs());
        }
        return ResponseEntity.status(r.getStatut()).body(corps);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> tropGros(MaxUploadSizeExceededException e) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(Map.of("message", "Fichier trop volumineux (30 Mo au plus)."));
    }

    @ExceptionHandler({ HttpMessageNotReadableException.class, MissingServletRequestPartException.class })
    public ResponseEntity<Map<String, Object>> illisible(Exception e) {
        return ResponseEntity.badRequest().body(Map.of("message", "Requête incomplète ou illisible."));
    }
}
