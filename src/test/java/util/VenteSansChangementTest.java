package util;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Demande du 28/10 (point 7) : une vente modifiee sans aucun changement n'est pas validee. */
class VenteSansChangementTest {

    private static VenteSansChangement.Etat vente() {
        VenteSansChangement.Etat e = new VenteSansChangement.Etat();
        e.lignes.add(new ComparaisonLignesVente.Ligne("P1", "", "", 2, 1000, 2000));
        e.lignes.add(new ComparaisonLignesVente.Ligne("P2", "", "", 1, 500, 500));
        e.typeVente = "2";
        e.client = "C1";
        e.ayantDroit = "A1";
        e.medecin = null;
        e.remise = "|0";
        e.vendeur = "U1";
        e.reglement("1", 2500);
        e.tiersPayant("CTP1", 80, "BON-1");
        return e;
    }

    @Test
    @DisplayName("Rien de change : vente identique")
    void identique() {
        assertTrue(VenteSansChangement.identiques(vente(), vente()));
    }

    @Test
    @DisplayName("Un seul mode : le montant du reglement n'est pas compare (il suit les lignes)")
    void unSeulModeMontantIgnore() {
        VenteSansChangement.Etat b = vente();
        b.reglements.clear();
        b.reglement("1", null);
        assertTrue(VenteSansChangement.identiques(vente(), b));
    }

    @Test
    @DisplayName("Chaque changement est vu : lignes, client, type, remise, vendeur, ayant droit, medecin")
    void changementsEntete() {
        VenteSansChangement.Etat b = vente();
        b.lignes.set(0, new ComparaisonLignesVente.Ligne("P1", "", "", 3, 1000, 3000));
        assertFalse(VenteSansChangement.identiques(vente(), b), "quantite");
        b = vente();
        b.lignes.remove(1);
        assertFalse(VenteSansChangement.identiques(vente(), b), "produit retire");
        b = vente();
        b.lignes.set(1, new ComparaisonLignesVente.Ligne("P2", "", "", 1, 450, 450));
        assertFalse(VenteSansChangement.identiques(vente(), b), "prix");
        b = vente();
        b.client = "C2";
        assertFalse(VenteSansChangement.identiques(vente(), b), "client");
        b = vente();
        b.typeVente = "1";
        assertFalse(VenteSansChangement.identiques(vente(), b), "type");
        b = vente();
        b.remise = "R1|200";
        assertFalse(VenteSansChangement.identiques(vente(), b), "remise");
        b = vente();
        b.vendeur = "U2";
        assertFalse(VenteSansChangement.identiques(vente(), b), "vendeur");
        b = vente();
        b.ayantDroit = "A2";
        assertFalse(VenteSansChangement.identiques(vente(), b), "ayant droit");
        b = vente();
        b.medecin = "M1";
        assertFalse(VenteSansChangement.identiques(vente(), b), "medecin");
    }

    @Test
    @DisplayName("Reglement et tiers payants : mode, repartition, taux, numero de bon")
    void changementsReglementEtTiersPayants() {
        VenteSansChangement.Etat b = vente();
        b.reglements.clear();
        b.reglement("4", 2500);
        assertFalse(VenteSansChangement.identiques(vente(), b), "especes -> differe");

        VenteSansChangement.Etat a = vente();
        a.reglements.clear();
        a.reglement("1", 1500).reglement("2", 1000);
        b = vente();
        b.reglements.clear();
        b.reglement("1", 1000).reglement("2", 1500);
        assertFalse(VenteSansChangement.identiques(a, b), "repartition de deux modes");
        b.reglements.clear();
        b.reglement("1", 1500).reglement("2", 1000);
        assertTrue(VenteSansChangement.identiques(a, b), "meme repartition");

        b = vente();
        b.tiersPayants.clear();
        b.tiersPayant("CTP1", 70, "BON-1");
        assertFalse(VenteSansChangement.identiques(vente(), b), "taux");
        b = vente();
        b.tiersPayants.clear();
        b.tiersPayant("CTP1", 80, "BON-2");
        assertFalse(VenteSansChangement.identiques(vente(), b), "numero de bon");
        b = vente();
        b.tiersPayant("CTP2", 20, "BON-1");
        assertFalse(VenteSansChangement.identiques(vente(), b), "tiers payant ajoute");
    }

    @Test
    @DisplayName("Differe : il n'a que la part payee en especes ; differe -> comptant et part payee changee sont vus")
    void differe() {
        VenteSansChangement.Etat a = vente();
        a.reglements.clear();
        a.reglement("1", 0);
        a.differe = true;
        a.payeVente = 0;
        VenteSansChangement.Etat b = vente();
        b.reglements.clear();
        b.reglement("4", 2500);
        b.differe = true;
        b.payeVente = 0;
        assertTrue(VenteSansChangement.identiques(a, b), "differe reclos en differe, rien d'autre");
        VenteSansChangement.Etat c = vente();
        c.reglements.clear();
        c.reglement("1", 0);
        assertFalse(VenteSansChangement.identiques(a, c), "differe -> comptant (meme mode especes enregistre)");
        b.payeVente = 1000;
        assertFalse(VenteSansChangement.identiques(a, b), "part payee a la vente changee");
    }

    @Test
    @DisplayName("Au moindre doute, la vente est consideree comme modifiee")
    void doute() {
        VenteSansChangement.Etat b = vente();
        b.reglements.clear();
        assertFalse(VenteSansChangement.identiques(vente(), b), "mode inconnu");
        assertFalse(VenteSansChangement.identiques(null, vente()));
        VenteSansChangement.Etat vide = vente();
        vide.lignes.clear();
        assertFalse(VenteSansChangement.identiques(vide, vide), "origine sans ligne");
    }
}
