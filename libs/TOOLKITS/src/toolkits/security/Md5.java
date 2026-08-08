/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package toolkits.security;

/**
 *
 * @author Administrator
 */
import java.security.*;

public class Md5 {
    /*

     * Encode la chaine passé en paramètre avec l’algorithme MD5

     * @param key : la chaine à encoder

     * @return la valeur (string) hexadécimale sur 32 bits

     */

    public static String encode(String key) {

        byte[] uniqueKey = key.getBytes();

        byte[] hash = null;



        try {

// on récupère un objet qui permettra de crypter la chaine

            hash = MessageDigest.getInstance("MD5").digest(uniqueKey);

        } catch (NoSuchAlgorithmException e) {

            throw new Error("no MD5 support in this VM");

        }



        StringBuffer hashString = new StringBuffer();

        for (int i = 0; i < hash.length; ++i) {

            String hex = Integer.toHexString(hash[i]);

            if (hex.length() == 1) {

                hashString.append('0');

                hashString.append(hex.charAt(hex.length() - 1));

            } else {

                hashString.append(hex.substring(hex.length() - 2));

            }

        }

        return hashString.toString();

    }

    public static String SimpleUPCA(String DataToEncode) {
        int idx = 0;				//for loop counter
        int LenOfData;				//length of a string
        String GoodData = "";		//Invalid characters stripped from DataToEncode
        String cData;				//character array representation of a string to check ascii values of characters
        String EAN5AddOn = "";		//5 digit EAN Add On code
        String EAN2AddOn = "";		//2 digit EAN Add On code
        int WeightFactor = 0;		//Weighting multiplier for calculating check digit
        int WeightedTotal = 0;		//Weighted Total for creating check digit
        int CheckDigit = 0;			//This is the check digit for our upc code
        int iCurrentChar = 0;		//ASCII value of current character.
        int iCharNumber = 0;		//actual value of a numeric character string

        cData = DataToEncode;
        LenOfData = DataToEncode.length();
        for (idx = 0; idx < LenOfData; idx++) {
            /* Add all numbers to GoodData string */
            if (cData.charAt(idx) >= 48 && cData.charAt(idx) <= 57) {
                GoodData = GoodData + cData.charAt(idx);
            }
        }	//end loop for checking characters

        if (GoodData.length() < 11) {
            GoodData = "00000000000";
        }
        if (GoodData.length() == 15) {
            GoodData = "00000000000";
        }
        if (GoodData.length() > 18) {
            GoodData = "00000000000";
        }
        if (GoodData.length() == 12) {
            GoodData = GoodData.substring(0, 11);
        }
        if (GoodData.length() == 14) {
            GoodData = GoodData.substring(0, 11) + GoodData.substring(12, 14);
        }
        if (GoodData.length() == 17) {
            GoodData = GoodData.substring(0, 11) + GoodData.substring(12, 17);
        }
        //set the addon if it exists
        if (GoodData.length() == 16) {
            EAN5AddOn = GoodData.substring(11, 16);
        }
        if (GoodData.length() == 13) {
            EAN2AddOn = GoodData.substring(11, 13);
        }

        GoodData = GoodData.substring(0, 11);
        /* <<<< Calculate Check Digit and add it to the end of the GoodData string for
         * bar code generation>>>> */
        WeightFactor = 3;
        WeightedTotal = 0;
        LenOfData = 11;
        for (idx = (LenOfData - 1); idx >= 0; idx--) {
            /* Get the value of each character string starting at the end */
            iCharNumber = Integer.parseInt("" + GoodData.charAt(idx));
            /* multiply by the weighting factor which is 3,1,3,1... */
            /* and add the sum together */
            WeightedTotal = WeightedTotal + (iCharNumber * WeightFactor);

            /* change factor for next calculation */
            WeightFactor = 4 - WeightFactor;
        }	//end loop creating Weighted Total for Check digit

        /* Find the CheckDigit by finding the number + weightedTotal that = a multiple of 10 */
        /* divide by 10, get the remainder and subtract from 10 */
        CheckDigit = WeightedTotal % 10;
        if (CheckDigit != 0) {
            CheckDigit = 10 - CheckDigit;
        } else {
            CheckDigit = 0;
        }
        //Add the check digit to our GoodData string representing our actual bar code data
        GoodData = GoodData + CheckDigit;
        return GoodData;
    }
}
