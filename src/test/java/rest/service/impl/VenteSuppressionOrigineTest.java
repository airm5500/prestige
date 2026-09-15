package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import dal.TPreenregistrement;
import dal.TUser;
import org.junit.jupiter.api.Test;

/**
 * Evolution 5, point 6 : la trace des ventes supprimees garde l'utilisateur d'origine de la vente, a cote de l'auteur
 * de la suppression. Pour les ventes abandonnees supprimees automatiquement a minuit l'auteur vaut « Systeme » : sans
 * cette resolution, la trace ne dirait plus qui avait ouvert la vente.
 */
public class VenteSuppressionOrigineTest {

    private static TUser utilisateur(String id) {
        TUser u = new TUser();
        u.setLgUSERID(id);
        return u;
    }

    @Test
    public void lOperateurQuiAOuvertLaVentePasse() {
        TPreenregistrement vente = new TPreenregistrement();
        TUser ouvreur = utilisateur("OUVREUR");
        vente.setLgUSERID(ouvreur);
        vente.setLgUSERVENDEURID(utilisateur("VENDEUR"));
        vente.setLgUSERCAISSIERID(utilisateur("CAISSIER"));
        assertSame(ouvreur, VenteSuppressionServiceImpl.utilisateurOrigine(vente));
    }

    @Test
    public void aDefautOnRetombeSurLeVendeur() {
        TPreenregistrement vente = new TPreenregistrement();
        TUser vendeur = utilisateur("VENDEUR");
        vente.setLgUSERVENDEURID(vendeur);
        vente.setLgUSERCAISSIERID(utilisateur("CAISSIER"));
        assertSame(vendeur, VenteSuppressionServiceImpl.utilisateurOrigine(vente));
    }

    @Test
    public void puisSurLeCaissier() {
        TPreenregistrement vente = new TPreenregistrement();
        TUser caissier = utilisateur("CAISSIER");
        vente.setLgUSERCAISSIERID(caissier);
        assertSame(caissier, VenteSuppressionServiceImpl.utilisateurOrigine(vente));
    }

    @Test
    public void uneVenteSansAucunUtilisateurNInventeRien() {
        // La colonne reste vide plutot que de porter une valeur fabriquee : l'ecran affiche alors un tiret.
        assertNull(VenteSuppressionServiceImpl.utilisateurOrigine(new TPreenregistrement()));
    }

    @Test
    public void lAuteurSystemeResteLeLibelleDesSuppressionsAutomatiques() {
        // L'auteur de la suppression est conserve tel quel : c'est l'utilisateur d'origine qui s'ajoute a cote.
        assertSame("Système", VenteSuppressionServiceImpl.AUTEUR_SYSTEME);
    }
}
