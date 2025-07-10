
package bll.configManagement;

import bll.bllBase;
import dal.TSpecialite;
import dal.dataManager;
import java.util.Date;
import toolkits.parameters.commonparameter;
import toolkits.utils.date;
import toolkits.utils.logger;

/**
 *
 * @author AMIGONE
 */
public class SpecialiteManagement extends bllBase {

    Object Otable = TSpecialite.class;

    public SpecialiteManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public void create(String str_CODESPECIALITE, String str_LIBELLESPECIALITE) {

        try {

            TSpecialite OTSpecialite = new TSpecialite();

            OTSpecialite.setLgSPECIALITEID(this.getKey().getComplexId());
            OTSpecialite.setStrCODESPECIALITE(str_CODESPECIALITE);
            OTSpecialite.setStrLIBELLESPECIALITE(str_LIBELLESPECIALITE);

            OTSpecialite.setStrSTATUT(commonparameter.statut_enable);
            OTSpecialite.setDtCREATED(new Date());

            this.persiste(OTSpecialite);
            new logger().oCategory.info("Mise a jour OTSpecialite " + OTSpecialite.getLgSPECIALITEID() + " StrName "
                    + OTSpecialite.getStrLIBELLESPECIALITE());

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

    public void update(String lg_SPECIALITE_ID, String str_CODESPECIALITE, String str_LIBELLESPECIALITE) {

        try {

            new logger().oCategory.info("lg_SPECIALITE_ID     Create   " + lg_SPECIALITE_ID);

            dal.TSpecialite OTSpecialite = null;

            OTSpecialite = getOdataManager().getEm().find(TSpecialite.class, lg_SPECIALITE_ID);
            OTSpecialite.setStrCODESPECIALITE(str_CODESPECIALITE);
            OTSpecialite.setStrLIBELLESPECIALITE(str_LIBELLESPECIALITE);

            OTSpecialite.setStrSTATUT(commonparameter.statut_enable);
            OTSpecialite.setDtUPDATED(new Date());

            this.persiste(OTSpecialite);
            new logger().oCategory.info("Mise a jour OTSpecialite " + OTSpecialite.getLgSPECIALITEID() + " StrLabel "
                    + OTSpecialite.getStrLIBELLESPECIALITE());

        } catch (Exception e) {

            new logger().oCategory.info("Mise a jour OTSpecialite IMPOSSIBLE");

        }

    }

}
