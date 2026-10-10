package etiquetagepro;

/**
 * Etiquetage Pro : zones d'une etiquette. Chaque zone est remplie depuis une colonne du fichier, un texte fixe ou un
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
    DATE("Date imprimée", false, false, "date", "date etiquette", "date impression", "date reception"),
    MENTION("Mention libre", false, false, "mention", "commentaire", "remarque", "note", "rayon", "emplacement");

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
