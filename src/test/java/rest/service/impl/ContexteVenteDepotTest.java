package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import dal.TEmplacement;
import dal.TPreenregistrement;
import dal.TUser;
import org.junit.jupiter.api.Test;

/**
 * Evolution 5, point 1 : une vente peut se jouer dans un depot d'extension. L'emplacement de la vente devient un champ
 * propre, et tous les sites d'ecriture (destockage, references, controles de stock, UG, annulation) passent par ce
 * point de decision unique.
 *
 * <p>
 * Ce qui est verifie ici, et qui est la garantie de non-regression : sans depot pose, la regle est mot pour mot
 * l'ancienne - l'emplacement de l'utilisateur de la vente.
 */
public class ContexteVenteDepotTest {

    private static TEmplacement emplacement(String id) {
        TEmplacement e = new TEmplacement();
        e.setLgEMPLACEMENTID(id);
        return e;
    }

    private static TUser utilisateur(TEmplacement emplacement) {
        TUser u = new TUser();
        u.setLgUSERID("U1");
        u.setLgEMPLACEMENTID(emplacement);
        return u;
    }

    @Test
    public void sansDepotLaVenteResteSurLEmplacementDeSonUtilisateur() {
        TEmplacement officine = emplacement("1");
        TPreenregistrement vente = new TPreenregistrement();
        vente.setLgUSERID(utilisateur(officine));

        assertSame(officine, ContexteVenteDepot.emplacementDeVente(vente));
        assertFalse(ContexteVenteDepot.estEnContexteDepot(vente));
    }

    @Test
    public void leDepotPoseSurLaVentePrime() {
        TEmplacement officine = emplacement("1");
        TEmplacement depot = emplacement("DEPOT");
        TPreenregistrement vente = new TPreenregistrement();
        vente.setLgUSERID(utilisateur(officine));
        vente.setEmplacementVente(depot);

        assertSame(depot, ContexteVenteDepot.emplacementDeVente(vente));
        assertTrue(ContexteVenteDepot.estEnContexteDepot(vente));
    }

    @Test
    public void leDepotPrimeAussiSurLOperateurFourni() {
        TEmplacement officine = emplacement("1");
        TEmplacement depot = emplacement("DEPOT");
        TPreenregistrement vente = new TPreenregistrement();
        vente.setLgUSERID(utilisateur(officine));
        vente.setEmplacementVente(depot);

        assertSame(depot, ContexteVenteDepot.emplacementDeVente(vente, utilisateur(officine)));
    }

    @Test
    public void sansDepotLOperateurFourniFaitFoi() {
        // Cloture et annulation n'ont pas toujours l'utilisateur de la vente sous la main : elles passaient
        // l'operateur. Sans depot, c'est bien lui qui doit continuer a decider.
        TEmplacement officine = emplacement("1");
        TEmplacement autre = emplacement("2");
        TPreenregistrement vente = new TPreenregistrement();
        vente.setLgUSERID(utilisateur(autre));

        assertSame(officine, ContexteVenteDepot.emplacementDeVente(vente, utilisateur(officine)));
    }

    @Test
    public void uneVenteSansUtilisateurNeFaitPasTomberLAppel() {
        TPreenregistrement vente = new TPreenregistrement();

        assertNull(ContexteVenteDepot.emplacementDeVente(vente));
        assertNull(ContexteVenteDepot.emplacementDeVente(vente, null));
        assertFalse(ContexteVenteDepot.estEnContexteDepot(vente));
    }

    @Test
    public void venteNulleToleree() {
        assertNull(ContexteVenteDepot.emplacementDeVente(null));
        assertFalse(ContexteVenteDepot.estEnContexteDepot(null));
    }

    @Test
    public void venteNulleAvecOperateurRendLEmplacementDeLOperateur() {
        TEmplacement officine = emplacement("1");

        assertSame(officine, ContexteVenteDepot.emplacementDeVente(null, utilisateur(officine)));
    }
}
