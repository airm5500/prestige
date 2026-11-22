package rest.service.impl.serveur;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import rest.service.impl.serveur.ReglagesServeur.Niveau;
import rest.service.impl.serveur.ReglagesServeur.Reglage;

/**
 * Retour du 22/11 : sur les caisses de 8 Go, Payara ne demarrait plus apres les reglages conseilles. L'option du
 * journal du ramasse-miettes « -Xlog:gc*:file=D:/.../gc.log:time,... » est refusee par Java (« Invalid -Xlog option »,
 * le « : » du lecteur D: coupe l'option) : la machine virtuelle ne se cree pas.
 *
 * Ce test DEMARRE une vraie machine Java avec toutes les options que Prestige conseille d'ajouter (lignes « asadmin
 * create-jvm-options », dechappees comme asadmin les ecrit dans domain.xml), pour plusieurs tailles de machine et
 * plusieurs dossiers : une option qui empeche le demarrage ne peut plus etre conseillee.
 */
class ConfigPayaraOptionsJavaTest {

    private static final Pattern CREATION = Pattern.compile("create-jvm-options (\\S+)");

    /** Options conseillees, telles que domain.xml les recevra (\: redevient :). */
    static List<String> optionsConseillees(List<Reglage> l) {
        List<String> o = new ArrayList<>();
        for (Reglage r : l) {
            if (r.niveau == Niveau.OK || r.ligne == null) {
                continue;
            }
            Matcher m = CREATION.matcher(r.ligne);
            while (m.find()) {
                o.add(m.group(1).replace("\\:", ":"));
            }
        }
        return o;
    }

    private static int demarrer(List<String> options, Path dossierDeTravail) throws Exception {
        List<String> cmd = new ArrayList<>();
        cmd.add(System.getProperty("java.home") + File.separator + "bin" + File.separator + "java");
        cmd.addAll(options);
        cmd.add("-version");
        /* comme Payara, lance depuis un dossier du disque de ses journaux */
        Process p = new ProcessBuilder(cmd).directory(dossierDeTravail.toFile()).redirectErrorStream(true).start();
        String sortie = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        assertTrue(p.waitFor(60, TimeUnit.SECONDS), "Java ne rend pas la main");
        if (p.exitValue() != 0) {
            System.out.println(String.join(" ", options) + "\n" + sortie);
        }
        return p.exitValue();
    }

    @Test
    void javaDemarreAvecLesOptionsConseillees(@TempDir Path dossier) throws Exception {
        String logs = dossier.resolve("logs").toAbsolutePath().toString().replace('\\', '/');
        String vidages = dossier.resolve("dumps").toAbsolutePath().toString().replace('\\', '/');
        Files.createDirectories(dossier.resolve("logs"));
        Files.createDirectories(dossier.resolve("dumps"));
        ConfigPayara c = ConfigPayara.lire(ConfigPayaraTest.DOMAIN);
        /* caisse 8 Go, serveur 16 Go ; options d'origine absentes ou deja presentes */
        for (long ram : new long[] { 8, 16 }) {
            for (List<String> actuelles : Arrays.asList(Arrays.<String> asList(), Arrays.asList("-Xmx512m"))) {
                List<Reglage> l = c.comparer(actuelles, ReglagesServeur.heapConseille(ram * ReglagesServeur.GO),
                        ram == 8 ? 1 : 10, vidages, logs);
                List<String> options = optionsConseillees(l);
                assertTrue(options.stream().anyMatch(x -> x.startsWith("-Xlog:gc")), options.toString());
                /* le test ne doit pas reserver toute la memoire de la machine qui le lance */
                options.replaceAll(x -> x.matches("-Xm[sx]\\d+[gm]") ? x.substring(0, 4) + "64m" : x);
                assertEquals(0, demarrer(options, dossier), "Java refuse : " + options);
                assertTrue(options.stream().noneMatch(x -> x.matches(".*file=[A-Za-z]:.*")), options.toString());
                /* chaque option conseillee passe par le bouton « Appliquer » du Centre de support */
                assertEquals(
                        l.stream()
                                .filter(r -> r.niveau != Niveau.OK && r.ligne != null
                                        && r.ligne.contains("jvm-options"))
                                .count(),
                        ApplicationPayara.commandes(l, null).stream()
                                .filter(x -> x.arguments.get(0).contains("jvm-options")).map(x -> x.cle).distinct()
                                .count());
            }
        }
    }

    /** L'ancienne forme, deja posee sur un poste (sans redemarrage), est signalee a corriger, avec son retrait. */
    @Test
    void ancienneOptionSignalee(@TempDir Path dossier) throws Exception {
        String ancienne = "-Xlog:gc*:file=D:/payara5/glassfish/domains/domain1/logs/gc.log:time,uptime:filecount=5,filesize=20m";
        assertTrue(demarrer(Arrays.asList(ancienne), dossier) != 0,
                "l'ancienne forme doit bien empecher Java de demarrer");
        ConfigPayara c = ConfigPayara.lire(ConfigPayaraTest.DOMAIN);
        Reglage gc = c
                .comparer(Arrays.asList("-Xmx3g", "-Xms3g", ancienne), 3 * ReglagesServeur.GO, 10, "D:/d",
                        "D:/payara5/glassfish/domains/domain1/logs")
                .stream().filter(r -> "gc-log".equals(r.cle)).findFirst().get();
        assertEquals(Niveau.CRITIQUE, gc.niveau);
        assertTrue(gc.ligne.contains("delete-jvm-options " + ConfigPayara.echapper(ancienne)), gc.ligne);
        assertTrue(
                gc.ligne.contains(
                        "create-jvm-options -Xlog\\:gc*\\:file=/payara5/glassfish/domains/domain1/logs/gc.log"),
                gc.ligne);
        /* retrait de l'ancienne forme et pose de la nouvelle : admis par le bouton « Appliquer » */
        assertEquals(2, ApplicationPayara.commandes(Arrays.asList(gc), null).size(), gc.ligne);
    }
}
