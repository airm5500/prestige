package rest.service.impl;

import commonTasks.dto.ArticleDTO;
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
import net.sf.jasperreports.engine.JRException;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import net.sf.jasperreports.engine.export.JRPdfExporter;
import net.sf.jasperreports.export.SimpleExporterInput;
import net.sf.jasperreports.export.SimpleOutputStreamExporterOutput;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.report.ReportUtil;
import rest.service.dto.StockReserveLigneDTO;

/**
 * Edition « stock avec reserve » (evolution 5, point 4), partagee par « comparaison stock article » et « etat de stock
 * ».
 *
 * <p>
 * C'est une edition NOUVELLE, servie a cote des editions existantes de ces deux ecrans, et non un remplacement :
 * rp_comparaison_surstock et rp_etatdestock, installes sur les sites, ne sont pas touches et continuent de sortir
 * exactement comme avant. Le modele de celle-ci ({@code /reports/stock_reserve.jrxml}) est embarque dans l'application,
 * donc present partout sans installation.
 * </p>
 */
@Stateless
public class StockReserveEditionService {

    private static final Logger LOG = Logger.getLogger(StockReserveEditionService.class.getName());

    /** Modele embarque : aucun fichier a poser sur les sites pour que cette edition fonctionne. */
    public static final String MODELE = "stock_reserve";

    @EJB
    private ReportUtil reportUtil;

    /**
     * Trie les lignes PAR EMPLACEMENT, puis par designation.
     *
     * <p>
     * Retour du 17/09 sur les deux editions de reserve : « trier par emplacement les produits ». Un releve de stock se
     * fait rayon par rayon, en marchant devant les etageres ; une liste dans l'ordre alphabetique des medicaments
     * oblige a traverser l'officine a chaque ligne. C'est la difference entre une feuille utilisable et une feuille
     * qu'on recopie a la main avant de s'en servir.
     *
     * <p>
     * Les articles sans emplacement renseigne passent EN DERNIER : leur libelle vide les placerait en tete, la ou l'on
     * commence a compter. Le tri ignore la casse et les espaces de bord, faute de quoi « T3 » et « t3 » formeraient
     * deux rayons distincts.
     *
     * <p>
     * Le tri est fait ici, dans l'edition, et non dans les requetes des deux ecrans : ceux-ci affichent leurs lignes
     * dans l'ordre que l'utilisateur a choisi a l'ecran, et cet ordre-la ne doit pas changer.
     */
    static void trierParEmplacement(List<StockReserveLigneDTO> lignes) {
        if (lignes == null) {
            return;
        }
        lignes.sort((a, b) -> {
            String ea = StringUtils.trimToEmpty(a.getEmplacement());
            String eb = StringUtils.trimToEmpty(b.getEmplacement());
            if (ea.isEmpty() != eb.isEmpty()) {
                return ea.isEmpty() ? 1 : -1;
            }
            int parEmplacement = ea.compareToIgnoreCase(eb);
            if (parEmplacement != 0) {
                return parEmplacement;
            }
            return StringUtils.trimToEmpty(a.getLibelle()).compareToIgnoreCase(StringUtils.trimToEmpty(b.getLibelle()));
        });
    }

    /** Lignes de l'edition a partir des lignes de « comparaison stock article ». */
    public List<StockReserveLigneDTO> lignesComparaison(List<ArticleDTO> articles) {
        List<StockReserveLigneDTO> lignes = new ArrayList<>();
        for (ArticleDTO a : articles) {
            lignes.add(new StockReserveLigneDTO(a.getCode(), a.getLibelle(),
                    StringUtils.defaultString(a.getFilterLibelle()), StringUtils.defaultString(a.getFamilleLibelle()),
                    a.getStock(), a.getStockReserve(), a.getPrixAchat(), a.getPrixVente()));
        }
        return lignes;
    }

    /**
     * Lignes de l'edition a partir des lignes de « etat de stock », servies en JSON par StockManager.
     *
     * <p>
     * Quand le parametre AFFICHER_STOCK masque les quantites, les trois colonnes sont absentes du JSON : l'edition ne
     * doit pas les reconstituer. La ligne est alors rendue a zero, comme la grille l'affiche vide.
     * </p>
     */
    public List<StockReserveLigneDTO> lignesEtatStock(JSONArray resultats) {
        List<StockReserveLigneDTO> lignes = new ArrayList<>();
        for (int i = 0; i < resultats.length(); i++) {
            JSONObject o = resultats.getJSONObject(i);
            boolean afficherStock = o.optBoolean("afficherStock", false);
            lignes.add(new StockReserveLigneDTO(o.optString("int_CIP", ""), o.optString("str_NAME", ""),
                    o.optString("CODEEMPLACEMENT", ""), o.optString("lg_GROSSISTE_ID", ""),
                    afficherStock ? o.optInt("int_NUMBER", 0) : 0,
                    afficherStock ? o.optInt("int_NUMBER_RESERVE", 0) : 0, o.optInt("int_NUMBER_ENTREE", 0),
                    o.optInt("int_PRICE", 0)));
        }
        return lignes;
    }

    /**
     * Produit le PDF. Rendu en memoire et non ecrit sur le disque : l'edition est servie en flux dans l'onglet ouvert
     * par le clic, sans fichier temporaire a nettoyer ni fenetre intermediaire.
     */
    public byte[] editer(TUser operateur, String titre, String criteres, List<StockReserveLigneDTO> lignes)
            throws JRException {
        trierParEmplacement(lignes);
        Map<String, Object> parametres = new HashMap<>();
        try {
            parametres.putAll(reportUtil.officineData(operateur));
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "en-tete de l'officine indisponible pour l'edition du stock avec reserve", e);
        }
        parametres.put("P_TITRE", titre);
        parametres.put("P_CRITERES", StringUtils.defaultString(criteres));

        JasperReport modele = reportUtil.compileFromClasspath(MODELE);
        if (modele == null) {
            throw new JRException("Modele embarque " + MODELE + ".jrxml introuvable dans l'application");
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
}
