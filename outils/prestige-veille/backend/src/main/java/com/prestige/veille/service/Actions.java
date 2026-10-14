package com.prestige.veille.service;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.TimeUnit;
import org.springframework.stereotype.Service;

/**
 * Actions sur le serveur : vider le pool de connexions de Prestige (asadmin flush-connection-pool) et redemarrer le
 * service Windows de Payara. Chaque action est journalisee par l'appelant. Windows seulement pour le service.
 */
@Service
public class Actions {

    private final Reglages reglages;

    public Actions(Reglages reglages) {
        this.reglages = reglages;
    }

    static boolean windows() {
        return System.getProperty("os.name", "").toLowerCase(Locale.ROOT).startsWith("windows");
    }

    private static String lancer(int secondes, String... commande) {
        try {
            Process p = new ProcessBuilder(commande).redirectErrorStream(true).start();
            String sortie = new String(p.getInputStream().readAllBytes(), windows() ? StandardCharsets.ISO_8859_1 : StandardCharsets.UTF_8);
            if (!p.waitFor(secondes, TimeUnit.SECONDS)) {
                p.destroyForcibly();
                return "trop long (" + secondes + " s)";
            }
            String fin = sortie.trim();
            fin = fin.length() > 300 ? fin.substring(fin.length() - 300) : fin;
            return (p.exitValue() == 0 ? "réussi" : "échec (code " + p.exitValue() + ")") + (fin.isEmpty() ? "" : " : " + fin);
        } catch (Exception e) {
            return "impossible (" + e.getClass().getSimpleName() + ")";
        }
    }

    public String viderPool() {
        String asadmin = reglages.texte("payara.asadmin", ""), pool = reglages.texte("payara.pool", "laborex_pool");
        if (asadmin.isEmpty() || !new File(asadmin).isFile()) {
            return "asadmin introuvable : " + asadmin;
        }
        return "Vidage du pool " + pool + " : " + (windows() ? lancer(120, "cmd", "/c", asadmin, "flush-connection-pool", pool)
                : lancer(120, asadmin, "flush-connection-pool", pool));
    }

    public String redemarrerPayara() {
        String s = reglages.texte("service.payara", "");
        if (!windows()) {
            return "Redémarrage du service : Windows seulement";
        }
        if (s.isEmpty() || !s.matches("[A-Za-z0-9 _.-]+")) {
            return "Nom du service Payara invalide";
        }
        String arret = lancer(180, "cmd", "/c", "net", "stop", s);
        String demarrage = lancer(300, "cmd", "/c", "net", "start", s);
        return "Redémarrage du service " + s + " - arrêt : " + arret + " ; démarrage : " + demarrage;
    }
}
