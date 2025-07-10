package rest.service.dto;

import java.time.Month;
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
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
@Getter
@Setter
public class StatistiqueProduitAnnuelleDTO {

    private String id;
    private String libelle;
    private String codeCip;
    private int janvier;
    private int fevrier;
    private int mars;
    private int avril;
    private int mai;
    private int juin;
    private int juillet;
    private int aout;
    private int septembre;
    private int octobre;
    private int novembre;
    private int decembre;

}
