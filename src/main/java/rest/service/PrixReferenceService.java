package rest.service;

import commonTasks.dto.VenteDetailsDTO;
import dal.PrixReference;
import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import javax.ejb.Local;
import rest.service.dto.PrixReferenceDTO;
import rest.service.dto.PrixReferenceJournalDTO;
import rest.service.dto.ReferenceTpDTO;
import rest.service.dto.SaisieReferenceResultat;

/**
 *
 * @author koben
 */
@Local
public interface PrixReferenceService {

    void add(PrixReferenceDTO prixReferenceDTO);

    void changeStatut(String id, Boolean enabled);

    void delete(String id);

    List<PrixReferenceDTO> getByProduitId(String produitId);

    Optional<PrixReference> getByProduitIdAndTiersPayantId(String produitId, String tiersPayantId);

    Optional<PrixReference> getActifByProduitIdAndTiersPayantId(String produitId, String tiersPayantId);

    void update(PrixReferenceDTO prixReferenceDTO);

    List<PrixReference> getActifByProduitIdAndTiersPayantIds(String produitId, Set<String> tiersPayantId);

    /* ---- cas 2 du 03/11/2026 : saisie a la caisse et journal (Q2.6) ---- */

    /** Vrai si KEY_PRIX_REF_CAISSE vaut 1 : sinon aucun chemin de la caisse n'existe. */
    boolean caisseActive();

    /**
     * Prix et taux de reference de chaque ligne de la vente, pour chacun de ses tiers-payants (valeurs par defaut
     * comprises). Liste vide si la vente est introuvable.
     */
    List<ReferenceTpDTO> referencesPourVente(String venteId);

    /**
     * Pose {@code referencesTp} sur les lignes de la vente, seulement si le parametre est actif et si la vente est une
     * vente assurance ; sinon les lignes restent strictement telles quelles.
     */
    void completerReferencesTp(List<VenteDetailsDTO> lignes, TPreenregistrement vente);

    /**
     * Saisie a la caisse : controle que la ligne appartient a la vente, que la vente est une vente assurance encore
     * ouverte et que le tiers-payant est sur la vente ; bornes reverifiees (entier, prix de 5 au prix de vente de la
     * ligne, taux de 5 a 100). Puis ecrit (ajout ou modification) la reference MIX_TAUX_PRIX du produit pour ce
     * tiers-payant et la journalise avec la vente d'origine.
     */
    SaisieReferenceResultat saisieCaisse(String venteId, String detailId, String tiersPayantId, Integer valeur,
            Integer taux);

    /** Retour du 10/11/2026 : vrai si KEY_PRISE_EN_CHARGE_TOTALE vaut 1. */
    boolean priseEnChargeTotaleActive();

    /**
     * Retour du 10/11/2026 : marque la ligne pour que ce tiers-payant passe en premier et prenne 100 % de sa propre
     * base, pour cette vente seulement (rien n'est ecrit dans les prix de reference). Controle le parametre, que la
     * ligne appartient a une vente assurance encore ouverte, que le tiers-payant est sur la vente et qu'aucun autre
     * n'est deja marque sur la ligne.
     *
     * @return le motif du refus, ou null si la marque est posee (ou l'etait deja)
     */
    String marquerPremier(String venteId, String detailId, String tiersPayantId);

    /**
     * Plan du 06/11, point 5.1 : references actives d'une ligne de vente pour ces tiers-payants, la saisie faite a la
     * caisse sur CETTE vente (pas encore validee) remplacant celle de la fiche article.
     */
    List<PrixReference> referencesDeLaLigneDeVente(TPreenregistrementDetail ligne, Set<String> tiersPayantIds);

    /**
     * Plan du 06/11, point 5.1 : a la cloture de la vente, recopie ses saisies de la caisse sur la fiche article (ajout
     * ou modification, journalisee avec la vente), puis les retire. Renvoie le nombre de saisies recopiees.
     */
    int validerSaisiesVente(String venteId);

    /**
     * Plan du 06/11, point 5.1 : annulation d'une vente close dont les saisies de la caisse ont ete ecrites sur la
     * fiche article. Le prix reste sur la fiche ; une ligne ANNULATION est notee au journal pour chaque couple produit
     * / tiers-payant, avec la valeur actuelle de la fiche. Renvoie le nombre de lignes notees.
     */
    int noterAnnulationVente(String venteId);

    /** Journal d'un produit, du plus recent au plus ancien. */
    List<PrixReferenceJournalDTO> journalProduit(String produitId);

}
