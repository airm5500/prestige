package rest.service.impl;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import javax.ejb.ConcurrencyManagement;
import javax.ejb.ConcurrencyManagementType;
import javax.ejb.Singleton;
import org.apache.commons.lang3.StringUtils;

/**
 * Coupe-circuit des envois de SMS.
 *
 * <p>
 * Un operateur distingue deux familles de refus. Ceux qui passeront tout seuls - reseau coupe, quota de la minute
 * atteint, panne chez l'operateur : il faut reessayer. Et ceux qui ne passeront jamais tant que la configuration n'aura
 * pas ete corrigee - contrat non souscrit, identifiants refuses, numero emetteur non autorise. Pour cette seconde
 * famille, chaque nouvelle tentative est identique a la precedente et son resultat est connu d'avance.
 * </p>
 *
 * <p>
 * Sans cette distinction, l'application appelle l'operateur a chaque ticket, a chaque notification, pendant des
 * semaines, et inscrit le meme refus au journal - c'est ainsi qu'une officine a accumule 74 refus POL0001 sans que
 * personne ne sache quoi corriger. Apres {@link #SEUIL} refus consecutifs de configuration, les envois sont suspendus
 * pour {@link #REPOS_MINUTES} minutes et UN evenement porte la consigne exacte. Le premier envoi accepte referme le
 * circuit.
 * </p>
 *
 * <p>
 * La suspension est volontairement temporaire : une configuration corrigee reprend d'elle-meme, sans redemarrage et
 * sans que personne n'ait a se souvenir d'un interrupteur a rearmer.
 * </p>
 *
 * @author koben
 */
@Singleton
@ConcurrencyManagement(ConcurrencyManagementType.CONTAINER)
public class SmsCoupeCircuit {

    /** Nombre de refus de configuration consecutifs avant suspension. */
    static final int SEUIL = 3;

    /** Duree de suspension, en minutes. */
    static final long REPOS_MINUTES = 60L;

    /**
     * Codes pour lesquels reessayer le meme appel ne peut pas aboutir : ils decrivent l'etat du contrat ou des
     * identifiants, pas celui du reseau. Volontairement restreint - un code absent d'ici continue d'etre reessaye,
     * parce qu'une suspension a tort prive l'officine de ses SMS.
     */
    private static final Set<String> CODES_CONFIGURATION = new HashSet<>(Arrays.asList("POL0001", "POL0002", "POL0004",
            "POL0006", "POL0011", "POL1009", "INVALID_CLIENT", "INVALID_GRANT", "HTTP_404"));

    private int refusConsecutifs;
    private String dernierCode;
    private LocalDateTime suspenduJusqua;

    /** Vrai si les envois sont actuellement suspendus. */
    public boolean suspendu() {
        return suspenduJusqua != null && LocalDateTime.now().isBefore(suspenduJusqua);
    }

    /** Instant de reprise, ou {@code null} si le circuit est ferme. */
    public LocalDateTime reprisePrevue() {
        return suspendu() ? suspenduJusqua : null;
    }

    /** Code du dernier refus de configuration constate, pour le message rendu a l'exploitant. */
    public String dernierCode() {
        return dernierCode;
    }

    /**
     * Enregistre un refus.
     *
     * @return vrai UNIQUEMENT au passage qui suspend les envois, de sorte que la consigne soit ecrite une fois et non a
     *         chaque tentative
     */
    public boolean enregistrerRefus(String code) {
        if (!erreurDeConfiguration(code)) {
            // Un refus passager ne doit pas rapprocher le circuit de la coupure : le compteur repart de zero.
            refusConsecutifs = 0;
            return false;
        }
        dernierCode = StringUtils.trimToEmpty(code);
        refusConsecutifs++;
        if (refusConsecutifs >= SEUIL && !suspendu()) {
            suspenduJusqua = LocalDateTime.now().plusMinutes(REPOS_MINUTES);
            return true;
        }
        return false;
    }

    /** Un envoi accepte referme le circuit : la configuration fonctionne. */
    public void enregistrerSucces() {
        refusConsecutifs = 0;
        dernierCode = null;
        suspenduJusqua = null;
    }

    // ------------------------------------------------------------------
    // Regles pures
    // ------------------------------------------------------------------

    /** Vrai si ce code de refus decrit un defaut de configuration, que reessayer ne corrigera pas. */
    static boolean erreurDeConfiguration(String code) {
        String normalise = StringUtils.trimToEmpty(code).toUpperCase(Locale.ROOT);
        return !normalise.isEmpty() && CODES_CONFIGURATION.contains(normalise);
    }

    /**
     * Consigne rendue a l'exploitant : ce qu'il faut verifier chez l'operateur, et non la seule constatation que
     * l'envoi a echoue. Le journal du support est lu par la personne qui exploite l'officine, pas par un developpeur.
     */
    static String consigne(String code, String messageOperateur, int refus) {
        String normalise = StringUtils.trimToEmpty(code).toUpperCase(Locale.ROOT);
        StringBuilder sb = new StringBuilder();
        sb.append("Les envois de SMS sont suspendus ").append(REPOS_MINUTES).append(" minutes : l'operateur a refuse ")
                .append(refus)
                .append(" envois de suite pour un motif de configuration, que reessayer ne corrigerait pas.\n\n");
        sb.append("Code operateur : ").append(normalise.isEmpty() ? "(non communique)" : normalise);
        if (StringUtils.isNotBlank(messageOperateur)) {
            sb.append(" - ").append(messageOperateur.trim());
        }
        sb.append("\n\nA verifier chez l'operateur, dans cet ordre :\n").append(pistes(normalise));
        sb.append("\nLes envois reprennent d'eux-memes des que la configuration est corrigee :"
                + " aucun redemarrage n'est necessaire.");
        return sb.toString();
    }

    private static String pistes(String code) {
        switch (code) {
        case "POL1009":
            return "1. L'application n'est pas souscrite a l'API SMS : souscrire l'offre sur le portail de"
                    + " l'operateur.\n2. Verifier que la cle utilisee appartient bien a cette application.\n";
        case "INVALID_CLIENT":
        case "INVALID_GRANT":
            return "1. Identifiants refuses : reprendre clientId et clientSecret sur le portail de l'operateur et"
                    + " les ressaisir dans la fiche du fournisseur SMS.\n"
                    + "2. Verifier que la cle n'a pas ete revoquee ou regeneree.\n";
        case "HTTP_404":
            return "1. URL d'envoi ou numero emetteur incorrect dans la fiche du fournisseur SMS.\n"
                    + "2. Comparer avec l'adresse indiquee sur le portail de l'operateur.\n";
        default:
            return "1. Le numero emetteur (senderAddress) doit etre celui autorise par le contrat, au format"
                    + " tel:+225XXXXXXXXXX.\n"
                    + "2. Le contrat doit etre en production : une cle de bac a sable n'accepte que les numeros"
                    + " declares en liste blanche.\n" + "3. Le solde ou le forfait SMS doit etre suffisant.\n"
                    + "4. Le numero destinataire doit etre un mobile valide de l'operateur.\n";
        }
    }

    /** Message court de l'evenement, celui que l'exploitant voit dans la liste du Centre de Support. */
    static String messageCourt(String fournisseur, String code) {
        String normalise = StringUtils.trimToEmpty(code).toUpperCase(Locale.ROOT);
        return "Envois SMS suspendus " + REPOS_MINUTES + " min : configuration refusee par "
                + StringUtils.defaultIfBlank(fournisseur, "l'operateur")
                + (normalise.isEmpty() ? "" : " (code " + normalise + ")");
    }
}
