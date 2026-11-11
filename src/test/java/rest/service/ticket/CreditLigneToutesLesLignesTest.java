package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Retour du 11/11 (ticket 2226656188) : des qu'une ligne du ticket assurance imprime son detail (prix de reference ou
 * taux propre), TOUTES les lignes prises en charge impriment le leur. Sinon le taux d'une ligne qui suit simplement
 * l'assurance n'apparait nulle part (le recapitulatif n'affiche plus le taux quand une ligne a un prix ou un taux
 * propre) et il faut le deduire a la main. Un ticket ou aucune ligne n'a rien de propre reste sans detail (plan du
 * 06/11, point 5.2), et une ligne au comptant n'en a jamais.
 */
class CreditLigneToutesLesLignesTest {

    @Test
    void ticket2226656188LaTroisiemeLigneAfficheAussiSonTaux() {
        // lignes : prix de reference a 80 %, taux saisi a 60 %, puis une ligne au taux de l'assurance
        assertEquals(Arrays.asList(true, true, true),
                CreditLigne.afficherLignes(Arrays.asList(true, true, false), Arrays.asList(false, false, false)));
    }

    @Test
    void aucuneLigneNARienDePropreLeTicketResteSansDetail() {
        assertEquals(Arrays.asList(false, false, false),
                CreditLigne.afficherLignes(Arrays.asList(false, false, false), Arrays.asList(false, false, false)));
        assertEquals(Arrays.asList(), CreditLigne.afficherLignes(new ArrayList<>(), new ArrayList<>()));
    }

    @Test
    void uneLigneAuComptantNAfficheJamaisDeDetail() {
        assertEquals(Arrays.asList(true, false, true),
                CreditLigne.afficherLignes(Arrays.asList(true, false, false), Arrays.asList(false, true, false)));
        // sans liste des lignes au comptant : aucune ne l'est
        assertEquals(Arrays.asList(true, true), CreditLigne.afficherLignes(Arrays.asList(false, true), null));
    }

    /** 5 000 tickets au hasard : tout ou rien pour les lignes prises en charge, jamais une ligne au comptant. */
    @Test
    void coherenceToutOuRien() {
        Random r = new Random(20261111L);
        for (int k = 0; k < 5000; k++) {
            int n = 1 + r.nextInt(8);
            List<Boolean> propres = new ArrayList<>(), comptant = new ArrayList<>();
            boolean unePropre = false;
            for (int i = 0; i < n; i++) {
                boolean c = r.nextInt(5) == 0;
                boolean p = !c && r.nextInt(3) == 0;
                propres.add(p);
                comptant.add(c);
                unePropre = unePropre || p;
            }
            List<Boolean> res = CreditLigne.afficherLignes(propres, comptant);
            assertEquals(n, res.size());
            for (int i = 0; i < n; i++) {
                assertEquals(unePropre && !comptant.get(i), res.get(i), "ticket " + k + " ligne " + i);
                assertTrue(!propres.get(i) || res.get(i), "une ligne qui a du propre reste affichee, ticket " + k);
            }
        }
    }
}
