package commonTasks.dto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;

/** Recapitulatif des articles vendus (retour du 02/11) : marge en % du montant vendu. */
public class VenteDetailsDTOMargeTest {

    @Test
    public void margeSurLeMontantVendu() {
        assertEquals(25.0, VenteDetailsDTO.margePourcent(1000, 750));
        assertEquals(33.3, VenteDetailsDTO.margePourcent(3000, 2001));
        assertEquals(0.0, VenteDetailsDTO.margePourcent(500, 500));
    }

    @Test
    public void margeNegativeQuandLAchatDepasseLaVente() {
        assertEquals(-20.0, VenteDetailsDTO.margePourcent(1000, 1200));
    }

    @Test
    public void sansMontantVenduPasDeDivisionParZero() {
        assertEquals(0.0, VenteDetailsDTO.margePourcent(0, 300));
    }
}
