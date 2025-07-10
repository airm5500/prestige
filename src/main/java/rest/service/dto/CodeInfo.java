
package rest.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

/**
 *
 * @author koben
 */

@AllArgsConstructor
@ToString
@Builder
@Getter
@Setter
public class CodeInfo {
    private final String code;
    private final String libelle;
}
