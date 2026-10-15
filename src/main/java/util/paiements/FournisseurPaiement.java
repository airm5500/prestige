package util.paiements;

import java.io.IOException;
import java.util.List;
import java.util.function.Function;

/**
 * B3 (Prestige Mobile) : agrégateur de paiement mobile money (CinetPay, Wave Business, simulateur…).
 * <p>
 * Règles communes : les clés secrètes viennent de la configuration du serveur ({@link ConfigPaiements}) et ne sont
 * jamais renvoyées ni journalisées ; une notification n'est crue qu'après vérification de sa signature PUIS
 * revérification du statut auprès de l'API du fournisseur ({@link #verifier}).
 */
public interface FournisseurPaiement {

    /** « simulateur », « cinetpay », « wave » (chemin du webhook : v1/paiements-mobile/notification/{code}). */
    String code();

    /** Opérateurs proposés par ce fournisseur. */
    List<Operateur> operateurs();

    /** Crée la transaction chez le fournisseur : lien de paiement (le QR affiché encode ce lien). */
    Creation creer(Demande d) throws IOException;

    /**
     * Lit une notification : identifiant de NOTRE transaction si la signature est valide, null sinon (notification
     * rejetée). {@code entete} donne la valeur d'un en-tête HTTP (insensible à la casse).
     */
    String lireNotification(String corpsBrut, Function<String, String> entete);

    /** Statut lu auprès de l'API du fournisseur (jamais d'après la notification seule). */
    Etat verifier(String transactionId, String refFournisseur) throws IOException;

    /** Demande de paiement : montant FIXÉ PAR LE SERVEUR (net de la vente). */
    final class Demande {
        public final String transactionId;
        public final int montant;
        public final String devise;
        public final Operateur operateur;
        public final String description;
        public final String urlNotification;
        public final String urlRetour;

        public Demande(String transactionId, int montant, String devise, Operateur operateur, String description,
                String urlNotification, String urlRetour) {
            this.transactionId = transactionId;
            this.montant = montant;
            this.devise = devise;
            this.operateur = operateur;
            this.description = description;
            this.urlNotification = urlNotification;
            this.urlRetour = urlRetour;
        }
    }

    final class Creation {
        public final String refFournisseur;
        public final String lien;

        public Creation(String refFournisseur, String lien) {
            this.refFournisseur = refFournisseur;
            this.lien = lien;
        }
    }

    /** Statut chez le fournisseur. */
    enum Resultat {
        PAYE, ECHOUE, EN_ATTENTE
    }

    final class Etat {
        public final Resultat resultat;
        public final Integer montant;
        public final String devise;
        public final String refOperateur;
        public final String message;

        public Etat(Resultat resultat, Integer montant, String devise, String refOperateur, String message) {
            this.resultat = resultat;
            this.montant = montant;
            this.devise = devise;
            this.refOperateur = refOperateur;
            this.message = message;
        }
    }
}
