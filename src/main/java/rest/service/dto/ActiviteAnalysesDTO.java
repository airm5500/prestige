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
    /** critere de duree retenu (retour du 24/10) */
    private String seuilOperateur;
    private int seuilMinutes;
    private String seuilLibelle;
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
    /** graphique des ventes longues : 15 operateurs puis « Autres » (total = tuile) */
    @Builder.Default
    private List<Operateur> longues = new ArrayList<>();
    /** plan du 08/11, points 15.5 et 15.7 : vitesse par type de vente (comptant, assurance, carnet, depot, avoir) */
    @Builder.Default
    private List<Operateur> typesVente = new ArrayList<>();
    /** plan du 08/11, point 15.4 : classement des vendeurs en preventes */
    @Builder.Default
    private List<Prevente> preventes = new ArrayList<>();
    /** plan du 08/11, point 15.3 : vitesse des caissieres, de la prise en caisse a l'encaissement */
    @Builder.Default
    private List<VitesseCaissiere> vitesseCaissieres = new ArrayList<>();
    @Builder.Default
    private List<Grossiste> grossistes = new ArrayList<>();
    @Builder.Default
    private List<Tranche> retardBl = new ArrayList<>();
    @Builder.Default
    private List<Sensible> sensibles = new ArrayList<>();
    @Builder.Default
    private List<Repartition> repartition = new ArrayList<>();
    /**
     * Plan avoir du 08/11, point 1 : chiffres repris par la carte « Activité des équipes » du tableau de bord et par
     * les titres des cartes du menu (meme valeur partout).
     */
    private Resume resume;

    /** Plan avoir du 08/11, point 1 : resume de la periode. */
    @NoArgsConstructor
    @AllArgsConstructor
    @ToString
    @Builder
    @Getter
    @Setter
    public static class Resume {

        /** ventes retenues par le critere de duree (plus de 10 min par defaut) */
        private long ventesLongues;
        private String seuilLibelle;
        /** annulations + modifications de ventes */
        private long actionsSensibles;
        private long annulations;
        private long modifications;
        /** ecart moyen, en jours, entre la livraison et l'entree du BL ; null sans BL date */
        private Double delaiMoyenBl;
        private long blMesures;
        /** operateur au plus petit temps par ligne (au moins {@code VENTES_MIN_RAPIDE} ventes) ; null sinon */
        private String plusRapideId;
        private String plusRapideNom;
        private Double plusRapideSecondesParLigne;
        private long plusRapideVentes;
        /** constats de niveau ALERTE et le titre du premier */
        private long alertes;
        private String premiereAlerte;
    }

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
        /** Plan du 08/11, point 15.2 : grossistes de la tranche (nombre de BL, delai moyen en jours). */
        @Builder.Default
        private List<RetardGrossiste> grossistes = new ArrayList<>();
    }

    /**
     * Plan du 08/11, point 15.3 : une caissiere. Preventes encaissees (vendeur different) et leur CA ; mesurees :
     * celles dont la prise en caisse est connue, duree de 0 a 1 h ; temps moyen et median en secondes, de la prise en
     * caisse a l'encaissement.
     */
    @NoArgsConstructor
    @AllArgsConstructor
    @ToString
    @Builder
    @Getter
    @Setter
    public static class VitesseCaissiere {

        private String id;
        private String nom;
        private long encaissees;
        private long chiffreAffaires;
        private long mesurees;
        private long tempsMoyen;
        private long tempsMedian;
    }

    /** Plan du 08/11, point 15.2 : un grossiste dans une tranche de delai de saisie des BL. */
    @NoArgsConstructor
    @AllArgsConstructor
    @ToString
    @Builder
    @Getter
    @Setter
    public static class RetardGrossiste {

        private String nom;
        private long bl;
        /** Ecart moyen en jours entre la livraison et l'entree du BL ; null sans date de livraison. */
        private Double delaiMoyen;
    }

    /**
     * Plan du 08/11, point 15.4 : preventes d'un vendeur (vente saisie par lui, encaissee par un autre) : encaissees,
     * CA et lignes des encaissees, annulees (hors modifications), abandonnees (restees en attente apres le jour de
     * saisie), taux d'annulees et abandonnees sur le total.
     */
    @NoArgsConstructor
    @AllArgsConstructor
    @ToString
    @Builder
    @Getter
    @Setter
    public static class Prevente {

        private String id;
        private String nom;
        private long encaissees;
        private long chiffreAffaires;
        private long lignes;
        private long annulees;
        private long abandonnees;
        private long total;
        private double lignesParPrevente;
        /** (annulees + abandonnees) / total, en % (une decimale) */
        private double taux;
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
