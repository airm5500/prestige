package rest.service;

import java.time.LocalDate;
import java.util.List;
import javax.ejb.Local;
import rest.service.impl.SuiviEquivalence;

/** Suivi equivalence (plan d'octobre, section 9) : produits regroupes par ensemble exact de DCI, en lecture seule. */
@Local
public interface SuiviEquivalenceService {

    /**
     * Les groupes d'equivalents de l'emplacement, avec les ventes de la periode (quantite, chiffre, marge), le stock et
     * la derniere vente de chaque produit.
     */
    List<SuiviEquivalence.Groupe> groupes(LocalDate debut, LocalDate fin, String emplacementId,
            SuiviEquivalence.Criteres criteres);
}
