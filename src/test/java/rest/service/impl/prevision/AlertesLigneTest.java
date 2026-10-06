package rest.service.impl.prevision;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.util.List;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

/** Plan d'octobre, section 5.3 : alertes par ligne de suggestion / commande. */
public class AlertesLigneTest {

    private static List<String> codes(AlertesLigne.Ligne l) {
        return AlertesLigne.alertes(l, new AlertesLigne.Seuils()).stream().map(a -> a.code)
                .collect(Collectors.toList());
    }

    private static AlertesLigne.Ligne normale() {
        AlertesLigne.Ligne l = new AlertesLigne.Ligne();
        l.quantite = 10;
        l.recommande = 10;
        l.prevuMois = 20;
        l.stock = 5;
        l.joursSansVente = 3;
        return l;
    }

    @Test
    public void ligneNormaleSansAlerte() {
        assertTrue(codes(normale()).isEmpty());
    }

    @Test
    public void quantiteAberranteOuInsuffisante() {
        AlertesLigne.Ligne l = normale();
        l.quantite = 100;
        assertEquals(List.of(AlertesLigne.ABERRANTE), codes(l));
        l.quantite = 4;
        assertEquals(List.of(AlertesLigne.INSUFFISANTE), codes(l));
    }

    @Test
    public void surstock() {
        AlertesLigne.Ligne l = normale();
        l.stock = 50;
        l.enCours = 30;
        assertEquals(List.of(AlertesLigne.SURSTOCK), codes(l), "80 / (20/30) = 120 jours > 90");
        l.prevuMois = 0;
        l.recommande = 0;
        l.quantite = 2;
        assertTrue(codes(l).contains(AlertesLigne.SURSTOCK), "en stock, rien ne se vend");
    }

    @Test
    public void equivalentIndisponiblePrixLente() {
        AlertesLigne.Ligne l = normale();
        l.equivalents = 6;
        l.indisponible = true;
        l.prixLigne = 1300;
        l.prixDernierAchat = 1000;
        l.joursSansVente = 400;
        assertEquals(List.of(AlertesLigne.EQUIVALENT, AlertesLigne.INDISPONIBLE, AlertesLigne.PRIX, AlertesLigne.LENTE),
                codes(l));
        l.prixLigne = 1100;
        assertTrue(!codes(l).contains(AlertesLigne.PRIX), "10 % : dans la tolerance");
    }

    @Test
    public void nouveauProduitNonJugeSurSaRotation() {
        AlertesLigne.Ligne l = new AlertesLigne.Ligne();
        l.quantite = 3;
        l.nouveau = true;
        assertTrue(codes(l).isEmpty());
        l.nouveau = false;
        assertEquals(List.of(AlertesLigne.LENTE), codes(l));
    }
}
