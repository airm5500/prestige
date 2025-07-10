
package bll.configManagement;

import bll.bllBase;
import dal.TCategoryClient;
import dal.TUser;
import dal.dataManager;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 *
 * @author KKOFFI
 */
public class CategoryClientManager extends bllBase {
    private CategoryClientController categoryController = null;

    public CategoryClientManager(dataManager O, TUser OTUser) {
        categoryController = new CategoryClientController(O.getEmf());

    }

    public boolean create(String str_LIBELLE, String str_Description, Short int_taux) {
        boolean isOk = false;
        TCategoryClient tcc = new TCategoryClient(this.getKey().getComplexId());
        tcc.setStrLIBELLE(str_LIBELLE);
        tcc.setStrDESCRIPTION(str_Description);

        try {
            isOk = categoryController.create(tcc);

        } catch (Exception e) {
            e.printStackTrace();
        }

        return isOk;
    }

    public boolean update(String id, String str_LIBELLE, String str_Description, Short int_taux) {
        boolean isOk = false;

        try {

            TCategoryClient c = categoryController.getEntityManager().find(TCategoryClient.class, id.trim());
            c.setStrLIBELLE(str_LIBELLE);
            c.setStrDESCRIPTION(str_Description);

            isOk = categoryController.edit(c);
        } catch (Exception e) {
            e.printStackTrace();
        }

        return isOk;
    }

    public boolean delete(String id) {
        boolean isOk = false;
        try {
            isOk = categoryController.destroy(id);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return isOk;
    }

    public JSONArray findCategoryClientEntities(int maxResults, int firstResult, String str_LIBELLE) {
        List<TCategoryClient> list = categoryController.findTCategoryClientEntities(maxResults, firstResult,
                str_LIBELLE);
        JSONArray array = new JSONArray();
        list.forEach((oCategoryClient) -> {
            JSONObject json = new JSONObject();
            try {
                json.put("lg_CATEGORY_CLIENT_ID", oCategoryClient.getLgCATEGORYCLIENTID());
                json.put("str_LIBELLE", oCategoryClient.getStrLIBELLE());
                json.put("str_ESCRIPTION", oCategoryClient.getStrDESCRIPTION());

                array.put(json);
            } catch (JSONException ex) {
                ex.printStackTrace();
            }
        });
        return array;
    }

}
