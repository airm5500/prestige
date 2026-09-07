package rest.service;

import java.io.IOException;
import java.util.List;
import javax.servlet.http.Part;
import org.json.JSONObject;
import rest.service.dto.ModeReglementTDO;

public interface ModeReglementService {

    void addQrCode(String id, Part filePart) throws IOException;

    List<ModeReglementTDO> fetchAll();

    JSONObject fetch();

    /**
     * Clients standards par defaut des modes mobile money (lot 3) : un par mode qui en a un de parametre. Sert au volet
     * « selection rapide » de la fenetre client a la vente.
     */
    JSONObject clientsMobileMoney();

    /** Associe (ou retire si clientId vide) le client standard par defaut d'un mode de reglement. */
    JSONObject setClientDefaut(String modeReglementId, String clientId);

    /**
     * Cree un mode de reglement (type + mode, meme identifiant) et le classe mobile money ou standard. Reponse
     * {success, msg, id}.
     */
    JSONObject creer(String nom, boolean mobileMoney, boolean clientRequis);

    /** Exigence de client du mode (point 12) : pilote l'ouverture du parcours client a la vente. */
    JSONObject setClientRequis(String modeReglementId, boolean clientRequis);
}
