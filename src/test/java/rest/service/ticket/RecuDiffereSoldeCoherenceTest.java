package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Random;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

/**
 * Plan du 10/11, point 1 (accord du 11/11) : recu de reglement d'un differe. « Montant dû (n ventes) » = du des seules
 * ventes reglees, « RÉGLÉ » = verse, « Reste sur ces ventes » = du − verse, « Solde restant du client » = toutes ses
 * dettes apres le versement (≥ reste sur ces ventes). Verifie sur 5 000 recus tires au hasard (graine fixe).
 */
class RecuDiffereSoldeCoherenceTest {

    private static long valeur(String texte, String libelle) {
        for (String l : texte.split("\n")) {
            if (l.contains("[" + libelle + " | ")) {
                String v = l.substring(l.indexOf(" | ") + 3);
                return Long.parseLong(v.replaceAll("[^0-9]", ""));
            }
        }
        return -1;
    }

    @Test
    void cinqMilleRecus() {
        Random r = new Random(20261111L);
        for (int k = 0; k < 5000; k++) {
            int n = 1 + r.nextInt(6);
            long[] du = new long[n];
            long[] reste = new long[n];
            long verse = 0;
            long sommeDu = 0;
            for (int i = 0; i < n; i++) {
                du[i] = 5 * (1 + r.nextInt(20000));
                long part = r.nextInt(4) == 0 ? du[i] : 5L * r.nextInt((int) (du[i] / 5) + 1);
                reste[i] = du[i] - part;
                verse += part;
                sommeDu += du[i];
            }
            long autres = r.nextInt(3) == 0 ? 0 : 5L * r.nextInt(40000);
            long solde = sommeDu - verse + autres;

            ConversionTicket.Source s = ExemplesTicket.exemple(ModeleTicket.REGLEMENT_DIFFERE,
                    r.nextBoolean() ? 80 : 58);
            s.datas = new ArrayList<>(Arrays.asList("NBRE DOSSIER(S);VERSE;RESTANT",
                    n + ";" + verse + "F CFA;" + solde + "F CFA", " ; ; ", ConversionTicket.ligneVentes(du, reste)));
            s.subtotal = Arrays.asList("Net à payer: ;     " + (sommeDu + autres) + "; F CFA;1",
                    "Règlement: ;     Espèces; ;0", "Montant Versé: ;     " + verse + "; F CFA;0",
                    "Monnaie: ;     0; F CFA;0");
            String t = ConversionTicket.convertir(s, new ReglagesTicket(ModeleTicket.REGLEMENT_DIFFERE)).blocsNonVides()
                    .stream().flatMap(b -> b.elements.stream()).map(Object::toString).collect(Collectors.joining("\n"));
            String cas = "cas " + k + " : " + t;

            String libDu = "Montant dû (" + n + " vente" + (n > 1 ? "s" : "") + ")";
            String libReste = n > 1 ? "Reste sur ces ventes" : "Reste sur cette vente";
            long duImprime = valeur(t, libDu);
            long regle = valeur(t, "RÉGLÉ");
            long resteImprime = valeur(t, libReste);
            long soldeImprime = valeur(t, "Solde restant du client");
            assertEquals(sommeDu, duImprime, cas);
            assertEquals(verse, regle, cas);
            assertEquals(Arrays.stream(reste).sum(), resteImprime, cas);
            assertEquals(duImprime - regle, resteImprime, cas);
            assertEquals(solde, soldeImprime, cas);
            assertTrue(resteImprime >= 0 && soldeImprime >= resteImprime, cas);
            assertFalse(t.contains("Reste dû") || t.contains("dossiers)"), cas);
        }
    }

    @Test
    void sansLigneDesVentesLeRecuGardeLAnciennePresentation() {
        ConversionTicket.Source s = ExemplesTicket.exemple(ModeleTicket.REGLEMENT_DIFFERE, 80);
        s.datas = Arrays.asList("NBRE DOSSIER(S);VERSE;RESTANT", "3;20 000F CFA;7 450F CFA", " ; ; ");
        String t = ConversionTicket.convertir(s, new ReglagesTicket(ModeleTicket.REGLEMENT_DIFFERE)).blocsNonVides()
                .stream().flatMap(b -> b.elements.stream()).map(Object::toString).collect(Collectors.joining("\n"));
        assertTrue(t.contains("PAIRE[Montant dû (3 dossiers) | 27 450 F CFA]"), t);
        assertTrue(t.contains("PAIRE[Reste dû | 7 450 F CFA]"), t);
        assertFalse(t.contains("Solde restant du client"), t);
    }

    @Test
    void ligneDesVentesAdditionneDuEtReste() {
        assertEquals("VENTES;15000;4000",
                ConversionTicket.ligneVentes(new long[] { 10000, 5000 }, new long[] { 0, 4000 }));
        assertEquals("VENTES;0;0", ConversionTicket.ligneVentes(new long[0], new long[0]));
    }
}
