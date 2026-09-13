package rest.service.dto;

/**
 * Une ligne de l'edition de la balance vente / caisse, nouvelle presentation (retour des tests du 09/09) : la section
 * (Balance, Resume, Clients et ventes, Part dans le chiffre d'affaires, Caisse, TVA), le libelle et jusqu'a six valeurs
 * deja mises en forme. Un seul jeu de lignes, groupe par section, suffit au modele.
 */
public class BalanceEditionLigneDTO {

    private final String section;
    private final int ordreSection;
    private final String libelle;
    private final String[] valeurs;
    private final boolean total;
    private final boolean secondaire;

    public BalanceEditionLigneDTO(String section, int ordreSection, String libelle, boolean total, boolean secondaire,
            String... valeurs) {
        this.section = section;
        this.ordreSection = ordreSection;
        this.libelle = libelle;
        this.total = total;
        this.secondaire = secondaire;
        this.valeurs = new String[6];
        for (int i = 0; i < 6; i++) {
            this.valeurs[i] = valeurs != null && i < valeurs.length && valeurs[i] != null ? valeurs[i] : "";
        }
    }

    public String getSection() {
        return section;
    }

    public int getOrdreSection() {
        return ordreSection;
    }

    /** Cle de groupe : le rang prefixe pour que les sections gardent l'ordre de l'ecran. */
    public String getCleSection() {
        return String.format("%02d|%s", ordreSection, section);
    }

    public String getLibelle() {
        return libelle;
    }

    public boolean isTotal() {
        return total;
    }

    /** Ligne de detail (operateur mobile, entrees / sorties) : rendue en retrait et en gris. */
    public boolean isSecondaire() {
        return secondaire;
    }

    public String getC1() {
        return valeurs[0];
    }

    public String getC2() {
        return valeurs[1];
    }

    public String getC3() {
        return valeurs[2];
    }

    public String getC4() {
        return valeurs[3];
    }

    public String getC5() {
        return valeurs[4];
    }

    public String getC6() {
        return valeurs[5];
    }
}
