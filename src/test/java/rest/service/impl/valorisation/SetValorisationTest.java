package rest.service.impl.valorisation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import etiquetagepro.Tableau;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import rest.service.impl.valorisation.SetValorisation.Base;
import rest.service.impl.valorisation.SetValorisation.Ligne;
import rest.service.impl.valorisation.SetValorisation.Resultat;

class SetValorisationTest {

    private static List<Ligne> stock() {
        return Arrays.asList(new Ligne("1", "A", 10, 1000, 1500), new Ligne("2", "B", 3, 2500, 3200),
                new Ligne("3", "C", 0, 800, 1000), new Ligne("4", "D", 7, 333, 450));
    }

    @Test
    void ajustementProportionnelSansDepasserLaCible() {
        List<Ligne> depart = stock();
        Resultat r = SetValorisation.ajuster(depart, 30_000, Base.PA);
        assertEquals(10 * 1000 + 3 * 2500 + 7 * 333, r.valeurDepart);
        assertTrue(r.valeurObtenue <= 30_000, "jamais au-dessus de la cible");
        assertTrue(r.ecart() < 2500, "écart inférieur au plus grand prix unitaire : " + r.ecart());
        assertEquals(0, r.lignes.get(2).qteAjustee, "une ligne sans stock reste sans stock");
        long somme = 0;
        for (Ligne l : r.lignes) {
            somme += l.qteAjustee * l.pa;
        }
        assertEquals(r.valeurObtenue, somme);
        /* les lignes de depart ne sont pas modifiees */
        assertEquals(0, depart.get(0).qteAjustee);
        assertEquals(10, depart.get(0).qte);
    }

    @Test
    void cibleEgaleAuDepartRendLeMemeStock() {
        Resultat r = SetValorisation.ajuster(stock(), 10 * 1500 + 3 * 3200 + 7 * 450, Base.PV);
        assertEquals(r.cible, r.valeurObtenue);
        for (Ligne l : r.lignes) {
            assertEquals(l.qte, l.qteAjustee);
        }
        assertEquals(1.0, r.coefficient, 1e-9);
    }

    @Test
    void reductionEtPlusFortReste() {
        /* cible = moitie : 5, 1.5, 3.5 -> 5, 1, 3 puis les restes */
        Resultat r = SetValorisation.ajuster(Arrays.asList(new Ligne("1", "A", 10, 100, 0),
                new Ligne("2", "B", 3, 100, 0), new Ligne("3", "C", 7, 100, 0)), 1000, Base.PA);
        assertEquals(1000, r.valeurObtenue);
        assertEquals(10, r.qteAjustee);
    }

    @Test
    void stockSansValeurNeSeValorisePas() {
        Resultat r = SetValorisation.ajuster(Arrays.asList(new Ligne("1", "A", 0, 100, 0)), 5000, Base.PA);
        assertEquals(0, r.valeurDepart);
        assertEquals(0, r.valeurObtenue);
    }

    @Test
    void negatifsComptentPourZero() {
        Resultat r = SetValorisation
                .ajuster(Arrays.asList(new Ligne("1", "A", -4, 100, 0), new Ligne("2", "B", 2, 100, 0)), 400, Base.PA);
        assertEquals(0, r.lignes.get(0).qteAjustee);
        assertEquals(4, r.lignes.get(1).qteAjustee);
    }

    @Test
    void controle() {
        assertNull(SetValorisation.controler(stock(), 1000));
        assertNotNull(SetValorisation.controler(stock(), 0));
        assertNotNull(SetValorisation.controler(stock(), -5));
        assertNotNull(SetValorisation.controler(Arrays.asList(), 1000));
    }

    @Test
    void lectureDuFichierImporte() {
        Tableau t = new Tableau(Arrays.asList("Code CIP", "Libellé", "Qté", "PA", "Prix de vente"),
                Arrays.asList(Arrays.asList("123", "DOLIPRANE", "12", "1 250", "1.850,00"),
                        Arrays.asList("", "", "", "", ""), Arrays.asList("456", "SANS QTE", "abc", "100", "200"),
                        Arrays.asList("789", "EFFERALGAN", "4", "", "1500")));
        SetValorisation.Import im = SetValorisation.lire(t);
        assertNull(im.message);
        assertEquals(2, im.lignes.size());
        assertEquals(1, im.ignorees);
        assertEquals(1250, im.lignes.get(0).pa);
        assertEquals(1850, im.lignes.get(0).pv);
        assertEquals(12, im.lignes.get(0).qte);
        assertEquals(0, im.lignes.get(1).pa);
    }

    @Test
    void fichierSansColonnesReconnues() {
        Tableau t = new Tableau(Arrays.asList("x", "y"), Arrays.asList(Arrays.asList("1", "2")));
        assertNotNull(SetValorisation.lire(t).message);
    }

    @Test
    void nombres() {
        assertEquals(1250L, SetValorisation.nombre("1 250"));
        assertEquals(1251L, SetValorisation.nombre("1.250,50"));
        assertEquals(1L, SetValorisation.nombre("1,250"), "virgule décimale (usage français)");
        assertNull(SetValorisation.nombre("abc"));
    }
}
