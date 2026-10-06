package rest.service;

import java.time.LocalDate;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 * Nouveau tableau de bord (plan d'octobre, section 8, lot L8) : une lecture par carte, en lecture seule.
 *
 * <p>
 * Les tuiles, la courbe du chiffre d'affaires, les achats par grossiste, les mouvements de caisse, les tops et les
 * encours tiers payants reprennent les FORMULES du tableau de bord actuel ({@code bll.report.Dashboard}) - memes
 * conditions, memes colonnes de date - en acceptant une date au lieu d'« aujourd'hui » : a date du jour, les chiffres
 * sont ceux de l'ancien tableau de bord.
 */
@Local
public interface TableauBordService {

    /** Tuiles : CA net, clients, evolution vs J-7, marge nette, panier moyen, achats (saisie ou date BL), ruptures. */
    JSONObject tuiles(LocalDate jour, boolean achatsDateBl, int joursRupture, String emplacementId);

    /** CA net TTC par mois d'une annee et de la precedente (meme requete que la courbe actuelle). */
    JSONObject evolution(int annee);

    /** Valorisation rayon / reserve, et produits entres il y a plus d'un mois jamais vendus depuis. */
    JSONObject valorisation(String emplacementId);

    /** Encaissements du jour par mode, mobile money detaille par operateur, credit tiers payant. */
    JSONObject encaissements(LocalDate jour, String modesMobileMoney);

    /** Mouvements de caisse du jour (hors ventes), entrees et sorties, solde. */
    JSONObject mouvements(LocalDate jour);

    /** Compteurs des alertes, periodes reglables. */
    JSONObject alertes(int moisPeremption, int joursRupture, int joursRenouvellement, int joursSuggestion,
            String emplacementId);

    /** Liste des produits d'une alerte (ruptures, peremptions, rayon) pour la fenetre de consultation. */
    JSONObject alerteListe(String type, int moisPeremption, int joursRupture, String emplacementId, int limite);

    /** Retours du 06/10 (4) : avec la periode des articles entres (commandes) non vendus, en jours. */
    JSONObject alertes(int moisPeremption, int joursRupture, int joursRenouvellement, int joursSuggestion,
            int joursNonVendus, String emplacementId);

    JSONObject alerteListe(String type, int moisPeremption, int joursRupture, int joursNonVendus, String emplacementId,
            int limite);

    /** Ventes du mois par produit : quantite, CA, marge, taux ; tries par CA (le client retrie par quantite). */
    JSONObject topMois(LocalDate jour, int limite);

    /** Tops du jour (reprise de l'existant) : CA et quantites. */
    JSONObject topJour(LocalDate jour, int limite);

    /** Achats du mois par grossiste (grossistes lus en base). */
    JSONObject grossistes(LocalDate jour, int limite);

    /** CA du mois par emplacement (rayon). */
    JSONObject emplacements(LocalDate jour, int limite);

    /** CA du mois par emplacement ({@code axe} = emplacement) ou par famille d'articles ({@code axe} = famille). */
    JSONObject emplacements(LocalDate jour, int limite, String axe);

    /** Encours tiers payants du mois (factures non reglees), comme la carte actuelle. */
    JSONObject tiersPayants(LocalDate jour, int limite);

    /** Valeur d'un parametre (t_parameters), ou la valeur par defaut. */
    String parametre(String cle, String defaut);

    /** Ventes par tranche de 2 heures : semaine precedente et semaine en cours (retours du 06/10). */
    JSONObject frequentation(LocalDate jour);
}
