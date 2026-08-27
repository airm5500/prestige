package rest.service.impl;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.security.PermitAll;
import javax.ejb.Asynchronous;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.apache.commons.lang3.StringUtils;
import rest.DiagnosticSuggestionLente;
import rest.service.SuggestionLenteurService;
import rest.service.SupportEventService;
import rest.service.dto.SupportEventDTO;

/**
 * Diagnostic des suggestions lentes a l'ouverture.
 *
 * <p>
 * La recherche des doublons parcourt toute la table des lignes de vente : elle n'est lancee que lorsqu'une lenteur a
 * ete <em>reellement constatee</em>, au plus une fois par heure, et seulement si l'index unique qui interdit ces
 * doublons n'est pas encore pose - sinon il ne peut y en avoir, et la question est deja tranchee.
 */
@PermitAll
@Stateless
public class SuggestionLenteurServiceImpl implements SuggestionLenteurService {

    private static final Logger LOG = Logger.getLogger(SuggestionLenteurServiceImpl.class.getName());

    /** Delai minimum entre deux diagnostics : le constat ne change pas d'une minute a l'autre. */
    private static final long DELAI_ENTRE_DIAGNOSTICS_MS = 60L * 60L * 1000L;

    /** Groupes en double rapatries : de quoi remplir le rapport et savoir s'il en reste. */
    private static final int MAX_GROUPES = DiagnosticSuggestionLente.MAX_LIGNES_DETAILLEES + 1;

    private static final AtomicLong DERNIER_DIAGNOSTIC = new AtomicLong(0L);

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private SupportEventService supportEventService;

    @Asynchronous
    @Override
    public void diagnostiquer(String uri, String chaineDeRequete, long dureeMs, long seuilMs, String utilisateur) {
        try {
            if (!doitDiagnostiquer()) {
                return;
            }
            List<DiagnosticSuggestionLente.Index> index = DiagnosticSuggestionLente.index(lireIndex());
            boolean unicite = DiagnosticSuggestionLente.uniciteSur(index, "lg_FAMILLE_ID", "lg_PREENREGISTREMENT_ID");
            boolean indexDate = DiagnosticSuggestionLente.commencePar(index, "lg_FAMILLE_ID", "dt_CREATED");

            List<Object[]> doublons = null;
            boolean tronquee = false;
            if (!unicite) {
                doublons = chercherDoublons();
                tronquee = doublons.size() >= MAX_GROUPES;
            }

            String suggestionId = DiagnosticSuggestionLente.identifiantSuggestion(chaineDeRequete);
            SupportEventDTO dto = new SupportEventDTO();
            dto.setType("PERF");
            dto.setNiveau("WARN");
            dto.setModule("COMMANDE");
            // Le verdict entre dans le message, donc dans la signature de l'evenement : un diagnostic qui
            // change ouvre un evenement neuf plutot que d'incrementer l'ancien, dont le rapport serait
            // devenu faux (le Centre de support ne reecrit jamais le log d'un evenement deja connu).
            dto.setMessageCourt(
                    "Suggestion lente a l'ouverture : " + DiagnosticSuggestionLente.verdict(indexDate, doublons));
            dto.setUrlOuEcran(StringUtils.abbreviate(StringUtils.defaultString(uri), 255));
            dto.setPayloadJson("Explication : " + explication(indexDate, doublons));
            dto.setStack(StringUtils.abbreviate(DiagnosticSuggestionLente.rapport(suggestionId, uri, dureeMs, seuilMs,
                    utilisateur, unicite, indexDate, doublons, tronquee), 60000));
            supportEventService.record(dto, utilisateur);
        } catch (Exception e) {
            // un diagnostic ne doit jamais peser sur l'application
            LOG.log(Level.WARNING, "diagnostiquer", e);
        }
    }

    /**
     * Phrase d'accueil de l'ecran Diagnostic & bugs : ce qu'il faut faire, en une ligne.
     */
    private String explication(boolean indexDate, List<Object[]> doublons) {
        if (!indexDate) {
            return "L'index (lg_FAMILLE_ID, dt_CREATED) manque sur " + DiagnosticSuggestionLente.TABLE
                    + " : chaque article de la suggestion fait relire tout son historique de ventes."
                    + " Voir le log : il porte les requetes a executer.";
        }
        if (doublons != null && !doublons.isEmpty()) {
            return "Des lignes de vente sont en double (meme article sur la meme vente) : elles gonflent tout ce que"
                    + " l'ecran recalcule. Voir le log : il porte les requetes a executer.";
        }
        return "Les deux causes connues sont ecartees (index en place, pas de doublon) : la lenteur vient d'ailleurs."
                + " Voir le log pour le detail des mesures.";
    }

    /**
     * Vrai une fois par heure au plus. Deux ouvertures lentes rapprochees ne relancent pas la recherche : le constat
     * serait le meme, et l'evenement de support est de toute facon regroupe par signature.
     */
    private boolean doitDiagnostiquer() {
        long maintenant = System.currentTimeMillis();
        long dernier = DERNIER_DIAGNOSTIC.get();
        if (maintenant - dernier < DELAI_ENTRE_DIAGNOSTICS_MS) {
            return false;
        }
        return DERNIER_DIAGNOSTIC.compareAndSet(dernier, maintenant);
    }

    /**
     * Index de la table des lignes de vente, dans l'ordre des colonnes.
     */
    private List<Object[]> lireIndex() {
        Query query = em.createNativeQuery("SELECT INDEX_NAME, SEQ_IN_INDEX, COLUMN_NAME, NON_UNIQUE"
                + " FROM information_schema.STATISTICS" + " WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '"
                + DiagnosticSuggestionLente.TABLE + "'" + " ORDER BY INDEX_NAME, SEQ_IN_INDEX");
        return normaliser(query.getResultList());
    }

    /**
     * Groupes (article, vente) portant plus d'une ligne, les plus charges d'abord.
     */
    private List<Object[]> chercherDoublons() {
        Query query = em.createNativeQuery("SELECT d.lg_FAMILLE_ID, d.lg_PREENREGISTREMENT_ID, COUNT(*) AS nb"
                + " FROM " + DiagnosticSuggestionLente.TABLE + " d"
                + " GROUP BY d.lg_FAMILLE_ID, d.lg_PREENREGISTREMENT_ID" + " HAVING COUNT(*) > 1" + " ORDER BY nb DESC")
                .setMaxResults(MAX_GROUPES);
        return normaliser(query.getResultList());
    }

    private List<Object[]> normaliser(List<?> resultats) {
        List<Object[]> lignes = new ArrayList<>();
        for (Object ligne : resultats) {
            lignes.add(ligne instanceof Object[] ? (Object[]) ligne : new Object[] { ligne });
        }
        return lignes;
    }
}
