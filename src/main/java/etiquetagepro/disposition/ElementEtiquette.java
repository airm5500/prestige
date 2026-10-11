package etiquetagepro.disposition;

/**
 * Personnalisation des etiquettes : les informations qu'on peut placer sur une etiquette, et le code lui-meme.
 * <p>
 * Chaque information a une police de depart lisible et un minimum en dessous duquel elle n'est plus acceptee ; la
 * designation peut passer sur deux lignes (le nom en machine est souvent long). Pour les codes etendus (DataMatrix+ et
 * QR+), une information peut aussi etre mise « dans le code ».
 */
public enum ElementEtiquette {

    /** Le code (code-barres du CIP, QR, DataMatrix, ou leurs versions etendues). Toujours imprime. */
    CODE("Code", 0f, false, 1, false), PHARMACIE("Nom de la pharmacie", 6.5f, true, 1, true),
    DESIGNATION("Désignation (nom en machine)", 6f, true, 2, true), CIP("CIP", 7f, true, 1, false),
    PRIX("Prix", 9f, true, 1, true), GROSSISTE("Grossiste", 6f, false, 1, true),
    CODE_GEO("Code géo (position)", 6f, true, 1, true), LOT("Lot", 5.5f, false, 1, false),
    PEREMPTION("Péremption", 5.5f, false, 1, false), CODE_UNIQUE("Code de l'étiquette", 6.5f, true, 1, true),
    DATE("Date", 6f, false, 1, false), MENTION("Mention libre", 5.5f, false, 1, false);

    /** Police minimale lisible (pt) : en dessous, la disposition est refusee. */
    public static final float POLICE_MIN = 4.5f;
    /** Police maximale (pt). */
    public static final float POLICE_MAX = 24f;

    private final String libelle;
    private final float policeDefaut;
    private final boolean gras;
    private final int lignesMax;
    /** peut etre mis dans un code etendu (le CIP, le lot et la peremption y sont toujours) */
    private final boolean possibleDansLeCode;

    ElementEtiquette(String libelle, float policeDefaut, boolean gras, int lignesMax, boolean possibleDansLeCode) {
        this.libelle = libelle;
        this.policeDefaut = policeDefaut;
        this.gras = gras;
        this.lignesMax = lignesMax;
        this.possibleDansLeCode = possibleDansLeCode;
    }

    public String getLibelle() {
        return libelle;
    }

    public float getPoliceDefaut() {
        return policeDefaut;
    }

    public boolean isGras() {
        return gras;
    }

    public int getLignesMax() {
        return lignesMax;
    }

    public boolean isPossibleDansLeCode() {
        return possibleDansLeCode;
    }

    public boolean estTexte() {
        return this != CODE;
    }

    /** Element de ce nom, sinon null. */
    public static ElementEtiquette de(String nom) {
        if (nom == null) {
            return null;
        }
        for (ElementEtiquette e : values()) {
            if (e.name().equalsIgnoreCase(nom.trim())) {
                return e;
            }
        }
        return null;
    }
}
