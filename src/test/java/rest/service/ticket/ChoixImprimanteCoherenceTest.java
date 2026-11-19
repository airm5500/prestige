package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import javax.print.PrintService;
import org.junit.jupiter.api.Test;

/**
 * CAISSE11 (16/11) : Payara en service Windows n'a pas d'imprimante par defaut ; les tickets tombaient sur « Imprimante
 * inconnue ». Regles du choix, verifiees sur des milliers de postes tires au hasard (graine fixe) : l'imprimante par
 * defaut gagne toujours ; sans elle, la premiere imprimante declaree (ordre de la liste) installee sur le poste, le nom
 * compare sans casse ni espaces autour ; jamais une imprimante non declaree ; aucune si aucune declaree n'est
 * installee.
 */
public class ChoixImprimanteCoherenceTest {

    private static final List<String> NOMS = Arrays.asList("TM-T20II", "Star TSP100", "EPSON TM-T88V", "POS-58",
            "Microsoft Print to PDF", "XPS", "Caisse 2", "HP LaserJet");

    public static PrintService service(String nom) {
        return (PrintService) Proxy.newProxyInstance(PrintService.class.getClassLoader(),
                new Class<?>[] { PrintService.class }, (p, m, a) -> {
                    switch (m.getName()) {
                    case "getName":
                        return nom;
                    case "toString":
                        return "imprimante " + nom;
                    case "hashCode":
                        return System.identityHashCode(p);
                    case "equals":
                        return p == a[0];
                    default:
                        return null;
                    }
                });
    }

    private static String variante(String nom, Random r) {
        switch (r.nextInt(4)) {
        case 0:
            return nom.toUpperCase();
        case 1:
            return " " + nom + " ";
        case 2:
            return nom.toLowerCase();
        default:
            return nom;
        }
    }

    @Test
    void reglesSurDesMilliersDePostes() {
        Random r = new Random(20261119L);
        int secours = 0, aucune = 0, parDefautVus = 0;
        for (int cas = 0; cas < 20000; cas++) {
            List<String> pool = new ArrayList<>(NOMS);
            Collections.shuffle(pool, r);
            int nInstallees = r.nextInt(5);
            PrintService[] installees = new PrintService[nInstallees];
            for (int i = 0; i < nInstallees; i++) {
                installees[i] = service(pool.get(i));
            }
            List<String> declarees = new ArrayList<>();
            int nDeclarees = r.nextInt(4);
            for (int i = 0; i < nDeclarees; i++) {
                declarees.add(r.nextInt(6) == 0 ? (r.nextBoolean() ? "" : null)
                        : variante(pool.get(r.nextInt(pool.size())), r));
            }
            PrintService parDefaut = r.nextInt(3) == 0 && nInstallees > 0 ? installees[r.nextInt(nInstallees)] : null;

            PrintService choisie = ChoixImprimante.choisir(parDefaut, installees, declarees);

            if (parDefaut != null) {
                parDefautVus++;
                assertSame(parDefaut, choisie, "l'imprimante par défaut gagne toujours (cas " + cas + ")");
                continue;
            }
            /*
             * attendu, recalcule independamment : premiere declaree (ordre de la liste) presente parmi les installees
             */
            PrintService attendue = null;
            for (String d : declarees) {
                if (d == null || d.trim().isEmpty()) {
                    continue;
                }
                for (PrintService s : installees) {
                    if (s.getName().equalsIgnoreCase(d.trim())) {
                        attendue = s;
                        break;
                    }
                }
                if (attendue != null) {
                    break;
                }
            }
            assertSame(attendue, choisie,
                    "cas " + cas + " : installées " + Arrays.toString(installees) + ", déclarées " + declarees);
            if (choisie != null) {
                secours++;
                String nom = choisie.getName();
                assertTrue(declarees.stream().anyMatch(d -> d != null && d.trim().equalsIgnoreCase(nom)),
                        "jamais une imprimante non déclarée");
                assertTrue(Arrays.asList(installees).contains(choisie), "toujours une imprimante installée");
            } else {
                aucune++;
            }
        }
        /* le tirage couvre bien les trois issues */
        assertTrue(parDefautVus > 1000 && secours > 1000 && aucune > 1000,
                parDefautVus + " / " + secours + " / " + aucune);
    }

    @Test
    void casFixes() {
        PrintService tm = service("TM-T20II"), pdf = service("Microsoft Print to PDF");
        PrintService[] poste = { pdf, tm };
        assertSame(pdf, ChoixImprimante.choisir(pdf, poste, Arrays.asList("TM-T20II")), "par défaut, comme avant");
        assertSame(tm, ChoixImprimante.choisir(null, poste, Arrays.asList("tm-t20ii ")), "service Windows : déclarée");
        assertNull(ChoixImprimante.choisir(null, poste, Arrays.asList("Star TSP100")), "déclarée absente du poste");
        assertNull(ChoixImprimante.choisir(null, poste, Collections.emptyList()), "rien de déclaré");
        assertNull(ChoixImprimante.choisir(null, null, Arrays.asList("TM-T20II")), "aucune imprimante installée");
        assertNull(ChoixImprimante.choisir(null, new PrintService[0], null));
        assertEquals("TM-T20II", ChoixImprimante.choisir(null, poste, Arrays.asList(null, "", "TM-T20II")).getName());
    }
}
