package rest.service.dto.builder;

import static org.junit.jupiter.api.Assertions.assertEquals;

import commonTasks.dto.FamilleDTO;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import rest.service.dto.BonLivraisonDetail;

/**
 * Rapport du 26/10, § 21, L23 : le texte des lignes d'un bon etait construit par concatenation quadratique. Il est
 * desormais construit d'un trait : le texte affiche doit rester exactement le meme.
 */
class EtatControlBonBuilderItemsTest {

    private static BonLivraisonDetail ligne(String cip, String nom, int cmde, int recue, int ug, Integer retour) {
        FamilleDTO f = new FamilleDTO();
        f.setIntCIP(cip);
        f.setStrDESCRIPTION(nom);
        return BonLivraisonDetail.builder().produit(f).intQTECMDE(cmde).intQTERECUE(recue).intQTEUG(ug)
                .intQTERETURN(retour).build();
    }

    /** L'ancienne construction, recopiee telle quelle pour la comparaison. */
    private static String ancien(List<BonLivraisonDetail> details) {
        String items = " ";
        for (BonLivraisonDetail e : details) {
            items = "<b><span style='display:inline-block;width: 7%;'>" + e.getProduit().getIntCIP()
                    + "</span><span style='display:inline-block;width: 25%;'>" + e.getProduit().getStrDESCRIPTION()
                    + "</span><span style='display:inline-block;width: 15%;'>Qte Cmdée: (" + e.getIntQTECMDE()
                    + ")</span><span style='display:inline-block;width: 15%;'>Qte Livrée: ("
                    + (e.getIntQTERECUE() - e.getIntQTEUG())
                    + ")</span><span style='display:inline-block;width: 15%;'>Unité gratuite: (" + e.getIntQTEUG()
                    + ")</span><span style='display:inline-block;width: 15%;'>Avoir ("
                    + (e.getIntQTERETURN() != null ? e.getIntQTERETURN() : 0) + ")</span></b><br> " + items;
        }
        return items;
    }

    @Test
    void memeTexteQuAvant() {
        List<BonLivraisonDetail> details = new ArrayList<>();
        assertEquals(ancien(details), EtatControlBonBuilder.buildItems(details), "bon sans ligne");
        details.add(ligne("1234567", "DOLIPRANE 1000", 10, 12, 2, null));
        assertEquals(ancien(details), EtatControlBonBuilder.buildItems(details), "une ligne");
        details.add(ligne("7654321", "EFFERALGAN", 5, 5, 0, 1));
        details.add(ligne("1111111", "SPASFON", 3, 2, 0, 0));
        assertEquals(ancien(details), EtatControlBonBuilder.buildItems(details),
                "trois lignes, ordre inverse conserve");
    }
}
