package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import commonTasks.dto.VenteDetailsDTO;
import dal.TFamille;
import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Tests de coherence (regle du 05/11/2026) de la regle unique « produit de l'ordonnancier » (cas 3 du 03/11) : au lieu
 * d'une table de verite choisie a la main, des milliers de produits et de ventes tires au hasard avec une graine fixe
 * (un echec se rejoue a l'identique), et pour chacun les regles qui doivent toujours tenir, ecrites independamment du
 * code teste.
 *
 * <p>
 * Codes tableau tires parmi : NULL, vide, blancs (espaces, tabulations, retours), lettres, chiffres romains, codes
 * entoures de blancs, codes longs. Drapeaux sensible et soumis a ordonnance a 0 et a 1 (quatre combinaisons). Ventes de
 * 0 a 12 lignes, dont des lignes sans produit.
 * </p>
 */
class ProduitOrdonnancierCoherenceTest {

    private static final long GRAINE = 20261105L;
    private static final int PRODUITS = 20000;
    private static final int VENTES = 5000;

    private static final String[] CODES = { null, "", " ", "   ", "\t", "\n", " \t ", "A", "B", "C", "I", "II", "III",
            "a", " A ", "A ", " A", "\tII\n", "LISTE I", "T1", "0", "AB-12", "x" };

    /** Un code tableau est « porte » s'il contient autre chose que des blancs : ecrit sans trim(), a dessein. */
    private static boolean codePorte(String code) {
        if (code == null) {
            return false;
        }
        for (int i = 0; i < code.length(); i++) {
            if (code.charAt(i) > ' ') {
                return true;
            }
        }
        return false;
    }

    /** La regle d'avant le cas 3, telle qu'elle etait ecrite, sans sa NullPointerException. */
    private static boolean regleHistorique(TFamille f) {
        return f.isScheduled() && f.getIntT() != null && !f.getIntT().trim().isEmpty();
    }

    private static TFamille produit(Random r, int k) {
        TFamille f = new TFamille();
        f.setLgFAMILLEID("P" + k);
        f.setIntCIP(String.format("%07d", r.nextInt(10000000)));
        f.setStrNAME("PRODUIT " + k);
        f.setScheduled(r.nextBoolean());
        f.setSensible(r.nextBoolean());
        f.setIntT(CODES[r.nextInt(CODES.length)]);
        return f;
    }

    private static String decrire(TFamille f) {
        return "scheduled=" + f.isScheduled() + " sensible=" + f.isSensible() + " int_T="
                + (f.getIntT() == null ? "NULL" : "[" + f.getIntT().replace("\t", "\\t").replace("\n", "\\n") + "]");
    }

    @Test
    @DisplayName("Entre au registre : sensible, ou soumis a ordonnance avec un code tableau porte ; jamais de plantage")
    void regleUniqueSurDesMilliersDeProduits() {
        Random r = new Random(GRAINE);
        int entrent = 0;
        for (int k = 0; k < PRODUITS; k++) {
            TFamille f = produit(r, k);
            boolean attendu = f.isSensible() || (f.isScheduled() && codePorte(f.getIntT()));
            assertEquals(attendu, f.estProduitOrdonnancier(), "produit " + k + " : " + decrire(f));
            if (attendu) {
                entrent++;
            }
        }
        // le tirage couvre les deux issues en nombre
        assertTrue(entrent > PRODUITS / 4 && entrent < 3 * PRODUITS / 4, "tirage desequilibre : " + entrent);
    }

    @Test
    @DisplayName("Motif : vide hors registre, « Sensible » si coche sensible, « Ordonnancier » sinon ; rien d'autre")
    void motifCoherentAvecLaRegle() {
        Random r = new Random(GRAINE + 1);
        for (int k = 0; k < PRODUITS; k++) {
            TFamille f = produit(r, k);
            String motif = f.motifOrdonnancier();
            String d = "produit " + k + " : " + decrire(f) + " motif=[" + motif + "]";
            assertTrue("".equals(motif) || "Sensible".equals(motif) || "Ordonnancier".equals(motif), d);
            assertEquals(f.estProduitOrdonnancier(), !motif.isEmpty(), "motif vide <=> hors registre, " + d);
            assertEquals(f.isSensible(), "Sensible".equals(motif), "Sensible <=> coche sensible, " + d);
            assertEquals(f.estProduitOrdonnancier() && !f.isSensible(), "Ordonnancier".equals(motif), d);
        }
    }

    @Test
    @DisplayName("Non-regression : sans produit sensible, la regle unique rend exactement l'ancienne regle")
    void sansSensibleRienNeChange() {
        Random r = new Random(GRAINE + 2);
        int historiques = 0;
        for (int k = 0; k < PRODUITS; k++) {
            TFamille f = produit(r, k);
            f.setSensible(false);
            assertEquals(regleHistorique(f), f.estProduitOrdonnancier(), "produit " + k + " : " + decrire(f));
            assertEquals(regleHistorique(f) ? "Ordonnancier" : "", f.motifOrdonnancier(), decrire(f));
            if (regleHistorique(f)) {
                historiques++;
            }
        }
        assertTrue(historiques > PRODUITS / 10, "tirage sans produit historique : " + historiques);
    }

    @Test
    @DisplayName("Cocher sensible ne retire jamais un produit du registre ; decocher rend exactement l'etat d'avant")
    void cocherPuisDecocherEstReversible() {
        Random r = new Random(GRAINE + 3);
        for (int k = 0; k < PRODUITS; k++) {
            TFamille f = produit(r, k);
            boolean avant = f.estProduitOrdonnancier();
            String motifAvant = f.motifOrdonnancier();
            boolean sensibleAvant = f.isSensible();
            f.setSensible(true);
            assertTrue(f.estProduitOrdonnancier(), "coche sensible et pourtant hors registre, " + decrire(f));
            assertEquals("Sensible", f.motifOrdonnancier(), decrire(f));
            f.setSensible(sensibleAvant);
            assertEquals(avant, f.estProduitOrdonnancier(), "decochage non reversible, " + decrire(f));
            assertEquals(motifAvant, f.motifOrdonnancier(), "motif non rendu, " + decrire(f));
            // un produit non coche sensible ne tient au registre que par son code tableau
            f.setSensible(false);
            f.setIntT(null);
            assertFalse(f.estProduitOrdonnancier(), "sans code tableau ni sensible, au registre : " + decrire(f));
            assertEquals("", f.motifOrdonnancier(), decrire(f));
        }
    }

    private static TPreenregistrementDetail ligne(TFamille f) {
        TPreenregistrementDetail d = new TPreenregistrementDetail();
        d.setLgFAMILLEID(f);
        return d;
    }

    @Test
    @DisplayName("Cloture d'une vente : medecin exige si et seulement si une ligne au moins entre au registre")
    void clotureEtRegistreSontDAccord() {
        Random r = new Random(GRAINE + 4);
        int exigent = 0;
        for (int k = 0; k < VENTES; k++) {
            int n = r.nextInt(13);
            List<TPreenregistrementDetail> lignes = new ArrayList<>();
            boolean uneLigneEntre = false;
            StringBuilder desc = new StringBuilder("vente " + k + " :");
            for (int i = 0; i < n; i++) {
                if (r.nextInt(10) == 0) {
                    lignes.add(new TPreenregistrementDetail()); // ligne sans produit (donnees anciennes)
                    desc.append(" [sans produit]");
                    continue;
                }
                TFamille f = produit(r, k * 100 + i);
                lignes.add(ligne(f));
                desc.append(" [").append(decrire(f)).append(']');
                // le registre retient les lignes dont le produit entre : meme regle que la cloture
                uneLigneEntre |= f.estProduitOrdonnancier();
            }
            Collections.shuffle(lignes, r);
            boolean exige = SalesServiceImpl.checkOrdonnancier(lignes);
            assertEquals(uneLigneEntre, exige, desc.toString());
            if (exige) {
                exigent++;
            }
        }
        assertTrue(exigent > VENTES / 4, "tirage : " + exigent + " ventes exigent un medecin");
        assertFalse(SalesServiceImpl.checkOrdonnancier(Collections.emptyList()), "vente vide");
    }

    private static TPreenregistrementDetail ligneComplete(Random r, TFamille f, int k) {
        TPreenregistrement p = new TPreenregistrement("V" + k);
        p.setStrSTATUT(r.nextBoolean() ? "is_Closed" : "is_Process");
        p.setDtUPDATED(new Date(1_762_300_000_000L + r.nextInt(1_000_000) * 1000L));
        p.setStrREF("REF" + k);
        p.setStrREFBON("");
        TPreenregistrementDetail d = new TPreenregistrementDetail("D" + k);
        d.setLgPREENREGISTREMENTID(p);
        d.setLgFAMILLEID(f);
        int qte = 1 + r.nextInt(6);
        int pu = (1 + r.nextInt(400)) * 25;
        d.setIntQUANTITY(qte);
        d.setIntQUANTITYSERVED(qte);
        d.setIntAVOIR(0);
        d.setIntAVOIRINITIAL(0);
        d.setIntPRICEUNITAIR(pu);
        d.setIntPRICE(pu * qte);
        d.setIntPRICEREMISE(0);
        d.setIntUG(0);
        d.setValeurTva(r.nextBoolean() ? 0 : 18);
        d.setMontantTva(0);
        return d;
    }

    @Test
    @DisplayName("Le detail relu (registre, PDF, Excel) porte le motif, les drapeaux et le code tableau du produit")
    void leDetailReluPorteLeMotifDuProduit() {
        Random r = new Random(GRAINE + 5);
        for (int k = 0; k < VENTES; k++) {
            TFamille f = produit(r, k);
            TPreenregistrementDetail d = ligneComplete(r, f, k);
            VenteDetailsDTO dto = new VenteDetailsDTO(d);
            String desc = "ligne " + k + " : " + decrire(f);
            assertEquals(f.motifOrdonnancier(), dto.getMotif(), "motif, " + desc);
            assertEquals(f.isSensible(), dto.isSensible(), "sensible, " + desc);
            assertEquals(f.isScheduled(), dto.isScheduled(), "scheduled, " + desc);
            assertEquals(f.getIntT(), dto.getCodeTableau(), "code tableau, " + desc);
            assertEquals(f.getIntCIP(), dto.getIntCIP(), desc);
            assertEquals(d.getIntQUANTITY(), dto.getIntQUANTITY(), desc);
            assertEquals(d.getIntPRICE(), dto.getIntPRICE(), desc);
            // ce que l'edition imprime decoule du motif : jamais de motif sur une ligne hors registre
            assertEquals(f.estProduitOrdonnancier(), !dto.getMotif().isEmpty(), desc);
        }
    }
}
