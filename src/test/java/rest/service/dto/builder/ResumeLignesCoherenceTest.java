package rest.service.dto.builder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;
import rest.service.dto.BonLivraisonDetail;
import rest.service.dto.EtatControlBon;
import rest.service.dto.ResumeLignes;
import rest.service.filtre.FiltresControleAchat;

/**
 * Demande du 14/11 : la liste de l'etat de controle des achats ne charge plus les lignes des bons. Le statut du
 * controle, l'avoir, l'ecart et le nombre de lignes sont agreges en base (EtatControlBonServiceImpl.RESUME_LIGNES_SQL)
 * puis lus par {@link ResumeLignes}.
 *
 * <p>
 * Ce test verifie, sur des milliers de bons tires au hasard (graine fixe), que les expressions de la requete -
 * transcrites ici une a une - donnent exactement ce que calculaient les regles Java appliquees aux lignes :
 * {@code computeBlControlStatus}, {@code computeAvoirAmount} et {@code FiltresControleAchat.unDesDetailsEnEcart}. Le
 * test d'ecran test-controle-bons-a-la-demande.js compare en outre, sur la base, la liste legere a la liste complete.
 */
class ResumeLignesCoherenceTest {

    private static Integer peutEtreNul(Random r, int max) {
        int t = r.nextInt(10);
        if (t == 0) {
            return null;
        }
        if (t == 1) {
            return 0;
        }
        return r.nextInt(max + 1);
    }

    private static List<BonLivraisonDetail> bonAuHasard(Random r) {
        int n = r.nextInt(8); // 0 a 7 lignes : bon vide compris
        List<BonLivraisonDetail> lignes = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            Integer recue = r.nextInt(12) == 0 ? null : 1 + r.nextInt(30);
            Integer compte;
            int t = r.nextInt(5);
            if (t == 0) {
                compte = null;
            } else if (t == 1) {
                compte = 0;
            } else if (t == 2 && recue != null) {
                compte = recue; // conforme
            } else {
                compte = r.nextInt(35);
            }
            lignes.add(BonLivraisonDetail.builder().intQTERECUE(recue).quantiteControle(compte)
                    .checked(r.nextInt(4) == 0).intQTERETURN(peutEtreNul(r, 6)).intPAF(1 + r.nextInt(25000)).build());
        }
        return lignes;
    }

    /** Transcription des expressions de RESUME_LIGNES_SQL (COUNT, MAX, MIN, SUM sur les lignes du bon). */
    private static ResumeLignes resumeCommeLaRequete(List<BonLivraisonDetail> lignes) {
        if (lignes.isEmpty()) {
            return null; // aucune ligne : aucun groupe en base, le bon prend ResumeLignes.VIDE
        }
        int commence = 0;
        int termine = 1;
        long avoir = 0;
        int ecart = 0;
        for (BonLivraisonDetail d : lignes) {
            boolean coche = Boolean.TRUE.equals(d.getChecked());
            Integer qc = d.getQuantiteControle();
            Integer recue = d.getIntQTERECUE();
            // MAX(CASE WHEN checked = 1 OR quantite_controle > 0 THEN 1 ELSE 0 END)
            commence = Math.max(commence, coche || (qc != null && qc > 0) ? 1 : 0);
            // MIN(CASE WHEN checked = 1 OR (qc IS NOT NULL AND recue IS NOT NULL AND qc >= recue) ...)
            termine = Math.min(termine, coche || (qc != null && recue != null && qc >= recue) ? 1 : 0);
            // SUM(CASE WHEN int_QTE_RETURN IS NOT NULL THEN int_QTE_RETURN * int_PAF ELSE 0 END)
            if (d.getIntQTERETURN() != null) {
                avoir += (long) d.getIntQTERETURN() * d.getIntPAF();
            }
            // MAX(CASE WHEN qc > 0 AND recue IS NOT NULL AND qc <> recue THEN 1 ELSE 0 END)
            ecart = Math.max(ecart, qc != null && qc > 0 && recue != null && !qc.equals(recue) ? 1 : 0);
        }
        return new ResumeLignes(lignes.size(), commence > 0, termine > 0, (int) avoir, ecart > 0);
    }

    @Test
    void leResumeCalculeEnBaseDonneLesMemesValeursQueLesLignes() {
        Random r = new Random(20261114L);
        int vides = 0;
        int termines = 0;
        int enCours = 0;
        int ecarts = 0;
        int avoirs = 0;
        for (int i = 0; i < 20000; i++) {
            List<BonLivraisonDetail> lignes = bonAuHasard(r);
            ResumeLignes resume = resumeCommeLaRequete(lignes);
            ResumeLignes lu = resume == null ? ResumeLignes.VIDE : resume;
            String attendu = EtatControlBonBuilder.computeBlControlStatus(lignes);
            assertEquals(attendu, lu.statut(), "statut du bon " + i);
            assertEquals(EtatControlBonBuilder.computeAvoirAmount(lignes), lu.getAvoir(), "avoir du bon " + i);
            assertEquals(FiltresControleAchat.unDesDetailsEnEcart(lignes), lu.isEcart(), "ecart du bon " + i);
            assertEquals(lignes.size(), lu.getNombre(), "nombre de lignes du bon " + i);
            assertTrue(lu.getAvoir() >= 0, "avoir jamais negatif");

            // le filtre d'ecart lit le resume quand les lignes ne sont pas chargees
            EtatControlBon entete = EtatControlBon.builder().avecEcart(lu.isEcart()).build();
            EtatControlBon complet = EtatControlBon.builder().bonLivraisonDetails(lignes).build();
            assertEquals(FiltresControleAchat.presenteUnEcart(complet), FiltresControleAchat.presenteUnEcart(entete));

            vides += lignes.isEmpty() ? 1 : 0;
            termines += "TERMINE".equals(attendu) ? 1 : 0;
            enCours += "EN_COURS".equals(attendu) ? 1 : 0;
            ecarts += lu.isEcart() ? 1 : 0;
            avoirs += lu.getAvoir() > 0 ? 1 : 0;
        }
        // le tirage couvre bien tous les cas
        assertTrue(vides > 100 && termines > 100 && enCours > 100 && ecarts > 100 && avoirs > 100,
                vides + " " + termines + " " + enCours + " " + ecarts + " " + avoirs);
    }

    @Test
    void unBonSansLigneEstAFaireSansAvoirNiEcart() {
        assertEquals("NON_TRAITE", ResumeLignes.VIDE.statut());
        assertEquals(0, ResumeLignes.VIDE.getAvoir());
        assertEquals(false, ResumeLignes.VIDE.isEcart());
        assertEquals("NON_TRAITE", new ResumeLignes(3, false, false, 0, false).statut());
        assertEquals("EN_COURS", new ResumeLignes(3, true, false, 0, false).statut());
        assertEquals("TERMINE", new ResumeLignes(3, true, true, 0, true).statut());
    }
}
