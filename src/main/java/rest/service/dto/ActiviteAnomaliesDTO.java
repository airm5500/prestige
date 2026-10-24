package rest.service.dto;

import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/** Onglet « Anomalies » d'Activité des équipes (retour du 24/10) : par employe, puis le detail. */
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
@Getter
@Setter
public class ActiviteAnomaliesDTO {

    @Builder.Default
    private List<Ligne> employes = new ArrayList<>();
    @Builder.Default
    private List<Element> anomalies = new ArrayList<>();

    /** Une ligne par employe : refus affiches, operations a risque, erreurs du logiciel (a part), ventes. */
    @NoArgsConstructor
    @AllArgsConstructor
    @ToString
    @Builder
    @Getter
    @Setter
    public static class Ligne {
        private String id;
        private String nom;
        private long ventes;
        private long refus;
        private long annulations;
        private long modifications;
        private long remises;
        private long ventesLongues;
        private long logiciel;
        /** (refus + annulations + modifications) pour 100 ventes ; les erreurs du logiciel ne comptent pas */
        private double pour100;
    }

    /** Une anomalie enregistree ; le fil n'est rendu que par le detail. */
    @NoArgsConstructor
    @AllArgsConstructor
    @ToString
    @Builder
    @Getter
    @Setter
    public static class Element {
        private long id;
        private String date;
        private String employeId;
        private String employe;
        private String famille;
        private String code;
        private String message;
        private String ecran;
        private String poste;
        private List<String> fil;
    }
}
