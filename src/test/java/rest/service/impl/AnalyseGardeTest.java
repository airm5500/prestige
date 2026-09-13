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

import commonTasks.dto.GardeCommandeDTO;
import commonTasks.dto.GardeKpiDTO;
import commonTasks.dto.GardeVendeurDTO;
import commonTasks.dto.GardeProduitDTO;
import commonTasks.dto.GardeReglementDTO;
import commonTasks.dto.GardeTrancheDTO;
import commonTasks.dto.GardeVenteDTO;
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

    // ------------------------------------------------------------------ tranches sur la periode (08/09)

    @Test
    @DisplayName("Les tranches de la periode sont les heures du jour, cumulees sur tous les jours de la garde")
    void tranchesCumuleesSurLaPeriode() {
        List<GardeVenteLigneDTO> lignes = Arrays.asList(
                ligne("V1", "P1", "X", LocalDateTime.of(2026, 9, 5, 20, 30), 1, 100),
                ligne("V2", "P1", "X", LocalDateTime.of(2026, 9, 6, 21, 15), 2, 300),
                ligne("V3", "P2", "Y", LocalDateTime.of(2026, 9, 7, 3, 0), 1, 50));

        List<GardeTrancheDTO> tranches = AnalyseGarde.tranchesParHeureDuJour(lignes, 2);

        assertEquals(12, tranches.size(), "24 heures en tranches de 2 heures, minuit compris");
        assertEquals("00h - 02h", tranches.get(0).getLibelle());
        assertEquals("20h - 22h", tranches.get(10).getLibelle());
        assertEquals("22h - 00h", tranches.get(11).getLibelle(), "la derniere tranche boucle sur minuit");
        assertEquals(400, tranches.get(10).getMontant(), "deux jours differents, meme heure : meme tranche");
        assertEquals(2, tranches.get(10).getVentes(), "deux clients (ventes distinctes)");
        assertEquals(50, tranches.get(1).getMontant(), "3 h du matin tombe dans 02h - 04h");
        assertEquals(450, tranches.stream().mapToLong(GardeTrancheDTO::getMontant).sum());
    }

    @Test
    @DisplayName("Une largeur qui ne divise pas 24 retombe sur une heure")
    void largeurNonDiviseurDeVingtQuatre() {
        assertEquals(24, AnalyseGarde.tranchesParHeureDuJour(Collections.emptyList(), 5).size());
        assertEquals(24, AnalyseGarde.tranchesParHeureDuJour(Collections.emptyList(), 0).size());
        assertEquals(4, AnalyseGarde.tranchesParHeureDuJour(null, 6).size());
    }

    // ------------------------------------------------------------------ marge (08/09)

    private static GardeVenteLigneDTO ligneAvecCout(String vente, String produit, long quantite, long montant,
            long remise, long tva, long prixAchat) {
        return new GardeVenteLigneDTO(vente, produit, "CIP-" + produit, produit, DEBUT, quantite, montant, remise, tva,
                prixAchat);
    }

    @Test
    @DisplayName("La marge d'une ligne suit la formule de l'analyse ABC : (montant - remise - TVA) - achat x quantite")
    void margeDeLigne() {
        assertEquals(450, ligneAvecCout("V1", "P1", 5, 1000, 100, 150, 60).getMarge());
        assertEquals(-200, ligneAvecCout("V1", "P1", 1, 100, 0, 0, 300).getMarge(), "une marge negative se voit");
        assertEquals(100, ligne("V1", "P1", "X", DEBUT, 1, 100).getMarge(),
                "sans prix d'achat connu, la marge vaut le chiffre : c'est la lecture de l'analyse ABC de l'application");
    }

    @Test
    @DisplayName("La marge se cumule par produit et le taux se lit sur le chiffre")
    void margeCumuleeParProduit() {
        List<GardeProduitDTO> abc = AnalyseGarde.classifierAbc(
                Arrays.asList(ligneAvecCout("V1", "P1", 1, 1000, 0, 0, 600),
                        ligneAvecCout("V2", "P1", 1, 1000, 0, 0, 600)),
                AnalyseGarde.SEUIL_A_DEFAUT, AnalyseGarde.SEUIL_B_DEFAUT);

        assertEquals(800, abc.get(0).getMarge());
        assertEquals(40D, abc.get(0).getTauxMarge(), 0.01);

        AnalyseGarde.Indicateurs i = AnalyseGarde.indicateurs(DEBUT, FIN, Arrays
                .asList(ligneAvecCout("V1", "P1", 1, 1000, 0, 0, 600), ligneAvecCout("V2", "P2", 1, 500, 0, 0, 500)));
        assertEquals(400, i.getMarge());
        assertEquals(400 * 100D / 1500, i.getTauxMarge(), 0.01);
    }

    @Test
    @DisplayName("Sans chiffre, le taux de marge est nul plutot qu'une division par zero")
    void tauxDeMargeSansChiffre() {
        GardeProduitDTO p = new GardeProduitDTO();
        p.setMarge(10);
        assertEquals(0D, p.getTauxMarge(), 0.0);
        assertEquals(0D, AnalyseGarde.indicateurs(DEBUT, FIN, Collections.emptyList()).getTauxMarge(), 0.0);
    }

    // ------------------------------------------------------------------ lecture filtree du classement (08/09)

    private static List<GardeProduitDTO> classement() {
        // Chiffre : GROS 800, MOYEN 150, PETIT 50 -> A, B, C. Quantites et marges dans un autre ordre.
        return AnalyseGarde.classifierAbc(
                Arrays.asList(ligneAvecCout("V1", "GROS", 1, 800, 0, 0, 700),
                        ligneAvecCout("V2", "MOYEN", 10, 150, 0, 0, 5), ligneAvecCout("V3", "PETIT", 4, 50, 0, 0, 10)),
                AnalyseGarde.SEUIL_A_DEFAUT, AnalyseGarde.SEUIL_B_DEFAUT);
    }

    @Test
    @DisplayName("Le filtre par classe ne change pas la classe des produits")
    void filtreParClasse() {
        List<GardeProduitDTO> b = AnalyseGarde.filtrer(classement(), "b", AnalyseGarde.TriProduits.MONTANT, 0);
        assertEquals(1, b.size());
        assertEquals("MOYEN", b.get(0).getLibelle());
        assertEquals("B", b.get(0).getClasse(), "la classe reste celle du classement complet");
        assertEquals(3, AnalyseGarde.filtrer(classement(), "", null, 0).size(), "vide : toutes les classes");
        assertEquals(3, AnalyseGarde.filtrer(classement(), null, null, 0).size());
    }

    @Test
    @DisplayName("Le tri par quantite ou par marge change l'ordre, pas le classement")
    void triParQuantiteOuMarge() {
        List<GardeProduitDTO> parQuantite = AnalyseGarde.filtrer(classement(), "", AnalyseGarde.TriProduits.QUANTITE,
                0);
        assertEquals("MOYEN", parQuantite.get(0).getLibelle(), "10 unites d'abord");
        assertEquals("A", parQuantite.get(2).getClasse(), "GROS reste en A, meme en dernier par quantite");

        List<GardeProduitDTO> parMarge = AnalyseGarde.filtrer(classement(), "", AnalyseGarde.TriProduits.MARGE, 0);
        // marges : GROS 100, MOYEN 150 - 50 = 100, PETIT 50 - 40 = 10 ; a egalite, l'ordre alphabetique
        assertEquals("GROS", parMarge.get(0).getLibelle());
        assertEquals("MOYEN", parMarge.get(1).getLibelle());
        assertEquals("PETIT", parMarge.get(2).getLibelle());
    }

    @Test
    @DisplayName("Les N premiers coupent la liste, jamais le classement")
    void nPremiers() {
        List<GardeProduitDTO> deux = AnalyseGarde.filtrer(classement(), "", AnalyseGarde.TriProduits.MONTANT, 2);
        assertEquals(2, deux.size());
        assertEquals("GROS", deux.get(0).getLibelle());
        assertEquals(3, AnalyseGarde.filtrer(classement(), "", AnalyseGarde.TriProduits.MONTANT, 10).size(),
                "une limite plus grande que la liste rend tout");
        assertEquals(3, AnalyseGarde.filtrer(classement(), "", AnalyseGarde.TriProduits.MONTANT, -1).size());
    }

    @Test
    @DisplayName("Le tri se lit depuis le parametre de l'ecran, sans casse ni surprise")
    void triDepuisLaSaisie() {
        assertEquals(AnalyseGarde.TriProduits.MARGE, AnalyseGarde.TriProduits.depuis(" Marge "));
        assertEquals(AnalyseGarde.TriProduits.QUANTITE, AnalyseGarde.TriProduits.depuis("quantite"));
        assertEquals(AnalyseGarde.TriProduits.MONTANT, AnalyseGarde.TriProduits.depuis("n'importe quoi"));
        assertEquals(AnalyseGarde.TriProduits.MONTANT, AnalyseGarde.TriProduits.depuis(null));
    }

    // ------------------------------------------------------------------ heures tenues et clients (H2)

    @Test
    @DisplayName("Chaque tranche sait combien d'heures de la garde elle a couvertes")
    void heuresCouvertesParTranche() {
        // 36 heures d'affilee, du 5 a 20 h au 7 a 8 h : 20h-22h est tenue deux fois (4 h), la
        // journee du 6 une fois (12h-14h : 2 h), et 8h-10h une seule fois, le 6.
        List<GardeTrancheDTO> tranches = AnalyseGarde.tranchesParHeureDuJour(Collections.emptyList(), 2,
                LocalDateTime.of(2026, 9, 5, 20, 0), LocalDateTime.of(2026, 9, 7, 8, 0));

        assertEquals(4, tranches.get(10).getHeuresCouvertes(), "20h - 22h");
        assertEquals(4, tranches.get(0).getHeuresCouvertes(), "00h - 02h");
        assertEquals(2, tranches.get(6).getHeuresCouvertes(), "12h - 14h, le 6 seulement");
        assertEquals(2, tranches.get(4).getHeuresCouvertes(), "08h - 10h, le 6 seulement : la fin a 8 h est exclue");
        assertEquals(36, tranches.stream().mapToInt(GardeTrancheDTO::getHeuresCouvertes).sum());

        // Une nuit de 20 h a 8 h : la journee n'est pas tenue.
        List<GardeTrancheDTO> nuit = AnalyseGarde.tranchesParHeureDuJour(Collections.emptyList(), 2, DEBUT, FIN);
        assertEquals(0, nuit.get(6).getHeuresCouvertes(), "12h - 14h n'est pas dans une nuit de garde");
        assertEquals(12, nuit.stream().mapToInt(GardeTrancheDTO::getHeuresCouvertes).sum());
    }

    @Test
    @DisplayName("Une heure entamee compte pour sa tranche")
    void heureEntamee() {
        List<GardeTrancheDTO> tranches = AnalyseGarde.tranchesParHeureDuJour(Collections.emptyList(), 1,
                LocalDateTime.of(2026, 9, 5, 20, 30), LocalDateTime.of(2026, 9, 5, 22, 15));
        assertEquals(1, tranches.get(20).getHeuresCouvertes());
        assertEquals(1, tranches.get(21).getHeuresCouvertes());
        assertEquals(1, tranches.get(22).getHeuresCouvertes(), "22h15 entame l'heure de 22 h");
        assertEquals(0, tranches.get(23).getHeuresCouvertes());
    }

    @Test
    @DisplayName("Les clients d'une tranche : le client rattache une fois, une vente anonyme pour un client")
    void clientsParTranche() {
        GardeVenteLigneDTO v1 = ligne("V1", "P1", "X", LocalDateTime.of(2026, 9, 5, 20, 10), 1, 100);
        GardeVenteLigneDTO v2 = ligne("V2", "P2", "Y", LocalDateTime.of(2026, 9, 6, 21, 10), 1, 100);
        GardeVenteLigneDTO v3 = ligne("V3", "P1", "X", LocalDateTime.of(2026, 9, 6, 21, 40), 1, 100);
        v1.setClientId("C1");
        v2.setClientId("C1");
        List<GardeTrancheDTO> tranches = AnalyseGarde.tranchesParHeureDuJour(Arrays.asList(v1, v2, v3), 2,
                LocalDateTime.of(2026, 9, 5, 20, 0), LocalDateTime.of(2026, 9, 7, 8, 0));

        GardeTrancheDTO t = tranches.get(10);
        assertEquals(3, t.getVentes());
        assertEquals(2, t.getClients(), "C1 deux fois = un client, V3 anonyme = un client");
        assertEquals(0.5D, t.getClientsParHeure(), 0.001, "2 clients sur 4 heures tenues");
    }

    // ------------------------------------------------------------------ indicateurs reels (H2)

    private static AnalyseGarde.Indicateurs indicateurs() {
        return AnalyseGarde.indicateurs(DEBUT, FIN, Arrays.asList(ligneAvecCout("V1", "P1", 1, 1000, 0, 0, 600),
                ligneAvecCout("V2", "P2", 1, 5000, 0, 0, 3000), ligneAvecCout("V3", "P1", 1, 1000, 0, 0, 600)));
    }

    @Test
    @DisplayName("Ventes, clients, chiffre et marge viennent des memes lignes que l'ABC")
    void kpiDeBase() {
        List<GardeVenteDTO> ventes = Arrays.asList(new GardeVenteDTO("V1", "C1", "1", 1000, 1000),
                new GardeVenteDTO("V2", "", "1", 5000, 5000), new GardeVenteDTO("V3", "C1", "1", 1000, 1000));
        GardeKpiDTO k = AnalyseGarde.kpi(indicateurs(), ventes, Collections.emptyList(), 2);

        assertEquals(3, k.getVentes());
        assertEquals(2, k.getClients(), "C1 deux fois, et une vente anonyme");
        assertEquals(7000, k.getMontant());
        assertEquals(2800, k.getMarge());
        assertEquals(40D, k.getTauxMarge(), 0.01);
        assertEquals(2, k.getRates());
        assertEquals(0, k.getClientsCredit());
        assertEquals(583, k.getMontantParHeure());
    }

    @Test
    @DisplayName("Le credit : part prise en charge par un tiers, et reglement differe")
    void kpiCredit() {
        List<GardeVenteDTO> ventes = Arrays.asList(
                // Assurance : 5000 dont 1000 au client -> 4000 a credit
                new GardeVenteDTO("V2", "C2", "2", 5000, 1000),
                // Comptant, mais reglee en differe
                new GardeVenteDTO("V1", "C1", "1", 1000, 1000),
                // Comptant, payee
                new GardeVenteDTO("V3", "", "1", 1000, 1000));
        List<GardeReglementDTO> reglements = Arrays.asList(new GardeReglementDTO("V1", "4", 1000),
                new GardeReglementDTO("V3", "1", 1000), new GardeReglementDTO("V2", "1", 1000));
        GardeKpiDTO k = AnalyseGarde.kpi(indicateurs(), ventes, reglements, 0);

        assertEquals(2, k.getClientsCredit(), "V2 (assurance) et V1 (differe)");
        assertEquals(5000, k.getMontantCredit(), "4000 pris en charge + 1000 differe");
        assertEquals(1000, k.getCaDiffere());
        assertEquals(2000, k.getCaEspeces());
    }

    @Test
    @DisplayName("Le chiffre par mode : especes, mobile (tous operateurs), cheque, carte, autres")
    void kpiParMode() {
        List<GardeReglementDTO> reglements = Arrays.asList(new GardeReglementDTO("V1", "1", 100),
                new GardeReglementDTO("V1", "7", 200), new GardeReglementDTO("V2", "8", 300),
                new GardeReglementDTO("V2", "9", 400), new GardeReglementDTO("V3", "10", 500),
                new GardeReglementDTO("V3", "19", 600), new GardeReglementDTO("V4", "2", 700),
                new GardeReglementDTO("V4", "3", 800), new GardeReglementDTO("V5", "6", 900));
        GardeKpiDTO k = AnalyseGarde.kpi(indicateurs(), Collections.emptyList(), reglements, 0);

        assertEquals(100, k.getCaEspeces());
        assertEquals(2000, k.getCaMobile(), "Orange + Moov + MTN + Wave + Djamo");
        assertEquals(700, k.getCaCheque());
        assertEquals(800, k.getCaCarte());
        assertEquals(900, k.getCaAutres(), "virement");
        assertEquals(0, k.getCaDiffere());
    }

    @Test
    @DisplayName("Sans rien, les indicateurs sont a zero, jamais en erreur")
    void kpiVide() {
        GardeKpiDTO k = AnalyseGarde.kpi(null, null, null, -3);
        assertEquals(0, k.getVentes());
        assertEquals(0, k.getClients());
        assertEquals(0, k.getRates(), "un nombre negatif de rates n'existe pas");
        assertEquals(0D, k.getTauxMarge(), 0.0);
        assertEquals(0, k.getMontantParHeure());
    }

    // ------------------------------------------------------------------ vendeurs et commandes (H3)

    @Test
    @DisplayName("Les vendeurs sont classes par chiffre, avec leurs ventes, clients et marge")
    void vendeursClasses() {
        GardeVenteLigneDTO a1 = ligneAvecCout("V1", "P1", 1, 1000, 0, 0, 600);
        GardeVenteLigneDTO a2 = ligneAvecCout("V1", "P2", 1, 500, 0, 0, 100);
        GardeVenteLigneDTO b1 = ligneAvecCout("V2", "P1", 1, 4000, 0, 0, 2000);
        a1.setVendeur("A", "Alice");
        a2.setVendeur("A", "Alice");
        b1.setVendeur("B", "Bob");
        a1.setClientId("C1");
        a2.setClientId("C1");

        List<GardeVendeurDTO> vendeurs = AnalyseGarde.vendeurs(Arrays.asList(a1, a2, b1));

        assertEquals(2, vendeurs.size());
        assertEquals("Bob", vendeurs.get(0).getNom(), "4 000 avant 1 500");
        assertEquals(2000, vendeurs.get(0).getMarge());
        assertEquals(50D, vendeurs.get(0).getTauxMarge(), 0.01);
        GardeVendeurDTO alice = vendeurs.get(1);
        assertEquals(1, alice.getVentes(), "deux lignes, une seule vente");
        assertEquals(1, alice.getClients());
        assertEquals(1500, alice.getMontant());
        assertEquals(800, alice.getMarge());
    }

    @Test
    @DisplayName("Une ligne sans vendeur est rangee a part, jamais perdue")
    void vendeurInconnu() {
        List<GardeVendeurDTO> vendeurs = AnalyseGarde
                .vendeurs(Collections.singletonList(ligne("V1", "P1", "X", DEBUT, 1, 100)));
        assertEquals(1, vendeurs.size());
        assertEquals("(sans vendeur)", vendeurs.get(0).getNom());
        assertEquals(100, vendeurs.get(0).getMontant());
        assertTrue(AnalyseGarde.vendeurs(null).isEmpty());
    }

    @Test
    @DisplayName("Les produits commandes sont rapproches des ventes de la garde, les non vendus en tete")
    void commandesRapprochees() {
        List<GardeCommandeDTO> commandes = Arrays.asList(new GardeCommandeDTO("P1", "C1", "VENDU", 5),
                new GardeCommandeDTO("P2", "C2", "JAMAIS VENDU", 4),
                new GardeCommandeDTO("P3", "C3", "AUTRE NON VENDU", 9));
        List<GardeVenteLigneDTO> lignes = Arrays.asList(ligne("V1", "P1", "VENDU", DEBUT, 2, 100),
                ligne("V2", "P1", "VENDU", DEBUT, 3, 100));

        List<GardeCommandeDTO> resultat = AnalyseGarde.commandesRapprochees(commandes, lignes);

        assertEquals(3, resultat.size());
        assertTrue(resultat.get(0).isNonVendu());
        assertEquals("AUTRE NON VENDU", resultat.get(0).getLibelle(),
                "non vendus d'abord, la plus grosse commande en tete");
        assertEquals("JAMAIS VENDU", resultat.get(1).getLibelle());
        GardeCommandeDTO vendu = resultat.get(2);
        assertEquals(5, vendu.getQuantiteVendue(), "2 + 3 unites vendues pendant la garde");
        assertEquals(false, vendu.isNonVendu());
        assertTrue(AnalyseGarde.commandesRapprochees(null, null).isEmpty());
    }
}
