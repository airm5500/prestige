package rest.service.prixreference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dal.PrixReference;
import dal.PrixReferenceJournal;
import dal.PrixReferenceJournalAction;
import dal.PrixReferenceType;
import dal.TFamille;
import dal.TTiersPayant;
import dal.TUser;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Cas 2 du 03/11/2026 : bornes de la saisie a la caisse et lignes de journal (Q2.6), sans base.
 */
class ReferenceCaisseTest {

    private static PrixReference reference(int valeur, Float taux, PrixReferenceType type) {
        PrixReference p = new PrixReference();
        p.setId("ref-1");
        p.setProduit(new TFamille("produit-1"));
        p.setTiersPayant(new TTiersPayant("tp-1"));
        p.setValeur(valeur);
        p.setValeurTaux(taux);
        p.setType(type);
        return p;
    }

    private static TUser utilisateur() {
        TUser u = new TUser();
        u.setLgUSERID("u-1");
        u.setStrFIRSTNAME("Caissière");
        u.setStrLASTNAME("A.");
        u.setStrLOGIN("caisse");
        return u;
    }

    @Test
    @DisplayName("prix de 5 au prix de vente et taux de 5 a 100 : accepte")
    void bornesAcceptees() {
        assertNull(ReferenceCaisse.motifRefus(5, 5, 4135));
        assertNull(ReferenceCaisse.motifRefus(4135, 100, 4135));
        assertNull(ReferenceCaisse.motifRefus(3145, 15, 3145));
    }

    @Test
    @DisplayName("4, 101, prix au-dessus du prix de vente, champ vide : refuse avec un motif")
    void bornesRefusees() {
        assertNotNull(ReferenceCaisse.motifRefus(4, 70, 4135));
        assertNotNull(ReferenceCaisse.motifRefus(3000, 4, 4135));
        assertNotNull(ReferenceCaisse.motifRefus(3000, 101, 4135));
        assertTrue(ReferenceCaisse.motifRefus(5000, 70, 4135).contains("dépasse le prix de vente"));
        assertNotNull(ReferenceCaisse.motifRefus(null, 70, 4135));
        assertNotNull(ReferenceCaisse.motifRefus(3000, null, 4135));
    }

    @Test
    @DisplayName("sans prix de vente connu (0), seule la borne basse s'applique")
    void sansPrixDeVente() {
        assertNull(ReferenceCaisse.motifRefus(99999, 50, 0));
    }

    @Test
    @DisplayName("ajout : pas d'avant, nouvelle valeur, utilisateur nomme, vente d'origine, poste")
    void journalAjout() {
        PrixReference apres = reference(3145, 15f, PrixReferenceType.MIX_TAUX_PRIX);
        PrixReferenceJournal j = ReferenceCaisse.journal(PrixReferenceJournalAction.AJOUT, null, apres, utilisateur(),
                "VO-1", "POSTE-3");
        assertEquals(PrixReferenceJournalAction.AJOUT, j.getAction());
        assertEquals("produit-1", j.getProduitId());
        assertEquals("tp-1", j.getTiersPayantId());
        assertEquals("ref-1", j.getPrixReferenceId());
        assertNull(j.getAncienneValeur());
        assertNull(j.getAncienTaux());
        assertNull(j.getAncienType());
        assertEquals(3145, j.getNouvelleValeur());
        assertEquals(15f, j.getNouveauTaux());
        assertEquals(PrixReferenceType.MIX_TAUX_PRIX, j.getNouveauType());
        assertEquals("u-1", j.getUtilisateurId());
        assertEquals("Caissière A.", j.getUtilisateur());
        assertEquals("VO-1", j.getVenteId());
        assertEquals("POSTE-3", j.getPoste());
        assertNotNull(j.getDateAction());
    }

    @Test
    @DisplayName("modification depuis la fiche : anciennes valeurs correctes, pas de vente")
    void journalModification() {
        PrixReference avant = reference(6500, 70f, PrixReferenceType.PRIX_REFERENCE);
        PrixReference apres = reference(6000, 70f, PrixReferenceType.MIX_TAUX_PRIX);
        PrixReferenceJournal j = ReferenceCaisse.journal(PrixReferenceJournalAction.MODIFICATION, avant, apres,
                utilisateur(), "", null);
        assertEquals(6500, j.getAncienneValeur());
        assertEquals(PrixReferenceType.PRIX_REFERENCE, j.getAncienType());
        assertEquals(6000, j.getNouvelleValeur());
        assertEquals(PrixReferenceType.MIX_TAUX_PRIX, j.getNouveauType());
        assertNull(j.getVenteId());
        assertNull(j.getPoste());
    }

    @Test
    @DisplayName("suppression : avant seulement, apres vide ; sans utilisateur connu")
    void journalSuppression() {
        PrixReference avant = reference(6200, null, PrixReferenceType.PRIX_REFERENCE);
        PrixReferenceJournal j = ReferenceCaisse.journal(PrixReferenceJournalAction.SUPPRESSION, avant, null, null,
                null, "P");
        assertEquals(6200, j.getAncienneValeur());
        assertNull(j.getNouvelleValeur());
        assertNull(j.getNouveauType());
        assertNull(j.getUtilisateurId());
        assertEquals("produit-1", j.getProduitId());
    }

    @Test
    @DisplayName("la copie prise avant modification ne suit pas les changements de l'original")
    void copieDetachee() {
        PrixReference original = reference(6500, 70f, PrixReferenceType.PRIX_REFERENCE);
        PrixReference copie = ReferenceCaisse.copie(original);
        original.setValeur(6000);
        original.setType(PrixReferenceType.MIX_TAUX_PRIX);
        assertEquals(6500, copie.getValeur());
        assertEquals(PrixReferenceType.PRIX_REFERENCE, copie.getType());
        assertTrue(ReferenceCaisse.change(copie, original));
        assertFalse(ReferenceCaisse.change(copie, ReferenceCaisse.copie(copie)));
    }

    @Test
    @DisplayName("la caisse ecrit toujours MIX_TAUX_PRIX (Q2.3)")
    void typeCaisse() {
        assertEquals(PrixReferenceType.MIX_TAUX_PRIX, ReferenceCaisse.typeCaisse());
    }
}
