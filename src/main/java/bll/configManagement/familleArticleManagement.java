package bll.configManagement;

import bll.bllBase;
import dal.TFamille;
import dal.TFamillearticle;
import dal.dataManager;
import dal.jconnexion;
import java.sql.ResultSetMetaData;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author AKOUAME
 */
public class familleArticleManagement extends bllBase {

    Object Otable = TFamille.class;

    public familleArticleManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public void create(String str_CODE_FAMILLE, String str_LIBELLE, String str_COMMENTAIRE,
            String lg_GROUPE_FAMILLE_ID) {

        try {

            TFamillearticle OTFamillearticle = new TFamillearticle();

            OTFamillearticle.setLgFAMILLEARTICLEID(this.getKey().getComplexId());
            OTFamillearticle.setStrCODEFAMILLE(str_CODE_FAMILLE);
            OTFamillearticle.setStrLIBELLE(str_LIBELLE);
            OTFamillearticle.setStrCOMMENTAIRE(str_COMMENTAIRE);

            // lg_GROUPE_FAMILLE_ID
            dal.TGroupeFamille OTGroupeFamille = getOdataManager().getEm().find(dal.TGroupeFamille.class,
                    lg_GROUPE_FAMILLE_ID);
            if (OTGroupeFamille != null) {
                OTFamillearticle.setLgGROUPEFAMILLEID(OTGroupeFamille);
                new logger().oCategory.info("lg_GROUPE_FAMILLE_ID     Create   " + lg_GROUPE_FAMILLE_ID);
            }

            OTFamillearticle.setStrSTATUT(commonparameter.statut_enable);
            OTFamillearticle.setDtCREATED(new Date());

            if (this.persiste(OTFamillearticle)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de création de la forme d'article");
            }

        } catch (Exception e) {
            this.buildErrorTraceMessage("Echec de création de la forme d'article");
        }

    }

    public void update(String lg_FAMILLEARTICLE_ID, String str_CODE_FAMILLE, String str_LIBELLE, String str_COMMENTAIRE,
            String lg_GROUPE_FAMILLE_ID) {

        try {

            TFamillearticle OTFamillearticle = null;

            OTFamillearticle = getOdataManager().getEm().find(TFamillearticle.class, lg_FAMILLEARTICLE_ID);

            // lg_GROUPE_FAMILLE_ID
            dal.TGroupeFamille OTGroupeFamille = getOdataManager().getEm().find(dal.TGroupeFamille.class,
                    lg_GROUPE_FAMILLE_ID);
            if (OTGroupeFamille != null) {
                OTFamillearticle.setLgGROUPEFAMILLEID(OTGroupeFamille);
                new logger().oCategory.info("lg_GROUPE_FAMILLE_ID     Create   " + lg_GROUPE_FAMILLE_ID);
            }

            OTFamillearticle.setStrCODEFAMILLE(str_CODE_FAMILLE);
            OTFamillearticle.setStrLIBELLE(str_LIBELLE);
            OTFamillearticle.setStrCOMMENTAIRE(str_COMMENTAIRE);

            OTFamillearticle.setStrSTATUT(commonparameter.statut_enable);
            OTFamillearticle.setDtUPDATED(new Date());

            this.persiste(OTFamillearticle);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            String Description = "Modification TFamillearticle " + OTFamillearticle.getStrLIBELLE();
            this.do_event_log(Ojconnexion, commonparameter.ALL, Description, this.getOTUser().getStrLOGIN(),
                    commonparameter.statut_enable, "TFamillearticle", "Donnee de ref", "");

        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }
    }

    // liste des familles articles
    public List<TFamillearticle> getAllFamilleArticle(String search_value, String lg_FAMILLEARTICLE_ID) {
        List<TFamillearticle> lstTFamillearticle = new ArrayList<TFamillearticle>();

        try {
            lstTFamillearticle = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TFamillearticle t WHERE t.lgFAMILLEARTICLEID LIKE ?1 AND t.strLIBELLE LIKE ?2 AND t.strSTATUT LIKE ?3 ")
                    .setParameter(1, lg_FAMILLEARTICLE_ID).setParameter(2, "%" + search_value + "%")
                    .setParameter(3, commonparameter.statut_enable).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTFamillearticle taille dans getAllFamilleArticle " + lstTFamillearticle.size());
        return lstTFamillearticle;
    }

    // fin liste des familles articles

    // supprimer famille article
    public boolean deleteFamilleArticle(String lg_FAMILLEARTICLE_ID) {
        boolean result = false;
        try {
            TFamillearticle OTFamillearticle = this.getOdataManager().getEm().find(TFamillearticle.class,
                    lg_FAMILLEARTICLE_ID);
            if (this.delete(OTFamillearticle)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de suppression de la famille article");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression de la famille article");
        }
        return result;
    }
    // fin supprimer famille article

    // liste des familles d'un inventaire
    public List<TFamillearticle> getListFamilleFromInventaire(String search_value, String lg_INVENTAIRE_ID) {
        List<TFamillearticle> lstTFamillearticle = new ArrayList<TFamillearticle>();
        TFamillearticle OTFamillearticle = null;
        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            String qry = "SELECT DISTINCT(t.lg_FAMILLEARTICLE_ID), t.str_LIBELLE FROM t_famillearticle t, t_inventaire_famille i, t_famille f WHERE f.lg_FAMILLEARTICLE_ID = t.lg_FAMILLEARTICLE_ID AND f.lg_FAMILLE_ID = i.lg_FAMILLE_ID AND (t.str_LIBELLE LIKE '"
                    + search_value + "%' OR t.str_CODE_FAMILLE LIKE '" + search_value + "%') AND i.lg_INVENTAIRE_ID = '"
                    + lg_INVENTAIRE_ID + "' ORDER BY t.str_LIBELLE";
            new logger().OCategory.info(qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                OTFamillearticle = new TFamillearticle();
                OTFamillearticle.setLgFAMILLEARTICLEID(Ojconnexion.get_resultat().getString("lg_FAMILLEARTICLE_ID"));
                OTFamillearticle.setStrLIBELLE(Ojconnexion.get_resultat().getString("str_LIBELLE"));
                lstTFamillearticle.add(OTFamillearticle);
            }
            Ojconnexion.CloseConnexion();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTFamillearticle taille " + lstTFamillearticle.size());
        return lstTFamillearticle;
    }

    // fin liste des familles d'un inventaire
}
