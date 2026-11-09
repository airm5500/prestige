package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Transmission du 07/11 : retours fournisseurs en attente. Test de coherence (CLAUDE.md) : sur 5 000 enchainements
 * tires au hasard avec une graine fixe (mise en attente, refus, correction, remise en attente, abandon, validation, par
 * l'auteur, un valideur ou un tiers), on verifie a chaque etape que :
 * <ul>
 * <li>le stock ne bouge qu'a la validation, et d'exactement la quantite du retour ;</li>
 * <li>il ne devient jamais negatif (validation refusee si le stock est insuffisant) ;</li>
 * <li>un retour n'est jamais valide deux fois ; un retour refuse ou abandonne ne se valide pas ;</li>
 * <li>seul un retour en attente se refuse, et jamais sans motif ;</li>
 * <li>seuls l'auteur et un valideur corrigent, remettent en attente ou abandonnent un retour refuse ;</li>
 * <li>le compteur du valideur = nombre de retours en attente.</li>
 * </ul>
 */
class RetourEtatsCoherenceTest {

    private static final long GRAINE = 20261107L;

    @Test
    @DisplayName("Transitions nommees : refus, remise en attente, abandon, validation")
    void transitions() {
        assertTrue(RetourEtats.peutValider("is_Process"));
        assertTrue(RetourEtats.peutValider("is_Waiting"));
        assertFalse(RetourEtats.peutValider("is_Refused"));
        assertFalse(RetourEtats.peutValider("is_Abandoned"));
        assertFalse(RetourEtats.peutValider("enable"));
        assertTrue(RetourEtats.peutRefuser("is_Waiting"));
        assertFalse(RetourEtats.peutRefuser("enable"), "un retour valide ne se refuse pas");
        assertFalse(RetourEtats.peutRefuser("is_Refused"));
        assertFalse(RetourEtats.peutRefuser("is_Process"));
        assertTrue(RetourEtats.peutRemettreEnAttente("is_Refused"));
        assertFalse(RetourEtats.peutRemettreEnAttente("is_Waiting"));
        assertTrue(RetourEtats.peutAbandonner("is_Refused"));
        assertFalse(RetourEtats.peutAbandonner("enable"));
        assertNull(RetourEtats.motif("   "));
        assertNull(RetourEtats.motif(null));
        assertEquals("Quantité fausse", RetourEtats.motif("  Quantité fausse "));
        assertEquals(500, RetourEtats.motif("x".repeat(800)).length());
        assertTrue(RetourEtats.peutCorriger("u1", "u1", "u2", false), "auteur");
        assertTrue(RetourEtats.peutCorriger("u2", "u1", "u2", false), "auteur de la mise en attente");
        assertTrue(RetourEtats.peutCorriger("u3", "u1", "u2", true), "valideur");
        assertFalse(RetourEtats.peutCorriger("u3", "u1", "u2", false), "tiers sans droit");
        assertFalse(RetourEtats.peutCorriger("", "", "", false), "sans utilisateur");
        assertEquals("Refusé", RetourEtats.libelle("is_Refused"));
        assertEquals("En attente de validation", RetourEtats.libelle("is_Waiting"));
        assertEquals("Abandonné", RetourEtats.libelle("is_Abandoned"));
        assertEquals("Validé", RetourEtats.libelle("enable"));
        assertTrue(RetourEtats.peutModifierLignes("is_Process"));
        assertTrue(RetourEtats.peutModifierLignes("is_Waiting"));
        assertTrue(RetourEtats.peutModifierLignes("is_Refused"), "correction apres refus");
        assertFalse(RetourEtats.peutModifierLignes("enable"), "le stock est deja sorti");
        assertFalse(RetourEtats.peutModifierLignes("is_Abandoned"), "clos sans suite");
    }

    /** Un retour simule : etat, quantite, auteur, nombre de validations. */
    private static final class Retour {
        String etat = RetourEtats.SAISIE;
        int quantite;
        String auteur;
        int validations;
        int refus;
    }

    @Test
    @DisplayName("5 000 enchainements au hasard (graine fixe) : stock, etats, droits et compteur concordent")
    void enchainements() {
        Random r = new Random(GRAINE);
        int validations = 0, refus = 0, remises = 0, abandons = 0, refusSansMotif = 0, refusDoubles = 0,
                interditsTiers = 0, stockInsuffisant = 0, lignesModifiees = 0, lignesRefusees = 0;
        for (int s = 0; s < 5000; s++) {
            int stock = r.nextInt(30);
            List<Retour> retours = new ArrayList<>();
            int nb = 1 + r.nextInt(4);
            for (int i = 0; i < nb; i++) {
                Retour x = new Retour();
                x.quantite = 1 + r.nextInt(8);
                x.auteur = "auteur" + r.nextInt(3);
                retours.add(x);
            }
            for (int pas = 0; pas < 20; pas++) {
                Retour x = retours.get(r.nextInt(retours.size()));
                String qui = r.nextInt(3) == 0 ? "tiers" : x.auteur;
                boolean valideur = r.nextBoolean();
                int stockAvant = stock;
                String etatAvant = x.etat;
                int quantiteAvant = x.quantite;
                switch (r.nextInt(7)) {
                case 0: // mettre en attente (saisie ou deja en attente)
                    if (RetourEtats.peutValider(x.etat)) {
                        x.etat = RetourEtats.EN_ATTENTE;
                    }
                    break;
                case 1: // refuser (valideur seulement, motif obligatoire)
                    String motif = RetourEtats.motif(r.nextInt(4) == 0 ? " " : "motif " + pas);
                    if (!valideur) {
                        break;
                    }
                    if (motif == null) {
                        refusSansMotif++;
                        break;
                    }
                    if (RetourEtats.peutRefuser(x.etat)) {
                        x.etat = RetourEtats.REFUSE;
                        x.refus++;
                        refus++;
                        if (x.refus > 1) {
                            refusDoubles++;
                        }
                    }
                    break;
                case 2: // corriger : la quantite change (auteur ou valideur, retour refuse)
                case 3: // remettre en attente
                    if (RetourEtats.peutRemettreEnAttente(x.etat)) {
                        if (RetourEtats.peutCorriger(qui, x.auteur, x.auteur, valideur)) {
                            x.quantite = 1 + r.nextInt(8);
                            x.etat = RetourEtats.EN_ATTENTE;
                            remises++;
                        } else {
                            interditsTiers++;
                        }
                    }
                    break;
                case 4: // abandonner
                    if (RetourEtats.peutAbandonner(x.etat) && RetourEtats.peutCorriger(qui, x.auteur, x.auteur,
                            valideur)) {
                        x.etat = RetourEtats.ABANDONNE;
                        abandons++;
                    }
                    break;
                case 5: // modifier une ligne (ajout, quantite, suppression) : jamais apres validation ou abandon
                    if (RetourEtats.peutModifierLignes(x.etat)) {
                        x.quantite = 1 + r.nextInt(8);
                        lignesModifiees++;
                    } else {
                        lignesRefusees++;
                    }
                    break;
                default: // valider (valideur) : tout ou rien, jamais sous zero
                    if (valideur && RetourEtats.peutValider(x.etat)) {
                        if (x.quantite <= stock) {
                            stock -= x.quantite;
                            x.etat = RetourEtats.VALIDE;
                            x.validations++;
                            validations++;
                        } else {
                            stockInsuffisant++;
                        }
                    }
                    break;
                }
                // regles verifiees a chaque etape
                assertTrue(stock >= 0, "stock jamais negatif");
                boolean valideIci = !RetourEtats.VALIDE.equals(etatAvant) && RetourEtats.VALIDE.equals(x.etat);
                assertEquals(valideIci ? stockAvant - x.quantite : stockAvant, stock,
                        "le stock ne bouge qu'a la validation");
                assertTrue(x.validations <= 1, "jamais valide deux fois");
                if (RetourEtats.VALIDE.equals(etatAvant) || RetourEtats.ABANDONNE.equals(etatAvant)) {
                    assertEquals(etatAvant, x.etat, "un retour valide ou abandonne ne change plus");
                    assertEquals(quantiteAvant, x.quantite, "ses lignes non plus");
                }
                long attente = retours.stream().filter(y -> RetourEtats.EN_ATTENTE.equals(y.etat)).count();
                assertEquals(attente, retours.stream().filter(y -> RetourEtats.peutRefuser(y.etat)).count(),
                        "compteur = retours en attente");
            }
        }
        assertTrue(validations > 1000 && refus > 1000 && remises > 300 && abandons > 100 && refusSansMotif > 100
                && refusDoubles > 30 && interditsTiers > 50 && stockInsuffisant > 50 && lignesModifiees > 1000
                && lignesRefusees > 1000, lignesModifiees + " " + lignesRefusees + " " + validations + " " + refus + " "
                        + remises + " " + abandons + " " + refusSansMotif + " " + refusDoubles + " " + interditsTiers
                        + " " + stockInsuffisant);
    }

    @Test
    @DisplayName("Partie 2 de la demande 59 : auteur de l'etat et repartition du tableau de bord, 5 000 retours")
    void auteurEtRepartition() {
        Random r = new Random(GRAINE + 59);
        String[] statuts = { RetourEtats.SAISIE, RetourEtats.EN_ATTENTE, RetourEtats.REFUSE, RetourEtats.ABANDONNE,
                RetourEtats.VALIDE };
        String[] noms = { null, "", "  ", "Alice Kone", "Bruno Diallo", " Chantal Yao " };
        java.util.Map<String, Integer> parCle = new java.util.HashMap<>();
        int valides = 0;
        for (int i = 0; i < 5000; i++) {
            String statut = statuts[r.nextInt(statuts.length)];
            String refusPar = noms[r.nextInt(noms.length)], attentePar = noms[r.nextInt(noms.length)];
            String abandonPar = noms[r.nextInt(noms.length)], validePar = noms[r.nextInt(noms.length)];
            String operateur = noms[r.nextInt(noms.length)];
            String a = RetourEtats.auteur(statut, refusPar, attentePar, abandonPar, validePar, operateur);
            String attendu = RetourEtats.REFUSE.equals(statut) ? refusPar
                    : RetourEtats.EN_ATTENTE.equals(statut) ? attentePar
                    : RetourEtats.ABANDONNE.equals(statut) ? abandonPar
                    : RetourEtats.VALIDE.equals(statut) ? validePar : null;
            String repli = operateur == null ? "" : operateur.trim();
            assertEquals(attendu != null && !attendu.trim().isEmpty() ? attendu.trim() : repli, a, statut);
            assertTrue(a != null && a.equals(a.trim()), "jamais null, jamais d'espace autour");
            if (!RetourEtats.SAISIE.equals(statut)) {
                String cle = RetourFournisseurServiceImpl.cleEtat(statut);
                parCle.merge(cle, 1, Integer::sum);
                if ("valide".equals(cle)) {
                    assertEquals(RetourEtats.VALIDE, statut, "un retour refuse ou abandonne n'est jamais compte valide");
                }
                valides += RetourEtats.VALIDE.equals(statut) ? 1 : 0;
            }
        }
        assertEquals(4, parCle.size(), "quatre etats au tableau de bord");
        assertEquals(valides, (int) parCle.get("valide"));
        assertEquals("attente", RetourFournisseurServiceImpl.cleEtat(RetourEtats.EN_ATTENTE));
        assertEquals("refuse", RetourFournisseurServiceImpl.cleEtat(RetourEtats.REFUSE));
        assertEquals("abandonne", RetourFournisseurServiceImpl.cleEtat(RetourEtats.ABANDONNE));
    }
}
