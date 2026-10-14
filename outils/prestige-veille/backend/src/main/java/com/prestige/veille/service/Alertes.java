package com.prestige.veille.service;

import java.util.Locale;
import java.util.Properties;
import java.util.concurrent.TimeUnit;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;

/**
 * Alertes : message sur l'ecran du serveur (commande Windows « msg ») et e-mail (serveur SMTP des reglages). Une alerte
 * qui ne part pas est notee au journal sans interrompre la veille. Aucun secret dans les messages.
 */
@Service
public class Alertes {

    private static final Logger LOG = Logger.getLogger(Alertes.class.getName());

    private final Reglages reglages;
    private final Journal journal;

    public Alertes(Reglages reglages, Journal journal) {
        this.reglages = reglages;
        this.journal = journal;
    }

    static boolean windows() {
        return System.getProperty("os.name", "").toLowerCase(Locale.ROOT).startsWith("windows");
    }

    /** Envoie l'alerte par les canaux actives ; renvoie le compte rendu. */
    public String envoyer(String titre, String message) {
        StringBuilder r = new StringBuilder();
        if (reglages.oui("alerte.ecran")) {
            r.append(ecran(titre, message));
        }
        if (reglages.oui("alerte.email")) {
            r.append(r.length() > 0 ? " ; " : "").append(email(titre, message));
        }
        String compteRendu = r.length() == 0 ? "aucun canal actif" : r.toString();
        journal.noter("veille", "ALERTE", titre + " -> " + compteRendu);
        return compteRendu;
    }

    String ecran(String titre, String message) {
        if (!windows()) {
            return "écran : Windows seulement";
        }
        try {
            String texte = ("Prestige Veille - " + titre + " : " + message).replace("\"", "'");
            Process p = new ProcessBuilder("msg", "*", "/TIME:300", texte).redirectErrorStream(true)
                    .redirectOutput(ProcessBuilder.Redirect.DISCARD).start();
            return p.waitFor(15, TimeUnit.SECONDS) && p.exitValue() == 0 ? "écran : affiché" : "écran : échec";
        } catch (Exception e) {
            return "écran : impossible (" + e.getClass().getSimpleName() + ")";
        }
    }

    String email(String titre, String message) {
        String hote = reglages.texte("smtp.hote", ""), a = reglages.texte("email.destinataires", "");
        if (hote.isEmpty() || a.isEmpty()) {
            return "e-mail : serveur SMTP ou destinataires non renseignés";
        }
        try {
            JavaMailSenderImpl m = new JavaMailSenderImpl();
            m.setHost(hote);
            m.setPort(reglages.entier("smtp.port", 587));
            m.setUsername(reglages.texte("smtp.utilisateur", ""));
            m.setPassword(reglages.texte("smtp.motdepasse", ""));
            Properties p = m.getJavaMailProperties();
            p.put("mail.smtp.auth", String.valueOf(!reglages.texte("smtp.utilisateur", "").isEmpty()));
            p.put("mail.smtp.starttls.enable", "true");
            p.put("mail.smtp.connectiontimeout", "10000");
            p.put("mail.smtp.timeout", "10000");
            SimpleMailMessage s = new SimpleMailMessage();
            s.setFrom(reglages.texte("smtp.de", reglages.texte("smtp.utilisateur", "")));
            s.setTo(a.split("\\s*,\\s*"));
            s.setSubject("Prestige Veille - " + titre);
            s.setText(message + "\n\n-- Prestige Veille");
            m.send(s);
            return "e-mail : envoyé";
        } catch (Exception e) {
            LOG.log(Level.WARNING, "e-mail d'alerte : {0}", e.getClass().getSimpleName());
            return "e-mail : échec (" + e.getClass().getSimpleName() + ")";
        }
    }
}
