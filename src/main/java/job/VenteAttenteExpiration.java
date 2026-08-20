package job;

import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.security.PermitAll;
import javax.ejb.EJB;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import rest.service.SalesStatsService;
import rest.service.SupportEventService;

/**
 * Ventes en attente jamais validees : tracabilite au changement de journee.
 *
 * CE QUI SE PASSAIT L'ecran des ventes en attente ne montre que la journee courante (la requete filtre sur
 * {@code dt_UPDATED >= CURDATE()}). Au passage a une nouvelle journee, les ventes restees en attente disparaissaient
 * donc de la liste, et pour l'utilisateur elles etaient "supprimees par le systeme a minuit".
 *
 * En realite RIEN ne les supprimait : elles restaient indefiniment en base avec leurs lignes de detail, simplement
 * invisibles. Aucune trace nulle part, alors qu'un produit retire d'une vente ou une vente supprimee a la main sont,
 * eux, traces dans l'ecran "Suppressions de vente".
 *
 * CE QUI SE PASSE DESORMAIS Chaque vente en attente de la veille est tracee dans "Suppressions de vente" avec ses
 * produits et leurs quantites, sous l'operateur "Systeme", puis reellement supprimee - exactement le traitement
 * applique quand un utilisateur la supprime lui-meme. Le libelle "supprimee" correspond ainsi a ce qui s'est reellement
 * produit.
 *
 * PERIMETRE Seule LA VEILLE est traitee. Les ventes plus anciennes, accumulees depuis des annees sur une installation
 * en exploitation, ne sont pas touchees : les traiter d'un bloc au premier passage aurait produit des milliers de
 * suppressions irreversibles en une seule transaction, sans que personne ait pu en mesurer le volume au prealable.
 *
 * DECLENCHEMENT Passage quotidien peu apres minuit. Le rattrapage d'un serveur eteint a cette heure-la est assure par
 * {@link SupportNightlyCatchUp}, qui porte deja ce mecanisme : inutile d'en ajouter un second.
 *
 * Le traitement est idempotent par construction : une vente traitee n'existe plus, un second passage ne la retrouve
 * pas.
 *
 * @author koben
 */
@Singleton
@PermitAll
public class VenteAttenteExpiration {

    private static final Logger LOG = Logger.getLogger(VenteAttenteExpiration.class.getName());

    /** Code de suivi de fraicheur, lisible dans la surveillance des jobs du Centre de Support. */
    public static final String CODE_JOB = "VENTES_ATTENTE_EXPIREES";

    @EJB
    private SalesStatsService salesStatsService;
    @EJB
    private SupportEventService supportEventService;

    /**
     * 00:10 et non 00:00 : les traitements de changement de journee sont deja nombreux a minuit pile, et rien ici
     * n'exige la seconde precise.
     */
    @Schedule(hour = "0", minute = "10", second = "0", persistent = false)
    public void executer() {
        try {
            int traitees = salesStatsService.supprimerVentesAttenteExpirees();
            LOG.log(Level.INFO, "Ventes en attente de la veille traitees : {0}", traitees);
            supportEventService.recordJobRun(CODE_JOB);
        } catch (Exception e) {
            // Un echec ici ne doit pas empecher les autres traitements de la nuit.
            LOG.log(Level.SEVERE, "traitement des ventes en attente de la veille", e);
        }
    }
}
