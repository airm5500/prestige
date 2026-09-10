package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import commonTasks.dto.GardeProduitDTO;
import commonTasks.dto.GardeTrancheDTO;
import commonTasks.dto.GardeVenteLigneDTO;

/**
 * L'analyse d'une garde.
 *
 * <p>
 * Deux erreurs seraient invisibles a l'oeil et sont donc verrouillees ici : une vente tombant pile sur une borne de
 * tranche comptee deux fois (ou perdue), et une classe ABC decalee d'un rang parce que le cumul serait lu apres la
 * ligne au lieu d'avant. Dans les deux cas les chiffres resteraient plausibles.
 * </p>
 */
class AnalyseGardeTest {

    private static final LocalDateTime DEBUT = LocalDateTime.of(2026, 9, 5, 20, 0);
    private static final LocalDateTime FIN = LocalDateTime.of(2026, 9, 6, 8, 0);

    private static GardeVenteLigneDTO ligne(String vente, String produit, String libelle, LocalDateTime quand,
            long quantite, long montant) {
        return new GardeVenteLigneDTO(vente, produit, "CIP-" + produit, libelle, quand, quantite, montant);
    }

    // ------------------------------------------------------------------ tranches horaires

    @Test
    @DisplayName("Les tranches partent du debut de la garde, pas de minuit")
    void tranchesAncreesSurLeDebut() {
        List<GardeTrancheDTO> tranches = AnalyseGarde.tranches(LocalDateTime.of(2026, 9, 5, 20, 30),
                LocalDateTime.of(2026, 9, 6, 0, 30), Collections.emptyList(), 2);

        assertEquals(2, tranches.size());
        assertEquals("20h30 - 22h30", tranches.get(0).getLibelle());
        assertEquals("22h30 - 00h30", tranches.get(1).getLibelle());
    }

    @Test
    @DisplayName("Une tranche sans vente est rendue quand meme")
    void trancheCreuseRendue() {
        List<GardeTrancheDTO> tranches = AnalyseGarde.tranches(DEBUT, FIN,
                Collections.singletonList(ligne("V1", "P1", "X", LocalDateTime.of(2026, 9, 5, 20, 30), 1, 100)), 2);

        assertEquals(6, tranches.size(), "12 heures en tranches de 2 heures");
        assertEquals(100, tranches.get(0).getMontant());
        assertEquals(0, tranches.get(1).getMontant(), "une heure creuse est une information, pas un trou");
        assertEquals(0, tranches.get(1).getVentes());
    }

    @Test
    @DisplayName("Une vente pile sur une borne appartient a la tranche qui commence, une seule fois")
    void venteSurLaBorne() {
        List<GardeTrancheDTO> tranches = AnalyseGarde.tranches(DEBUT, FIN,
                Collections.singletonList(ligne("V1", "P1", "X", LocalDateTime.of(2026, 9, 5, 22, 0), 1, 100)), 2);

        assertEquals(0, tranches.get(0).getMontant(), "la borne n'appartient pas a la tranche qui finit");
        assertEquals(100, tranches.get(1).getMontant());
        long total = 0;
        for (GardeTrancheDTO t : tranches) {
            total += t.getMontant();
        }
        assertEquals(100, total, "comptee une fois et une seule");
    }

    @Test
    @DisplayName("Une vente a la seconde de cloture n'est pas perdue")
    void venteALaCloture() {
        List<GardeTrancheDTO> tranches = AnalyseGarde.tranches(DEBUT, FIN,
                Collections.singletonList(ligne("V1", "P1", "X", FIN, 1, 100)), 2);

        long total = 0;
        for (GardeTrancheDTO t : tranches) {
            total += t.getMontant();
        }
        assertEquals(100, total, "sinon elle compte dans les totaux et manque dans les tranches");
        assertEquals(100, tranches.get(tranches.size() - 1).getMontant());
    }

    @Test
    @DisplayName("La derniere tranche est raccourcie plutot que de deborder de la garde")
    void derniereTrancheRaccourcie() {
        List<GardeTrancheDTO> tranches = AnalyseGarde.tranches(LocalDateTime.of(2026, 9, 5, 20, 0),
                LocalDateTime.of(2026, 9, 5, 23, 0), Collections.emptyList(), 2);

        assertEquals(2, tranches.size());
        assertEquals("22h00 - 23h00", tranches.get(1).getLibelle());
        assertEquals(LocalDateTime.of(2026, 9, 5, 23, 0), tranches.get(1).getFin());
    }

    @Test
    @DisplayName("Une tranche compte les ventes distinctes, pas les lignes")
    void ventesDistinctesParTranche() {
        List<GardeTrancheDTO> tranches = AnalyseGarde.tranches(DEBUT, FIN,
                Arrays.asList(ligne("V1", "P1", "X", LocalDateTime.of(2026, 9, 5, 20, 10), 1, 100),
                        ligne("V1", "P2", "Y", LocalDateTime.of(2026, 9, 5, 20, 10), 1, 200),
                        ligne("V2", "P1", "X", LocalDateTime.of(2026, 9, 5, 20, 20), 1, 100)),
                2);

        assertEquals(2, tranches.get(0).getVentes(), "deux produits d'une meme vente font une vente");
        assertEquals(400, tranches.get(0).getMontant());
    }

    @Test
    @DisplayName("Une periode incoherente ne rend aucune tranche")
    void periodeIncoherente() {
        assertTrue(AnalyseGarde.tranches(FIN, DEBUT, Collections.emptyList(), 2).isEmpty());
        assertTrue(AnalyseGarde.tranches(DEBUT, DEBUT, Collections.emptyList(), 2).isEmpty());
        assertTrue(AnalyseGarde.tranches(null, FIN, Collections.emptyList(), 2).isEmpty());
    }

    @Test
    @DisplayName("Une largeur nulle vaut une heure, plutot que de boucler sans fin")
    void largeurNulle() {
        assertEquals(12, AnalyseGarde.tranches(DEBUT, FIN, Collections.emptyList(), 0).size());
        assertEquals(12, AnalyseGarde.tranches(DEBUT, FIN, Collections.emptyList(), -3).size());
    }

    // ------------------------------------------------------------------ classification ABC

    @Test
    @DisplayName("La classe se lit sur le cumul ATTEINT AVANT la ligne")
    void classeLueSurLeCumulPrecedent() {
        // Un seul produit fait 100 % du chiffre : il doit rester en A. Lire le cumul apres la
        // ligne le rangerait en C, ce qui resterait parfaitement plausible a la lecture.
        List<GardeProduitDTO> abc = AnalyseGarde.classifierAbc(
                Collections.singletonList(ligne("V1", "P1", "DOMINANT", DEBUT, 1, 1000)), AnalyseGarde.SEUIL_A_DEFAUT,
                AnalyseGarde.SEUIL_B_DEFAUT);

        assertEquals(1, abc.size());
        assertEquals("A", abc.get(0).getClasse());
        assertEquals(100D, abc.get(0).getCumulPart(), 0.01);
    }

    @Test
    @DisplayName("Les classes se repartissent selon les seuils 80 et 95")
    void repartitionDesClasses() {
        List<GardeVenteLigneDTO> lignes = Arrays.asList(ligne("V1", "P1", "GROS", DEBUT, 1, 800),
                ligne("V2", "P2", "MOYEN", DEBUT, 1, 150), ligne("V3", "P3", "PETIT", DEBUT, 1, 50));
        List<GardeProduitDTO> abc = AnalyseGarde.classifierAbc(lignes, AnalyseGarde.SEUIL_A_DEFAUT,
                AnalyseGarde.SEUIL_B_DEFAUT);

        assertEquals("A", abc.get(0).getClasse(), "cumul avant = 0 %");
        assertEquals("B", abc.get(1).getClasse(), "cumul avant = 80 %");
        assertEquals("C", abc.get(2).getClasse(), "cumul avant = 95 %");
        assertEquals(80D, abc.get(0).getPart(), 0.01);
        assertEquals(95D, abc.get(1).getCumulPart(), 0.01);
    }

    @Test
    @DisplayName("Le meme produit vendu plusieurs fois se cumule sur une seule ligne")
    void cumulParProduit() {
        List<GardeProduitDTO> abc = AnalyseGarde.classifierAbc(
                Arrays.asList(ligne("V1", "P1", "X", DEBUT, 2, 200), ligne("V2", "P1", "X", DEBUT, 3, 300)),
                AnalyseGarde.SEUIL_A_DEFAUT, AnalyseGarde.SEUIL_B_DEFAUT);

        assertEquals(1, abc.size());
        assertEquals(5, abc.get(0).getQuantite());
        assertEquals(500, abc.get(0).getMontant());
        assertEquals(2, abc.get(0).getLignes());
    }

    @Test
    @DisplayName("Deux produits homonymes restent deux lignes")
    void homonymesNonFusionnes() {
        List<GardeProduitDTO> abc = AnalyseGarde.classifierAbc(
                Arrays.asList(ligne("V1", "P1", "AMOXICILLINE", DEBUT, 1, 100),
                        ligne("V1", "P2", "AMOXICILLINE", DEBUT, 1, 100)),
                AnalyseGarde.SEUIL_A_DEFAUT, AnalyseGarde.SEUIL_B_DEFAUT);

        assertEquals(2, abc.size());
    }

    @Test
    @DisplayName("Une garde sans chiffre d'affaires ne range personne en A par division par zero")
    void aucunChiffreAffaires() {
        List<GardeProduitDTO> abc = AnalyseGarde.classifierAbc(
                Collections.singletonList(ligne("V1", "P1", "GRATUIT", DEBUT, 1, 0)), AnalyseGarde.SEUIL_A_DEFAUT,
                AnalyseGarde.SEUIL_B_DEFAUT);

        assertEquals(1, abc.size(), "le produit reste liste");
        assertEquals("", abc.get(0).getClasse(), "mais sans classe, qui n'aurait aucun sens");
        assertEquals(0D, abc.get(0).getPart(), 0.001);
    }

    @Test
    @DisplayName("Une garde vide rend une liste vide")
    void gardeVide() {
        assertTrue(AnalyseGarde.classifierAbc(Collections.emptyList(), 80, 95).isEmpty());
        assertTrue(AnalyseGarde.classifierAbc(null, 80, 95).isEmpty());
    }

    @Test
    @DisplayName("Les seuils sont parametrables, comme ceux de la classification ABC de l'application")
    void seuilsParametrables() {
        List<GardeVenteLigneDTO> lignes = Arrays.asList(ligne("V1", "P1", "GROS", DEBUT, 1, 500),
                ligne("V2", "P2", "AUTRE", DEBUT, 1, 500));
        // Avec un seuil A a 40 %, le second produit (cumul avant = 50 %) bascule hors de A.
        List<GardeProduitDTO> abc = AnalyseGarde.classifierAbc(lignes, 40, 90);

        assertEquals("A", abc.get(0).getClasse());
        assertEquals("B", abc.get(1).getClasse());
    }

    // ------------------------------------------------------------------ indicateurs

    @Test
    @DisplayName("Les indicateurs comptent les ventes distinctes, pas les lignes")
    void indicateursVentesDistinctes() {
        AnalyseGarde.Indicateurs i = AnalyseGarde.indicateurs(DEBUT, FIN,
                Arrays.asList(ligne("V1", "P1", "X", DEBUT, 2, 200), ligne("V1", "P2", "Y", DEBUT, 1, 300),
                        ligne("V2", "P1", "X", DEBUT, 1, 100)));

        assertEquals(2, i.getVentes());
        assertEquals(3, i.getLignes());
        assertEquals(2, i.getProduitsDistincts());
        assertEquals(4, i.getQuantite());
        assertEquals(600, i.getMontant());
        assertEquals(720, i.getDureeMinutes(), "12 heures");
    }

    @Test
    @DisplayName("Le chiffre par heure ramene deux gardes de durees differentes a une base comparable")
    void montantParHeure() {
        List<GardeVenteLigneDTO> lignes = Collections.singletonList(ligne("V1", "P1", "X", DEBUT, 1, 12000));

        AnalyseGarde.Indicateurs nuit = AnalyseGarde.indicateurs(DEBUT, FIN, lignes);
        assertEquals(1000, nuit.getMontantParHeure(), "12 000 sur 12 heures");

        AnalyseGarde.Indicateurs weekend = AnalyseGarde.indicateurs(DEBUT, DEBUT.plusHours(24), lignes);
        assertEquals(500, weekend.getMontantParHeure(), "le meme chiffre sur 24 heures vaut moitie moins");
    }

    @Test
    @DisplayName("Une garde sans duree ne divise pas par zero")
    void dureeNulle() {
        AnalyseGarde.Indicateurs i = AnalyseGarde.indicateurs(DEBUT, DEBUT,
                Collections.singletonList(ligne("V1", "P1", "X", DEBUT, 1, 1000)));

        assertEquals(0, i.getDureeMinutes());
        assertEquals(0, i.getMontantParHeure());
    }

    @Test
    @DisplayName("Une garde sans vente rend des indicateurs a zero, pas une erreur")
    void aucuneVente() {
        AnalyseGarde.Indicateurs i = AnalyseGarde.indicateurs(DEBUT, FIN, new ArrayList<>());

        assertEquals(0, i.getVentes());
        assertEquals(0, i.getMontant());
        assertEquals(720, i.getDureeMinutes(), "la duree reste celle de la garde");
    }
}
