package rest.service.impl;

import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.servlet.http.HttpServletRequest;
import rest.Droits;
import rest.SuggestionReserveRessource;

/**
 * Demande 61 : droits dont le controle depend de leur presence en base. Un droit ajoute par une migration n'est
 * controle que s'il existe (actif) dans t_privilege : tant que la migration n'est pas passee, ou si le droit est
 * desactive, le comportement reste celui d'avant le droit. Meme regle que la cloture d'un BL
 * ({@code CommandeServiceImpl.voitSuggestionsReserve}) : web, mobile, cloche et tableau de bord repondent de la meme
 * facon.
 */
@Stateless
public class PrivilegesEnBase {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Vrai si le privilege existe et est actif dans t_privilege. */
    public boolean actif(String privilege) {
        Object n = em
                .createNativeQuery("SELECT COUNT(*) FROM t_privilege WHERE str_NAME = ?1 AND str_STATUT = 'enable'")
                .setParameter(1, privilege).getSingleResult();
        return ((Number) n).longValue() > 0;
    }

    /**
     * Demande 60 et 61 : voir les suggestions de reserve. La session porte P_RESERVE_SUGGESTION, ou ce droit n'existe
     * pas (actif) en base : comme avant la demande 60, tout le monde les voit.
     */
    public boolean voitSuggestionsReserve(HttpServletRequest requete) {
        return Droits.a(requete, SuggestionReserveRessource.P_VOIR_SUGGESTIONS)
                || !actif(SuggestionReserveRessource.P_VOIR_SUGGESTIONS);
    }
}
