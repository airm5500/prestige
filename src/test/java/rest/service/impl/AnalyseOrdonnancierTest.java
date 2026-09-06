package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import commonTasks.dto.AnalyseOrdonnancierLigneDTO;
import commonTasks.dto.VenteDTO;
import commonTasks.dto.VenteDetailsDTO;

/**
 * L'analyse du registre de l'ordonnancier.
 *
 * <p>
 * Ce qui est verifie ici tient en une phrase : l'analyse doit compter EXACTEMENT ce que le registre affiche. Une
 * delivrance qui compterait deux fois parce qu'elle porte deux produits, ou une vente sans produit reglemente comptee
 * quand meme, rendraient les chiffres inutilisables -- et personne ne s'en apercevrait, puisqu'ils resteraient
 * plausibles.
 * </p>
 */
class AnalyseOrdonnancierTest {

    private static VenteDetailsDTO produit(String id, String nom, String cip, String tableau, int quantite,
            int montant) {
        VenteDetailsDTO d = new VenteDetailsDTO();
        d.setLgFAMILLEID(id);
        d.setStrNAME(nom);
        d.setIntCIP(cip);
        d.setCodeTableau(tableau);
        d.setIntQUANTITY(quantite);
        d.setIntPRICE(montant);
        return d;
    }

    private static VenteDTO vente(String id, String client, String medecin, String numOrdre,
            VenteDetailsDTO... produits) {
        VenteDTO v = new VenteDTO();
        v.setLgPREENREGISTREMENTID(id);
        v.setClientFullName(client);
        v.setNom(medecin);
        v.setNumOrder(numOrdre);
        v.setItems(new ArrayList<>(Arrays.asList(produits)));
        return v;
    }

    @Test
    @DisplayName("Un registre vide ne rend aucun chiffre plutot que des zeros trompeurs")
    void registreVide() {
        AnalyseOrdonnancier.Resultat r = AnalyseOrdonnancier.analyser(Collections.emptyList(), 10);

        assertEquals(0, r.getDelivrances());
        assertEquals(0, r.getLignes());
        assertTrue(r.getTopProduits().isEmpty());
        assertTrue(r.getTopClients().isEmpty());
        assertTrue(r.getTopMedecins().isEmpty());
        assertEquals(0, AnalyseOrdonnancier.analyser(null, 10).getDelivrances());
    }

    @Test
    @DisplayName("Une delivrance de deux produits reste UNE delivrance")
    void deuxProduitsUneDelivrance() {
        AnalyseOrdonnancier.Resultat r = AnalyseOrdonnancier.analyser(Collections.singletonList(
                vente("V1", "DUPONT JEAN", "DR HOUSE", "9001", produit("P1", "PARACETAMOL", "111", "A", 2, 1000),
                        produit("P2", "CODEINE", "222", "II", 3, 2000))),
                10);

        assertEquals(1, r.getDelivrances(), "deux produits d'une meme vente font une seule delivrance");
        assertEquals(2, r.getLignes());
        assertEquals(5, r.getQuantiteTotale());
        assertEquals(3000, r.getMontantTotal());
        assertEquals(2, r.getProduitsDistincts());
        assertEquals(1, r.getClientsDistincts());
        assertEquals(1, r.getMedecinsDistincts());
        assertEquals(1, r.getTopClients().get(0).getDelivrances());
        assertEquals(1, r.getTopMedecins().get(0).getDelivrances());
    }

    @Test
    @DisplayName("Une vente sans produit reglemente n'entre pas au registre")
    void venteSansProduitReglemente() {
        AnalyseOrdonnancier.Resultat r = AnalyseOrdonnancier.analyser(Arrays.asList(
                vente("V1", "DUPONT", "DR HOUSE", "9001", produit("P1", "PARACETAMOL", "111", "A", 2, 1000)),
                vente("V2", "MARTIN", "DR HOUSE", "9001")), 10);

        assertEquals(1, r.getDelivrances(), "la vente sans produit ne doit pas etre comptee");
        assertEquals(1, r.getClientsDistincts(), "son client non plus");
    }

    @Test
    @DisplayName("Le meme produit vendu plusieurs fois se cumule sur une seule ligne")
    void cumulProduit() {
        AnalyseOrdonnancier.Resultat r = AnalyseOrdonnancier.analyser(
                Arrays.asList(vente("V1", "A", "DR HOUSE", "9001", produit("P1", "PARACETAMOL", "111", "A", 2, 1000)),
                        vente("V2", "B", "DR HOUSE", "9001", produit("P1", "PARACETAMOL", "111", "A", 3, 1500))),
                10);

        assertEquals(1, r.getTopProduits().size());
        assertEquals(5, r.getTopProduits().get(0).getQuantite());
        assertEquals(2500, r.getTopProduits().get(0).getMontant());
        assertEquals(2, r.getTopProduits().get(0).getDelivrances());
    }

    @Test
    @DisplayName("Deux produits homonymes restent deux lignes")
    void homonymesNonFusionnes() {
        AnalyseOrdonnancier.Resultat r = AnalyseOrdonnancier.analyser(Collections
                .singletonList(vente("V1", "A", "DR HOUSE", "9001", produit("P1", "AMOXICILLINE", "111", "A", 1, 100),
                        produit("P2", "AMOXICILLINE", "222", "A", 1, 100))),
                10);

        assertEquals(2, r.getTopProduits().size(), "l'identifiant du produit distingue deux homonymes");
    }

    @Test
    @DisplayName("Le palmares est trie par quantite, le montant departageant les ex aequo")
    void triDuPalmares() {
        AnalyseOrdonnancier.Resultat r = AnalyseOrdonnancier
                .analyser(Arrays.asList(vente("V1", "A", "M", "1", produit("P1", "PEU VENDU", "1", "A", 1, 90000)),
                        vente("V2", "B", "M", "1", produit("P2", "TRES VENDU", "2", "A", 50, 500)),
                        vente("V3", "C", "M", "1", produit("P3", "EX AEQUO CHER", "3", "A", 10, 8000)),
                        vente("V4", "D", "M", "1", produit("P4", "EX AEQUO PAS CHER", "4", "A", 10, 200))), 10);

        List<String> ordre = new ArrayList<>();
        r.getTopProduits().forEach(c -> ordre.add(c.getLibelle()));
        assertEquals(Arrays.asList("TRES VENDU", "EX AEQUO CHER", "EX AEQUO PAS CHER", "PEU VENDU"), ordre);
    }

    @Test
    @DisplayName("La limite coupe le palmares sans changer les indicateurs d'ensemble")
    void limiteDuPalmares() {
        List<VenteDTO> ventes = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            ventes.add(vente("V" + i, "CLIENT " + i, "MEDECIN " + i, String.valueOf(i),
                    produit("P" + i, "PRODUIT " + i, String.valueOf(i), "A", i + 1, 100)));
        }
        AnalyseOrdonnancier.Resultat r = AnalyseOrdonnancier.analyser(ventes, 5);

        assertEquals(5, r.getTopProduits().size());
        assertEquals(5, r.getTopClients().size());
        assertEquals(5, r.getTopMedecins().size());
        assertEquals(12, r.getProduitsDistincts(), "le total distinct reste celui de la periode entiere");
        assertEquals(12, r.getDelivrances());
        assertEquals("PRODUIT 11", r.getTopProduits().get(0).getLibelle());

        assertEquals(12, AnalyseOrdonnancier.analyser(ventes, 0).getTopProduits().size(),
                "une limite nulle garde tout");
    }

    @Test
    @DisplayName("Un client ou un medecin absent est nomme, pas ignore")
    void valeursAbsentesNommees() {
        AnalyseOrdonnancier.Resultat r = AnalyseOrdonnancier.analyser(
                Collections.singletonList(vente("V1", "  ", null, null, produit("P1", "X", "1", "A", 1, 100))), 10);

        assertEquals("Client non renseigné", r.getTopClients().get(0).getLibelle());
        assertEquals("Médecin non renseigné", r.getTopMedecins().get(0).getLibelle());
        assertEquals(1, r.getClientsDistincts(), "une valeur absente reste un regroupement, pas un trou");
    }

    @Test
    @DisplayName("Le complement porte le CIP et le code tableau du produit")
    void complementProduit() {
        AnalyseOrdonnancier.Resultat r = AnalyseOrdonnancier.analyser(Collections
                .singletonList(vente("V1", "A", "M", "9001", produit("P1", "CODEINE", "8074624", "II", 1, 100))), 10);

        assertEquals("8074624 - tableau II", r.getTopProduits().get(0).getComplement());
        assertEquals("9001", r.getTopMedecins().get(0).getComplement(), "le numero d'ordre suit le medecin");
    }

    @Test
    @DisplayName("La mise a plat rend les trois palmares dans l'ordre, section par section")
    void miseAPlat() {
        AnalyseOrdonnancier.Resultat r = AnalyseOrdonnancier
                .analyser(Arrays.asList(vente("V1", "DUPONT", "DR HOUSE", "9001", produit("P1", "X", "1", "A", 2, 100)),
                        vente("V2", "MARTIN", "DR WILSON", "9002", produit("P2", "Y", "2", "C", 1, 50))), 10);
        List<AnalyseOrdonnancierLigneDTO> lignes = AnalyseOrdonnancier.aPlat(r);

        assertEquals(6, lignes.size(), "2 produits + 2 clients + 2 medecins");
        assertEquals(AnalyseOrdonnancier.SECTION_PRODUIT, lignes.get(0).getSection());
        assertEquals(AnalyseOrdonnancier.SECTION_CLIENT, lignes.get(2).getSection());
        assertEquals(AnalyseOrdonnancier.SECTION_MEDECIN, lignes.get(4).getSection());
        assertEquals("X", lignes.get(0).getLibelle());
        assertEquals(Long.valueOf(2L), lignes.get(0).getQuantite());
    }

    @Test
    @DisplayName("Le resume des indicateurs se lit d'un coup d'oeil")
    void resumeIndicateurs() {
        AnalyseOrdonnancier.Resultat r = AnalyseOrdonnancier.analyser(Collections
                .singletonList(vente("V1", "DUPONT", "DR HOUSE", "9001", produit("P1", "X", "1", "A", 2, 1000))), 10);
        String texte = AnalyseOrdonnancier.indicateursTexte(r);

        assertTrue(texte.contains("1 délivrance(s)"), texte);
        assertTrue(texte.contains("1 ligne(s)"), texte);
        assertTrue(texte.contains("2 unité(s)"), texte);
        assertTrue(texte.contains("1000"), texte);
    }
}
