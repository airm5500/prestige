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
import rest.service.BalanceService;
import rest.service.dto.DepotCaLigneDTO;
import rest.service.dto.DepotEmplacementLigneDTO;
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

    /** Modele de l'edition de la valorisation ventilee par emplacement, egalement embarque. */
    public static final String MODELE_EMPLACEMENT = "depot_valorisation_emplacement";

    /** Modele de l'edition du chiffre d'affaires du depot, embarque comme les deux autres. */
    public static final String MODELE_CA = "depot_chiffre_affaires";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private ReportUtil reportUtil;

    @EJB
    private BalanceService balanceService;

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

    private Query appliquer(Query q, String depotId, DepotStockSql.Criteres c) {
        q.setParameter(DepotStockSql.P_DEPOT, depotId);
        if (StringUtils.isNotBlank(c.recherche)) {
            q.setParameter(DepotStockSql.P_RECHERCHE, "%" + c.recherche.trim() + "%");
        }
        if (StringUtils.isNotBlank(c.familleId)) {
            q.setParameter(DepotStockSql.P_FAMILLE, c.familleId);
        }
        if (StringUtils.isNotBlank(c.zoneGeoId)) {
            q.setParameter(DepotStockSql.P_ZONE, c.zoneGeoId);
        }
        return q;
    }

    /**
     * Criteres de la valorisation, construits en un seul endroit.
     *
     * <p>
     * « ALL » est la valeur que les combos de la maison envoient pour « Tous » : elle vaut absence de filtre, et la
     * laisser passer telle quelle chercherait un identifiant de famille nomme ALL, donc zero ligne.
     */
    public static DepotStockSql.Criteres criteresDe(String recherche, String familleId, String zoneGeoId,
            String filtreStock, boolean masquerLesZeros) {
        return criteresDe(recherche, familleId, zoneGeoId, filtreStock, null, null, masquerLesZeros);
    }

    /**
     * Criteres avec le filtre de stock sous sa forme demandee le 18/09 : un OPERATEUR et une valeur.
     *
     * <p>
     * Les trois anciennes categories (NEGATIF, ZERO, POSITIF) sont TRADUITES ici en couple (operateur, valeur) : « &lt;
     * 0 », « = 0 », « &gt; 0 ». Elles ne sont donc pas un second chemin de filtrage a cote du premier - il n'y en a
     * qu'un, et les appels existants continuent de fonctionner sans changement.
     *
     * <p>
     * L'operateur explicite l'emporte sur la categorie : c'est le controle que l'utilisateur vient de manipuler.
     */
    public static DepotStockSql.Criteres criteresDe(String recherche, String familleId, String zoneGeoId,
            String filtreStock, String operateurStock, Integer valeurStock, boolean masquerLesZeros) {
        String operateur = DepotStockSql.signe(operateurStock) != null ? operateurStock.trim().toUpperCase() : null;
        Integer valeur = valeurStock;
        if (operateur == null) {
            String categorie = DepotStockSql.normaliserFiltre(filtreStock);
            if (DepotStockSql.NEGATIF.equals(categorie)) {
                operateur = DepotStockSql.OP_INFERIEUR;
                valeur = 0;
            } else if (DepotStockSql.ZERO.equals(categorie)) {
                operateur = DepotStockSql.OP_EGAL;
                valeur = 0;
            } else if (DepotStockSql.POSITIF.equals(categorie)) {
                operateur = DepotStockSql.OP_SUPERIEUR;
                valeur = 0;
            }
        }
        return new DepotStockSql.Criteres(recherche, sansTous(familleId), sansTous(zoneGeoId), filtreStock, operateur,
                valeur, masquerLesZeros);
    }

    private static String sansTous(String valeur) {
        return StringUtils.isBlank(valeur) || "ALL".equalsIgnoreCase(valeur.trim()) ? null : valeur.trim();
    }

    @SuppressWarnings("unchecked")
    public List<DepotStockLigneDTO> lignes(String depotId, DepotStockSql.Criteres criteres, int start, int limit) {
        List<DepotStockLigneDTO> out = new ArrayList<>();
        try {
            Query q = appliquer(em.createNativeQuery(DepotStockSql.liste(criteres), Tuple.class), depotId, criteres);
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

    public int compter(String depotId, DepotStockSql.Criteres criteres) {
        try {
            return ((Number) appliquer(em.createNativeQuery(DepotStockSql.comptage(criteres)), depotId, criteres)
                    .getSingleResult()).intValue();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "comptage du stock du depot " + depotId, e);
            return 0;
        }
    }

    /**
     * Valorisation calculee par la base sur TOUTES les lignes retenues : additionner la page affichee donnerait un
     * total faux des la deuxieme page.
     */
    public JSONObject valorisation(String depotId, DepotStockSql.Criteres criteres) {
        try {
            Tuple t = (Tuple) appliquer(em.createNativeQuery(DepotStockSql.valorisation(criteres), Tuple.class),
                    depotId, criteres).getSingleResult();
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
    public JSONObject valorisationParEmplacement(String depotId, DepotStockSql.Criteres criteres) {
        JSONArray lignes = new JSONArray();
        try {
            @SuppressWarnings("unchecked")
            List<Tuple> resultats = appliquer(
                    em.createNativeQuery(DepotStockSql.valorisationParEmplacement(criteres), Tuple.class), depotId,
                    criteres).getResultList();
            for (Tuple t : resultats) {
                lignes.put(new JSONObject()
                        .put("emplacement", StringUtils.defaultString(t.get("emplacement", String.class)))
                        .put("articles", entier(t.get("articles"))).put("quantite", entier(t.get("quantite")))
                        // « unites » est le nom qui dit ce que c'est : la somme des QUANTITES du rayon, a ne pas
                        // confondre avec « articles », qui compte les REFERENCES. « quantite » est conserve pour
                        // ne rien casser de ce qui le lit deja.
                        .put("unites", entier(t.get("quantite"))).put("valeurAchat", longueur(t.get("valeurAchat")))
                        .put("valeurVente", longueur(t.get("valeurVente"))));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "valorisation par emplacement du depot " + depotId, e);
        }
        return new JSONObject().put("success", true).put("total", lignes.length()).put("data", lignes)
                .put("valorisation", valorisation(depotId, criteres));
    }

    /** Lignes de la ventilation par emplacement, pour l'edition : la meme chose que ce que l'ecran affiche. */
    public List<DepotEmplacementLigneDTO> lignesParEmplacement(String depotId, DepotStockSql.Criteres criteres) {
        List<DepotEmplacementLigneDTO> out = new ArrayList<>();
        JSONObject reponse = valorisationParEmplacement(depotId, criteres);
        JSONArray data = reponse.optJSONArray("data");
        if (data == null) {
            return out;
        }
        for (int i = 0; i < data.length(); i++) {
            JSONObject l = data.getJSONObject(i);
            out.add(new DepotEmplacementLigneDTO(l.optString("emplacement", ""), l.optInt("articles"),
                    l.optInt("quantite"), l.optLong("valeurAchat"), l.optLong("valeurVente")));
        }
        return out;
    }

    public JSONObject stock(String depotId, DepotStockSql.Criteres criteres, int start, int limit) {
        return new JSONObject().put("success", true).put("total", compter(depotId, criteres))
                .put("valorisation", valorisation(depotId, criteres))
                .put("data", new JSONArray(lignes(depotId, criteres, start, limit)));
    }

    /** Rappel des criteres : une edition sans ses criteres n'est pas relisible un mois plus tard. */
    public String criteres(String depotId, String recherche, String familleLibelle, String emplacementLibelle,
            String filtreStock, boolean masquerLesZeros) {
        StringBuilder sb = new StringBuilder("Dépôt : ").append(nomDepot(depotId));
        if (StringUtils.isNotBlank(recherche)) {
            sb.append(" - Recherche : ").append(recherche.trim());
        }
        if (StringUtils.isNotBlank(familleLibelle)) {
            sb.append(" - Famille : ").append(familleLibelle);
        }
        if (StringUtils.isNotBlank(emplacementLibelle)) {
            sb.append(" - Emplacement : ").append(emplacementLibelle);
        }
        // Memes mots que les controles de l'ecran : une edition doit se relire avec le vocabulaire de
        // l'ecran qui l'a produite. Le filtre de stock l'emporte sur la case, comme dans le SQL.
        String filtre = DepotStockSql.normaliserFiltre(filtreStock);
        if (DepotStockSql.NEGATIF.equals(filtre)) {
            sb.append(" - stock négatif seulement");
        } else if (DepotStockSql.ZERO.equals(filtre)) {
            sb.append(" - stock à zéro seulement");
        } else if (DepotStockSql.POSITIF.equals(filtre)) {
            sb.append(" - stock positif seulement");
        } else {
            sb.append(masquerLesZeros ? " - articles à 0 masqués" : " - tous les articles du référentiel");
        }
        return sb.toString();
    }

    /**
     * Rappel des criteres, forme complete : il NOMME le filtre de stock tel qu'il a ete pose, operateur et valeur
     * compris (« stock >= 10 »). Une edition qui tait son filtre laisse croire qu'elle porte sur tout le depot.
     */
    public String criteres(String depotId, DepotStockSql.Criteres criteres, String familleLibelle,
            String emplacementLibelle) {
        String signe = DepotStockSql.signe(criteres.operateurStock);
        if (signe == null) {
            return criteres(depotId, criteres.recherche, familleLibelle, emplacementLibelle, criteres.filtreStock,
                    criteres.masquerLesZeros);
        }
        StringBuilder sb = new StringBuilder("Dépôt : ").append(nomDepot(depotId));
        if (StringUtils.isNotBlank(criteres.recherche)) {
            sb.append(" - Recherche : ").append(criteres.recherche.trim());
        }
        if (StringUtils.isNotBlank(familleLibelle)) {
            sb.append(" - Famille : ").append(familleLibelle);
        }
        if (StringUtils.isNotBlank(emplacementLibelle)) {
            sb.append(" - Emplacement : ").append(emplacementLibelle);
        }
        sb.append(" - stock ").append(signe).append(' ')
                .append(criteres.valeurStock == null ? 0 : criteres.valeurStock.intValue());
        return sb.toString();
    }

    public byte[] excel(String depotId, DepotStockSql.Criteres criteres) {
        List<DepotStockLigneDTO> data = lignes(depotId, criteres, 0, 0);
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
    public byte[] pdf(TUser operateur, String depotId, DepotStockSql.Criteres criteres, String familleLibelle,
            String emplacementLibelle) throws JRException {
        return editer(operateur, MODELE, "STOCK DU DEPOT - " + nomDepot(depotId).toUpperCase(),
                criteres(depotId, criteres, familleLibelle, emplacementLibelle), lignes(depotId, criteres, 0, 0));
    }

    /**
     * Edition de la valorisation ventilee par emplacement (retour du 17/09 : « par emplacement, on doit pouvoir
     * imprimer »). Meme en-tete, memes criteres et meme total que l'ecran : c'est la meme requete.
     */
    public byte[] pdfParEmplacement(TUser operateur, String depotId, DepotStockSql.Criteres criteres,
            String familleLibelle, String emplacementLibelle) throws JRException {
        return editer(operateur, MODELE_EMPLACEMENT,
                "VALORISATION PAR EMPLACEMENT - " + nomDepot(depotId).toUpperCase(),
                criteres(depotId, criteres, familleLibelle, emplacementLibelle),
                lignesParEmplacement(depotId, criteres));
    }

    /**
     * Chiffre d'affaires du depot sur une periode, dans la presentation demandee par l'officine.
     *
     * <p>
     * Les chiffres viennent de la balance - {@code v1/balance/balancesalecashdepot}, dont le perimetre a ete corrige
     * pour reunir les ventes saisies par un utilisateur rattache au depot ET celles jouees dans le depot depuis
     * l'officine. On ne recalcule rien ici : l'ecran, l'edition et l'ecran « Balance Depot » doivent donner le meme
     * chiffre, et deux calculs finissent toujours par diverger.
     *
     * <p>
     * La colonne « reglement » de l'ancienne presentation n'est pas reprise : le service ne la renseigne jamais pour
     * ces lignes, elle etait systematiquement vide.
     */
    public List<DepotCaLigneDTO> lignesCa(String depotId, String dtStart, String dtEnd) {
        List<DepotCaLigneDTO> out = new ArrayList<>();
        try {
            rest.service.dto.BalanceParamsDTO params = rest.service.dto.BalanceParamsDTO.builder().dtStart(dtStart)
                    .dtEnd(dtEnd).emplacementId(depotId).build();
            for (commonTasks.dto.BalanceDTO b : balanceService.getBalanceVenteCaisseData(params).getBalances()) {
                out.add(new DepotCaLigneDTO(StringUtils.defaultString(b.getTypeVente()), b.getMontantTTC(),
                        b.getMontantNet(), b.getMarge(), b.getNbreVente(), b.getMontantEsp(), b.getMontantTp()));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "chiffre d'affaires du depot " + depotId, e);
        }
        return out;
    }

    /**
     * Chiffre d'affaires du depot pour l'onglet : les lignes, et le recapitulatif de la periode.
     *
     * <p>
     * Les totaux sont la somme des lignes, calculee ici une fois pour toutes : l'ecran les affiche, l'edition les
     * imprime, et aucun des deux ne refait l'addition de son cote.
     */
    public JSONObject ca(String depotId, String dtStart, String dtEnd) {
        List<DepotCaLigneDTO> lignes = lignesCa(depotId, dtStart, dtEnd);
        long ttc = 0;
        long net = 0;
        long marge = 0;
        long ventes = 0;
        long especes = 0;
        long tiersPayant = 0;
        for (DepotCaLigneDTO l : lignes) {
            ttc += l.getMontantTTC();
            net += l.getMontantNet();
            marge += l.getMarge();
            ventes += l.getNbreVente();
            especes += l.getMontantEspeces();
            tiersPayant += l.getMontantTiersPayant();
        }
        JSONObject meta = new JSONObject().put("montantTTC", ttc).put("montantNet", net).put("marge", marge)
                .put("nbreVente", ventes).put("montantEsp", especes).put("montantTp", tiersPayant);
        return new JSONObject().put("success", true).put("total", lignes.size()).put("data", new JSONArray(lignes))
                .put("metaData", meta).put("depot", nomDepot(depotId));
    }

    /** Edition du chiffre d'affaires, servie en flux comme les deux autres. */
    public byte[] pdfCa(TUser operateur, String depotId, String dtStart, String dtEnd) throws JRException {
        return editer(operateur, MODELE_CA, "CHIFFRE D'AFFAIRES - " + nomDepot(depotId).toUpperCase(),
                "Dépôt : " + nomDepot(depotId) + " - période du " + StringUtils.defaultString(dtStart) + " au "
                        + StringUtils.defaultString(dtEnd),
                lignesCa(depotId, dtStart, dtEnd));
    }

    /** PDF rendu en memoire : servi en flux dans l'onglet ouvert par le clic, sans fichier temporaire. */
    private byte[] editer(TUser operateur, String modeleNom, String titre, String rappelCriteres, List<?> lignes)
            throws JRException {
        Map<String, Object> parametres = new HashMap<>();
        try {
            parametres.putAll(reportUtil.officineData(operateur));
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "en-tete de l'officine indisponible pour l'edition du depot", e);
        }
        parametres.put("P_TITRE", titre);
        parametres.put("P_CRITERES", rappelCriteres);

        JasperReport modele = reportUtil.compileFromClasspath(modeleNom);
        if (modele == null) {
            throw new JRException("Modele embarque " + modeleNom + ".jrxml introuvable dans l'application");
        }
        JasperPrint print = JasperFillManager.fillReport(modele, parametres, new JRBeanCollectionDataSource(lignes));
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
