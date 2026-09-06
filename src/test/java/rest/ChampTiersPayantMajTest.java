package rest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import org.junit.jupiter.api.Test;

import dal.TTiersPayant;

/**
 * Ce que la mise a jour selective des tiers payants doit garantir avant d'ecrire dans quarante fiches d'un coup :
 * seules les donnees envoyees sont touchees, et une valeur douteuse arrete tout AVANT la transaction.
 */
class ChampTiersPayantMajTest {

    @Test
    void uneDonneeAbsenteDeLaTableNEstPasTouchee() {
        Map<ChampTiersPayantMaj, Object> valeurs = ChampTiersPayantMaj.lire("{\"CODE_OFFICINE\":\"OFF-12\"}");

        assertEquals(1, valeurs.size());
        assertTrue(valeurs.containsKey(ChampTiersPayantMaj.CODE_OFFICINE));
        assertFalse(valeurs.containsKey(ChampTiersPayantMaj.PLAFOND_CREDIT),
                "le plafond n'etait pas demande, il ne doit pas figurer dans le resultat");
    }

    @Test
    void plusieursDonneesPartentDansLeMemePassage() {
        Map<ChampTiersPayantMaj, Object> valeurs = ChampTiersPayantMaj
                .lire("{\"NBREBONS\":\"25\",\"PLAFOND_CREDIT\":\"150000\",\"IS_ABSOLUTE\":\"1\"}");

        assertEquals(3, valeurs.size());
        assertEquals(Integer.valueOf(25), valeurs.get(ChampTiersPayantMaj.NBREBONS));
        assertEquals(Double.valueOf(150000D), valeurs.get(ChampTiersPayantMaj.PLAFOND_CREDIT));
        assertEquals(Boolean.TRUE, valeurs.get(ChampTiersPayantMaj.IS_ABSOLUTE));
    }

    @Test
    void uneTableIllisibleNeDonneAucuneDonnee() {
        // L'appelant refusera alors faute de reglage, au lieu d'ecrire n'importe quoi.
        assertTrue(ChampTiersPayantMaj.lire("ceci n'est pas du json").isEmpty());
        assertTrue(ChampTiersPayantMaj.lire("").isEmpty());
        assertTrue(ChampTiersPayantMaj.lire(null).isEmpty());
    }

    @Test
    void unNomDeDonneeInconnuEstIgnore() {
        assertNull(ChampTiersPayantMaj.parNom("STR_INEXISTANT"));
        assertNull(ChampTiersPayantMaj.parNom(""));
        assertSame(ChampTiersPayantMaj.CODE_OFFICINE, ChampTiersPayantMaj.parNom("code_officine"));
        assertTrue(ChampTiersPayantMaj.lire("{\"STR_INEXISTANT\":\"x\"}").isEmpty());
    }

    @Test
    void unNombreIllisibleArreteLAppel() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> ChampTiersPayantMaj.lire("{\"NBREBONS\":\"vingt\"}"),
                "un nombre illisible doit etre refuse, pas converti en zero");
        assertTrue(e.getMessage().contains("vingt"), e.getMessage());
    }

    @Test
    void unMontantNegatifEstRefuse() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> ChampTiersPayantMaj.lire("{\"PLAFOND_VENTE\":\"-1\"}"), "un plafond negatif n'a pas de sens");
        assertTrue(e.getMessage().contains("négatif"), e.getMessage());
    }

    @Test
    void laVirguleDecimaleFrancaiseEstAcceptee() {
        assertEquals(Double.valueOf(1250.75D),
                ChampTiersPayantMaj.lire("{\"PLAFOND_CREDIT\":\"1250,75\"}").get(ChampTiersPayantMaj.PLAFOND_CREDIT));
    }

    @Test
    void unModeDeTriInconnuEstRefuse() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> ChampTiersPayantMaj.lire("{\"MODE_TRI_FACTURE\":\"PAR_MONTANT\"}"),
                "seuls ALPHABETIQUE et DATE_BON existent");
        assertTrue(e.getMessage().contains("PAR_MONTANT"), e.getMessage());
        assertEquals("DATE_BON", ChampTiersPayantMaj.lire("{\"MODE_TRI_FACTURE\":\"DATE_BON\"}")
                .get(ChampTiersPayantMaj.MODE_TRI_FACTURE));
    }

    @Test
    void unTexteTropLongEstRefuseAuLieuDEtreTronque() {
        StringBuilder trop = new StringBuilder();
        for (int i = 0; i < 101; i++) {
            trop.append('A');
        }
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> ChampTiersPayantMaj.lire("{\"REGISTRE_COMMERCE\":\"" + trop + "\"}"),
                "tronquer ecrirait une valeur fausse dans toutes les fiches");
        assertTrue(e.getMessage().contains("100"), e.getMessage());
    }

    @Test
    void unTexteVideEffaceVolontairementLaDonnee() {
        Map<ChampTiersPayantMaj, Object> valeurs = ChampTiersPayantMaj.lire("{\"COMPTE_CONTRIBUABLE\":\"\"}");

        assertEquals("", valeurs.get(ChampTiersPayantMaj.COMPTE_CONTRIBUABLE));
    }

    @Test
    void ouiEtNonSAcceptentSousLeursDeuxEcritures() {
        assertEquals(Boolean.TRUE, ChampTiersPayantMaj.IS_ABSOLUTE.convertir("1"));
        assertEquals(Boolean.TRUE, ChampTiersPayantMaj.IS_ABSOLUTE.convertir("true"));
        assertEquals(Boolean.FALSE, ChampTiersPayantMaj.IS_ABSOLUTE.convertir("0"));
        assertEquals(Boolean.FALSE, ChampTiersPayantMaj.IS_ABSOLUTE.convertir("false"));
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> ChampTiersPayantMaj.IS_ABSOLUTE.convertir("peut-etre"),
                "une reponse ambigue ne doit pas devenir non par defaut");
        assertTrue(e.getMessage().contains("oui ou non"), e.getMessage());
    }

    @Test
    void chaqueDonneeSePoseSurLaBonneColonne() {
        TTiersPayant tp = new TTiersPayant();
        Map<ChampTiersPayantMaj, Object> valeurs = ChampTiersPayantMaj.lire("{\"NBRE_EXEMPLAIRE_BORD\":\"3\","
                + "\"NBREBONS\":\"25\",\"MONTANTFAC\":\"500000\",\"MODE_TRI_FACTURE\":\"DATE_BON\","
                + "\"PLAFOND_CREDIT\":\"150000\",\"PLAFOND_VENTE\":\"20000\",\"IS_ABSOLUTE\":\"1\","
                + "\"COMPTE_CONTRIBUABLE\":\"CC-1\",\"REGISTRE_COMMERCE\":\"RC-2\",\"CODE_OFFICINE\":\"OFF-3\"}");
        for (Map.Entry<ChampTiersPayantMaj, Object> reglage : valeurs.entrySet()) {
            reglage.getKey().appliquer(tp, reglage.getValue());
        }

        assertEquals(Integer.valueOf(3), tp.getIntNBREEXEMPLAIREBORD());
        assertEquals(Integer.valueOf(25), tp.getIntNBREBONS());
        assertEquals(Integer.valueOf(500000), tp.getIntMONTANTFAC());
        assertEquals("DATE_BON", tp.getStrMODETRIFACTURE());
        assertEquals(Double.valueOf(150000D), tp.getDblPLAFONDCREDIT());
        assertEquals(Double.valueOf(20000D), tp.getDblPLAFONDVENTE());
        assertEquals(Boolean.TRUE, tp.getBIsAbsolute());
        assertEquals("CC-1", tp.getStrCOMPTECONTRIBUABLE());
        assertEquals("RC-2", tp.getStrREGISTRECOMMERCE());
        assertEquals("OFF-3", tp.getStrCODEOFFICINE());
    }

    @Test
    void poserUneDonneeNeTouchePasLesAutres() {
        TTiersPayant tp = new TTiersPayant();
        tp.setDblPLAFONDCREDIT(99D);
        tp.setStrCODEOFFICINE("INCHANGE");

        Map<ChampTiersPayantMaj, Object> valeurs = ChampTiersPayantMaj.lire("{\"NBREBONS\":\"10\"}");
        for (Map.Entry<ChampTiersPayantMaj, Object> reglage : valeurs.entrySet()) {
            reglage.getKey().appliquer(tp, reglage.getValue());
        }

        assertEquals(Integer.valueOf(10), tp.getIntNBREBONS());
        assertEquals(Double.valueOf(99D), tp.getDblPLAFONDCREDIT(), "le plafond n'etait pas demande");
        assertEquals("INCHANGE", tp.getStrCODEOFFICINE(), "le code officine n'etait pas demande");
    }

    @Test
    void leResumeEstLisiblePourLaConfirmation() {
        assertEquals("Plafond absolu = oui", ChampTiersPayantMaj.IS_ABSOLUTE.resume(Boolean.TRUE));
        assertEquals("Plafond absolu = non", ChampTiersPayantMaj.IS_ABSOLUTE.resume(Boolean.FALSE));
        assertEquals("Code officine = (vide)", ChampTiersPayantMaj.CODE_OFFICINE.resume(""));
        assertEquals("Nombre maximum de bons par facture = 25", ChampTiersPayantMaj.NBREBONS.resume(25));
    }
}
