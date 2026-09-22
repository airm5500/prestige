package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Substitution (23/09) : dosage et forme LUS DANS LE LIBELLE, sur des libelles reels du catalogue de l'officine.
 */
public class SubstitutionArticleTest {

    @Test
    public void dosageLuEtNormalise() {
        assertEquals(List.of("500 mg"), SubstitutionArticle.dosage("DOLIPRANE 500MG CPR B/16"));
        // 1 G et 1000 MG : le meme dosage.
        assertEquals(SubstitutionArticle.dosage("DOLIPRANE 1G CPR B/8"),
                SubstitutionArticle.dosage("METFORMIN GH LP 1000MG CPR B/100"));
        assertEquals(List.of("120 mg", "20 mg"), SubstitutionArticle.dosage("COARTEM 20/120MG CPR DISP B/6I08"));
        assertEquals(List.of("500 mg", "62,5 mg"), SubstitutionArticle.dosage("AMOXICLAV DENK 500MG/62,5MG CPR B/16"));
        assertEquals(List.of("75 mcg"), SubstitutionArticle.dosage("LEVOTHYROX 75MCG CPR SEC B/30"));
        // Les volumes ne sont pas des dosages ; les boites non plus.
        assertEquals(List.of("125 mg"), SubstitutionArticle.dosage("FLAGYL 125MG/5ML SUSP BUV/120ML"));
        assertTrue(SubstitutionArticle.dosage("FERCEFOL CPR B/30").isEmpty());
    }

    @Test
    public void formeLueDansLeLibelle() {
        assertEquals("oral_solide", SubstitutionArticle.forme("DOLIPRANE 500MG CPR B/16"));
        assertEquals("oral_solide", SubstitutionArticle.forme("AMLOR 5MG GEL B/30"));
        assertEquals("effervescent", SubstitutionArticle.forme("DOLIPRANE 500MG CPR EFFV T/16"));
        assertEquals("dispersible", SubstitutionArticle.forme("COARTEM 20/120MG CPR DISP B/12 I08"));
        assertEquals("liberation_prolongee", SubstitutionArticle.forme("DIAMICRON LM 60MG CPR SEC  B/30"));
        assertEquals("buvable", SubstitutionArticle.forme("FERCEFOL SP F/150ML"));
        assertEquals("sachet", SubstitutionArticle.forme("ASPEGIC 500MG PDRE SOL BUV SACH/20"));
        assertEquals("collyre", SubstitutionArticle.forme("CIPRO 0,3% COLL 5ML"));
        assertEquals("suppositoire", SubstitutionArticle.forme("DOLIPRANE 200MG SUPPO B/10"));
        assertEquals("injectable", SubstitutionArticle.forme("LASILIX 20MG INJ AMP 2ML B/1"));
        // Le laboratoire CREAT n'est pas une creme.
        assertEquals("oral_solide", SubstitutionArticle.forme("PARACETAMOL CREAT 500MG CPR B/120"));
    }

    @Test
    public void equivalentDirect() {
        SubstitutionArticle.Verdict v = SubstitutionArticle.comparer("DOLIPRANE 500MG CPR B/16",
                "PARACETAMOL BIOG 500MG CPR B/16");
        assertEquals(SubstitutionArticle.DIRECT, v.niveau);
        // La taille de boite ne compte pas ; comprime et gelule sont de la meme famille orale.
        assertEquals(SubstitutionArticle.DIRECT,
                SubstitutionArticle.comparer("DOLIPRANE 500MG CPR B/16", "EFFERALGAN 500MG GEL B/16 ANF").niveau);
    }

    @Test
    public void aAdapterAvecLaRaison() {
        SubstitutionArticle.Verdict dose = SubstitutionArticle.comparer("DOLIPRANE 500MG CPR B/16",
                "DOLIPRANE 1G CPR B/8");
        assertEquals(SubstitutionArticle.ADAPTER, dose.niveau);
        assertTrue(dose.raison.contains("1000 mg au lieu de 500 mg"), dose.raison);
        SubstitutionArticle.Verdict effv = SubstitutionArticle.comparer("DOLIPRANE 500MG CPR B/16",
                "EFFERALGAN 500MG CPR EFFV B/16");
        assertEquals(SubstitutionArticle.ADAPTER, effv.niveau);
        assertTrue(effv.raison.contains("sodium"), effv.raison);
        SubstitutionArticle.Verdict sirop = SubstitutionArticle.comparer("FERCEFOL CPR B/30", "FERCEFOL SP F/150ML");
        assertEquals(SubstitutionArticle.ADAPTER, sirop.niveau);
        assertTrue(sirop.raison.contains("sucre") && sirop.raison.contains("dosage à vérifier"), sirop.raison);
        assertTrue(SubstitutionArticle.comparer("METFORMIN DENK 1G CPR B/30", "METFORMIN GH LP 1000MG CPR B/100").raison
                .contains("libération prolongée"));
    }

    @Test
    public void uneAutreVoieNEstPasProposee() {
        assertNull(SubstitutionArticle.comparer("CIPRO DENK 500MG CPR B/10", "CIPRO 0,3% COLL 5ML"));
        assertNull(SubstitutionArticle.comparer("DOLIPRANE 500MG CPR B/16", "DOLIPRANE 200MG SUPPO B/10"));
        assertNull(SubstitutionArticle.comparer("LASILIX 40MG CPR B/30", "LASILIX 20MG INJ AMP 2ML B/1"));
    }

    @Test
    public void margeTherapeutiqueEtroite() {
        assertTrue(SubstitutionArticle.avertissement(Arrays.asList("LEVOTHYROXINE SODIQUE")).contains("à éviter"));
        assertTrue(SubstitutionArticle.avertissement(Arrays.asList("ACENOCOUMAROL")).contains("marge"));
        assertEquals("", SubstitutionArticle.avertissement(Arrays.asList("PARACETAMOL")));
    }

    @Test
    public void requeteMemesDciExactement() {
        String sql = SubstitutionService.requeteCandidats(true);
        assertTrue(sql.contains("k.cle = :cle") && sql.contains("GROUP_CONCAT(DISTINCT fd.lg_DCI_ID ORDER BY"));
        assertTrue(sql.contains(":emplacement"));
        assertTrue(!SubstitutionService.requeteCandidats(false).contains(":emplacement"));
    }
}
