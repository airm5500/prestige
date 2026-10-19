package rest.service.dto;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Onglet « Analyses » du menu « Activité des équipes » : indicateurs, constats d'aide a la decision et une serie par
 * graphique. Les durees sont en secondes. Aucune donnee de client.
 */
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
@Getter
@Setter
public class ActiviteAnalysesDTO {

    private String debut;
    private String fin;
    /** periode precedente de meme duree (comparaison) */
    private String debutPrecedent;
    private String finPrecedent;
    @Builder.Default
    private List<Indicateur> indicateurs = new ArrayList<>();
    @Builder.Default
    private List<Constat> constats = new ArrayList<>();
    @Builder.Default
    private List<Heure> heures = new ArrayList<>();
    @Builder.Default
    private List<Cellule> carte = new ArrayList<>();
    @Builder.Default
    private List<Jour> jours = new ArrayList<>();
    @Builder.Default
    private List<Operateur> operateurs = new ArrayList<>();
    @Builder.Default
    private List<Grossiste> grossistes = new ArrayList<>();
    @Builder.Default
    private List<Tranche> retardBl = new ArrayList<>();
    @Builder.Default
    private List<Sensible> sensibles = new ArrayList<>();
    @Builder.Default
    private List<Repartition> repartition = new ArrayList<>();

    /** Tuile d'indicateur : valeur de la periode, valeur de la periode precedente, evolution en %. */
    @NoArgsConstructor
    @AllArgsConstructor
    @ToString
    @Builder
    @Getter
    @Setter
    public static class Indicateur {

        private String code;
        private String libelle;
        private double valeur;
        private Double precedent;
        /** (valeur - precedent) / precedent * 100, null sans reference */
        private Double evolution;
        /** NOMBRE, DUREE (secondes), MONTANT, POURCENT */
        private String format;
        /** vrai si une hausse est une bonne nouvelle (couleur de la fleche) */
        private boolean hausseFavorable;
        private String aide;
    }

    /** Constat d'aide a la decision : ALERTE, CONSEIL ou INFO. */
    @NoArgsConstructor
    @AllArgsConstructor
    @ToString
    @Builder
    @Getter
    @Setter
    public static class Constat {

        private String niveau;
        private String titre;
        private String texte;
    }

    @NoArgsConstructor
    @AllArgsConstructor
    @ToString
    @Builder
    @Getter
    @Setter
    public static class Heure {

        private int heure;
        private long ventes;
        /** saisie moyenne d'une vente, en secondes */
        private long saisieMoyenne;
    }

    /** Case de la carte d'affluence : jour de la semaine (1 = lundi) et heure. */
    @NoArgsConstructor
    @AllArgsConstructor
    @ToString
    @Builder
    @Getter
    @Setter
    public static class Cellule {

        private int jour;
        private int heure;
        private long ventes;
    }

    /** Charge d'un jour travaille : temps cumule de saisie des ventes et des BL (secondes). */
    @NoArgsConstructor
    @AllArgsConstructor
    @ToString
    @Builder
    @Getter
    @Setter
    public static class Jour {

        /** AAAA-MM-JJ */
        private String date;
        private long ventes;
        private long saisieVentes;
        private long bl;
        private long saisieBl;
    }

    @NoArgsConstructor
    @AllArgsConstructor
    @ToString
    @Builder
    @Getter
    @Setter
    public static class Operateur {

        private String id;
        private String nom;
        private long jours;
        private long ventes;
        private double ventesParJour;
        private double lignesParVente;
        /** saisie par ligne, en secondes */
        private double secondesParLigne;
        private long chiffreAffaires;
        private long panierMoyen;
        /** ventes de plus de 10 minutes */
        private long ventesLongues;
    }

    @NoArgsConstructor
    @AllArgsConstructor
    @ToString
    @Builder
    @Getter
    @Setter
    public static class Grossiste {

        private String nom;
        private long bl;
        private double lignesParBl;
        private double secondesParLigne;
    }

    @NoArgsConstructor
    @AllArgsConstructor
    @ToString
    @Builder
    @Getter
    @Setter
    public static class Tranche {

        private String code;
        private String libelle;
        private long nombre;
    }

    /** Actions sensibles d'un employe : annulations, modifications de ventes, remises accordees. */
    @NoArgsConstructor
    @AllArgsConstructor
    @ToString
    @Builder
    @Getter
    @Setter
    public static class Sensible {

        private String id;
        private String nom;
        private long ventes;
        private long annulations;
        private long modifications;
        private long remises;
        /** annulations pour 1 000 ventes */
        private double tauxAnnulation;
    }

    /** Repartition des taches d'un employe : nombre d'actions par type du journal. */
    @NoArgsConstructor
    @AllArgsConstructor
    @ToString
    @Builder
    @Getter
    @Setter
    public static class Repartition {

        private String id;
        private String nom;
        @Builder.Default
        private Map<String, Long> actions = new LinkedHashMap<>();
    }
}
