/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package toolkits.utils;

import java.math.BigInteger;

/**
 *
 * @author Admin
 */
public class Maths {

    protected static BigInteger[] table = new BigInteger[100];

    static {
        table[0] = BigInteger.valueOf(1);
    }

    public static synchronized BigInteger facto(int x)
            throws IllegalArgumentException {
        if (x < 0) {
            throw new IllegalArgumentException("x doit etre positif");
        }
        for (int size = 1; size <= x; size++) {
            table[size] = table[size - 1].multiply(BigInteger.valueOf(size));
        }
        return (BigInteger) table[x];
    }
    // The biggest factorial that can be calculated using 64-bit signed longs.
    private static final int MAX_LONG_FACTORIAL = 20;

    // Mask for casting a byte to an int, bit-by-bit (with
    // bitwise AND) with no special consideration for the sign bit.
    private static final int BITWISE_BYTE_TO_INT = 0x000000FF;

    private Maths() {
        // Prevent instantiation.
    }

    /**
     * Calculates the factorial of n where n is a number in the range 0 - 20.
     * Zero factorial is equal to 1. For values of n greater than 20 you must
     * use {@link #bigFactorial(int)}.
     *
     * @param n The factorial to calculate.
     * @return The factorial of n.
     * @see #bigFactorial(int)
     */
    public static long factorial(int n) {
        if (n < 0 || n > MAX_LONG_FACTORIAL) {
            throw new IllegalArgumentException("Argument must be in the range 0 - 20.");
        }
        long factorial = 1;
        for (int i = n; i > 1; i--) {
            factorial *= i;
        }
        return factorial;
    }

    /**
     * Calculates the factorial of n where n is a positive integer. Zero
     * factorial is equal to 1. For values of n up to 20, consider using
     * {@link #factorial(int)} instead since it uses a faster implementation.
     *
     * @param n The factorial to calculate.
     * @return The factorial of n.
     * @see #factorial(int)
     */
    public static BigInteger bigFactorial(int n) {
        if (n < 0) {
            throw new IllegalArgumentException("Argument must greater than or equal to zero.");
        }
        BigInteger factorial = BigInteger.ONE;
        for (int i = n; i > 1; i--) {
            factorial = factorial.multiply(BigInteger.valueOf(i));
        }
        return factorial;
    }

    /**
     * Calculate the first argument raised to the power of the second. This
     * method only supports non-negative powers.
     *
     * @param value The number to be raised.
     * @param power The exponent (must be positive).
     * @return {@code value} raised to {@code power}.
     */
    public static long raiseToPower(int value, int power) {
        if (power < 0) {
            throw new IllegalArgumentException("This method does not support negative powers.");
        }
        long result = 1;
        for (int i = 0; i < power; i++) {
            result *= value;
        }
        return result;
    }

    /**
     * Calculate logarithms for arbitrary bases.
     *
     * @param base The base for the logarithm.
     * @param arg The value to calculate the logarithm for.
     * @return The log of {code arg} in the specified {@code base}.
     */
    public static double log(double base, double arg) {
        // Use natural logarithms and change the base.
        return Math.log(arg) / Math.log(base);
    }

    /**
     * Checks that two values are approximately equal (plus or minus a specified
     * tolerance).
     *
     * @param tolerance How much (in percentage terms, as a percentage of the
     * first value) the values are allowed to differ and still be considered
     * equal. Expressed as a value between 0 and 1.
     * @return true if the values are approximately equal, false otherwise.
     */
    public static boolean approxEquals(double value1,
            double value2,
            double tolerance) {
        if (tolerance < 0 || tolerance > 1) {
            throw new IllegalArgumentException("Tolerance must be between 0 and 1.");
        }
        return Math.abs(value1 - value2) <= value1 * tolerance;
    }

    /**
     * Take four bytes from the specified position in the specified block and
     * convert them into a 32-bit int, using the big-endian convention.
     *
     * @param bytes The data to read from.
     * @param offset The position to start reading the 4-byte int from.
     * @return The 32-bit integer represented by the four bytes.
     */
    public static int convertBytesToInt(byte[] bytes, int offset) {
        return (BITWISE_BYTE_TO_INT & bytes[offset + 3])
                | ((BITWISE_BYTE_TO_INT & bytes[offset + 2]) << 8)
                | ((BITWISE_BYTE_TO_INT & bytes[offset + 1]) << 16)
                | ((BITWISE_BYTE_TO_INT & bytes[offset]) << 24);
    }

    //arrondi de nombre a un modulo
    public static int arrondiModuloOfNumber(int nbre, int modulo) {
        int result = 0, temp_modulo = 0;
        float part = 0;
        String temp_v = "";
        try {
           
            temp_v = String.valueOf(nbre).substring(String.valueOf(nbre).length() - 1, String.valueOf(nbre).length());
            temp_modulo = Integer.parseInt(temp_v)%modulo;
            part = (modulo - 1)/2;
            result = (int) ((part >= temp_modulo) ? (nbre - temp_modulo) : ((nbre - temp_modulo) + modulo));
            new logger().OCategory.info("result:"+result);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }
    //fin 
}
