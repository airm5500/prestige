
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
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
@Getter
@Setter
public class DoublonsDTO {
    private String id;
    private String libelle;
    private String cip;
    private String codeProduit;
    private String libelleGrossiste;
    private String dateCreation;
    private String dateModification;
    private String statut;
    private int prixAchat;
    private int prixUnitaire;
    private String produitId;

}
