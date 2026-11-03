package rest.service.vente;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import dal.TTypeVente;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import util.Constant;

/** Cas 1 du 03/11/2026 : regles pures de la ligne au comptant (parametre, cochage, calcul, imputation). */
public class LigneComptantTest {

    private static TPreenregistrement vente(String type) {
        TPreenregistrement tp = new TPreenregistrement("V1");
        tp.setLgTYPEVENTEID(new TTypeVente(type));
        return tp;
    }

    private static TPreenregistrementDetail ligne(String id, int prix, int remise, boolean comptant) {
        TPreenregistrementDetail d = new TPreenregistrementDetail(id);
        d.setIntPRICE(prix);
        d.setIntPRICEREMISE(remise);
        d.setMontantTva(0);
        d.setComptant(comptant);
        return d;
    }

    @Test
    public void parametreInactifSaufValeur1() {
        assertFalse(LigneComptant.valeurActive(null));
        assertFalse(LigneComptant.valeurActive("0"));
        assertFalse(LigneComptant.valeurActive(""));
        assertTrue(LigneComptant.valeurActive("1"));
        assertTrue(LigneComptant.valeurActive(" 1 "));
    }

    @Test
    public void lignesDuCalculIdentiquesSansParametreOuSansCoche() {
        TPreenregistrement vo = vente(Constant.VENTE_ASSURANCE_ID);
        List<TPreenregistrementDetail> sansCoche = Arrays.asList(ligne("a", 1000, 0, false),
                ligne("b", 2000, 0, false));
        List<TPreenregistrementDetail> avecCoche = Arrays.asList(ligne("a", 1000, 0, false), ligne("b", 2000, 0, true));
        // parametre a 0 : la liste rendue est exactement celle recue, cochee ou non
        assertSame(avecCoche, LigneComptant.lignesPourLeCalcul(false, vo, avecCoche));
        // parametre a 1 mais aucune coche : idem
        assertSame(sansCoche, LigneComptant.lignesPourLeCalcul(true, vo, sansCoche));
        // carnet : la coche est ignoree (Q1.7)
        assertSame(avecCoche, LigneComptant.lignesPourLeCalcul(true, vente(Constant.VENTE_AVEC_CARNET), avecCoche));
        // assurance, parametre a 1, une coche : seule la ligne non cochee entre dans le moteur
        List<TPreenregistrementDetail> calcul = LigneComptant.lignesPourLeCalcul(true, vo, avecCoche);
        assertEquals(1, calcul.size());
        assertEquals("a", calcul.get(0).getLgPREENREGISTREMENTDETAILID());
    }

    @Test
    public void montantComptantComprendLaRemiseProduit() {
        // maquette : KETODERM 4 135 avec remise 5 % (207) cochee ; deux lignes assurance non cochees
        List<TPreenregistrementDetail> lignes = Arrays.asList(ligne("r", 6725, 101, false), ligne("i", 3145, 47, false),
                ligne("k", 4135, 207, true));
        assertEquals(4135 - 207, LigneComptant.montantComptant(lignes));
        assertEquals(3930, LigneComptant.arrondi5(LigneComptant.montantComptant(lignes)));
        assertEquals(4135, LigneComptant.montantTotal(LigneComptant.lignesComptant(lignes)));
        assertEquals(6725 + 3145, LigneComptant.montantTotal(LigneComptant.lignesAssurance(lignes)));
        assertEquals(0, LigneComptant.montantComptant(Arrays.asList(ligne("x", 500, 0, false))));
        assertTrue(LigneComptant.aDesLignesComptant(lignes));
        assertFalse(LigneComptant.aDesLignesComptant(Arrays.asList(ligne("x", 500, 0, false))));
    }

    @Test
    public void arrondiAuMultipleDeCinq() {
        assertEquals(0, LigneComptant.arrondi5(0));
        assertEquals(5, LigneComptant.arrondi5(1));
        assertEquals(3930, LigneComptant.arrondi5(3928));
        assertEquals(3930, LigneComptant.arrondi5(3930));
    }

    @Test
    public void imputationComptantDAbordPuisPartClient() {
        // Q1.3 : 6 740 recus, comptant 3 930, part client 2 810
        assertArrayEquals(new int[] { 3930, 2810 }, LigneComptant.imputation(6740, 3930, 2810));
        // paiement partiel : tout sur le comptant, rien sur l'assurance (qui reste due)
        assertArrayEquals(new int[] { 3000, 0 }, LigneComptant.imputation(3000, 3930, 2810));
        // rien de paye (differe)
        assertArrayEquals(new int[] { 0, 0 }, LigneComptant.imputation(0, 3930, 2810));
        // trop paye : le surplus (monnaie) reste a la vente assurance
        assertArrayEquals(new int[] { 3930, 3070 }, LigneComptant.imputation(7000, 3930, 2810));
    }

    @Test
    public void refusDuCochage() {
        TPreenregistrement vo = vente(Constant.VENTE_ASSURANCE_ID);
        TPreenregistrementDetail d = ligne("a", 1000, 0, false);
        assertEquals(LigneComptant.MSG_INACTIF, LigneComptant.refusCochage(false, vo, d, true, null));
        assertEquals("close", LigneComptant.refusCochage(true, vo, d, true, "close"));
        assertEquals(LigneComptant.MSG_TYPE, LigneComptant.refusCochage(true, vente("1"), d, true, null));
        assertEquals(LigneComptant.MSG_TYPE,
                LigneComptant.refusCochage(true, vente(Constant.VENTE_AVEC_CARNET), d, true, null));
        d.setPromotionProduitId(12);
        assertEquals(LigneComptant.MSG_PROMOTION, LigneComptant.refusCochage(true, vo, d, true, null));
        // decocher une ligne en promotion reste possible (retour a l'etat d'avant)
        assertNull(LigneComptant.refusCochage(true, vo, d, false, null));
        d.setPromotionProduitId(null);
        assertNull(LigneComptant.refusCochage(true, vo, d, true, null));
    }
}
