package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;

import dal.MvtTransaction;
import dal.TModeReglement;
import dal.TPreenregistrement;
import dal.TReglement;
import dal.TTypeReglement;
import dal.VenteReglement;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Mouvement de caisse reconstruit depuis une vente terminee sans MvtTransaction. */
class MouvementCaisseSubstitutionTest {

    private static TTypeReglement type(String id, String nom) {
        TTypeReglement t = new TTypeReglement();
        t.setLgTYPEREGLEMENTID(id);
        t.setStrNAME(nom);
        return t;
    }

    private static VenteReglement ligne(TTypeReglement type, int montant, int verse) {
        VenteReglement v = new VenteReglement();
        v.setTypeReglement(type);
        v.setMontant(montant);
        v.setMontantVerse(verse);
        return v;
    }

    private static TPreenregistrement vente(int prix, int remise, Integer partClient, List<VenteReglement> lignes) {
        TPreenregistrement p = new TPreenregistrement();
        p.setLgPREENREGISTREMENTID("vente-1");
        p.setStrREF("VNO-0001");
        p.setIntPRICE(prix);
        p.setIntPRICEREMISE(remise);
        p.setIntCUSTPART(partClient);
        p.setVenteReglements(lignes);
        return p;
    }

    @Test
    void venteComptantEspecesAvecMonnaie() {
        TTypeReglement especes = type("1", "Espèces");
        List<VenteReglement> lignes = new ArrayList<>();
        lignes.add(ligne(especes, 1320, 2000));
        MvtTransaction m = MouvementCaisseSubstitution.depuisVente(vente(1320, 0, 0, lignes));

        assertEquals("vente-1", m.getPkey());
        assertEquals("VNO-0001", m.getReference());
        assertSame(especes, m.getReglement());
        assertEquals(1320, m.getMontant());
        assertEquals(0, m.getMontantRemise());
        assertEquals(1320, m.getMontantNet());
        assertEquals(1320, m.getMontantPaye());
        assertEquals(2000, m.getMontantVerse());
        assertEquals(0, m.getMontantRestant());
        assertEquals(0, m.getMontantCredit());
    }

    @Test
    void sansLigneDeReglementLeTypeVientDuModeDeLaVente() {
        TTypeReglement mobile = type("3", "Mobile money");
        TModeReglement mode = new TModeReglement();
        mode.setLgTYPEREGLEMENTID(mobile);
        TReglement reglement = new TReglement();
        reglement.setLgMODEREGLEMENTID(mode);
        TPreenregistrement p = vente(5000, 500, 0, new ArrayList<>());
        p.setLgREGLEMENTID(reglement);

        MvtTransaction m = MouvementCaisseSubstitution.depuisVente(p);

        assertSame(mobile, m.getReglement());
        assertEquals(500, m.getMontantRemise());
        assertEquals(4500, m.getMontantNet());
        // sans ligne de reglement : la vente est consideree reglee, sans monnaie
        assertEquals(4500, m.getMontantPaye());
        assertEquals(4500, m.getMontantVerse());
        assertEquals(0, m.getMontantRestant());
    }

    @Test
    void venteAssurancePartClientEtPartTiersPayant() {
        TTypeReglement especes = type("1", "Espèces");
        List<VenteReglement> lignes = new ArrayList<>();
        lignes.add(ligne(especes, 400, 500));
        MvtTransaction m = MouvementCaisseSubstitution.depuisVente(vente(2000, 0, 400, lignes));

        assertEquals(2000, m.getMontantNet());
        assertEquals(400, m.getMontantPaye());
        assertEquals(500, m.getMontantVerse());
        assertEquals(1600, m.getMontantCredit());
        assertEquals(0, m.getMontantRestant());
    }

    @Test
    void venteDiffereePartiellementRegleeGardeUnRestant() {
        TTypeReglement especes = type("1", "Espèces");
        List<VenteReglement> lignes = new ArrayList<>();
        lignes.add(ligne(especes, 1000, 1000));
        MvtTransaction m = MouvementCaisseSubstitution.depuisVente(vente(3000, 0, 0, lignes));

        assertEquals(1000, m.getMontantPaye());
        assertEquals(2000, m.getMontantRestant());
    }

    @Test
    void fractionnementDeuxLignesSansModeSurLaVente() {
        TTypeReglement especes = type("1", "Espèces");
        TTypeReglement mobile = type("3", "Mobile money");
        List<VenteReglement> lignes = new ArrayList<>();
        lignes.add(ligne(mobile, 2000, 2000));
        lignes.add(ligne(especes, 1210, 1500));
        MvtTransaction m = MouvementCaisseSubstitution.depuisVente(vente(3210, 0, 0, lignes));

        assertEquals(3210, m.getMontantPaye());
        assertEquals(3500, m.getMontantVerse());
        // deux lignes : le type porte par le mouvement est celui de la premiere (le ticket
        // detaille de toute facon chaque ligne)
        assertSame(mobile, m.getReglement());
    }

    @Test
    void champsNulsNeFontPasEchouerLaReconstruction() {
        TPreenregistrement p = new TPreenregistrement();
        p.setVenteReglements(null);
        MvtTransaction m = MouvementCaisseSubstitution.depuisVente(p);

        assertNull(m.getReglement());
        assertEquals(0, m.getMontant());
        assertEquals(0, m.getMontantNet());
        assertEquals(0, m.getMontantRemise());
        assertEquals(0, m.getMontantVerse());
        assertEquals(0, m.getMontantPaye());
        assertEquals(0, m.getMontantRestant());
    }
}
