/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

package toolkits;

/**
 *
 * @author Admin
 */
public class Utils {
private static String	digits = "0123456789abcdef";

    /**
     * Return length many bytes of the passed in byte array as a hex string.
     *
     * @param data the bytes to be converted.
     * @param length the number of bytes in the data block to be converted.
     * @return a hex representation of length bytes of data.
     */
    public static String toHex(byte[] data, int length)
    {
        StringBuffer	buf = new StringBuffer();

        for (int i = 0; i != length; i++)
        {
            int	v = data[i] & 0xff;

            buf.append(digits.charAt(v >> 4));
            buf.append(digits.charAt(v & 0xf));
        }

        return buf.toString();
    }

    /**
     * Return the passed in byte array as a hex string.
     *
     * @param data the bytes to be converted.
     * @return a hex representation of data.
     */
    public static String toHex(byte[] data)
    {
        return toHex(data, data.length);
    }
    
    //fonction pour changer l'imprimante par défaut
    public static void setDefaultPrinter(String printerName) {
        try {
            Runtime rt = Runtime.getRuntime();
            rt.exec("rundll32 printui.dll,PrintUIEntry /y /n \"" + printerName + "\"");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    //fin fonction pour changer l'imprimante par défaut
}
