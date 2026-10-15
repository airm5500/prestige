package util.paiements;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import org.json.JSONObject;

/**
 * B3 : agrégateur FACTICE complet (tests, démonstration, formation) : lien « simulateur://… », paiement simulé par
 * {@link #payer} / {@link #refuser} (route réservée aux utilisateurs connectés, active seulement avec ce fournisseur),
 * notification signée HMAC-SHA256 (en-tête {@code X-Simulateur-Signature}) et revérification du statut, exactement
 * comme un vrai fournisseur. Aucun argent ne circule.
 */
public final class SimulateurPaiement implements FournisseurPaiement {

    public static final String ENTETE_SIGNATURE = "X-Simulateur-Signature";

    /** Transactions simulées (mémoire du serveur). */
    private static final Map<String, Etat> ETATS = new ConcurrentHashMap<>();
    private static final Map<String, Integer> MONTANTS = new ConcurrentHashMap<>();

    private final String secret;

    public SimulateurPaiement(String secret) {
        this.secret = secret;
    }

    @Override
    public String code() {
        return "simulateur";
    }

    @Override
    public List<Operateur> operateurs() {
        return Arrays.asList(Operateur.values());
    }

    @Override
    public Creation creer(Demande d) {
        MONTANTS.put(d.transactionId, d.montant);
        ETATS.put(d.transactionId, new Etat(Resultat.EN_ATTENTE, d.montant, d.devise, null, null));
        return new Creation("SIM-" + d.transactionId,
                "simulateur://payer/" + d.transactionId + "?montant=" + d.montant + "&operateur=" + d.operateur.code());
    }

    /** Le client « paie » ; renvoie le corps de la notification (à signer par {@link #signer}). */
    public String payer(String transactionId, Integer montantPaye) {
        Integer m = montantPaye != null ? montantPaye : MONTANTS.get(transactionId);
        ETATS.put(transactionId, new Etat(Resultat.PAYE, m, "XOF", "SIM-OP-" + transactionId, null));
        return new JSONObject().put("transaction_id", transactionId).put("statut", "paye").toString();
    }

    public String refuser(String transactionId) {
        ETATS.put(transactionId,
                new Etat(Resultat.ECHOUE, MONTANTS.get(transactionId), "XOF", null, "Solde insuffisant"));
        return new JSONObject().put("transaction_id", transactionId).put("statut", "echoue").toString();
    }

    public String signer(String corps) {
        return Signatures.hmacHex(secret, corps);
    }

    @Override
    public String lireNotification(String corpsBrut, Function<String, String> entete) {
        if (!Signatures.valide(secret, corpsBrut, entete.apply(ENTETE_SIGNATURE))) {
            return null;
        }
        try {
            String id = new JSONObject(corpsBrut).optString("transaction_id", "");
            return id.isEmpty() ? null : id;
        } catch (RuntimeException e) {
            return null;
        }
    }

    @Override
    public Etat verifier(String transactionId, String refFournisseur) {
        Etat e = ETATS.get(transactionId);
        return e != null ? e : new Etat(Resultat.EN_ATTENTE, null, null, null, "Transaction inconnue du simulateur");
    }

    /** Oublie tout (tests). */
    static void vider() {
        ETATS.clear();
        MONTANTS.clear();
    }
}
