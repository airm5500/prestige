package rest.service.dto;

import static org.junit.jupiter.api.Assertions.assertEquals;

import dal.PrixReferenceJournal;
import dal.PrixReferenceJournalAction;
import dal.PrixReferenceType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Journal des prix de reference tel que la fiche article l'affiche (cas 2 du 03/11/2026). */
class PrixReferenceJournalDTOTest {

    @Test
    @DisplayName("origine : fiche article sans vente, caisse avec la reference de la vente")
    void origine() {
        assertEquals("Fiche article", PrixReferenceJournalDTO.origine(null, null));
        assertEquals("Fiche article", PrixReferenceJournalDTO.origine("", null));
        assertEquals("Caisse — vente VO-2026-01039", PrixReferenceJournalDTO.origine("id-1", "VO-2026-01039"));
        assertEquals("Caisse — vente id-1", PrixReferenceJournalDTO.origine("id-1", ""));
    }

    @Test
    @DisplayName("avant / apres : prix et taux selon le type, tiret quand il n'y a rien")
    void resume() {
        assertEquals("—", PrixReferenceJournalDTO.resume(null, null, null));
        assertEquals("prix 3 145 · taux 15 %",
                PrixReferenceJournalDTO.resume(3145, 15f, PrixReferenceType.MIX_TAUX_PRIX));
        assertEquals("prix 6 200", PrixReferenceJournalDTO.resume(6200, 70f, PrixReferenceType.PRIX_REFERENCE));
        assertEquals("taux 20 %", PrixReferenceJournalDTO.resume(6200, 20f, PrixReferenceType.TAUX));
    }

    @Test
    @DisplayName("une ligne complete : date, qui, origine, tiers-payant, action, avant, apres")
    void ligne() {
        PrixReferenceJournal j = new PrixReferenceJournal();
        j.setAction(PrixReferenceJournalAction.AJOUT);
        j.setUtilisateur("Caissière A.");
        j.setVenteId("v-1");
        j.setTiersPayantId("tp-1");
        j.setNouvelleValeur(3145);
        j.setNouveauTaux(15f);
        j.setNouveauType(PrixReferenceType.MIX_TAUX_PRIX);
        PrixReferenceJournalDTO d = new PrixReferenceJournalDTO(j, "CNPS", "VO-2026-01039");
        assertEquals("Caissière A.", d.getQui());
        assertEquals("CNPS", d.getTiersPayant());
        assertEquals("Ajout", d.getAction());
        assertEquals("—", d.getAvant());
        assertEquals("prix 3 145 · taux 15 %", d.getApres());
        assertEquals("Caisse — vente VO-2026-01039", d.getOrigine());
        assertEquals(16, d.getDate().length());
    }
}
