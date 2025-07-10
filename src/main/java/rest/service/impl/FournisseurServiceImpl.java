package rest.service.impl;

import dal.Groupefournisseur;
import dal.TGrossiste;
import java.util.List;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.FournisseurService;
import util.DateCommonUtils;

/**
 *
 * @author koben
 */
@Stateless
public class FournisseurServiceImpl implements FournisseurService {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public JSONObject getAll(String search) {
        String qu = StringUtils.isNotEmpty(search) ? search + "%" : "%%";
        TypedQuery<TGrossiste> query = em.createQuery(
                "SELECT o FROM TGrossiste o WHERE o.strSTATUT='enable' AND (o.strLIBELLE LIKE ?1 OR o.strCODE LIKE ?1) ORDER BY o.strLIBELLE ASC",
                TGrossiste.class);
        query.setParameter(1, qu);
        List<TGrossiste> grossistes = query.getResultList();
        JSONArray array = new JSONArray();
        grossistes.forEach(grossiste -> array.put(buildData(grossiste)));
        JSONObject json = new JSONObject();
        json.put("total", array.length());
        json.put("results", array);
        return json;
    }

    private JSONObject buildData(TGrossiste grossiste) {
        JSONObject json = new JSONObject();

        json.put("lg_GROSSISTE_ID", grossiste.getLgGROSSISTEID());

        json.put("str_LIBELLE", grossiste.getStrLIBELLE());
        json.put("str_DESCRIPTION", grossiste.getStrDESCRIPTION());
        json.put("str_ADRESSE_RUE_1", grossiste.getStrADRESSERUE1());
        json.put("str_ADRESSE_RUE_2", grossiste.getStrADRESSERUE2());
        json.put("str_CODE_POSTAL", grossiste.getStrCODEPOSTAL());
        json.put("str_BUREAU_DISTRIBUTEUR", grossiste.getStrBUREAUDISTRIBUTEUR());
        json.put("str_MOBILE", grossiste.getStrMOBILE());
        json.put("str_TELEPHONE", grossiste.getStrTELEPHONE());
        json.put("int_DELAI_REGLEMENT_AUTORISE", grossiste.getIntDELAIREGLEMENTAUTORISE());
        json.put("str_CODE", grossiste.getStrCODE());
        Groupefournisseur gr = grossiste.getGroupeId();
        if (gr != null) {
            json.put("groupeId", gr.getId() + "");
        }

        json.put("idrepartiteur", grossiste.getIdRepartiteur());
        json.put("dbl_CHIFFRE_DAFFAIRE", grossiste.getDblCHIFFREDAFFAIRE());

        json.put("lg_CUSTOMER_ID", grossiste.getLgGROSSISTEID());
        if (grossiste.getLgTYPEREGLEMENTID() != null) {
            json.put("lg_TYPE_REGLEMENT_ID", grossiste.getLgTYPEREGLEMENTID().getStrNAME());
        }

        if (grossiste.getLgVILLEID() != null) {
            json.put("lg_VILLE_ID", grossiste.getLgVILLEID().getStrName());
        }
        json.put("str_STATUT", grossiste.getStrSTATUT());
        json.put("int_DELAI_REAPPROVISIONNEMENT", grossiste.getIntDELAIREAPPROVISIONNEMENT());
        json.put("int_COEF_SECURITY", grossiste.getIntCOEFSECURITY());
        json.put("int_DATE_BUTOIR_ARTICLE", grossiste.getIntDATEBUTOIRARTICLE());

        if (grossiste.getDtCREATED() != null) {
            json.put("dt_CREATED", DateCommonUtils.formatDate(grossiste.getDtCREATED()));
        }

        return json;
    }

}
