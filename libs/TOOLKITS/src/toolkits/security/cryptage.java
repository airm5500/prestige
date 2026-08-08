/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

package toolkits.security;
import java.io.UnsupportedEncodingException;
import java.security.*;
import javax.crypto.*;
import javax.crypto.spec.SecretKeySpec;

/**
 *
 * @author Administrator
 */
public class cryptage {
private Key clef;
	private String cle;
	private byte[] passwordInBytes;

	public cryptage(String cle)
	{
		try
		{
			//passwordInBytes = cle.getBytes("ISO-8859-2");
			//passwordInBytes = cle.getBytes("UTF8");
			passwordInBytes = cle.getBytes("ISO-8859-2");
			clef=new SecretKeySpec(passwordInBytes,"Blowfish");

		} catch (UnsupportedEncodingException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}

	}

	public byte[] getSecretKeyInBites()
	{
		return clef.getEncoded();
	}

	public byte[] cryptageString(String txt)
	{
		return cryptageByte(txt.getBytes());
	}
	public byte[] cryptageByte(byte[] txt)
	{
		try
		{
			Cipher cipher=Cipher.getInstance("Blowfish");

			cipher.init(Cipher.ENCRYPT_MODE,clef);
			return cipher.doFinal(txt);
		}
		catch (Exception e)
		{
			return null;
		}

	}
	public byte[] decryptageInByte(byte[] txt)
	{
		try
		{
			Cipher cipher=Cipher.getInstance("Blowfish");
			cipher.init(Cipher.DECRYPT_MODE,clef);
			return cipher.doFinal(txt);
		}
		catch (Exception e)
		{
			System.out.println(e);
			return null;
		}

	}



	public String decryptageInString(byte[] txt)
	{
		return new String(decryptageInByte(txt));
	}




}
