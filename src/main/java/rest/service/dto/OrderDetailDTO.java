package rest.service.dto;

/**
 *
 * @author koben
 */

import lombok.*;

@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
@Getter
@Setter
public class OrderDetailDTO {
    private String familleId;
    private String orderId;
    private String grossisteId;
    private String statut;
    private Integer qte;
    private String itemId;
}
