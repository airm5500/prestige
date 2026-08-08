/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package toolkits.utils.StringComplexUtils;

import java.util.ArrayList;
import java.util.List;
import toolkits.parameters.commonparameter;
import toolkits.utils.StringUtils;
import toolkits.utils.logger;

/**
 *
 * @author user
 */
public class DataManager {

    public List<Data> lstData = new ArrayList<Data>();

    public String getStringOccurence(String str_Data) {

        String[] part = StringUtils.split(str_Data, commonparameter.SEPARATEUR_POINT_VIRGULE);
        for (int i = 0; i < part.length; i++) {
            String[] partIn = StringUtils.split(part[i], commonparameter.SEPARATEUR_TRAIS_6);
            String strPrice = "0";
            int value = 0;
            if (partIn.length > 1) {
                value = new Integer(partIn[1]);
                new logger().OCategory.info("value   "+value);
            }
            this.store(partIn[0], value);
        }
        return this.display(lstData);
    }

    public void store(String Odata, int value) {

        if (this.checkIfexist(Odata)) {
        } else {
            Data ODataString = new Data();
            ODataString.key = Odata;
            ODataString.Value = value;
            ODataString.UnitPrice = new Integer("1");
            lstData.add(ODataString);
        }
    }

    public boolean checkIfexist(String Odata) {
        int val = 0;
        for (int i = 0; i < lstData.size(); i++) {
            if (Odata.equals(lstData.get(i).key)) {
               val =  lstData.get(i).Value +1;
                return true;
            }
        }
        return false;
    }

    public String display(List<Data> lstTemp) {
        String strResul = "";
        for (int i = 0; i < lstTemp.size(); i++) {
            strResul = strResul + lstTemp.get(i).key + "(" + lstTemp.get(i).Value + ")";
        }
        new logger().OCategory.info(strResul);
        return strResul;
    }
    
    
   
}
