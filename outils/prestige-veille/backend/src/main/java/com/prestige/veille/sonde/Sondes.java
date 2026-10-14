package com.prestige.veille.sonde;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prestige.veille.regles.Regles;
import com.prestige.veille.service.Actions;
import com.prestige.veille.service.Journal;
import com.prestige.veille.service.Reglages;
import java.io.File;
import java.lang.management.ManagementFactory;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Sondes, toutes les 30 secondes, en parallele et chacune bornee dans le temps : Prestige (point de veille protege par
 * jeton), MariaDB (connexion directe), machine, services Windows, postes de caisse. Chaque resultat est enregistre et
 * evalue (incidents, alertes, redemarrage automatique s'il est active).
 */
@Service
public class Sondes {

    private static final Logger LOG = Logger.getLogger(Sondes.class.getName());
    public static final String PRESTIGE = "Prestige (serveur)", MARIADB = "MariaDB", MACHINE = "Machine";

    private final Reglages reglages;
    private final Mesures mesures;
    private final Incidents incidents;
    private final Actions actions;
    private final Journal journal;
    private final ObjectMapper json = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final List<LocalDateTime> redemarrages = new ArrayList<>();
    private volatile LocalDateTime derniereSonde;

    public Sondes(Reglages reglages, Mesures mesures, Incidents incidents, Actions actions, Journal journal) {
        this.reglages = reglages;
        this.mesures = mesures;
        this.incidents = incidents;
        this.actions = actions;
        this.journal = journal;
    }

    public LocalDateTime getDerniereSonde() {
        return derniereSonde;
    }

    @Scheduled(initialDelay = 5_000, fixedDelay = 30_000)
    public synchronized void sonder() {
        List<CompletableFuture<List<Mesure>>> taches = new ArrayList<>();
        taches.add(CompletableFuture.supplyAsync(() -> List.of(prestige())));
        taches.add(CompletableFuture.supplyAsync(() -> List.of(mariadb())));
        taches.add(CompletableFuture.supplyAsync(() -> List.of(machine())));
        taches.add(CompletableFuture.supplyAsync(this::services));
        taches.add(CompletableFuture.supplyAsync(this::postes));
        List<Mesure> toutes = new ArrayList<>();
        for (CompletableFuture<List<Mesure>> t : taches) {
            try {
                toutes.addAll(t.get(25, TimeUnit.SECONDS));
            } catch (Exception e) {
                LOG.log(Level.WARNING, "sonde trop longue ou en echec : {0}", e.getClass().getSimpleName());
            }
        }
        for (Mesure m : toutes) {
            try {
                mesures.enregistrer(m);
                incidents.evaluer(m);
            } catch (Exception e) {
                LOG.log(Level.WARNING, "enregistrement d'une mesure", e);
            }
        }
        derniereSonde = LocalDateTime.now();
        redemarrageAutomatique(toutes);
    }

    @Scheduled(cron = "0 17 3 * * *")
    public void purger() {
        mesures.purger(reglages.entier("retention.jours", 30));
    }

    private String url(String base, String chemin) {
        return base.replaceAll("/+$", "") + chemin;
    }

    /** Prestige du serveur : point de veille (jeton) ; sans jeton, simple disponibilite. */
    Mesure prestige() {
        Mesure m = Mesure.de(PRESTIGE, "PRESTIGE");
        String base = reglages.texte("prestige.url", "http://127.0.0.1:8080/prestige"), jeton = reglages.texte("prestige.jeton", "");
        long t = System.nanoTime();
        try {
            HttpRequest.Builder r = HttpRequest.newBuilder(URI.create(url(base, jeton.isEmpty() ? "/api/v1/app/info" : "/api/v1/support/veille")))
                    .timeout(Duration.ofSeconds(15)).GET();
            if (!jeton.isEmpty()) {
                r.header("X-Veille-Jeton", jeton);
            }
            HttpResponse<String> rep = http.send(r.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            m.ms = (int) ((System.nanoTime() - t) / 1_000_000);
            if (rep.statusCode() == 403) {
                m.ok = true;
                m.detail = "Jeton de veille refusé : vérifier SUPPORT_VEILLE_JETON (Prestige répond, détails indisponibles)";
                return m;
            }
            m.ok = rep.statusCode() == 200;
            if (!m.ok) {
                m.detail = "HTTP " + rep.statusCode();
                return m;
            }
            if (jeton.isEmpty()) {
                m.detail = "Jeton de veille non renseigné (Réglages) : seule la disponibilité est mesurée";
            } else {
                JsonNode o = json.readTree(rep.body());
                double max = o.path("memoireMaxMo").asDouble(0);
                m.memoirePct = max > 0 ? o.path("memoireMo").asDouble(0) * 100 / max : null;
                m.cpuServeur = o.path("cpuServeur").isNumber() ? o.path("cpuServeur").asDouble() : null;
                m.filsHttp = o.path("filsHttp").asInt();
                m.poolMs = o.path("poolMs").asInt();
                m.bddConnexions = o.path("bddConnexions").isNumber() ? o.path("bddConnexions").asInt() : null;
                m.bddPic = o.path("bddPic").isNumber() ? o.path("bddPic").asInt() : null;
                JsonNode rum = o.path("rum");
                if (rum.isArray() && rum.size() > 0) {
                    long appels = 0, appelsMs = 0, ecrans = 0, ecransMs = 0, err = 0;
                    for (JsonNode x : rum) {
                        appels += x.path("appels").asLong();
                        appelsMs += x.path("appels").asLong() * x.path("appelMoyenMs").asLong();
                        ecrans += x.path("ecrans").asLong();
                        ecransMs += x.path("ecrans").asLong() * x.path("ecranMoyenMs").asLong();
                        err += x.path("erreurs").asLong();
                    }
                    m.appelMoyenMs = appels == 0 ? null : (int) (appelsMs / appels);
                    m.ecranMoyenMs = ecrans == 0 ? null : (int) (ecransMs / ecrans);
                    m.erreurs = (int) err;
                }
                if (m.poolMs != null && m.poolMs < 0) {
                    m.detail = "Pool de connexions en échec : " + o.path("pool").path("etat").asText("");
                } else if (o.hasNonNull("derniereCause")) {
                    m.detail = "Dernier arrêt brutal : " + o.path("derniereCause").asText();
                }
            }
        } catch (Exception e) {
            m.ok = false;
            m.ms = (int) ((System.nanoTime() - t) / 1_000_000);
            m.detail = "Injoignable (" + e.getClass().getSimpleName() + ")";
        }
        return m;
    }

    /** MariaDB : connexion directe, SELECT 1, connexions en cours et pic. */
    Mesure mariadb() {
        Mesure m = Mesure.de(MARIADB, "MARIADB");
        String url = reglages.texte("mariadb.url", "jdbc:mariadb://127.0.0.1:3306/capitale");
        url += (url.contains("?") ? "&" : "?") + "connectTimeout=5000&socketTimeout=15000";
        long t = System.nanoTime();
        try (Connection c = DriverManager.getConnection(url, reglages.texte("mariadb.utilisateur", "root"),
                reglages.texte("mariadb.motdepasse", "")); Statement s = c.createStatement()) {
            s.execute("SELECT 1");
            m.ms = (int) ((System.nanoTime() - t) / 1_000_000);
            try (ResultSet r = s.executeQuery("SHOW GLOBAL STATUS WHERE Variable_name IN ('Threads_connected','Max_used_connections')")) {
                while (r.next()) {
                    if ("Threads_connected".equalsIgnoreCase(r.getString(1))) {
                        m.bddConnexions = r.getInt(2);
                    } else {
                        m.bddPic = r.getInt(2);
                    }
                }
            }
            m.ok = true;
        } catch (Exception e) {
            m.ok = false;
            m.ms = (int) ((System.nanoTime() - t) / 1_000_000);
            m.detail = Regles.erreurMariadb(e instanceof java.sql.SQLException q ? q.getSQLState() : null, e.getClass().getSimpleName());
        }
        return m;
    }

    /** Machine : processeur, memoire, disque. */
    Mesure machine() {
        Mesure m = Mesure.de(MACHINE, "MACHINE");
        m.ok = true;
        java.lang.management.OperatingSystemMXBean os = ManagementFactory.getOperatingSystemMXBean();
        if (os instanceof com.sun.management.OperatingSystemMXBean s) {
            double cpu = s.getCpuLoad();
            m.cpuMachine = cpu < 0 ? null : cpu * 100;
            m.ramLibreMo = s.getFreeMemorySize() / (1024 * 1024);
            m.ramTotaleMo = s.getTotalMemorySize() / (1024 * 1024);
        }
        File d = new File(reglages.texte("disque", windows() ? "C:/" : "/"));
        m.disqueLibreMo = d.exists() ? d.getUsableSpace() / (1024 * 1024) : null;
        return m;
    }

    static boolean windows() {
        return System.getProperty("os.name", "").toLowerCase(Locale.ROOT).startsWith("windows");
    }

    /** Services Windows de Payara et MariaDB (sc query). */
    List<Mesure> services() {
        List<Mesure> l = new ArrayList<>();
        if (!windows()) {
            return l;
        }
        for (String[] s : new String[][] { { "Service Payara", reglages.texte("service.payara", "") },
            { "Service MariaDB", reglages.texte("service.mariadb", "") } }) {
            if (s[1].isEmpty()) {
                continue;
            }
            Mesure m = Mesure.de(s[0], "SERVICE");
            try {
                Process p = new ProcessBuilder("sc", "query", s[1]).redirectErrorStream(true).start();
                String sortie = new String(p.getInputStream().readAllBytes(), StandardCharsets.ISO_8859_1);
                p.waitFor(10, TimeUnit.SECONDS);
                String etat = Regles.etatService(sortie);
                m.ok = "RUNNING".equals(etat);
                m.detail = etat == null ? "Service « " + s[1] + " » introuvable" : etat;
            } catch (Exception e) {
                m.ok = false;
                m.detail = "sc query impossible (" + e.getClass().getSimpleName() + ")";
            }
            l.add(m);
        }
        return l;
    }

    /** Postes de caisse : « NOM=http://IP:8080/prestige », une ligne par poste. */
    List<Mesure> postes() {
        List<Mesure> l = new ArrayList<>();
        for (String ligne : reglages.texte("postes", "").split("\\r?\\n")) {
            int i = ligne.indexOf('=');
            if (i <= 0) {
                continue;
            }
            String nom = ligne.substring(0, i).trim(), base = ligne.substring(i + 1).trim();
            Mesure m = Mesure.de("Poste " + nom, "POSTE");
            long t = System.nanoTime();
            try {
                HttpResponse<Void> rep = http.send(HttpRequest.newBuilder(URI.create(url(base, "/api/v1/app/info")))
                        .timeout(Duration.ofSeconds(10)).GET().build(), HttpResponse.BodyHandlers.discarding());
                m.ok = rep.statusCode() == 200;
                m.detail = m.ok ? null : "HTTP " + rep.statusCode();
            } catch (Exception e) {
                m.ok = false;
                m.detail = "Injoignable (" + e.getClass().getSimpleName() + ")";
            }
            m.ms = (int) ((System.nanoTime() - t) / 1_000_000);
            l.add(m);
        }
        return l;
    }

    /** Redemarrage automatique du service Payara (desactive par defaut). */
    private void redemarrageAutomatique(List<Mesure> toutes) {
        boolean base = toutes.stream().anyMatch(m -> MARIADB.equals(m.cible) && m.ok);
        LocalDateTime maintenant = LocalDateTime.now();
        redemarrages.removeIf(t -> t.isBefore(maintenant.minusHours(2)));
        Regles.Decision d = Regles.redemarrage(reglages.oui("redemarrage.auto"), incidents.panneDepuis(PRESTIGE), base,
                reglages.entier("redemarrage.minutes", 5), redemarrages, reglages.entier("redemarrage.max.heure", 2), maintenant);
        if (d == Regles.Decision.REDEMARRER) {
            redemarrages.add(maintenant);
            String r = actions.redemarrerPayara();
            journal.noter("veille", "REDEMARRAGE_AUTO", r);
        } else if (d == Regles.Decision.LIMITE_ATTEINTE && redemarrages.stream().noneMatch(t -> t.isAfter(maintenant.minusSeconds(31)))) {
            journal.noter("veille", "REDEMARRAGE_AUTO", "Limite de redémarrages atteinte : intervention nécessaire");
        }
    }
}
