package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

/** Choix de l'imprimante des tickets quand le compte de Payara n'a pas d'imprimante par défaut (retour du 18/11). */
class ChoixImprimanteCoherenceTest {

    @Test
    void choixDansLesCasConnus() {
        assertEquals("EPSON TM-T20", ChoixImprimante.choisir("EPSON TM-T20", Arrays.asList("HP A4", "EPSON TM-T20")));
        assertEquals("EPSON TM-T20",
                ChoixImprimante
                        .choisir(null,
                                Arrays.asList("Microsoft Print to PDF", "Microsoft XPS Document Writer",
                                        "OneNote (Desktop)", "Fax", "EPSON TM-T20")),
                "une seule imprimante réelle : elle est prise");
        assertNull(ChoixImprimante.choisir(null, Arrays.asList("HP A4", "EPSON TM-T20")),
                "deux imprimantes réelles : on ne devine pas");
        assertNull(ChoixImprimante.choisir(null, Arrays.asList("Microsoft Print to PDF")));
        assertNull(ChoixImprimante.choisir(null, Collections.emptyList()));
        assertNull(ChoixImprimante.choisir("  ", null));
    }

    /**
     * Cohérence : 5 000 listes d'imprimantes tirées au hasard (graine fixe). Règles : l'imprimante par défaut prime ;
     * sans elle, l'imprimante choisie existe dans la liste, n'est jamais une imprimante logicielle, et n'est choisie
     * que si elle est la seule réelle ; sinon aucune, et le message nomme le poste et rassure sur la vente.
     */
    @Test
    void reglesSurDesMilliersDeListes() {
        Random r = new Random(20261118L);
        String[] reelles = { "EPSON TM-T20", "EPSON TM-T88V", "HP LaserJet A4", "Xprinter XP-80", "POS-80" };
        String[] virtuelles = { "Microsoft Print to PDF", "Microsoft XPS Document Writer", "OneNote for Windows 10",
                "Fax", "Envoyer vers OneNote 2016" };
        int choisies = 0, aucune = 0, parDefaut = 0;
        for (int i = 0; i < 5000; i++) {
            List<String> l = new ArrayList<>();
            int nr = r.nextInt(3), nv = r.nextInt(4);
            for (int j = 0; j < nr; j++) {
                l.add(reelles[r.nextInt(reelles.length)] + (j > 0 ? " (" + j + ")" : ""));
            }
            for (int j = 0; j < nv; j++) {
                l.add(virtuelles[r.nextInt(virtuelles.length)]);
            }
            Collections.shuffle(l, r);
            String defaut = r.nextInt(4) == 0 && !l.isEmpty() ? l.get(r.nextInt(l.size())) : null;
            String c = ChoixImprimante.choisir(defaut, l);
            // attendu calcule independamment de la fonction testee : les imprimantes reelles sont celles tirees ici
            long nbReelles = nr;
            List<String> virt = Arrays.asList(virtuelles);
            if (defaut != null) {
                assertEquals(defaut, c, "cas " + i);
                parDefaut++;
            } else if (nbReelles == 1) {
                assertTrue(l.contains(c) && !virt.contains(c), "cas " + i + " : " + l + " -> " + c);
                choisies++;
            } else {
                assertNull(c, "cas " + i + " : " + l);
                String msg = ChoixImprimante.message("CAISSE11", (int) nbReelles);
                assertTrue(msg.contains("CAISSE11") && msg.contains("La vente est bien enregistrée"), msg);
                aucune++;
            }
        }
        assertTrue(choisies > 500 && aucune > 500 && parDefaut > 500,
                "jeu varié : " + choisies + " / " + aucune + " / " + parDefaut);
    }
}
