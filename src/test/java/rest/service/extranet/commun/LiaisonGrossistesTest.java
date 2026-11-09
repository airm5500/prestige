package rest.service.extranet.commun;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

/**
 * Lien grossiste de Prestige / extranet (demande du 09/11) : proposition d'apres l'adresse extranet et le nom, sur les
 * grossistes reels du poste (LABOREX-CI par agence, TEDIS PHARMA, COPHARMED, DPCI) et sur des pieges (mots partiels).
 */
class LiaisonGrossistesTest {

    @Test
    void propositions() {
        assertEquals(SourceExtranet.UBIPHARM, LiaisonGrossistes.proposer("LABOREX-CI YOP", null));
        assertEquals(SourceExtranet.UBIPHARM, LiaisonGrossistes.proposer("LABOREX-CI GAGNOA", ""));
        assertEquals(SourceExtranet.UBIPHARM,
                LiaisonGrossistes.proposer("ANS", "http://www.ubipharm-cotedivoire.com/"));
        assertEquals(SourceExtranet.TEDIS, LiaisonGrossistes.proposer("TEDIS PHARMA", null));
        assertEquals(SourceExtranet.TEDIS, LiaisonGrossistes.proposer("X", "http://www.tedispharma-ci.com"));
        assertEquals(SourceExtranet.COPHARMED, LiaisonGrossistes.proposer("COPHARMED", null));
        assertEquals(SourceExtranet.DPCI, LiaisonGrossistes.proposer("DPCI", "http://www.dpci.ci/"));
        assertNull(LiaisonGrossistes.proposer("FOURNISSEUR DIVERS", null));
        assertNull(LiaisonGrossistes.proposer("DPCIX DISTRIBUTION", null), "mot partiel : aucune proposition");
        assertNull(LiaisonGrossistes.proposer(null, null));
    }

    @Test
    void sourcesLiables() {
        assertEquals(SourceExtranet.TEDIS, LiaisonGrossistes.liable("tedis"));
        assertNull(LiaisonGrossistes.liable("MAYITE"), "Mayite n'est pas un grossiste");
        assertNull(LiaisonGrossistes.liable(""));
        assertNull(LiaisonGrossistes.liable("INCONNU"));
        assertFalse(LiaisonGrossistes.SOURCES.contains(SourceExtranet.MAYITE));
        assertEquals("Ubipharm", LiaisonGrossistes.libelle(SourceExtranet.UBIPHARM));
    }
}
