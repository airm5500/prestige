package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Regles de saisie d'une ordonnance client (evolution 6, point 2).
 *
 * <p>
 * Ces controles sont rejoues cote serveur et pas seulement dans l'ecran : un controle qui ne vit que dans le navigateur
 * est un controle qu'un appel direct au service contourne. Il s'agit ici de donnees de sante, on ne s'en remet donc pas
 * a la bonne tenue du formulaire.
 */
public class OrdonnanceClientSaisieTest {

    private static final LocalDate JOUR = LocalDate.of(2026, 9, 18);

    private static JSONObject valide() {
        return new JSONObject().put("clientId", "CLIENT-1").put("dateOrdonnance", "2026-09-18").put("produits",
                new JSONArray().put(new JSONObject().put("libelle", "DOLIPRANE 1000").put("quantite", 2)
                        .put("posologie", "1 cp matin et soir").put("duree", "7 jours")));
    }

    @Test
    public void uneOrdonnanceCompleteEstAcceptee() {
        assertTrue(OrdonnanceClientSaisie.valider(valide(), JOUR).isEmpty());
    }

    @Test
    public void leClientEstObligatoire() {
        JSONObject o = valide();
        o.remove("clientId");
        List<String> refus = OrdonnanceClientSaisie.valider(o, JOUR);
        assertEquals(1, refus.size());
        assertTrue(refus.get(0).contains("client"), refus.toString());
    }

    @Test
    public void laDateEstObligatoire() {
        JSONObject o = valide();
        o.remove("dateOrdonnance");
        assertTrue(OrdonnanceClientSaisie.valider(o, JOUR).toString().contains("date"));
    }

    @Test
    public void uneDateDansLeFuturEstRefusee() {
        // Faute de frappe sur l'annee : sans ce refus, le document sortirait de tous les historiques filtres
        JSONObject o = valide().put("dateOrdonnance", "2027-09-18");
        assertTrue(OrdonnanceClientSaisie.valider(o, JOUR).toString().contains("futur"));
    }

    @Test
    public void uneOrdonnanceDuJourMemeEstAcceptee() {
        assertTrue(OrdonnanceClientSaisie.valider(valide().put("dateOrdonnance", "2026-09-18"), JOUR).isEmpty());
    }

    @Test
    public void unePrescriptionAncienneResteAcceptee() {
        // Une ordonnance presentee des mois apres sa redaction doit pouvoir etre enregistree telle quelle
        assertTrue(OrdonnanceClientSaisie.valider(valide().put("dateOrdonnance", "2024-01-05"), JOUR).isEmpty());
    }

    @Test
    public void ilFautAuMoinsUnProduit() {
        JSONObject o = valide().put("produits", new JSONArray());
        assertTrue(OrdonnanceClientSaisie.valider(o, JOUR).toString().contains("produit"));
    }

    @Test
    public void lesLignesVidesSontIgnoreesEtNonRefusees() {
        /*
         * La grille de saisie garde presque toujours une derniere ligne amorcee que l'operateur n'a pas remplie : la
         * lui reprocher serait absurde. Elle est simplement ignoree.
         */
        JSONObject o = valide();
        o.getJSONArray("produits").put(new JSONObject().put("libelle", "").put("quantite", 1));
        assertTrue(OrdonnanceClientSaisie.valider(o, JOUR).isEmpty());
    }

    @Test
    public void uneLigneQuiPorteUnePosologieMaisPasDeProduitEstRefusee() {
        // Elle n'est PAS vide : quelqu'un a commence a la remplir, et taire l'oubli ferait perdre l'information
        JSONObject o = valide();
        o.getJSONArray("produits").put(new JSONObject().put("posologie", "2 cp le soir"));
        assertTrue(OrdonnanceClientSaisie.valider(o, JOUR).toString().contains("nommé"));
    }

    @Test
    public void uneQuantiteNulleOuNegativeEstRefusee() {
        JSONObject o = valide();
        o.getJSONArray("produits").getJSONObject(0).put("quantite", 0);
        assertTrue(OrdonnanceClientSaisie.valider(o, JOUR).toString().contains("quantité"));
        o.getJSONArray("produits").getJSONObject(0).put("quantite", -3);
        assertTrue(OrdonnanceClientSaisie.valider(o, JOUR).toString().contains("quantité"));
    }

    @Test
    public void leProduitSaisiLibrementEstAccepte() {
        // Le coeur du choix fait avec l'officine : un produit prescrit mais non tenu doit pouvoir etre enregistre
        JSONObject o = new JSONObject().put("clientId", "C").put("dateOrdonnance", "2026-09-18").put("produits",
                new JSONArray().put(new JSONObject().put("libelle", "SIROP NON REFERENCE").put("quantite", 1)));
        assertTrue(OrdonnanceClientSaisie.valider(o, JOUR).isEmpty());
    }

    @Test
    public void lePrescripteurEtLEtablissementNeSontPasObligatoires() {
        // « le prescripteur et l'etablissement de sante, SI DISPONIBLES » : une ordonnance au tampon illisible
        // doit pouvoir etre saisie, sinon elle ne le sera pas du tout
        assertTrue(OrdonnanceClientSaisie.valider(valide(), JOUR).isEmpty());
    }

    @Test
    public void aucuneDonneeDuToutEstRefuseSansExploser() {
        assertFalse(OrdonnanceClientSaisie.valider(null, JOUR).isEmpty());
    }

    @Test
    public void laDateSeLitEnIsoAvecOuSansHeure() {
        assertEquals(LocalDate.of(2026, 9, 18), OrdonnanceClientSaisie.date("2026-09-18"));
        // Les datefield ExtJS envoient parfois l'heure avec la date
        assertEquals(LocalDate.of(2026, 9, 18), OrdonnanceClientSaisie.date("2026-09-18T00:00:00"));
        assertNull(OrdonnanceClientSaisie.date(null));
        assertNull(OrdonnanceClientSaisie.date("  "));
        assertNull(OrdonnanceClientSaisie.date("18/09/2026"));
    }

    @Test
    public void leNumeroEstLisibleEtMensuel() {
        assertEquals("ORD-202609-0001", OrdonnanceClientSaisie.numero(JOUR, 1));
        assertEquals("ORD-202609-0042", OrdonnanceClientSaisie.numero(JOUR, 42));
        assertEquals("ORD-202601-0007", OrdonnanceClientSaisie.numero(LocalDate.of(2026, 1, 31), 7));
    }

    @Test
    public void laSequenceRepartAUnChaqueMois() {
        assertEquals(1, OrdonnanceClientSaisie.sequenceSuivante(null));
        assertEquals(1, OrdonnanceClientSaisie.sequenceSuivante(""));
        assertEquals(2, OrdonnanceClientSaisie.sequenceSuivante("ORD-202609-0001"));
        assertEquals(43, OrdonnanceClientSaisie.sequenceSuivante("ORD-202609-0042"));
    }

    @Test
    public void unNumeroInattenduNeFaitPasEchouerLEnregistrement() {
        // Format ancien ou saisie manuelle : on repart de 1 plutot que de refuser d'enregistrer le document
        assertEquals(1, OrdonnanceClientSaisie.sequenceSuivante("ORDONNANCE"));
        assertEquals(1, OrdonnanceClientSaisie.sequenceSuivante("ORD-202609-ABCD"));
    }

    @Test
    public void laTroncatureRespecteLesColonnes() {
        String longue = new String(new char[200]).replace('\0', 'x');
        assertEquals(OrdonnanceClientSaisie.MAX_LIBELLE,
                OrdonnanceClientSaisie.tronquer(longue, OrdonnanceClientSaisie.MAX_LIBELLE).length());
        assertEquals("DOLIPRANE", OrdonnanceClientSaisie.tronquer("  DOLIPRANE  ", 150));
        assertNull(OrdonnanceClientSaisie.tronquer(null, 150));
    }
}
