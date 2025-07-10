package rest.service.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

/**
 *
 * @author koben
 */
@Getter
@Setter
@Builder
public class UserCaisseDataDTO {

    private String caisseId;
    private String resumeCaisseId;
    private long solde;
    private String userId;
    private String userFullName;
    private String createAt;
    private String updateAt;
    private int cashFund;
    private boolean display;
    private long totalAmount;

}
