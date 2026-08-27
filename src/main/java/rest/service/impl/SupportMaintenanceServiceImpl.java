/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Consumer;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Stream;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import rest.service.SupportEventService;
import rest.service.SupportMaintenanceService;
import static rest.service.SupportMaintenanceService.ACTION_COMMANDES_EN_COURS;
import static rest.service.SupportMaintenanceService.ACTION_ETIQUETTES;
import static rest.service.SupportMaintenanceService.ACTION_LOTS_PERIMES_FANTOMES;
import static rest.service.SupportMaintenanceService.ACTION_PIECES_JOINTES;
import static rest.service.SupportMaintenanceService.ACTION_SUGGESTIONS;
import static rest.service.SupportMaintenanceService.PIECES_JOINTES_JOURS_DEFAUT;

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

    // ------------------------------------------------------------------
    // Pieces jointes des demandes de support (operation manuelle)
    // ------------------------------------------------------------------

    /**
     * Mention laissee sur la demande a la place des chemins de fichiers. Elle commence par une parenthese : c'est ce
     * qui permet de reconnaitre une demande deja purgee et de ne pas la retraiter.
     */
    private static final String MENTION_PURGE = "(pièces jointes purgées le ";

    @Override
    public Map<String, Object> comptesPiecesJointes(int jours) {
        int anciennete = jours > 0 ? jours : PIECES_JOINTES_JOURS_DEFAUT;
        Path base = basePiecesJointes();
        Set<String> referencees = cheminsReferences(null);
        Set<String> anciennes = cheminsReferences(anciennete);

        long[] total = new long[] { 0L, 0L };
        long[] orphelins = new long[] { 0L, 0L };
        long[] liberables = new long[] { 0L, 0L };
        parcourirFichiers(base, fichier -> {
            long taille = tailleDe(fichier);
            String cle = normaliser(fichier);
            total[0]++;
            total[1] += taille;
            if (!referencees.contains(cle)) {
                orphelins[0]++;
                orphelins[1] += taille;
            } else if (anciennes.contains(cle)) {
                liberables[0]++;
                liberables[1] += taille;
            }
        });

        Map<String, Object> comptes = new LinkedHashMap<>();
        comptes.put("dossier", base.toString());
        comptes.put("dossierPresent", Files.isDirectory(base));
        comptes.put("jours", anciennete);
        comptes.put("fichiers", total[0]);
        comptes.put("volumeMo", enMo(total[1]));
        comptes.put("orphelins", orphelins[0]);
        comptes.put("orphelinsMo", enMo(orphelins[1]));
        comptes.put("liberables", liberables[0]);
        comptes.put("liberablesMo", enMo(liberables[1]));
        comptes.put("totalLibereMo", enMo(orphelins[1] + liberables[1]));
        return comptes;
    }

    @Override
    public Map<String, Object> viderPiecesJointes(int jours, String utilisateur) {
        int anciennete = jours > 0 ? jours : PIECES_JOINTES_JOURS_DEFAUT;
        Path base = basePiecesJointes();
        String mention = MENTION_PURGE + LocalDate.now().format(DateTimeFormatter.ISO_DATE) + ")";

        long fichiersSupprimes = 0L;
        long octetsLiberes = 0L;
        int demandesTouchees = 0;

        // 1) Pieces jointes des demandes trop anciennes : le fichier part, la demande reste.
        List<Object[]> anciennes = demandesAvecPieces(anciennete);
        for (Object[] ligne : anciennes) {
            String id = String.valueOf(ligne[0]);
            long[] bilan = supprimerFichiers(ligne[1]);
            fichiersSupprimes += bilan[0];
            octetsLiberes += bilan[1];
            em.createNativeQuery("UPDATE t_support_demande SET pieces_jointes = ?1 WHERE id = ?2")
                    .setParameter(1, mention).setParameter(2, id).executeUpdate();
            demandesTouchees++;
        }

        // 2) Fichiers orphelins : plus references par aucune demande (demande supprimee, envoi interrompu...).
        Set<String> referencees = cheminsReferences(null);
        long[] orphelins = new long[] { 0L, 0L };
        parcourirFichiers(base, fichier -> {
            if (referencees.contains(normaliser(fichier))) {
                return;
            }
            long taille = tailleDe(fichier);
            if (supprimer(fichier)) {
                orphelins[0]++;
                orphelins[1] += taille;
            }
        });
        fichiersSupprimes += orphelins[0];
        octetsLiberes += orphelins[1];

        Map<String, Object> resultat = new LinkedHashMap<>();
        resultat.put("jours", anciennete);
        resultat.put("demandes", demandesTouchees);
        resultat.put("orphelins", orphelins[0]);
        resultat.put("fichiers", fichiersSupprimes);
        resultat.put("volumeMo", enMo(octetsLiberes));
        resultat.put("lignes", fichiersSupprimes);

        supportEventService.recordMaintenance(ACTION_PIECES_JOINTES,
                "Maintenance : purge des pièces jointes de plus de " + anciennete + " jour(s) (" + fichiersSupprimes
                        + " fichier(s) supprimé(s), " + enMo(octetsLiberes) + " Mo libérés, " + demandesTouchees
                        + " demande(s) concernée(s), " + orphelins[0] + " orphelin(s))",
                utilisateur);
        return resultat;
    }

    /** [id, pieces_jointes] des demandes plus anciennes que {@code jours} et non deja purgees. */
    @SuppressWarnings("unchecked")
    private List<Object[]> demandesAvecPieces(int jours) {
        try {
            return em.createNativeQuery("SELECT id, pieces_jointes FROM t_support_demande"
                    + " WHERE pieces_jointes IS NOT NULL AND pieces_jointes <> '' AND pieces_jointes NOT LIKE '(%'"
                    + " AND created_at < DATE_SUB(NOW(), INTERVAL ?1 DAY)").setParameter(1, jours).getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "demandesAvecPieces", e);
            return new java.util.ArrayList<>();
        }
    }

    /**
     * Chemins references par les demandes. {@code jours} nul = toutes les demandes ; sinon uniquement celles plus
     * anciennes que ce nombre de jours.
     */
    private Set<String> cheminsReferences(Integer jours) {
        Set<String> chemins = new HashSet<>();
        try {
            String sql = "SELECT pieces_jointes FROM t_support_demande"
                    + " WHERE pieces_jointes IS NOT NULL AND pieces_jointes <> '' AND pieces_jointes NOT LIKE '(%'";
            javax.persistence.Query query;
            if (jours == null) {
                query = em.createNativeQuery(sql);
            } else {
                query = em.createNativeQuery(sql + " AND created_at < DATE_SUB(NOW(), INTERVAL ?1 DAY)").setParameter(1,
                        jours.intValue());
            }
            for (Object valeur : query.getResultList()) {
                ajouterChemins(chemins, valeur);
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "cheminsReferences", e);
        }
        return chemins;
    }

    private void ajouterChemins(Set<String> chemins, Object valeur) {
        String brut = valeur == null ? "" : String.valueOf(valeur);
        for (String chemin : brut.split(";")) {
            if (StringUtils.isNotBlank(chemin)) {
                chemins.add(normaliser(Paths.get(chemin.trim())));
            }
        }
    }

    /** Supprime les fichiers listes dans une colonne pieces_jointes. Retourne [nb fichiers, octets liberes]. */
    private long[] supprimerFichiers(Object valeur) {
        long[] bilan = new long[] { 0L, 0L };
        String brut = valeur == null ? "" : String.valueOf(valeur);
        for (String chemin : brut.split(";")) {
            if (StringUtils.isBlank(chemin)) {
                continue;
            }
            try {
                Path fichier = Paths.get(chemin.trim());
                if (!Files.isRegularFile(fichier)) {
                    continue;
                }
                long taille = tailleDe(fichier);
                if (supprimer(fichier)) {
                    bilan[0]++;
                    bilan[1] += taille;
                }
            } catch (Exception e) {
                LOG.log(Level.FINE, "supprimerFichiers " + chemin, e);
            }
        }
        return bilan;
    }

    private Path basePiecesJointes() {
        String configure = StringUtils.trimToEmpty(supportEventService.getParameter("SUPPORT_STORAGE_DIR"));
        Path base = StringUtils.isNotBlank(configure) ? Paths.get(configure)
                : util.StockageDisque.sousDossier("support");
        return base.resolve("pieces-jointes");
    }

    private void parcourirFichiers(Path base, Consumer<Path> action) {
        if (base == null || !Files.isDirectory(base)) {
            return;
        }
        try (Stream<Path> flux = Files.walk(base)) {
            flux.filter(Files::isRegularFile).forEach(action);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "parcourirFichiers " + base, e);
        }
    }

    private String normaliser(Path chemin) {
        try {
            return chemin.toAbsolutePath().normalize().toString();
        } catch (Exception e) {
            return chemin.toString();
        }
    }

    private long tailleDe(Path fichier) {
        try {
            return Files.size(fichier);
        } catch (Exception e) {
            return 0L;
        }
    }

    private boolean supprimer(Path fichier) {
        try {
            return Files.deleteIfExists(fichier);
        } catch (Exception e) {
            LOG.log(Level.WARNING, "suppression impossible : " + fichier, e);
            return false;
        }
    }

    private long enMo(long octets) {
        return Math.round(octets / (1024.0d * 1024.0d));
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
