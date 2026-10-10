package etiquetagepro;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Etiquetage Pro : contenu d'un fichier importe (CSV ou Excel), tel que lu. Les colonnes portent les titres de la
 * premiere ligne (ou « Colonne 1 », « Colonne 2 »... si le fichier n'en a pas) ; chaque ligne a autant de cellules que
 * de colonnes (texte, jamais null).
 */
public final class Tableau {

    private final List<String> colonnes;
    private final List<List<String>> lignes;
    /** Classeur Excel : noms des feuilles et feuille lue ; CSV : liste vide. */
    private List<String> feuilles = Collections.emptyList();
    private String feuille;
    /** CSV : separateur et encodage reconnus. */
    private String separateur, encodage;
    /** Lignes ignorees au-dela de la limite. */
    private int lignesIgnorees;

    public Tableau(List<String> colonnes, List<List<String>> lignes) {
        this.colonnes = new ArrayList<>(colonnes);
        this.lignes = new ArrayList<>();
        for (List<String> l : lignes) {
            List<String> c = new ArrayList<>(colonnes.size());
            for (int i = 0; i < colonnes.size(); i++) {
                c.add(i < l.size() && l.get(i) != null ? l.get(i) : "");
            }
            this.lignes.add(c);
        }
    }

    public List<String> getColonnes() {
        return Collections.unmodifiableList(colonnes);
    }

    public List<List<String>> getLignes() {
        return Collections.unmodifiableList(lignes);
    }

    /** Index de la colonne de ce titre (casse, accents et espaces ignores), -1 si absente. */
    public int indexDe(String titre) {
        String cherche = Correspondance.normaliser(titre);
        for (int i = 0; i < colonnes.size(); i++) {
            if (Correspondance.normaliser(colonnes.get(i)).equals(cherche)) {
                return i;
            }
        }
        return -1;
    }

    public List<String> getFeuilles() {
        return feuilles;
    }

    public String getFeuille() {
        return feuille;
    }

    public String getSeparateur() {
        return separateur;
    }

    public String getEncodage() {
        return encodage;
    }

    public int getLignesIgnorees() {
        return lignesIgnorees;
    }

    Tableau classeur(List<String> noms, String lue) {
        this.feuilles = new ArrayList<>(noms);
        this.feuille = lue;
        return this;
    }

    Tableau csv(String sep, String enc) {
        this.separateur = sep;
        this.encodage = enc;
        return this;
    }

    Tableau ignorees(int n) {
        this.lignesIgnorees = n;
        return this;
    }
}
