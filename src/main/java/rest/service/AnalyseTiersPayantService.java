package rest.service;

import java.util.List;
import javax.ejb.Local;
import rest.service.dto.AnalyseTiersPayantDTO;

/**
 * Analyse des ventes prises en charge par les tiers payants : quantite, chiffre d'affaires et marge, par tiers payant
 * et par produit, sur une periode.
 *
 * @author koben
 */
@Local
public interface AnalyseTiersPayantService {

    /** Une ligne par tiers payant ayant couvert au moins une vente sur la periode, la plus rentable en tete. */
    List<AnalyseTiersPayantDTO> parTiersPayant(String dtStart, String dtEnd, String recherche);

    /**
     * Une ligne par produit vendu sur la periode dans une vente couverte par un tiers payant.
     *
     * @param tiersPayantId
     *            limite a ce tiers payant ; vide pour tous, les produits etant alors regroupes tous tiers payants
     *            confondus.
     */
    List<AnalyseTiersPayantDTO> parProduit(String dtStart, String dtEnd, String tiersPayantId, String recherche);

    /**
     * Periode reellement analysee : celle qui est demandee, ou le mois en cours quand les bornes recues sont
     * inutilisables. L'etat imprime l'annonce en sous-titre, il ne peut donc pas la deviner de son cote.
     *
     * @return deux dates au format aaaa-mm-jj, debut puis fin incluse.
     */
    String[] periodeRetenue(String dtStart, String dtEnd);
}
