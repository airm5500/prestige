/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

package toolkits.security;

/**
 *
 * @author Administrator
 */
public class UPCACodeGenerator {

    public static final long A = 99999999977l;

    public static final long B = 11371317311l;

    public static long get11DigitCode(long n) {
        return (n * B) % A;
    }

    public static int get4DigitPIN(){
        int value = (int)(Math.random() * 8847);
        if(value <1000)
            value = value +1000;
        return value;
    }

}
