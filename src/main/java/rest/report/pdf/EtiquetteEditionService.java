package rest.report.pdf;

import dal.TEtiquette;
import dal.TFamille;
import dal.TOfficine;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import toolkits.parameters.commonparameter;
import toolkits.utils.conversion;
import toolkits.utils.date;

/**
 * Alimente le moteur d'edition NOUVEAU (planche PDF vectorielle) a partir des etiquettes du menu Gestion etiquettes.
 *
 * Le moteur ANCIEN construit ces memes etiquettes dans deux pages JSP (ws_generate_pdf.jsp pour une ligne de la grille,
 * ws_generate_etiquette_pdf.jsp pour l'etiquettage massif) via JasperReports. Les donnees portees par une etiquette
 * sont les memes dans les deux moteurs : nom abrege de l'officine, designation et CIP du produit, prix de vente et date
 * du jour. Le grossiste, present sur les etiquettes issues d'un bon de livraison, n'existe pas ici : la ligne
 * correspondante n'affiche donc que la date, comme dans le modele JasperReports.
 *
 * @author koben
 */
@Stateless
public class EtiquetteEditionService {

    private static final Logger LOG = Logger.getLogger(EtiquetteEditionService.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /**
     * Etiquettes d'une ligne de la grille Gestion etiquettes : int_NUMBER exemplaires du meme produit, comme le fait
     * ws_generate_pdf.jsp.
     */
    public List<LabelSheetPdf.LabelData> etiquettesDeLaLigne(String idEtiquette) {
        TEtiquette etiquette = em.find(TEtiquette.class, idEtiquette);
        if (etiquette == null) {
            LOG.log(Level.WARNING, "etiquette introuvable : {0}", idEtiquette);
            return new ArrayList<>();
        }
        return construire(Collections.singletonList(etiquette));
    }

    /**
     * Etiquettes du panier d'etiquettage massif : toutes les lignes en preparation, chacune repetee int_NUMBER fois,
     * dans l'ordre retenu par ws_generate_etiquette_pdf.jsp.
     *
     * Le moteur ANCIEN passe par listeEtiquette("", is_Process), dont le filtre de recherche vide se traduit par un
     * LIKE '%%%' : celui-ci ecarterait une ligne dont le CIP, la designation et l'EAN13 seraient tous nuls. On ne
     * conserve ici que le critere utile, le statut.
     */
    public List<LabelSheetPdf.LabelData> etiquettesEnPreparation() {
        List<TEtiquette> etiquettes = em
                .createQuery("SELECT t FROM TEtiquette t WHERE t.strSTATUT = ?1 ORDER BY t.dtUPDATED DESC",
                        TEtiquette.class)
                .setParameter(1, commonparameter.statut_is_Process).getResultList();
        return construire(etiquettes);
    }

    /**
     * Marque la ligne comme editee, exactement comme le moteur ANCIEN le fait en fin de generation : sans cela
     * l'etiquette resterait indefiniment a l'etat « a editer » dans la grille.
     */
    public void marquerImprimee(String idEtiquette) {
        try {
            TEtiquette etiquette = em.find(TEtiquette.class, idEtiquette);
            if (etiquette != null) {
                etiquette.setStrSTATUT(commonparameter.statut_Read);
                em.merge(etiquette);
            }
        } catch (Exception e) {
            // Le PDF est deja parti au navigateur : un echec ici ne doit pas casser l'edition.
            LOG.log(Level.SEVERE, "marquerImprimee " + idEtiquette, e);
        }
    }

    private List<LabelSheetPdf.LabelData> construire(List<TEtiquette> etiquettes) {
        List<LabelSheetPdf.LabelData> labels = new ArrayList<>();
        String dateDuJour = date.DateToString(new Date(), date.formatterShortBis);
        String nomOfficine = nomOfficine();
        for (TEtiquette etiquette : etiquettes) {
            TFamille famille = etiquette.getLgFAMILLEID();
            if (famille == null) {
                continue;
            }
            String prix = conversion.AmountFormat(famille.getIntPRICE(), ' ') + " CFA";
            int exemplaires = nombreExemplaires(etiquette.getIntNUMBER());
            for (int i = 0; i < exemplaires; i++) {
                labels.add(new LabelSheetPdf.LabelData(nomOfficine, "", famille.getStrDESCRIPTION(),
                        famille.getIntCIP(), prix, dateDuJour));
            }
        }
        return labels;
    }

    /** int_NUMBER est stocke en texte : une valeur absente ou illisible ne doit pas faire echouer l'edition. */
    static int nombreExemplaires(String intNumber) {
        try {
            int valeur = Integer.parseInt(StringUtils.trimToEmpty(intNumber));
            return Math.max(valeur, 0);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private String nomOfficine() {
        try {
            TOfficine officine = em.find(TOfficine.class, "1");
            return officine != null ? officine.getStrNOMABREGE() : "";
        } catch (Exception e) {
            LOG.log(Level.WARNING, "nomOfficine", e);
            return "";
        }
    }
}
