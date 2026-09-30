package rest.service.impl;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Regles de la PREVENTE creee depuis une ordonnance client (retour du 30/09), sans base de donnees pour etre
 * verifiables une a une.
 *
 * <ul>
 * <li>Client STANDARD : prevente au comptant, au nom du client.</li>
 * <li>Client ASSURANCE : prevente assurance, avec son tiers payant PRINCIPAL.</li>
 * <li>Client CARNET : prevente carnet, avec son tiers payant principal.</li>
 * </ul>
 * Les autres types (confrere, proprietaire, depot) ne sont pas pris en charge : leur vente suit d'autres regles.
 *
 * <p>
 * Quantite mise en prevente = ce qui RESTE a servir : la quantite prescrite, moins la quantite deja servie quand elle
 * est renseignee. Une ligne n'est ecartee que pour une raison dite a l'operateur : produit hors referentiel, article
 * desactive, deja servie, sans prix, ou stock insuffisant. Rien n'est force : le pharmacien complete la prevente a la
 * caisse s'il le souhaite.
 */
public final class PreventeOrdonnance {

    public static final String TYPE_CLIENT_ASSURANCE = "1";
    public static final String TYPE_CLIENT_CARNET = "2";
    public static final String TYPE_CLIENT_STANDARD = "6";

    public static final String VENTE_COMPTANT = "1";
    public static final String VENTE_ASSURANCE = "2";
    public static final String VENTE_CARNET = "3";

    private PreventeOrdonnance() {
    }

    /** Type de vente de la prevente, ou null si ce client ne peut pas en avoir une (voir {@link #refusClient}). */
    public static String typeVente(String typeClientId, boolean aTiersPayant) {
        if (TYPE_CLIENT_STANDARD.equals(typeClientId)) {
            return VENTE_COMPTANT;
        }
        if (TYPE_CLIENT_ASSURANCE.equals(typeClientId) && aTiersPayant) {
            return VENTE_ASSURANCE;
        }
        if (TYPE_CLIENT_CARNET.equals(typeClientId) && aTiersPayant) {
            return VENTE_CARNET;
        }
        return null;
    }

    /** La raison pour laquelle ce client ne peut pas avoir de prevente, ou null. */
    public static String refusClient(String typeClientId, String libelleType, boolean aTiersPayant) {
        if (typeVente(typeClientId, aTiersPayant) != null) {
            return null;
        }
        if (TYPE_CLIENT_ASSURANCE.equals(typeClientId) || TYPE_CLIENT_CARNET.equals(typeClientId)) {
            return "Ce client n'a aucun tiers payant actif : renseignez-le dans sa fiche avant de créer la prévente.";
        }
        return "Client de type « "
                + (libelleType == null || libelleType.trim().isEmpty() ? "inconnu" : libelleType.trim())
                + " » : la prévente depuis l'ordonnance est prévue pour les clients standard, assurance et carnet.";
    }

    public static String libelleTypeVente(String typeVente) {
        if (VENTE_ASSURANCE.equals(typeVente)) {
            return "Assurance";
        }
        if (VENTE_CARNET.equals(typeVente)) {
            return "Carnet";
        }
        return "Au comptant";
    }

    /** Ce qui reste a servir : prescrite moins servie (servie non renseignee = rien de servi). Jamais negatif. */
    public static int reste(int prescrite, Integer servie) {
        int deja = servie == null ? 0 : servie;
        return Math.max(0, prescrite - deja);
    }

    /** Une ligne de l'ordonnance, avec ce qu'en sait le stock. */
    public static final class Ligne {
        public final String articleId;
        public final String libelle;
        public final int prescrite;
        public final Integer servie;
        public final int stock;
        public final int prix;
        public final boolean actif;

        public Ligne(String articleId, String libelle, int prescrite, Integer servie, int stock, int prix,
                boolean actif) {
            this.articleId = articleId;
            this.libelle = libelle;
            this.prescrite = prescrite;
            this.servie = servie;
            this.stock = stock;
            this.prix = prix;
            this.actif = actif;
        }
    }

    /** Ce qui est decide pour une ligne : sa quantite si elle est retenue, sinon le motif de l'ecart. */
    public static final class Decision {
        public final Ligne ligne;
        public final int quantite;
        public final String motif;

        Decision(Ligne ligne, int quantite, String motif) {
            this.ligne = ligne;
            this.quantite = quantite;
            this.motif = motif;
        }

        public boolean retenue() {
            return motif == null;
        }
    }

    public static Decision decider(Ligne l) {
        if (l.articleId == null || l.articleId.trim().isEmpty()) {
            return new Decision(l, 0, "produit hors référentiel : à ajouter à la main à la caisse");
        }
        if (!l.actif) {
            return new Decision(l, 0, "article désactivé");
        }
        int reste = reste(l.prescrite, l.servie);
        if (reste <= 0) {
            return new Decision(l, 0, "déjà servi");
        }
        if (l.prix <= 0) {
            return new Decision(l, 0, "prix de vente non renseigné");
        }
        if (reste > l.stock) {
            return new Decision(l, 0,
                    "stock insuffisant : " + Math.max(0, l.stock) + " en stock pour " + reste + " à servir");
        }
        return new Decision(l, reste, null);
    }

    /**
     * Toutes les lignes. Un meme produit prescrit sur deux lignes puise dans le MEME stock : la seconde ne voit que ce
     * que la premiere a laisse (la caisse regroupe d'ailleurs les deux dans une seule ligne de vente).
     */
    public static List<Decision> decider(List<Ligne> lignes) {
        if (lignes == null) {
            return Collections.emptyList();
        }
        List<Decision> sortie = new ArrayList<>();
        java.util.Map<String, Integer> pris = new java.util.HashMap<>();
        for (Ligne l : lignes) {
            int dejaPris = l.articleId == null ? 0 : pris.getOrDefault(l.articleId, 0);
            Ligne vue = dejaPris == 0 ? l
                    : new Ligne(l.articleId, l.libelle, l.prescrite, l.servie, l.stock - dejaPris, l.prix, l.actif);
            Decision d = decider(vue);
            sortie.add(new Decision(l, d.quantite, d.motif));
            if (d.retenue()) {
                pris.merge(l.articleId, d.quantite, Integer::sum);
            }
        }
        return sortie;
    }
}
