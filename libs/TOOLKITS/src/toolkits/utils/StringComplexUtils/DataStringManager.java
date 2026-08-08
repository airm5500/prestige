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
public class DataStringManager {

    public List<DataString> lstData = new ArrayList<DataString>();
    public List<String> lst = new ArrayList<String>();

    public String getStringOccurence(String str_Data) {

        String[] part = StringUtils.split(str_Data, commonparameter.SEPARATEUR_POINT_VIRGULE);
        for (int i = 0; i < part.length; i++) {
            String[] partIn = StringUtils.split(part[i], commonparameter.SEPARATEUR_TRAIS_6);
            String strPrice = "0";
            if (partIn.length > 1) {
                strPrice = partIn[1];
              //  new logger().OCategory.info(partIn[1]);
            }
            this.store(partIn[0], strPrice);
        }
        return this.display(lstData);
    }

    public void store(String Odata, String strPrice) {

        if (this.checkIfexist(Odata)) {
        } else {
            DataString ODataString = new DataString();
            ODataString.key = Odata;
            ODataString.Value = 1;
            ODataString.UnitPrice = new Integer(strPrice);
            lstData.add(ODataString);
        }
    }
    
    
     public List<String> store(String Odata) {

        if (this.checkIfexist(Odata)) {
        } else {
            /*DataString ODataString = new DataString();
            ODataString.key = Odata;
            ODataString.Value = 1;
            */
            lst.add(Odata);
        }
        new logger().OCategory.info(" *** lstData *** "+lst.size());
        return lst;
    }

    public boolean checkIfexist(String Odata) {
        for (int i = 0; i < lstData.size(); i++) {
            if (Odata.equals(lstData.get(i).key)) {
                lstData.get(i).Value++;
                return true;
            }
        }
        return false;
    }

    public String display(List<DataString> lstTemp) {
        String strResul = "";
        for (int i = 0; i < lstTemp.size(); i++) {
            strResul = strResul + lstTemp.get(i).key + "(" + lstTemp.get(i).Value + ")";
        }
        new logger().OCategory.info(strResul);
        return strResul;
    }
    
    public static String subStringData(String texte, int begin, int end) {
       // String result = "";
        if(texte.length()>end) {
            texte = texte.substring(begin, end);
        }
        return texte;
    }
}
