package commonTasks.dto;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.ArrayList;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import dal.TClient;
import dal.TTypeClient;

/**
 * Client sans type de client : la fiche doit se construire quand meme.
 *
 * Une seule fiche sans type faisait echouer la LISTE ENTIERE des clients (NullPointerException a la construction du
 * DTO, cote serveur), alors que les 700 autres fiches etaient parfaitement valides.
 */
public class ClientDTOTypeAbsentTest {

    private TClient clientSansType() {
        TClient client = new TClient();
        client.setLgCLIENTID("client-test");
        client.setStrFIRSTNAME("KOUTOUAN");
        client.setStrLASTNAME("AWOH MARIE JOSEE");
        client.setLgTYPECLIENTID(null);
        return client;
    }

    private TClient clientAvecType() {
        TClient client = clientSansType();
        TTypeClient type = new TTypeClient();
        type.setLgTYPECLIENTID("6");
        type.setStrNAME("Standard");
        client.setLgTYPECLIENTID(type);
        return client;
    }

    @Test
    @DisplayName("liste des clients : une fiche sans type ne leve plus d'erreur")
    public void ficheSansTypeConstruite() {
        ClientDTO dto = assertDoesNotThrow(() -> new ClientDTO(clientSansType()));
        assertNull(dto.getLibelleTypeClient());
        assertEquals("KOUTOUAN AWOH MARIE JOSEE", dto.getFullName());
    }

    @Test
    @DisplayName("le type est toujours repris quand il est renseigne")
    public void ficheAvecTypeInchangee() {
        ClientDTO dto = new ClientDTO(clientAvecType());
        assertEquals("Standard", dto.getLibelleTypeClient());
    }

    @Test
    @DisplayName("les autres constructeurs supportent aussi l'absence de type")
    public void autresConstructeurs() {
        ClientDTO avecListes = assertDoesNotThrow(
                () -> new ClientDTO(clientSansType(), new ArrayList<>(), new ArrayList<>()));
        assertNull(avecListes.getLgTYPECLIENTID());

        ClientDTO avecType = new ClientDTO(clientAvecType(), new ArrayList<>(), new ArrayList<>());
        assertEquals("6", avecType.getLgTYPECLIENTID());
    }
}
