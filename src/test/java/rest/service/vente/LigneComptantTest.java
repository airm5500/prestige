package rest.service.vente;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import commonTasks.dto.ClotureVenteParams;
import commonTasks.dto.VenteReglementDTO;
import dal.TFamille;
import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import dal.TTypeVente;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
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

    private static VenteReglementDTO reglement(String type, int montant, int verse) {
        VenteReglementDTO r = new VenteReglementDTO();
        r.setTypeReglement(type);
        r.setMontant(montant);
        r.setMontantAttentu(montant);
        r.setMontantVerse(verse);
        return r;
    }

    private static String texte(Set<VenteReglementDTO> s) {
        StringBuilder b = new StringBuilder();
        for (VenteReglementDTO r : s) {
            b.append(r.getTypeReglement()).append(':').append(r.getMontant()).append('/').append(r.getMontantVerse())
                    .append(' ');
        }
        return b.toString().trim();
    }

    @Test
    public void unSeulModeCoupeEnDeux() {
        // especes 6 740 recus (7 000 tendus) pour un comptant de 3 930 : 3 930 au comptant, le reste et la monnaie
        // a l'assurance
        Set<VenteReglementDTO> r = new LinkedHashSet<>(Arrays.asList(reglement("1", 6740, 7000)));
        List<Set<VenteReglementDTO>> parts = LigneComptant.repartirReglements(r, 3930);
        assertEquals("1:3930/3930", texte(parts.get(0)));
        assertEquals("1:2810/3070", texte(parts.get(1)));
    }

    @Test
    public void deuxModesImputesComptantDAbord() {
        // mobile 3 000 + especes 3 740 : le comptant (3 930) prend le mode le plus fort puis 930 d'especes
        Set<VenteReglementDTO> r = new LinkedHashSet<>(
                Arrays.asList(reglement("5", 3000, 3000), reglement("1", 3740, 3740)));
        List<Set<VenteReglementDTO>> parts = LigneComptant.repartirReglements(r, 3930);
        assertEquals("1:3740/3740 5:190/190", texte(parts.get(0)));
        assertEquals("5:2810/2810", texte(parts.get(1)));
        // rien de paye (differe) : tout reste a l'assurance avec un montant nul, le comptant n'a rien
        parts = LigneComptant.repartirReglements(Arrays.asList(reglement("4", 0, 0)), 3930);
        assertTrue(parts.get(0).isEmpty());
        assertEquals("4:0/0", texte(parts.get(1)));
    }

    @Test
    public void chargeDeClotureDeLaVenteComptantLiee() {
        TFamille f = new TFamille("F");
        f.setBoolACCOUNT(true);
        f.setIntPAF(2000);
        List<TPreenregistrementDetail> lignes = new ArrayList<>();
        TPreenregistrementDetail a = ligne("r", 6725, 101, false);
        TPreenregistrementDetail k = ligne("k", 4135, 207, true);
        k.setIntQUANTITY(1);
        k.setLgFAMILLEID(f);
        a.setIntQUANTITY(1);
        a.setLgFAMILLEID(f);
        lignes.add(a);
        lignes.add(k);
        ClotureVenteParams vo = new ClotureVenteParams();
        vo.setVenteId("VO");
        vo.setTypeVenteId("2");
        vo.setNatureVenteId("1");
        vo.setRemiseId("R5");
        vo.setUserVendeurId("U1");
        vo.setClientId("C1");
        vo.setTypeRegleId("1");
        vo.setMontantRecu(7000);
        vo.setMontantRemis(260);
        vo.setMontantPaye(6740);
        vo.setTotalRecap(10860);
        vo.setMarge(5000);
        vo.setReglements(new LinkedHashSet<>(Arrays.asList(reglement("1", 7000, 7000))));
        ClotureVenteParams c = LigneComptant.parametresVenteComptant(vo, lignes, "VNO");
        // la vente comptant : son net arrondi (3 928 -> 3 930), type comptant, memes client / vendeur / remise
        assertEquals("VNO", c.getVenteId());
        assertEquals("1", c.getTypeVenteId());
        assertEquals("C1", c.getClientId());
        assertEquals("U1", c.getUserVendeurId());
        assertEquals("R5", c.getRemiseId());
        assertEquals(Integer.valueOf(3930), c.getMontantPaye());
        assertEquals(Integer.valueOf(3930), c.getMontantRecu());
        assertEquals(Integer.valueOf(0), c.getMontantRemis());
        assertEquals(Integer.valueOf(4135), c.getTotalRecap());
        assertEquals(Integer.valueOf(4135 - 207 - 2000), c.getMarge());
        assertEquals("1:3930/3930", texte(c.getReglements()));
        // la vente assurance garde le reste : part client 2 810, monnaie inchangee
        assertEquals(Integer.valueOf(2810), vo.getMontantPaye());
        assertEquals(Integer.valueOf(3070), vo.getMontantRecu());
        assertEquals(Integer.valueOf(260), vo.getMontantRemis());
        assertEquals(Integer.valueOf(10860 - 4135), vo.getTotalRecap());
        assertEquals(Integer.valueOf(5000 - (4135 - 207 - 2000)), vo.getMarge());
        assertEquals("1:3070/3070", texte(vo.getReglements()));
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
