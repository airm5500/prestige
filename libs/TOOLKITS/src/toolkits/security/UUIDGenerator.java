/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

package toolkits.security;

import java.security.SecureRandom;

/**
 *
 * @author Admin
 */
public class UUIDGenerator {
private final SecureRandom secRand = new SecureRandom();

	/**
	 * 128-bit buffer for use with secRand
	 */
	private final byte[] secRandBuf16 = new byte[16];

	public UUIDGenerator() {
		super();
	}

	/**
	 * @return	uuid as String
	 */
	public String newUUID() {
		secRand.nextBytes(secRandBuf16);
		secRandBuf16[6] &= 0x0f;
		secRandBuf16[6] |= 0x40; /* version 4 */
		secRandBuf16[8] &= 0x3f;
		secRandBuf16[8] |= 0x80; /* IETF variant */
		secRandBuf16[10] |= 0x80; /* multicast bit */
		long mostSig = 0;
		for (int i = 0; i < 8; i++) {
			mostSig = (mostSig << 8) | (secRandBuf16[i] & 0xff);
		}
		long leastSig = 0;
		for (int i = 8; i < 16; i++) {
			leastSig = (leastSig << 8) | (secRandBuf16[i] & 0xff);
		}
		return (digits(mostSig >> 32, 8) + "-" + digits(mostSig >> 16, 4) + "-"  //$NON-NLS-1$//$NON-NLS-2$
				+ digits(mostSig, 4) + "-" + digits(leastSig >> 48, 4) + "-" + digits(  //$NON-NLS-1$//$NON-NLS-2$
				leastSig, 12));
	}

	/** Returns val represented by the specified number of hex digits. */
	private static String digits(long val, int digits) {
		long hi = 1L << (digits * 4);
		return Long.toHexString(hi | (val & (hi - 1))).substring(1);
	}

}