package rest.service.impl;

import dal.TEmplacement;
import dal.TUser;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.Tuple;
import net.sf.jasperreports.engine.JRException;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import net.sf.jasperreports.engine.export.JRPdfExporter;
import net.sf.jasperreports.export.SimpleExporterInput;
import net.sf.jasperreports.export.SimpleOutputStreamExporterOutput;
import org.apache.commons.lang3.StringUtils;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.report.ReportUtil;
import rest.service.dto.DepotStockLigneDTO;

/**
 * Depots d'extension (evolution 5, point 1) : ce que le depot detient, et ce que cela vaut.
 *
 * <p>
 * Le stock d'un depot d'extension est {@code t_famille_stock} pour l'emplacement du depot - la meme table que le stock
 * de l'officine, distinguee par son emplacement. Rien n'etait donc a inventer sur les donnees ; ce qui manquait, c'est
 * de pouvoir consulter ce stock depuis l'officine, depot par depot, avec sa valorisation, et de l'emporter en Excel ou
 * en PDF.
 * </p>
 */
@Stateless
public class DepotExtensionService {

    private static final Logger LOG = Logger.getLogger(DepotExtensionService.class.getName());

    /** Type d'emplacement « depot d'extension » dans t_typedepot. */
    public static final String TYPE_DEPOT_EXTENSION = "2";

    /** Modele embarque : aucun fichier a poser sur les sites pour que l'edition fonctionne. */
    public static final String MODELE = "depot_stock";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private ReportUtil reportUtil;

    /** Depots d'extension actifs, pour le choix de l'ecran. */
    @SuppressWarnings("unchecked")
    public JSONObject depots() {
        JSONArray data = new JSONArray();
        try {
            List<Tuple> lignes = em.createNativeQuery(
                    "SELECT e.lg_EMPLACEMENT_ID AS id, e.str_NAME AS nom, COALESCE(e.str_LOCALITE, '') AS localite,"
                            + " COALESCE(e.str_PHONE, '') AS telephone,"
                            + " CONCAT(COALESCE(e.str_FIRST_NAME, ''), ' ', COALESCE(e.str_LAST_NAME, '')) AS responsable"
                            + " FROM t_emplacement e WHERE e.lg_TYPEDEPOT_ID = ?1 AND e.str_STATUT = 'enable'"
                            + " ORDER BY e.str_NAME",
                    Tuple.class).setParameter(1, TYPE_DEPOT_EXTENSION).getResultList();
            for (Tuple t : lignes) {
                data.put(new JSONObject().put("id", t.get("id", String.class)).put("nom", t.get("nom", String.class))
                        .put("localite", StringUtils.defaultString(t.get("localite", String.class)))
                        .put("telephone", StringUtils.defaultString(t.get("telephone", String.class)))
                        .put("responsable", StringUtils.trimToEmpty(t.get("responsable", String.class))));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "liste des depots d'extension", e);
        }
        return new JSONObject().put("total", data.length()).put("data", data);
    }

    /** Vrai si l'emplacement demande est bien un depot d'extension actif : on ne sert pas le stock de l'officine. */
    public boolean estDepotExtension(String depotId) {
        if (StringUtils.isBlank(depotId)) {
            return false;
        }
        try {
            Number n = (Number) em
                    .createNativeQuery("SELECT COUNT(1) FROM t_emplacement e WHERE e.lg_EMPLACEMENT_ID = ?1"
                            + " AND e.lg_TYPEDEPOT_ID = ?2 AND e.str_STATUT = 'enable'")
                    .setParameter(1, depotId).setParameter(2, TYPE_DEPOT_EXTENSION).getSingleResult();
            return n != null && n.intValue() > 0;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "controle du depot " + depotId, e);
            return false;
        }
    }

    public String nomDepot(String depotId) {
        TEmplacement e = em.find(TEmplacement.class, depotId);
        return e == null ? "" : StringUtils.defaultString(e.getStrNAME());
    }

    private Query appliquer(Query q, String depotId, String recherche, String familleId) {
        q.setParameter(DepotStockSql.P_DEPOT, depotId);
        if (StringUtils.isNotBlank(recherche)) {
            q.setParameter(DepotStockSql.P_RECHERCHE, "%" + recherche.trim() + "%");
        }
        if (StringUtils.isNotBlank(familleId)) {
            q.setParameter(DepotStockSql.P_FAMILLE, familleId);
        }
        return q;
    }

    @SuppressWarnings("unchecked")
    public List<DepotStockLigneDTO> lignes(String depotId, String recherche, String familleId, boolean seulementEnStock,
            int start, int limit) {
        List<DepotStockLigneDTO> out = new ArrayList<>();
        try {
            Query q = appliquer(
                    em.createNativeQuery(DepotStockSql.liste(recherche, familleId, seulementEnStock), Tuple.class),
                    depotId, recherche, familleId);
            if (limit > 0) {
                q.setFirstResult(Math.max(0, start)).setMaxResults(limit);
            }
            for (Tuple t : (List<Tuple>) q.getResultList()) {
                out.add(new DepotStockLigneDTO(t.get("id", String.class),
                        StringUtils.defaultString(t.get("cip", String.class)),
                        StringUtils.defaultString(t.get("nom", String.class)),
                        StringUtils.defaultString(t.get("famille", String.class)),
                        StringUtils.defaultString(t.get("emplacement", String.class)), entier(t.get("stock")),
                        entier(t.get("prixAchat")), entier(t.get("prixVente"))));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "stock du depot " + depotId, e);
        }
        return out;
    }

    public int compter(String depotId, String recherche, String familleId, boolean seulementEnStock) {
        try {
            return ((Number) appliquer(
                    em.createNativeQuery(DepotStockSql.comptage(recherche, familleId, seulementEnStock)), depotId,
                    recherche, familleId).getSingleResult()).intValue();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "comptage du stock du depot " + depotId, e);
            return 0;
        }
    }

    /**
     * Valorisation calculee par la base sur TOUTES les lignes retenues : additionner la page affichee donnerait un
     * total faux des la deuxieme page.
     */
    public JSONObject valorisation(String depotId, String recherche, String familleId, boolean seulementEnStock) {
        try {
            Tuple t = (Tuple) appliquer(em
                    .createNativeQuery(DepotStockSql.valorisation(recherche, familleId, seulementEnStock), Tuple.class),
                    depotId, recherche, familleId).getSingleResult();
            return new JSONObject().put("articles", entier(t.get("articles")))
                    .put("quantite", entier(t.get("quantite"))).put("valeurAchat", longueur(t.get("valeurAchat")))
                    .put("valeurVente", longueur(t.get("valeurVente")));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "valorisation du depot " + depotId, e);
            return new JSONObject().put("articles", 0).put("quantite", 0).put("valeurAchat", 0).put("valeurVente", 0);
        }
    }

    /**
     * Valorisation ventilee par emplacement des articles - leur rayon, et non le depot, qui est deja choisi.
     *
     * <p>
     * Le total du depot est joint a la ventilation : c'est ce qui permet de verifier d'un coup d'oeil que la somme des
     * lignes fait bien le total. Sans lui, une ligne oubliee passerait inapercue.
     */
    public JSONObject valorisationParEmplacement(String depotId, String recherche, String familleId,
            boolean seulementEnStock) {
        JSONArray lignes = new JSONArray();
        try {
            @SuppressWarnings("unchecked")
            List<Tuple> resultats = appliquer(em.createNativeQuery(
                    DepotStockSql.valorisationParEmplacement(recherche, familleId, seulementEnStock), Tuple.class),
                    depotId, recherche, familleId).getResultList();
            for (Tuple t : resultats) {
                lignes.put(new JSONObject()
                        .put("emplacement", StringUtils.defaultString(t.get("emplacement", String.class)))
                        .put("articles", entier(t.get("articles"))).put("quantite", entier(t.get("quantite")))
                        .put("valeurAchat", longueur(t.get("valeurAchat")))
                        .put("valeurVente", longueur(t.get("valeurVente"))));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "valorisation par emplacement du depot " + depotId, e);
        }
        return new JSONObject().put("success", true).put("total", lignes.length()).put("data", lignes)
                .put("valorisation", valorisation(depotId, recherche, familleId, seulementEnStock));
    }

    public JSONObject stock(String depotId, String recherche, String familleId, boolean seulementEnStock, int start,
            int limit) {
        return new JSONObject().put("success", true)
                .put("total", compter(depotId, recherche, familleId, seulementEnStock))
                .put("valorisation", valorisation(depotId, recherche, familleId, seulementEnStock))
                .put("data", new JSONArray(lignes(depotId, recherche, familleId, seulementEnStock, start, limit)));
    }

    /** Rappel des criteres : une edition sans ses criteres n'est pas relisible un mois plus tard. */
    public String criteres(String depotId, String recherche, String familleLibelle, boolean seulementEnStock) {
        StringBuilder sb = new StringBuilder("Dépôt : ").append(nomDepot(depotId));
        if (StringUtils.isNotBlank(recherche)) {
            sb.append(" - Recherche : ").append(recherche.trim());
        }
        if (StringUtils.isNotBlank(familleLibelle)) {
            sb.append(" - Famille : ").append(familleLibelle);
        }
        // Meme formulation que la case a cocher de l'ecran : une edition doit se relire avec les memes
        // mots que l'ecran qui l'a produite.
        sb.append(seulementEnStock ? " - articles à 0 masqués" : " - tous les articles du référentiel");
        return sb.toString();
    }

    public byte[] excel(String depotId, String recherche, String familleId, boolean seulementEnStock) {
        List<DepotStockLigneDTO> data = lignes(depotId, recherche, familleId, seulementEnStock, 0, 0);
        try (Workbook classeur = new HSSFWorkbook(); ByteArrayOutputStream sortie = new ByteArrayOutputStream()) {
            Sheet feuille = classeur.createSheet("Stock depot");
            int r = 0;
            Row entete = feuille.createRow(r++);
            String[] titres = { "CIP", "Désignation", "Famille", "Emplacement", "Stock", "Prix achat", "Prix vente",
                    "Valeur achat", "Valeur vente" };
            for (int c = 0; c < titres.length; c++) {
                entete.createCell(c).setCellValue(titres[c]);
            }
            for (DepotStockLigneDTO l : data) {
                Row ligne = feuille.createRow(r++);
                int c = 0;
                ligne.createCell(c++).setCellValue(l.getCip());
                ligne.createCell(c++).setCellValue(l.getNom());
                ligne.createCell(c++).setCellValue(l.getFamille());
                ligne.createCell(c++).setCellValue(l.getEmplacement());
                ligne.createCell(c++).setCellValue(l.getStock());
                ligne.createCell(c++).setCellValue(l.getPrixAchat());
                ligne.createCell(c++).setCellValue(l.getPrixVente());
                ligne.createCell(c++).setCellValue(l.getValeurAchat());
                ligne.createCell(c).setCellValue(l.getValeurVente());
            }
            for (int c = 0; c < titres.length; c++) {
                feuille.autoSizeColumn(c);
            }
            classeur.write(sortie);
            return sortie.toByteArray();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "export Excel du stock du depot " + depotId, e);
            return new byte[0];
        }
    }

    /** PDF rendu en memoire : servi en flux dans l'onglet ouvert par le clic, sans fichier temporaire. */
    public byte[] pdf(TUser operateur, String depotId, String recherche, String familleId, String familleLibelle,
            boolean seulementEnStock) throws JRException {
        Map<String, Object> parametres = new HashMap<>();
        try {
            parametres.putAll(reportUtil.officineData(operateur));
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "en-tete de l'officine indisponible pour le stock du depot", e);
        }
        parametres.put("P_TITRE", "STOCK DU DEPOT - " + nomDepot(depotId).toUpperCase());
        parametres.put("P_CRITERES", criteres(depotId, recherche, familleLibelle, seulementEnStock));

        JasperReport modele = reportUtil.compileFromClasspath(MODELE);
        if (modele == null) {
            throw new JRException("Modele embarque " + MODELE + ".jrxml introuvable dans l'application");
        }
        JasperPrint print = JasperFillManager.fillReport(modele, parametres,
                new JRBeanCollectionDataSource(lignes(depotId, recherche, familleId, seulementEnStock, 0, 0)));
        try (ByteArrayOutputStream sortie = new ByteArrayOutputStream()) {
            JRPdfExporter exporteur = new JRPdfExporter();
            exporteur.setExporterInput(new SimpleExporterInput(print));
            exporteur.setExporterOutput(new SimpleOutputStreamExporterOutput(sortie));
            exporteur.exportReport();
            return sortie.toByteArray();
        } catch (java.io.IOException e) {
            throw new JRException(e);
        }
    }

    private static int entier(Object v) {
        return v == null ? 0 : ((Number) v).intValue();
    }

    private static long longueur(Object v) {
        return v == null ? 0L : ((Number) v).longValue();
    }
}
