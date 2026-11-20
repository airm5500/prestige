package fileupload;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dal.OrderDetailLot;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import rest.service.impl.LotsBonLivraison;
import rest.service.impl.UgReception;

/**
 * Plan du 19/11, point 2 : import d'un BL au modele DPCI avec des lignes d'unites gratuites (prix d'achat et prix de
 * vente a 0). Test de coherence : cas du fichier de Pontmain (export_facture_20261118), puis des milliers de fichiers
 * tires au hasard (graine fixe) : lignes payees et lignes d'UG dans tous les ordres, prix differents d'une ligne a
 * l'autre, quantites de 0 a 60.
 * <p>
 * Regles : quantite = somme des payees ; UG = somme des gratuites ; montant = somme des payees x leur prix d'achat,
 * jamais 0 des qu'une ligne payee a un prix ; prix d'achat = celui de la premiere ligne payee, sinon celui de la fiche
 * ; lots : payees et gratuites conservees ; BL : UG = gratuites, recu = payees + gratuites ; stock = payees +
 * gratuites.
 */
class CumulLigneImportCoherenceTest {

    private static final long GRAINE = 20261119L;

    /** Lignes du fichier : {quantite, prix d'achat, prix de vente}. */
    private static CumulLigneImport lire(int[][] lignes, int pafFiche, int prixFiche, List<OrderDetailLot> lots) {
        CumulLigneImport c = null;
        for (int[] l : lignes) {
            boolean ug = CumulLigneImport.estLigneUgDpci(l[1], l[2]);
            int q = ug ? 0 : l[0], g = ug ? l[0] : 0;
            c = c == null ? CumulLigneImport.premiere(q, g, l[1], l[2], pafFiche, prixFiche)
                    : c.ajouter(q, g, l[1], l[2]);
            LotsImport.ajouter(lots, null, null, q, g);
        }
        return c;
    }

    @Test
    @DisplayName("LITACOLD (lignes 10, 19, 53) : 40 + 60 payes, 15 UG")
    void litacold() {
        List<OrderDetailLot> lots = new ArrayList<>();
        CumulLigneImport c = lire(new int[][] { { 40, 1003, 1515 }, { 15, 0, 0 }, { 60, 1003, 1515 } }, 990, 1500,
                lots);
        assertEquals(100, c.getQuantite());
        assertEquals(15, c.getUg());
        assertEquals(100 * 1003, c.getMontant());
        assertEquals(1003, c.getPrixAchat());
        assertEquals(1515, c.getPrixVente());
        assertEquals(1, lots.size());
        assertEquals(100, lots.get(0).getQuantity());
        assertEquals(15, lots.get(0).getQuantityGratuit());
        assertEquals(115, UgReception.quantiteLot(lots.get(0)));
        assertEquals(15, UgReception.gratuitesDesLots(lots));
    }

    @Test
    @DisplayName("NEULORA (22 puis 39) et NEUTROCOLD (63 puis 69) : la ligne d'UG en dernier ne remet plus le montant a 0")
    void ugEnDernier() {
        CumulLigneImport n = lire(new int[][] { { 10, 2735, 4130 }, { 2, 0, 0 } }, 2700, 4100, new ArrayList<>());
        assertEquals(10, n.getQuantite());
        assertEquals(2, n.getUg());
        assertEquals(27350, n.getMontant());
        assertEquals(2735, n.getPrixAchat());
        CumulLigneImport t = lire(new int[][] { { 10, 4560, 6885 }, { 2, 0, 0 } }, 4500, 6800, new ArrayList<>());
        assertEquals(45600, t.getMontant());
        assertEquals(2, t.getUg());
    }

    @Test
    @DisplayName("Ancienne regle (montant = quantite cumulee x PA de la derniere ligne) : 0 pour NEULORA")
    void ancienneRegleFausse() {
        // reproduit l'ancien calcul de FileFormaManager : setIntPRICE(getIntNUMBER() * intPafDetail)
        int quantite = 10 + 2, ancienMontant = quantite * 0;
        assertEquals(0, ancienMontant);
        assertFalse(
                ancienMontant == lire(new int[][] { { 10, 2735, 4130 }, { 2, 0, 0 } }, 2700, 4100, new ArrayList<>())
                        .getMontant());
    }

    @Test
    @DisplayName("Ligne d'UG seule ou lue avant la ligne payee : prix de la fiche, puis celui de la ligne payee")
    void ugAvant() {
        CumulLigneImport seule = lire(new int[][] { { 3, 0, 0 } }, 1200, 1800, new ArrayList<>());
        assertEquals(0, seule.getQuantite());
        assertEquals(3, seule.getUg());
        assertEquals(1200, seule.getPrixAchat());
        assertEquals(1800, seule.getPrixVente());
        assertEquals(0, seule.getMontant());
        CumulLigneImport puis = lire(new int[][] { { 3, 0, 0 }, { 5, 1300, 1950 } }, 1200, 1800, new ArrayList<>());
        assertEquals(1300, puis.getPrixAchat());
        assertEquals(1950, puis.getPrixVente());
        assertEquals(6500, puis.getMontant());
    }

    @Test
    @DisplayName("Fichiers tires au hasard : sommes, montant, prix, lots, BL et stock")
    void hasard() {
        Random r = new Random(GRAINE);
        for (int essai = 0; essai < 20000; essai++) {
            int n = 1 + r.nextInt(6);
            int[][] lignes = new int[n][];
            int payees = 0, gratuites = 0, montant = 0, premierPa = -1, premierPv = -1;
            for (int i = 0; i < n; i++) {
                boolean ug = r.nextInt(3) == 0;
                int q = r.nextInt(61);
                int pa = ug ? 0 : 1 + r.nextInt(9000);
                int pv = ug ? 0 : (r.nextInt(5) == 0 ? 0 : pa + r.nextInt(5000));
                lignes[i] = new int[] { q, pa, pv };
                if (ug) {
                    gratuites += q;
                } else {
                    payees += q;
                    montant += q * pa;
                    if (premierPa < 0 && q > 0) {
                        premierPa = pa;
                        premierPv = pv;
                    }
                }
            }
            int pafFiche = 1 + r.nextInt(9000), prixFiche = pafFiche + r.nextInt(3000);
            List<OrderDetailLot> lots = new ArrayList<>();
            CumulLigneImport c = lire(lignes, pafFiche, prixFiche, lots);
            String m = "essai " + essai;
            assertEquals(payees, c.getQuantite(), m);
            assertEquals(gratuites, c.getUg(), m);
            assertEquals(montant, c.getMontant(), m);
            assertTrue(c.getMontant() >= 0, m);
            assertTrue(payees == 0 || c.getMontant() > 0, m + " : montant a 0 avec des payees");
            assertTrue(c.getPrixAchat() > 0, m + " : prix d'achat a 0");
            if (premierPa > 0) {
                assertEquals(premierPa, c.getPrixAchat(), m);
            }
            assertTrue(c.getPrixVente() > 0, m + " : prix de vente a 0");
            if (premierPv > 0) {
                assertEquals(premierPv, c.getPrixVente(), m);
            }
            // lots de la commande, puis BL et stock (regle de la gestion des entrees)
            assertEquals(payees, lots.stream().mapToInt(OrderDetailLot::getQuantity).sum(), m);
            assertEquals(gratuites, UgReception.gratuitesDesLots(lots), m);
            int lotBl = lots.stream().mapToInt(UgReception::quantiteLot).sum();
            assertEquals(payees + gratuites, lotBl, m);
            Integer entree = LotsBonLivraison.quantiteEntree(lotsBl(lotBl, gratuites), payees, gratuites);
            assertEquals(Integer.valueOf(payees + gratuites), entree, m + " : stock + (payees + UG)");
        }
    }

    private static List<dal.TLot> lotsBl(int quantite, int gratuites) {
        dal.TLot l = new dal.TLot("e2e");
        l.setIntNUMBER(quantite);
        l.setIntNUMBERGRATUIT(gratuites);
        l.setStrSTATUT("enable");
        List<dal.TLot> lots = new ArrayList<>();
        lots.add(l);
        return lots;
    }
}
