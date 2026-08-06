package commonTasks.dto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Le DTO du suivi complet doit exposer les nouveaux champs ET conserver le contrat herite du suivi 2 : la grille ExtJS
 * et l'export Excel lisent les deux familles de proprietes sur le meme objet.
 */
public class MvtProduitCompletDTOTest {

    @Test
    public void valeursParDefautANeutres() {
        MvtProduitCompletDTO dto = new MvtProduitCompletDTO();
        assertEquals(0, dto.getQtyVersReserve());
        assertEquals(0, dto.getQtyVersRayon());
        assertEquals(0, dto.getQtyAjustReserve());
        assertEquals(0, dto.getCurrentStockReserve());
        assertEquals(0, dto.getCurrentStockTotal());
    }

    @Test
    public void ajustementReservePeutEtreNegatif() {
        MvtProduitCompletDTO dto = new MvtProduitCompletDTO();
        dto.setQtyAjustReserve(-4);
        assertEquals(-4, dto.getQtyAjustReserve());
    }

    /** Le detail jour par jour du suivi complet copie chaque ligne du suivi general avant d'y greffer la reserve. */
    @Test
    public void constructeurDeCopieReprendLaLigneGenerale() {
        MvtProduitDTO source = new MvtProduitDTO();
        source.setDateOperation(java.time.LocalDate.of(2026, 8, 5));
        source.setStockInit(40);
        source.setStockFinal(25);
        source.setQtyVente(12);
        source.setQtyEntree(3);
        source.setEcartInventaire(-1);

        MvtProduitCompletDTO copie = new MvtProduitCompletDTO(source);

        assertEquals("05/08/2026", copie.getDateOp());
        assertEquals(java.time.LocalDate.of(2026, 8, 5), copie.getDateOperation());
        assertEquals(40, copie.getStockInit());
        assertEquals(25, copie.getStockFinal());
        assertEquals(12, copie.getQtyVente());
        assertEquals(3, copie.getQtyEntree());
        assertEquals(-1, copie.getEcartInventaire());
        assertEquals(0, copie.getQtyVersReserve());
    }

    /**
     * La reponse JSON de /produit/monitoring-complet est construite par reflexion sur les getters (org.json) : les cles
     * attendues par MonitoringArticleComplet.js doivent toutes etre presentes, heritees comme nouvelles.
     */
    @Test
    public void serialisationJsonExposeToutesLesCles() {
        MvtProduitCompletDTO dto = new MvtProduitCompletDTO();
        dto.setProduitId("P1");
        dto.setCip("123456");
        dto.setProduitName("DOLIPRANE 500MG");
        dto.setCurrentStock(30);
        dto.setQtyVente(5);
        dto.setQtyVersReserve(10);
        dto.setQtyVersRayon(6);
        dto.setQtyAjustReserve(-2);
        dto.setCurrentStockReserve(20);
        dto.setCurrentStockTotal(50);

        JSONObject json = new JSONObject(dto);

        // Champs herites du suivi 2
        assertEquals("123456", json.getString("cip"));
        assertEquals("DOLIPRANE 500MG", json.getString("produitName"));
        assertEquals(30, json.getInt("currentStock"));
        assertEquals(5, json.getInt("qtyVente"));
        assertTrue(json.has("qtyEntree"));
        assertTrue(json.has("qtyInv"));
        // Nouveaux champs du suivi complet
        assertEquals(10, json.getInt("qtyVersReserve"));
        assertEquals(6, json.getInt("qtyVersRayon"));
        assertEquals(-2, json.getInt("qtyAjustReserve"));
        assertEquals(20, json.getInt("currentStockReserve"));
        assertEquals(50, json.getInt("currentStockTotal"));
    }
}
