/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package toolkits.security;

import org.jasypt.util.text.BasicTextEncryptor;

/**
 *
 * @author Admin
 */
public class Cryptages {

    String myEncryptionPassword = "key";

    public String cryptage(String Ovalue) {
          String Ovalue_temp = Ovalue;
         try {
      
        String myDataBasePassword = Ovalue;
        BasicTextEncryptor textEncryptor = new BasicTextEncryptor();
        textEncryptor.setPassword(myEncryptionPassword);
        //   System.out.println("Mon mot de passe en clair est : " + myDataBasePassword);
        String myEncryptedPassword = textEncryptor.encrypt(myDataBasePassword);
        // System.out.println("Mon mot de passe crypté avec la clé : " + myEncryptionPassword + " est " + myEncryptedPassword);
        Ovalue_temp = myEncryptedPassword;
       
        } catch (Exception ex) {
            ex.printStackTrace();
            Ovalue_temp = Ovalue;
        }
        return Ovalue_temp;
    }

    public String decryptage(String Ovalue) {

        String Ovalue_temp = Ovalue;
        try {
            BasicTextEncryptor textEncryptor = new BasicTextEncryptor();
            textEncryptor.setPassword(myEncryptionPassword);
            //  2 - Décryptage
            String plainText = textEncryptor.decrypt(Ovalue);
            //mon mot de passe après décryptage avec la même clé
           // System.out.println("Après décryptage avec la clé : " + myEncryptionPassword + " on obtient : " + plainText);
            Ovalue_temp = plainText;

        } catch (Exception e) {
           // e.printStackTrace();
            Ovalue_temp = Ovalue;
        }
        return Ovalue_temp;
    }
}
