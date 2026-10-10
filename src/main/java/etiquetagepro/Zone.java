package etiquetagepro;

/**
 * Etiquettage Pro : zones d'une etiquette. Chaque zone est remplie depuis une colonne du fichier, un texte fixe ou un
 * modele (« Lot {Lot} ») ; elle peut etre declaree obligatoire (une ligne sans elle n'est pas imprimee). Le CIP est
 * toujours obligatoire : c'est lui que porte le code.
 */
public enum Zone {

    CIP("CIP", true, true, "cip", "code cip", "cip7", "cip13", "code", "code produit", "code article", "acl",
            "code acl", "ref", "reference"),
    DESIGNATION("Désignation", true, false, "designation", "libelle", "nom", "produit", "article", "description",
            "nom produit", "libelle produit", "denomination"),
    PRIX("Prix", false, false, "prix", "prix de vente", "pv", "prix public", "ppv", "prix vente", "prix ttc", "pu",
            "prix unitaire", "tarif"),
    GROSSISTE("Grossiste", false, false, "grossiste", "fournisseur", "repartiteur", "distributeur", "laboratoire",
            "labo"),
    LOT("Lot", false, false, "lot", "numero de lot", "n lot", "no lot", "num lot", "batch"),
    PEREMPTION("Péremption", false, false, "peremption", "date de peremption", "date peremption", "expiration",
            "date expiration", "exp", "dlu", "date limite"),
    EAN("EAN", false, false, "ean", "ean13", "ean 13", "gtin", "code barre", "code barres", "code ean"),
    NOMBRE("Nombre d'étiquettes", false, false, "nombre", "nombre d etiquettes", "nb", "nb etiquettes", "quantite",
            "qte", "qty", "quantity", "copies", "exemplaires"),
    DATE("Date imprimée", false, false, "date", "date imprimee", "date etiquette", "date impression", "date reception"),
    MENTION("Mention libre", false, false, "mention", "mention libre", "commentaire", "remarque", "note", "rayon",
            "emplacement");

    private final String libelle;
    private final boolean obligatoireParDefaut;
    private final boolean toujoursObligatoire;
    /** titres de colonnes reconnus (normalises : minuscules, sans accent ni ponctuation) */
    private final String[] titres;

    Zone(String libelle, boolean obligatoireParDefaut, boolean toujoursObligatoire, String... titres) {
        this.libelle = libelle;
        this.obligatoireParDefaut = obligatoireParDefaut;
        this.toujoursObligatoire = toujoursObligatoire;
        this.titres = titres;
    }

    public String getLibelle() {
        return libelle;
    }

    public boolean isObligatoireParDefaut() {
        return obligatoireParDefaut;
    }

    public boolean isToujoursObligatoire() {
        return toujoursObligatoire;
    }

    /** Titres de colonnes reconnus automatiquement (sans tenir compte des accents ni des majuscules). */
    public java.util.List<String> getTitres() {
        return java.util.Collections.unmodifiableList(java.util.Arrays.asList(titres));
    }

    /** Valeur d'exemple de la zone, pour le fichier modele. */
    public String exemple() {
        switch (this) {
        case CIP:
            return "8476972";
        case DESIGNATION:
            return "DOLIPRANE 1000MG CPR B/8";
        case PRIX:
            return "1 500";
        case GROSSISTE:
            return "LABOREX";
        case LOT:
            return "A12";
        case PEREMPTION:
            return "03/2028";
        case EAN:
            return "3400930000014";
        case NOMBRE:
            return "2";
        case DATE:
            return "10/10/26";
        default:
            return "Rayon 4";
        }
    }

    /**
     * Fichier modele (CSV, separateur « ; ») : une colonne par zone, titree de son libelle, et deux lignes d'exemple.
     * Lu tel quel, chaque colonne va dans sa zone : on s'en sert pour essayer l'import avant d'apporter un nouveau
     * modele.
     */
    public static String fichierModele() {
        StringBuilder b = new StringBuilder();
        Zone[] z = values();
        for (int i = 0; i < z.length; i++) {
            b.append(i == 0 ? "" : ";").append(z[i].libelle);
        }
        b.append("\r\n");
        for (int l = 0; l < 2; l++) {
            for (int i = 0; i < z.length; i++) {
                String v = z[i].exemple();
                if (l == 1) {
                    v = z[i] == CIP ? "1234567" : z[i] == DESIGNATION ? "EFFERALGAN 500MG CPR EFFV B/16"
                            : z[i] == PRIX ? "1 570" : z[i] == LOT || z[i] == EAN ? "" : v;
                }
                b.append(i == 0 ? "" : ";").append(v);
            }
            b.append("\r\n");
        }
        return b.toString();
    }

    /** Vrai si ce titre de colonne designe cette zone. */
    public boolean reconnait(String titre) {
        String t = Correspondance.normaliser(titre);
        for (String x : titres) {
            if (x.equals(t)) {
                return true;
            }
        }
        return false;
    }

    /** Zone de ce nom (enum ou libelle), sinon null. */
    public static Zone de(String nom) {
        if (nom == null) {
            return null;
        }
        for (Zone z : values()) {
            if (z.name().equalsIgnoreCase(nom.trim()) || z.libelle.equalsIgnoreCase(nom.trim())) {
                return z;
            }
        }
        return null;
    }
}
