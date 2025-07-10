/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package util;

import java.time.LocalDateTime;

/**
 *
 * @author koben
 */
public class IdGenerator {

    public static String getNumberRandom() {
        return String.valueOf((int) (Math.random() * 10000 + 1));
    }

    public static String getComplexId() {
        LocalDateTime now = LocalDateTime.now();
        int mm = now.getMinute();
        int ss = now.getSecond();
        int mls = now.getNano();
        String catime = (String.valueOf(mm) + "" + ss + "" + mls);
        int intLenght = catime.length();
        if (intLenght < 20) {
            catime = catime + getNumberRandom();
        }
        if (intLenght == 20) {
            return catime;
        }
        if (intLenght > 20) {
            return catime.substring(0, 20);
        }
        return catime;
    }
}
