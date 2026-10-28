package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import commonTasks.dto.ClientDTO;
import commonTasks.dto.TiersPayantParams;
import java.util.Arrays;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Demande du 28/10 (point 9) : pourcentage d'un tiers payant de vente assurance entre 0 et 100 %. */
class TauxTiersPayantTest {

    private static TiersPayantParams tp(String nom, int taux) {
        TiersPayantParams t = new TiersPayantParams();
        t.setTpFullName(nom);
        t.setTaux(taux);
        return t;
    }

    @Test
    @DisplayName("Principal et complementaires jusqu'a 100 % : acceptes")
    void accepte() {
        ClientDTO c = new ClientDTO();
        c.setIntPOURCENTAGE(100);
        c.setTiersPayants(Arrays.asList(tp("MUGEFCI", 20), tp("CARNET", 100)));
        assertNull(ClientServiceImpl.controleTauxTiersPayants(c));
        c.setIntPOURCENTAGE(null);
        assertNull(ClientServiceImpl.controleTauxTiersPayants(c), "pourcentage absent : non controle ici");
    }

    @Test
    @DisplayName("Principal au-dela de 100 % : refuse, message explicite")
    void principalRefuse() {
        ClientDTO c = new ClientDTO();
        c.setIntPOURCENTAGE(120);
        String msg = ClientServiceImpl.controleTauxTiersPayants(c);
        assertNotNull(msg);
        assertTrue(msg.contains("120 %") && msg.contains("100 %"), msg);
    }

    @Test
    @DisplayName("Complementaire au-dela de 100 % ou negatif : refuse, organisme nomme")
    void complementaireRefuse() {
        ClientDTO c = new ClientDTO();
        c.setIntPOURCENTAGE(80);
        c.setTiersPayants(Arrays.asList(tp("MUGEFCI", 150)));
        String msg = ClientServiceImpl.controleTauxTiersPayants(c);
        assertNotNull(msg);
        assertTrue(msg.contains("MUGEFCI") && msg.contains("150 %"), msg);
        c.setTiersPayants(Arrays.asList(tp("MUGEFCI", -5)));
        assertNotNull(ClientServiceImpl.controleTauxTiersPayants(c));
    }
}
