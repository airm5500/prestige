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
}
