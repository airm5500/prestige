package rest.service.impl;

import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import org.apache.commons.lang3.StringUtils;

/**
 * DATE DE NAISSANCE du patient (retour du 30/09) : facultative, saisie JJ/MM/AA ou JJ/MM/AAAA dans l'ecran, envoyee au
 * serveur en AAAA-MM-JJ. L'age de l'ordonnance en est deduit : il ne peut plus contredire la date.
 *
 * <p>
 * Les controles de l'ecran sont rejoues ici : une date impossible (31/02), a venir, ou de plus de
 * {@value OrdonnanceClientSaisie#AGE_MAX} ans est refusee.
 */
public final class DateNaissance {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ofPattern("uuuu-MM-dd")
            .withResolverStyle(ResolverStyle.STRICT);
    private static final DateTimeFormatter FR = DateTimeFormatter.ofPattern("dd/MM/uuuu")
            .withResolverStyle(ResolverStyle.STRICT);

    private DateNaissance() {
    }

    /** La date lue (AAAA-MM-JJ ou JJ/MM/AAAA), ou null si elle est absente ou impossible. */
    public static LocalDate lire(String saisie) {
        String s = StringUtils.trimToEmpty(saisie);
        if (s.isEmpty()) {
            return null;
        }
        if (s.length() > 10) {
            /* « 1985-03-02 00:00:00 » : une date-heure venue de la base. */
            s = s.substring(0, 10);
        }
        try {
            return LocalDate.parse(s, s.indexOf('/') > 0 ? FR : ISO);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    /** Le motif du refus, ou null si la date est vide ou recevable. */
    public static String valider(String saisie, LocalDate aujourdhui) {
        if (StringUtils.isBlank(saisie)) {
            return null;
        }
        LocalDate d = lire(saisie);
        if (d == null) {
            return "La date de naissance n'existe pas (JJ/MM/AAAA).";
        }
        if (d.isAfter(aujourdhui)) {
            return "La date de naissance ne peut pas être dans le futur.";
        }
        if (age(d, aujourdhui) > OrdonnanceClientSaisie.AGE_MAX) {
            return "La date de naissance donne plus de " + OrdonnanceClientSaisie.AGE_MAX + " ans.";
        }
        return null;
    }

    /** Age revolu a une date donnee. */
    public static int age(LocalDate naissance, LocalDate a) {
        return Math.max(Period.between(naissance, a).getYears(), 0);
    }
}
