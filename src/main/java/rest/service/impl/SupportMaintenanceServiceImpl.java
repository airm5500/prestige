/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import rest.service.SupportEventService;
import rest.service.SupportMaintenanceService;

/**
 * Vidages de maintenance : suppressions en SQL natif, details supprimes AVANT les entetes pour respecter les liens
 * entre tables. Les commandes ne sont touchees que si leur statut est 'is_Process' (commandes en cours, jamais les
 * commandes receptionnees / historisees).
 *
 * @author koben
 */
@Stateless
public class SupportMaintenanceServiceImpl implements SupportMaintenanceService {

    private static final Logger LOG = Logger.getLogger(SupportMaintenanceServiceImpl.class.getName());
    private static final String STATUT_COMMANDE_EN_COURS = "is_Process";

    /*
     * Stock fantome des lots deja perimes : historiquement les ventes ne decrementaient pas les lots perimes, qui
     * restaient donc visibles dans la recherche des produits perimes alors que tout avait ete vendu. Regle PRUDENTE :
     * un reliquat de lot perime n'est repute fantome que si le stock disponible du produit est deja entierement couvert
     * par les lots NON perimes (les unites du lot perime ne peuvent alors physiquement pas exister).
     */
    private static final String LOTS_PERIMES_FANTOMES_FROM_WHERE = " FROM t_lot l" + " JOIN ("
            + "    SELECT l2.lg_FAMILLE_ID AS fid,"
            + "           COALESCE(SUM(CASE WHEN DATE(l2.dt_PEREMPTION) >= CURDATE() THEN l2.current_stock ELSE 0 END), 0) AS stock_lots_valides"
            + "    FROM t_lot l2 WHERE l2.dt_PEREMPTION IS NOT NULL GROUP BY l2.lg_FAMILLE_ID"
            + " ) agg ON agg.fid = l.lg_FAMILLE_ID" + " LEFT JOIN ("
            + "    SELECT fs.lg_FAMILLE_ID AS fid, SUM(fs.int_NUMBER_AVAILABLE) AS stock_disponible"
            + "    FROM t_famille_stock fs WHERE fs.str_STATUT = 'enable' GROUP BY fs.lg_FAMILLE_ID"
            + " ) st ON st.fid = l.lg_FAMILLE_ID" + " WHERE DATE(l.dt_PEREMPTION) < CURDATE() AND l.current_stock > 0"
            + " AND COALESCE(st.stock_disponible, 0) <= agg.stock_lots_valides";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private SupportEventService supportEventService;

    @Override
    public Map<String, Object> counts() {
        Map<String, Object> counts = new LinkedHashMap<>();
        counts.put("etiquettes", countNative("SELECT COUNT(*) FROM t_etiquette"));
        counts.put("suggestions", countNative("SELECT COUNT(*) FROM t_suggestion_order"));
        counts.put("suggestionDetails", countNative("SELECT COUNT(*) FROM t_suggestion_order_details"));
        counts.put("commandesEnCours",
                countNative("SELECT COUNT(*) FROM t_order WHERE str_STATUT = '" + STATUT_COMMANDE_EN_COURS + "'"));
        counts.put("commandeDetails",
                countNative("SELECT COUNT(*) FROM t_order_detail d JOIN t_order o ON o.lg_ORDER_ID = d.lg_ORDER_ID "
                        + "WHERE o.str_STATUT = '" + STATUT_COMMANDE_EN_COURS + "'"));
        long[] fantomes = countLotsPerimesFantomes();
        counts.put("lotsPerimesFantomes", fantomes[0]);
        counts.put("produitsPerimesFantomes", fantomes[1]);
        counts.put("unitesPerimesFantomes", fantomes[2]);
        return counts;
    }

    /** [nb lots, nb produits distincts, unites fantomes] concernes par la regle prudente. */
    private long[] countLotsPerimesFantomes() {
        try {
            Object[] r = (Object[]) em.createNativeQuery(
                    "SELECT COUNT(*), COUNT(DISTINCT l.lg_FAMILLE_ID), COALESCE(SUM(l.current_stock), 0)"
                            + LOTS_PERIMES_FANTOMES_FROM_WHERE)
                    .getSingleResult();
            return new long[] { ((Number) r[0]).longValue(), ((Number) r[1]).longValue(), ((Number) r[2]).longValue() };
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "countLotsPerimesFantomes", e);
            return new long[] { -1, -1, -1 };
        }
    }

    @Override
    public Map<String, Object> vider(String action, String utilisateur) {
        Map<String, Object> resultat = new LinkedHashMap<>();
        switch (action == null ? "" : action) {
        case ACTION_ETIQUETTES: {
            int lignes = em.createNativeQuery("DELETE FROM t_etiquette").executeUpdate();
            resultat.put("lignes", lignes);
            supportEventService.recordMaintenance(action,
                    "Maintenance : vidage des étiquettes (" + lignes + " ligne(s) supprimée(s))", utilisateur);
            break;
        }
        case ACTION_SUGGESTIONS: {
            // Les details referencent la suggestion : suppression des details AVANT les entetes.
            int details = em.createNativeQuery("DELETE FROM t_suggestion_order_details").executeUpdate();
            int entetes = em.createNativeQuery("DELETE FROM t_suggestion_order").executeUpdate();
            resultat.put("details", details);
            resultat.put("lignes", entetes);
            supportEventService.recordMaintenance(action, "Maintenance : vidage des suggestions (" + entetes
                    + " suggestion(s) et " + details + " détail(s) supprimé(s))", utilisateur);
            break;
        }
        case ACTION_COMMANDES_EN_COURS: {
            // Uniquement les commandes en cours (statut 'is_Process') : details AVANT entetes.
            int details = em.createNativeQuery(
                    "DELETE d FROM t_order_detail d JOIN t_order o ON o.lg_ORDER_ID = d.lg_ORDER_ID WHERE o.str_STATUT = ?1")
                    .setParameter(1, STATUT_COMMANDE_EN_COURS).executeUpdate();
            int entetes = em.createNativeQuery("DELETE FROM t_order WHERE str_STATUT = ?1")
                    .setParameter(1, STATUT_COMMANDE_EN_COURS).executeUpdate();
            resultat.put("details", details);
            resultat.put("lignes", entetes);
            supportEventService.recordMaintenance(action, "Maintenance : vidage des commandes en cours (" + entetes
                    + " commande(s) et " + details + " détail(s) supprimé(s))", utilisateur);
            break;
        }
        case ACTION_LOTS_PERIMES_FANTOMES: {
            // Remise a zero (pas de suppression) du stock fantome des lots deja
            // perimes, uniquement dans le cas prouvable (regle prudente ci-dessus).
            long[] avant = countLotsPerimesFantomes();
            int lignes = em.createNativeQuery("UPDATE t_lot l" + " JOIN (" + "    SELECT l2.lg_FAMILLE_ID AS fid,"
                    + "           COALESCE(SUM(CASE WHEN DATE(l2.dt_PEREMPTION) >= CURDATE() THEN l2.current_stock ELSE 0 END), 0) AS stock_lots_valides"
                    + "    FROM t_lot l2 WHERE l2.dt_PEREMPTION IS NOT NULL GROUP BY l2.lg_FAMILLE_ID"
                    + " ) agg ON agg.fid = l.lg_FAMILLE_ID" + " LEFT JOIN ("
                    + "    SELECT fs.lg_FAMILLE_ID AS fid, SUM(fs.int_NUMBER_AVAILABLE) AS stock_disponible"
                    + "    FROM t_famille_stock fs WHERE fs.str_STATUT = 'enable' GROUP BY fs.lg_FAMILLE_ID"
                    + " ) st ON st.fid = l.lg_FAMILLE_ID" + " SET l.current_stock = 0, l.dt_UPDATED = NOW()"
                    + " WHERE DATE(l.dt_PEREMPTION) < CURDATE() AND l.current_stock > 0"
                    + " AND COALESCE(st.stock_disponible, 0) <= agg.stock_lots_valides").executeUpdate();
            resultat.put("lignes", lignes);
            supportEventService
                    .recordMaintenance(
                            action, "Maintenance : remise à zéro du stock fantôme des lots périmés (" + lignes
                                    + " lot(s) sur " + avant[1] + " produit(s), " + avant[2] + " unité(s) fantôme(s))",
                            utilisateur);
            break;
        }
        default:
            throw new IllegalArgumentException("Action de maintenance inconnue : " + action);
        }
        return resultat;
    }

    private long countNative(String sql) {
        try {
            return ((Number) em.createNativeQuery(sql).getSingleResult()).longValue();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "countNative " + sql, e);
            return -1;
        }
    }
}
