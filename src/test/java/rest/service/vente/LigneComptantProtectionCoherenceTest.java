package rest.service.vente;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import dal.TTypeVente;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;
import util.Constant;

/**
 * Demande du 15/11 : la colonne « C » d'une vente assurance ne doit jamais faire passer toute la vente au comptant. Un
 * cochage est refuse si la vente n'a qu'une ligne, ou si toutes les autres lignes sont deja cochees ; decocher reste
 * toujours possible. Vente au comptant et carnet : la colonne n'existe pas (refus de type, comme avant).
 *
 * <p>
 * Regles verifiees sur 20 000 ventes tirees au hasard (graine fixe) : 1 a 8 lignes, lignes deja cochees au hasard,
 * ligne visee au hasard, cocher ou decocher. Invariant : apres un cochage accepte, il reste au moins une ligne a
 * l'assurance.
 */
public class LigneComptantProtectionCoherenceTest {

    private static TPreenregistrement vente(String type) {
        TPreenregistrement tp = new TPreenregistrement("V1");
        tp.setLgTYPEVENTEID(new TTypeVente(type));
        return tp;
    }

    private static TPreenregistrementDetail ligne(String id, boolean comptant) {
        TPreenregistrementDetail d = new TPreenregistrementDetail(id);
        d.setIntPRICE(1000);
        d.setIntPRICEREMISE(0);
        d.setComptant(comptant);
        return d;
    }

    @Test
    public void exemples() {
        TPreenregistrement vo = vente(Constant.VENTE_ASSURANCE_ID);
        TPreenregistrementDetail seule = ligne("a", false);
        List<TPreenregistrementDetail> une = new ArrayList<>();
        une.add(seule);
        assertEquals(LigneComptant.MSG_UNE_LIGNE, LigneComptant.refusCochage(true, vo, seule, true, null, une));

        TPreenregistrementDetail a = ligne("a", true), b = ligne("b", false);
        List<TPreenregistrementDetail> deux = new ArrayList<>();
        deux.add(a);
        deux.add(b);
        // a est deja cochee : cocher b mettrait toute la vente au comptant
        assertEquals(LigneComptant.MSG_TOUTES, LigneComptant.refusCochage(true, vo, b, true, null, deux));
        // decocher a reste possible
        assertNull(LigneComptant.refusCochage(true, vo, a, false, null, deux));
        a.setComptant(false);
        assertNull(LigneComptant.refusCochage(true, vo, b, true, null, deux));
        // carnet et comptant : refus de type, inchange
        assertEquals(LigneComptant.MSG_TYPE,
                LigneComptant.refusCochage(true, vente(Constant.VENTE_AVEC_CARNET), b, true, null, deux));
        assertEquals(LigneComptant.MSG_TYPE, LigneComptant.refusCochage(true, vente("1"), b, true, null, deux));
    }

    @Test
    public void regleSurDesVentesAuHasard() {
        Random r = new Random(15112026L);
        TPreenregistrement vo = vente(Constant.VENTE_ASSURANCE_ID);
        int refusUne = 0, refusToutes = 0, acceptes = 0, decoches = 0;
        for (int cas = 0; cas < 20000; cas++) {
            int n = 1 + r.nextInt(8);
            List<TPreenregistrementDetail> lignes = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                lignes.add(ligne("L" + i, r.nextInt(3) == 0));
            }
            // l'etat de depart respecte deja la regle (au moins une ligne a l'assurance), sauf vente d'une ligne
            if (n > 1 && lignes.stream().allMatch(TPreenregistrementDetail::isComptant)) {
                lignes.get(r.nextInt(n)).setComptant(false);
            }
            TPreenregistrementDetail visee = lignes.get(r.nextInt(n));
            boolean cocher = r.nextBoolean();
            String refus = LigneComptant.refusCochage(true, vo, visee, cocher, null, lignes);
            long autresCochees = lignes.stream().filter(d -> d != visee && d.isComptant()).count();
            String decrire = "cas " + cas + " : " + n + " ligne(s), autres cochees " + autresCochees + ", cocher "
                    + cocher;
            if (!cocher) {
                assertNull(refus, decrire);
                decoches++;
            } else if (n == 1) {
                assertEquals(LigneComptant.MSG_UNE_LIGNE, refus, decrire);
                refusUne++;
            } else if (autresCochees == n - 1) {
                assertEquals(LigneComptant.MSG_TOUTES, refus, decrire);
                refusToutes++;
            } else {
                assertNull(refus, decrire);
                acceptes++;
                // invariant : apres le cochage, au moins une ligne reste a l'assurance
                visee.setComptant(true);
                assertEquals(true, lignes.stream().anyMatch(d -> !d.isComptant()), decrire);
            }
        }
        // jeux varies : chaque issue est rencontree souvent
        assertEquals(true, refusUne > 500 && refusToutes > 300 && acceptes > 3000 && decoches > 5000,
                refusUne + " / " + refusToutes + " / " + acceptes + " / " + decoches);
    }
}
