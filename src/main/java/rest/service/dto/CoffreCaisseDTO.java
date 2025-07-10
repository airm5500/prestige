package rest.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 *
 * @author koben
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CoffreCaisseDTO {

    private String id;
    private String statut;
    private String userId;
    private String userFullName;
    private String createAt;
    private String updateAt;
    private int amount;
    private boolean hidden;
    private String createdByFullName;
    private String firstName;
    private String lastName;
    private boolean inUse;
    private String emplacement;

}
