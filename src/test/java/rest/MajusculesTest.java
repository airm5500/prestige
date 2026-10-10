package rest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import commonTasks.dto.AyantDroitDTO;
import commonTasks.dto.ClientDTO;
import commonTasks.dto.ClientLambdaDTO;
import commonTasks.dto.TiersPayantDTO;
import org.junit.jupiter.api.Test;

class MajusculesTest {

    @Test
    void texte() {
        assertEquals("KOUASSI ÉLODIE", Majuscules.texte("  kouassi élodie "));
        assertEquals("BL-12A", Majuscules.texte("bl-12a"));
        assertNull(Majuscules.texte(null));
        assertEquals("", Majuscules.texte("  "));
    }

    @Test
    void clientRapideSansToucherAuxCoordonnees() {
        ClientLambdaDTO c = new ClientLambdaDTO();
        c.setStrFIRSTNAME("awa");
        c.setStrLASTNAME("traoré");
        c.setEmail("awa.traore@exemple.ci");
        c.setStrADRESSE("rue des jardins");
        Majuscules.appliquer(c);
        assertEquals("AWA", c.getStrFIRSTNAME());
        assertEquals("TRAORÉ", c.getStrLASTNAME());
        assertEquals("awa.traore@exemple.ci", c.getEmail());
        assertEquals("rue des jardins", c.getStrADRESSE());
    }

    @Test
    void clientAssuranceAyantDroitEtTiersPayant() {
        ClientDTO c = new ClientDTO();
        c.setStrFIRSTNAME("jean");
        c.setStrLASTNAME("yao");
        c.setStrNUMEROSECURITESOCIAL("mat-01b");
        c.setEmail("Jean@Exemple.ci");
        Majuscules.appliquer(c);
        assertEquals("JEAN", c.getStrFIRSTNAME());
        assertEquals("YAO", c.getStrLASTNAME());
        assertEquals("MAT-01B", c.getStrNUMEROSECURITESOCIAL());
        assertEquals("Jean@Exemple.ci", c.getEmail());

        AyantDroitDTO a = new AyantDroitDTO();
        a.setStrFIRSTNAME("marie");
        a.setStrLASTNAME("yao");
        a.setStrNUMEROSECURITESOCIAL("ad-2");
        Majuscules.appliquer(a);
        assertEquals("MARIE", a.getStrFIRSTNAME());
        assertEquals("AD-2", a.getStrNUMEROSECURITESOCIAL());

        TiersPayantDTO t = new TiersPayantDTO();
        t.setStrNAME("mugefci");
        t.setStrFULLNAME("mutuelle générale");
        t.setStrCODEORGANISME("org1");
        t.setStrTELEPHONE("0102030405");
        Majuscules.appliquer(t);
        assertEquals("MUGEFCI", t.getStrNAME());
        assertEquals("MUTUELLE GÉNÉRALE", t.getStrFULLNAME());
        assertEquals("ORG1", t.getStrCODEORGANISME());
        assertEquals("0102030405", t.getStrTELEPHONE());
        assertNull(Majuscules.appliquer((TiersPayantDTO) null));
    }
}
