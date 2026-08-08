/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

package multilangue;

import java.util.Locale;
import toolkits.parameters.commonparameter;


/**
 *
 * @author Administrator
 */
public class Translate {
    private String Key="";
    private String Value="";
    private String Local="";
    private String Local_Lg="";
    private String Local_Cty="";
    
    public Translate(){
         this.Local_Cty =commonparameter.Local_Culture_city_FRANCAIS;
         this.Local_Lg =commonparameter.Local_Culture_Lg_FRANCAIS;
      
    }
    
    
    public String getKey() {
        return Key;
    }

    public void setKey(String Key) {
        this.Key = Key;
    }

    public String getValue(String oKey) {
       String oValue  = oKey;
        try{
        oValue=  java.util.ResourceBundle.getBundle(toolkits.parameters.commonparameter.path_bundle_multilangue, new Locale(this.Local_Lg, this.Local_Cty)).getString(oKey) ;
        }catch(Exception ex){
           
        }
       return oValue;
    }

    public void setValue(String Value) {
        this.Value = Value;
    }

    public String getLocal() {
        return Local;
    }

    public void setLocal(String Local) {
        this.Local = Local;
    }

    public String getLocal_Lg() {
        return Local_Lg;
    }

    public void setLocal_Lg(String Local_Lg) {
        this.Local_Lg = Local_Lg;
    }

    public String getLocal_Cty() {
        return Local_Cty;
    }

    public void setLocal_Cty(String Local_Cty) {
        this.Local_Cty = Local_Cty;
    }

}
