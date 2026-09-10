package rest.report.pdf;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import rest.service.dto.StatCaisseRecetteDTO;

/** Retours des tests 4 : les entrees et sorties de caisse entrent dans le solde et s'editent au pied de la journee. */
public class SoldeCaisseRecetteTest {

    private static StatCaisseRecetteDTO journee(long especes, long mobile, long tp, long differe, long entrees,
            long sorties) {
        StatCaisseRecetteDTO j = new StatCaisseRecetteDTO();
        j.setMontantEspece(especes);
        j.setMontantMobile(mobile);
        j.setMontantReglementFacture(tp);
        j.setMontantReglementDiff(differe);
        j.setMontantEntre(entrees);
        j.setMontantSortie(sorties);
        j.calculerSolde();
        return j;
    }

    @Test
    public void leSoldeAjouteLesEntreesEtRetireLesSorties() {
        assertEquals(15000L, journee(10000, 5000, 0, 0, 0, 0).getMontantSolde());
        assertEquals(17500L, journee(10000, 5000, 0, 0, 3000, 500).getMontantSolde());
        assertEquals(29000L, journee(10000, 5000, 12000, 2000, 500, 500).getMontantSolde());
        // une sortie seule fait baisser le solde
        assertEquals(9000L, journee(10000, 0, 0, 0, 0, 1000).getMontantSolde());
    }

    @Test
    public void laJourneeSaitSiElleADesMouvements() {
        assertFalse(journee(10000, 0, 0, 0, 0, 0).aDesMouvementsDeCaisse());
        assertTrue(journee(10000, 0, 0, 0, 3000, 0).aDesMouvementsDeCaisse());
        assertTrue(journee(10000, 0, 0, 0, 0, 500).aDesMouvementsDeCaisse());
    }

    /** Le separateur de milliers depend de la locale de la machine (espace, insecable ou fine) : on l'efface. */
    private static String sansSeparateur(String texte) {
        return texte.replaceAll("(?<=\\d)[\\s\\u00a0\\u202f,.](?=\\d{3})", "");
    }

    @Test
    public void laRubriqueNeSEditeQueSIlYADesMouvements() {
        assertEquals("", RecapCaisseRecettePdf.detailMouvements(0, 0));
        String texte = sansSeparateur(RecapCaisseRecettePdf.detailMouvements(3000, 500));
        assertTrue(texte.startsWith("Mouvements de caisse : entrées 3000"), texte);
        assertTrue(texte.endsWith("sorties 500"), texte);
        assertEquals("Mouvements de caisse : entrées 0   -   sorties 1500",
                sansSeparateur(RecapCaisseRecettePdf.detailMouvements(0, 1500)));
    }
}
