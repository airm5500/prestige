package rest.service.impl;

import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;

/**
 * Ecriture du releve journalier relationnel (stock_snapshot_day), source des valorisations historiques.
 *
 * <p>
 * L'ecriture passe par un upsert natif multi-lignes plutot que par une entite JPA. Deux raisons : l'idempotence est
 * portee par la base (ON DUPLICATE KEY UPDATE), donc relancer le traitement d'une journee met a jour les lignes
 * existantes au lieu de creer des doublons ; et un seul ordre SQL remplace 500 allers-retours, ce qui raccourcit
 * d'autant la transaction et donc la duree pendant laquelle le traitement de nuit tient des verrous.
 * </p>
 *
 * <p>
 * {@code REQUIRED} et non {@code REQUIRES_NEW} : l'upsert rejoint la transaction courte du lot appelant, de sorte qu'un
 * lot est enregistre en entier ou pas du tout.
 * </p>
 *
 * @author koben
 */
@Stateless
public class StockSnapshotDayService {

    private static final Logger LOG = Logger.getLogger(StockSnapshotDayService.class.getName());

    /**
     * Nombre maximal de lignes par ordre SQL. Au-dela, l'ordre est decoupe : on garde des paquets d'ecriture de taille
     * bornee (9 parametres par ligne) et une empreinte memoire previsible cote pilote JDBC.
     */
    public static final int TAILLE_ORDRE = 500;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Une ligne de releve : un produit, un magasin, une journee. */
    public static class Ligne {

        private final int stockOfDay;
        private final String magasinId;
        private final String produitId;
        private final int qty;
        private final int qtyReserve;
        private final int prixPaf;
        private final int prixUni;
        private final int prixMoyenPondere;
        private final int valeurTva;

        public Ligne(int stockOfDay, String magasinId, String produitId, int qty, int qtyReserve, int prixPaf,
                int prixUni, int prixMoyenPondere, int valeurTva) {
            this.stockOfDay = stockOfDay;
            this.magasinId = magasinId;
            this.produitId = produitId;
            this.qty = qty;
            this.qtyReserve = qtyReserve;
            this.prixPaf = prixPaf;
            this.prixUni = prixUni;
            this.prixMoyenPondere = prixMoyenPondere;
            this.valeurTva = valeurTva;
        }

        public int getStockOfDay() {
            return stockOfDay;
        }

        public String getProduitId() {
            return produitId;
        }
    }

    /**
     * Enregistre (ou met a jour) les lignes fournies. Relancer le traitement d'une meme journee ne cree aucun doublon :
     * la cle primaire (journee, magasin, produit) declenche la mise a jour.
     *
     * @param lignes
     *            lignes a ecrire, eventuellement plus nombreuses que {@link #TAILLE_ORDRE}
     *
     * @return nombre de lignes soumises
     */
    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public int upsert(List<Ligne> lignes) {
        if (lignes == null || lignes.isEmpty()) {
            return 0;
        }
        int total = 0;
        for (int debut = 0; debut < lignes.size(); debut += TAILLE_ORDRE) {
            List<Ligne> paquet = lignes.subList(debut, Math.min(debut + TAILLE_ORDRE, lignes.size()));
            executerUpsert(paquet);
            total += paquet.size();
        }
        return total;
    }

    /**
     * Variante isolee, utilisee par le traitement quotidien pendant la periode de double ecriture.
     *
     * <p>
     * L'ecriture se fait dans sa propre transaction et une erreur y est absorbee : tant que les ecrans lisent encore
     * l'archive JSON, un probleme sur la table neuve (migration pas encore jouee, disque plein) ne doit pas faire
     * echouer le releve JSON du lot, qui reste la source de lecture. La ligne manquante sera reecrite au prochain
     * passage, l'upsert etant idempotent.
     * </p>
     *
     * @param lignes
     *            lignes a ecrire
     *
     * @return nombre de lignes ecrites, 0 en cas d'echec
     */
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public int upsertIsole(List<Ligne> lignes) {
        try {
            return upsert(lignes);
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Ecriture du releve journalier relationnel impossible (releve JSON conserve)", e);
            return 0;
        }
    }

    private void executerUpsert(List<Ligne> paquet) {
        StringBuilder sql = new StringBuilder("INSERT INTO stock_snapshot_day (stock_of_day, magasin_id, produit_id, "
                + "qty, qty_reserve, prix_paf, prix_uni, prix_moyen_pondere, valeur_tva) VALUES ");
        int position = 0;
        List<Object> valeurs = new ArrayList<>(paquet.size() * 9);
        for (int i = 0; i < paquet.size(); i++) {
            Ligne l = paquet.get(i);
            if (i > 0) {
                sql.append(",");
            }
            sql.append("(");
            for (int c = 0; c < 9; c++) {
                if (c > 0) {
                    sql.append(",");
                }
                sql.append("?").append(++position);
            }
            sql.append(")");
            valeurs.add(l.stockOfDay);
            valeurs.add(l.magasinId);
            valeurs.add(l.produitId);
            valeurs.add(l.qty);
            valeurs.add(l.qtyReserve);
            valeurs.add(l.prixPaf);
            valeurs.add(l.prixUni);
            valeurs.add(l.prixMoyenPondere);
            valeurs.add(l.valeurTva);
        }
        sql.append(" ON DUPLICATE KEY UPDATE qty=VALUES(qty), qty_reserve=VALUES(qty_reserve), ")
                .append("prix_paf=VALUES(prix_paf), prix_uni=VALUES(prix_uni), ")
                .append("prix_moyen_pondere=VALUES(prix_moyen_pondere), valeur_tva=VALUES(valeur_tva), ")
                .append("updated_at=CURRENT_TIMESTAMP");

        Query q = em.createNativeQuery(sql.toString());
        for (int i = 0; i < valeurs.size(); i++) {
            q.setParameter(i + 1, valeurs.get(i));
        }
        q.executeUpdate();
    }

    /**
     * Nombre de lignes deja enregistrees pour une journee. Sert au traitement quotidien pour savoir si la journee a
     * deja ete relevee (redemarrage du serveur en cours de journee).
     *
     * @param stockOfDay
     *            journee au format yyyyMMdd
     *
     * @return nombre de lignes, 0 si la journee n'a pas encore ete relevee
     */
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public long compterJournee(int stockOfDay) {
        try {
            Object r = em.createNativeQuery("SELECT COUNT(*) FROM stock_snapshot_day WHERE stock_of_day = ?1")
                    .setParameter(1, stockOfDay).getSingleResult();
            return r == null ? 0L : ((Number) r).longValue();
        } catch (Exception e) {
            // Table absente (migration pas encore jouee) : on se comporte comme si la journee n'existait pas, le
            // traitement quotidien reste fonctionnel.
            LOG.log(Level.WARNING, "compterJournee " + stockOfDay, e);
            return 0L;
        }
    }
}
