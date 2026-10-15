package rest.service.mobile.lecture;

import org.json.JSONArray;

/**
 * O5 : fournisseur de lecture avancee (interchangeable). Recoit l'image JPEG de la ZONE DES MEDICAMENTS deja recadree
 * et masquee par le telephone ; renvoie seulement les lignes de medicaments. Ne garde jamais l'image.
 */
public interface FournisseurLecture {

    /** Resultat d'une lecture : lignes {nom, dosage, forme, posologie, quantite, confiance} et jetons consommes. */
    final class Resultat {
        public final JSONArray lignes;
        public final long jetonsEntree;
        public final long jetonsSortie;

        public Resultat(JSONArray lignes, long jetonsEntree, long jetonsSortie) {
            this.lignes = lignes;
            this.jetonsEntree = jetonsEntree;
            this.jetonsSortie = jetonsSortie;
        }
    }

    /** Echec de lecture (motif sans donnee de l'ordonnance) ; {@code delai} : delai depasse. */
    final class Echec extends Exception {
        private static final long serialVersionUID = 1L;
        public final boolean delai;

        public Echec(String motif, boolean delai) {
            super(motif);
            this.delai = delai;
        }
    }

    Resultat lire(byte[] jpeg, LectureAvanceeConfiguration config) throws Echec;

    /** Fournisseur de la configuration (null : aucun). */
    static FournisseurLecture pour(LectureAvanceeConfiguration config) {
        switch (config.fournisseur()) {
        case LectureAvanceeConfiguration.CLAUDE:
            return new FournisseurClaude();
        case LectureAvanceeConfiguration.GOOGLE:
            return new FournisseurGoogleVision();
        default:
            return null;
        }
    }
}
