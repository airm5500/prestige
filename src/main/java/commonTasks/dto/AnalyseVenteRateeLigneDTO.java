package commonTasks.dto;

import java.io.Serializable;

/**
 * Ligne a plat de l'analyse des ventes ratees, pour l'edition PDF et l'export Excel : chaque section (classements,
 * motifs, evolutions) devient un bloc de lignes de la meme table.
 */
public class AnalyseVenteRateeLigneDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private final String section;
    private final String libelle;
    private final int demandes;
    private final int quantite;
    private final int nonCommandees;

    public AnalyseVenteRateeLigneDTO(String section, String libelle, int demandes, int quantite, int nonCommandees) {
        this.section = section;
        this.libelle = libelle;
        this.demandes = demandes;
        this.quantite = quantite;
        this.nonCommandees = nonCommandees;
    }

    public String getSection() {
        return section;
    }

    public String getLibelle() {
        return libelle;
    }

    public int getDemandes() {
        return demandes;
    }

    public int getQuantite() {
        return quantite;
    }

    public int getNonCommandees() {
        return nonCommandees;
    }
}
