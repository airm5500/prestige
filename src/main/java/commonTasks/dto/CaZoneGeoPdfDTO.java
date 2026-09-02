package commonTasks.dto;

/**
 * Lignes de l'etat PDF « chiffre d'affaires par zone geographique » (point 3) : une ligne par couple (ligne du tableau,
 * tranche) pour le tableau croise, et un point par (serie, tranche) pour la courbe.
 */
public final class CaZoneGeoPdfDTO {

    private CaZoneGeoPdfDTO() {
    }

    /** Une cellule du tableau croise. cleLigne = rang sur 3 chiffres + « | » + libelle, pour garder l'ordre. */
    public static final class Ligne {

        private final String cleLigne;
        private final String cle;
        private final long montant;

        public Ligne(String cleLigne, String cle, long montant) {
            this.cleLigne = cleLigne;
            this.cle = cle;
            this.montant = montant;
        }

        public String getCleLigne() {
            return cleLigne;
        }

        public String getCle() {
            return cle;
        }

        public long getMontant() {
            return montant;
        }
    }

    /** Un point de la courbe. */
    public static final class Point {

        private final String serie;
        private final String categorie;
        private final long valeur;

        public Point(String serie, String categorie, long valeur) {
            this.serie = serie;
            this.categorie = categorie;
            this.valeur = valeur;
        }

        public String getSerie() {
            return serie;
        }

        public String getCategorie() {
            return categorie;
        }

        public long getValeur() {
            return valeur;
        }
    }
}
