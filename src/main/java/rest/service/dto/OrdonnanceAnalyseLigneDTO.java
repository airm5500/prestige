package rest.service.dto;

/**
 * Une ligne de l'edition de l'onglet « Analyse des ordonnances » (22/09).
 *
 * <p>
 * Une seule forme pour les quatre tableaux (prescripteur, etablissement, type de client, produits) : la section et ses
 * en-tetes voyagent avec la ligne, et le modele les imprime en tete de chaque groupe. Les valeurs sont deja mises en
 * forme (« 72,5 % », « — ») : l'imprime dit exactement ce que l'ecran affiche.
 */
public class OrdonnanceAnalyseLigneDTO {

    private final String section;
    private final String[] entetes;
    private final String libelle;
    private final String[] valeurs;

    public OrdonnanceAnalyseLigneDTO(String section, String[] entetes, String libelle, String... valeurs) {
        this.section = section;
        this.entetes = entetes;
        this.libelle = libelle;
        this.valeurs = valeurs;
    }

    private static String case_(String[] t, int i) {
        return t != null && i < t.length && t[i] != null ? t[i] : "";
    }

    public String getSection() {
        return section;
    }

    public String getLibelle() {
        return libelle;
    }

    public String getH0() {
        return case_(entetes, 0);
    }

    public String getH1() {
        return case_(entetes, 1);
    }

    public String getH2() {
        return case_(entetes, 2);
    }

    public String getH3() {
        return case_(entetes, 3);
    }

    public String getH4() {
        return case_(entetes, 4);
    }

    public String getH5() {
        return case_(entetes, 5);
    }

    public String getV1() {
        return case_(valeurs, 0);
    }

    public String getV2() {
        return case_(valeurs, 1);
    }

    public String getV3() {
        return case_(valeurs, 2);
    }

    public String getV4() {
        return case_(valeurs, 3);
    }

    public String getV5() {
        return case_(valeurs, 4);
    }
}
