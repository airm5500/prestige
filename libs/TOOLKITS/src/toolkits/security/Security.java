/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package toolkits.security;

import java.security.SecureRandom;
import org.bouncycastle.crypto.CryptoException;
import org.bouncycastle.crypto.KeyGenerationParameters;
import org.bouncycastle.crypto.engines.BlowfishEngine;
import org.bouncycastle.crypto.generators.DESedeKeyGenerator;
import org.bouncycastle.crypto.modes.CBCBlockCipher;
import org.bouncycastle.crypto.paddings.PaddedBufferedBlockCipher;
import org.bouncycastle.crypto.params.DESedeParameters;
import org.bouncycastle.crypto.params.KeyParameter;
import org.bouncycastle.util.encoders.Hex;

/**
 *
 * @author Admin
 */
public class Security {

    private PaddedBufferedBlockCipher cipher = null;
    private String key = "x-392kla%3$1f";
    private byte[] key1 = null;

    public Security() {
        cipher = new PaddedBufferedBlockCipher(new CBCBlockCipher(new BlowfishEngine()));
    }

    public String encryptData(String data) {
        // Get the contents from the textbox
        genere_cle();
        String result = "";
        byte[] inBytes = data.getBytes();

        // Initialize the cipher. 'true' specifies encrypting
        cipher.init(true, new KeyParameter(key.getBytes()));

        // Determine the minimum output buffer size
        byte[] outBytes = new byte[cipher.getOutputSize(inBytes.length)];

        // 'len' is the actual size returned
        int len = cipher.processBytes(inBytes, 0, inBytes.length, outBytes, 0);
        try {
            // Process the last block in the buffer, starting at 'len' location
            cipher.doFinal(outBytes, len);

            // Update the textbox with the new encrypted string
            //  textBox.setString(new String(Hex.encode(outBytes)));

            // Debug message
            System.out.println("encrypted: " + new String(Hex.encode(outBytes)));
            result = new String(Hex.encode(outBytes));
        } catch (CryptoException e) {
            System.out.println("Exception: " + e.toString());
        }
        // result = data;
        return result;
    }

    /*--------------------------------------------------
     * Decrypt data in the textbox. Place data
     * back into textbox upon completion.
     *-------------------------------------------------*/
    public String decryptData(String data) {
        int test = 0;
        //DESACTIVE LA VERSION CRYPTE
        if (test == 0) {
            return data;
        }

        // Get the text to decrypt from the textbox
        String result = "";
        byte[] inBytes = Hex.decode(data.getBytes());

        // Initialize the cipher. 'false' specifies decrypting
        cipher.init(false, new KeyParameter(key.getBytes()));

        // Determine the minimum output buffer size
        byte[] outBytes = new byte[cipher.getOutputSize(inBytes.length)];

        // 'len' is the actual size returned
        int len = cipher.processBytes(inBytes, 0, inBytes.length, outBytes, 0);

        try {
            // Process the last block in the buffer, starting at 'len' location
            cipher.doFinal(outBytes, len);

            // Update the textbox with the decrypted string
            //  textBox.setString(new String(outBytes).trim());

            System.out.println("decrypted: " + new String(outBytes).trim());
            result = new String(outBytes).trim();
        } catch (CryptoException e) {
            System.out.println("Exception: " + e.toString());
        }
        //  result = data;
        return result;
    }

    public final void genere_cle() {

        //le SecureRadom sera un parametre pour la generation de la cle
        SecureRandom sr = null;
        try {
            sr = new SecureRandom();
            sr.setSeed("x-392kla%3$1f".getBytes());
        } catch (Exception nsa) {
            System.err.println("Hmmm, no SHA1PRNG, you need the " + "Sun implementation");
            System.exit(1);
        }
        KeyGenerationParameters kgp = new KeyGenerationParameters(sr, DESedeParameters.DES_EDE_KEY_LENGTH * 8);
        DESedeKeyGenerator kg = new DESedeKeyGenerator();
        kg.init(kgp);
        key1 = kg.generateKey();
    }
}
