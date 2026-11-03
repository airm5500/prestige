package rest.service;

import commonTasks.dto.VenteDetailsDTO;
import dal.PrixReference;
import dal.TPreenregistrement;
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

    /** Journal d'un produit, du plus recent au plus ancien. */
    List<PrixReferenceJournalDTO> journalProduit(String produitId);

}
