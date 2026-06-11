package rest.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 *
 * @author koben
 */
@NoArgsConstructor(force = true)
@AllArgsConstructor
@ToString
@Builder
@Getter
@Setter
public class AchatGrossisteMensuelDTO {

    private final String grossisteId;
    private final String libelle;
    private final long janvier;
    private final long fevrier;
    private final long mars;
    private final long avril;
    private final long mai;
    private final long juin;
    private final long juillet;
    private final long aout;
    private final long septembre;
    private final long octobre;
    private final long novembre;
    private final long decembre;
    private final long total;
}
