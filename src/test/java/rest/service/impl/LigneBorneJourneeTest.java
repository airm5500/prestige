package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;

import dal.HMvtProduit;
import dal.Typemvtproduit;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;
import util.DateConverter;

/**
 * Non-regression de la fiche des mouvements de l'article : la colonne Stock recopie la qteFinale du dernier mouvement
 * du jour, mais createdAt est stocke a la seconde pres et le deconditionnement automatique partage l'horodatage de la
 * vente qui le declenche. L'ordre entre les deux etait indetermine : le rapport pouvait afficher le stock de la ligne
 * deconditionnement (204 sur le cas reel du 20/08/2026) au lieu de celui de la vente (99). A egalite d'horodatage, la
 * ligne non-deconditionnement doit primer.
 */
public class LigneBorneJourneeTest {

    private static final LocalDateTime T1 = LocalDateTime.of(2026, 8, 20, 18, 42, 7);
    private static final LocalDateTime T0 = LocalDateTime.of(2026, 8, 20, 9, 15, 0);

    private static HMvtProduit ligne(String typeMvt, LocalDateTime createdAt, int qteDebut, int qteFinale) {
        HMvtProduit h = new HMvtProduit();
        h.setTypemvtproduit(new Typemvtproduit(typeMvt));
        h.setCreatedAt(createdAt);
        h.setQteDebut(qteDebut);
        h.setQteFinale(qteFinale);
        return h;
    }

    @Test
    public void casReelDuVingtAout_laVentePrimeSurLeDecon() {
        // dernier mouvement du jour : vente de 5 a stock 4, decon automatique d'une boite de 100, meme seconde.
        // Ligne decon (historique errone : qteFinale 204) renvoyee avant la ligne vente (qteFinale 99).
        HMvtProduit decon = ligne(DateConverter.DECONDTIONNEMENT_POSITIF, T1, 104, 204);
        HMvtProduit vente = ligne(DateConverter.VENTE, T1, 4, 99);
        HMvtProduit retenue = ProduitServiceImpl.ligneBorneJournee(Arrays.asList(decon, vente));
        assertSame(vente, retenue);
        assertEquals(Integer.valueOf(99), retenue.getQteFinale());
    }

    @Test
    public void ordreInverseMemeResultat() {
        HMvtProduit decon = ligne(DateConverter.DECONDTIONNEMENT_POSITIF, T1, 104, 204);
        HMvtProduit vente = ligne(DateConverter.VENTE, T1, 4, 99);
        assertSame(vente, ProduitServiceImpl.ligneBorneJournee(Arrays.asList(vente, decon)));
    }

    @Test
    public void horodatageDifferentPasDeSubstitution() {
        // le decon est bien le dernier mouvement du jour (decon manuel en fin de journee) : il reste retenu
        HMvtProduit decon = ligne(DateConverter.DECONDTIONNEMENT_POSITIF, T1, 79, 179);
        HMvtProduit vente = ligne(DateConverter.VENTE, T0, 96, 79);
        assertSame(decon, ProduitServiceImpl.ligneBorneJournee(Arrays.asList(decon, vente)));
    }

    @Test
    public void queDesDeconsDansLaSecondePremiereConservee() {
        HMvtProduit decon1 = ligne(DateConverter.DECONDTIONNEMENT_POSITIF, T1, 4, 104);
        HMvtProduit decon2 = ligne(DateConverter.DECONDTIONNEMENT_POSITIF, T1, 104, 204);
        assertSame(decon1, ProduitServiceImpl.ligneBorneJournee(Arrays.asList(decon1, decon2)));
    }

    @Test
    public void ouvertureDeJournee_laVentePrimeAussi() {
        // premiere seconde du jour : la vente porte le vrai stock d'ouverture (qteDebut 4),
        // la ligne decon historique portant un qteDebut gonfle (104)
        HMvtProduit decon = ligne(DateConverter.DECONDTIONNEMENT_POSITIF, T0, 104, 204);
        HMvtProduit vente = ligne(DateConverter.VENTE, T0, 4, 99);
        HMvtProduit retenue = ProduitServiceImpl.ligneBorneJournee(Arrays.asList(decon, vente));
        assertSame(vente, retenue);
        assertEquals(Integer.valueOf(4), retenue.getQteDebut());
    }

    @Test
    public void listeVideOuNulle() {
        assertNull(ProduitServiceImpl.ligneBorneJournee(Collections.<HMvtProduit> emptyList()));
        assertNull(ProduitServiceImpl.ligneBorneJournee((List<HMvtProduit>) null));
    }

    @Test
    public void mouvementUnique() {
        HMvtProduit vente = ligne(DateConverter.VENTE, T0, 11, 4);
        assertSame(vente, ProduitServiceImpl.ligneBorneJournee(Collections.singletonList(vente)));
    }

    /* Stock d'ouverture de la journee (13/10) : la ligne VENTE suit desormais la ligne de deconditionnement. */

    @Test
    public void ouvertureDeJournee_historiqueCorrige_stockAvantLeDecon() {
        // 2 en rayon, boite de 20 ouverte, vente de 3, meme seconde : decon 2 -> 22, vente 22 -> 19
        HMvtProduit decon = ligne(DateConverter.DECONDTIONNEMENT_POSITIF, T0, 2, 22);
        HMvtProduit vente = ligne(DateConverter.VENTE, T0, 22, 19);
        assertEquals(Integer.valueOf(2), ProduitServiceImpl.stockOuvertureJournee(Arrays.asList(decon, vente)));
        assertEquals(Integer.valueOf(2), ProduitServiceImpl.stockOuvertureJournee(Arrays.asList(vente, decon)));
    }

    @Test
    public void ouvertureDeJournee_ancienHistorique_inchange() {
        // avant le 05/09 : decon gonfle (104 -> 204), vente partant du stock d'avant ouverture (4)
        assertEquals(Integer.valueOf(4), ProduitServiceImpl.stockOuvertureJournee(Arrays.asList(
                ligne(DateConverter.DECONDTIONNEMENT_POSITIF, T0, 104, 204), ligne(DateConverter.VENTE, T0, 4, 99))));
        // du 05/09 au 13/10 : decon sain (2 -> 22), vente partant encore de 2
        assertEquals(Integer.valueOf(2), ProduitServiceImpl.stockOuvertureJournee(Arrays.asList(
                ligne(DateConverter.DECONDTIONNEMENT_POSITIF, T0, 2, 22), ligne(DateConverter.VENTE, T0, 2, 19))));
    }

    @Test
    public void ouvertureDeJournee_venteAuDepot_et_casSimples() {
        HMvtProduit decon = ligne(DateConverter.DECONDTIONNEMENT_POSITIF, T0, 2, 22);
        HMvtProduit venteDepot = ligne(DateConverter.TMVTP_VENTE_DEPOT_EXTENSION, T0, 22, 19);
        assertEquals(Integer.valueOf(2), ProduitServiceImpl.stockOuvertureJournee(Arrays.asList(venteDepot, decon)));
        assertEquals(Integer.valueOf(11), ProduitServiceImpl
                .stockOuvertureJournee(Collections.singletonList(ligne(DateConverter.VENTE, T0, 11, 4))));
        assertNull(ProduitServiceImpl.stockOuvertureJournee(Collections.<HMvtProduit> emptyList()));
        // decon manuel en debut de journee, vente plus tard : le decon ouvre la journee
        assertEquals(Integer.valueOf(5), ProduitServiceImpl.stockOuvertureJournee(Arrays.asList(
                ligne(DateConverter.DECONDTIONNEMENT_POSITIF, T0, 5, 25), ligne(DateConverter.VENTE, T1, 25, 20))));
    }
}
