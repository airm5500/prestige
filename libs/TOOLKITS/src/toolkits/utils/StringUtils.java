/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package toolkits.utils;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import java.util.Vector;
import toolkits.parameters.commonparameter;

/**
 *
 * @author Administrator
 * classe customisée pour certaines opération sur les  String
 */
public class StringUtils {

    public static String message = "";
    public static String Detailmessage = "";
    public static String TypeOfError = "";
    public static int temp_degres_correspondance = 0;

    public static String reverse(String source) {
        if (source == null || source.length() < 2) {
            return source;
        }
        StringBuffer buf = new StringBuffer(source.length());
        for (int i = source.length() - 1; i >= 0; i--) {
            buf.append(source.charAt(i));
        }
        return buf.toString();
    }

    public static String reverseBet(String source) {
        if (source == null || source.length() <= 2) {
            return source;
        }
        String[] part = split(source, ",");
        String res = "";
        for (int i = part.length - 1; i >= 0; i--) {
            res += part[i] + ",";
        }
        return res.substring(0, res.length() - 1);
    }

    /**
     * Splits a String into many parts
     * @param source the source String
     * @param ex the regular expresion used as separation pattern
     * @return
     */
    public static String[] split(String source, String ex) {

        if (source == null) {
            return null;
        }
        if (ex == null) {
            return new String[]{source};
        }
        String item;
        String s = source;
        Vector res = new Vector();
        int index = s.indexOf(ex);
        while (index > -1) {
            if (s.length() == index) {
                break;
            }
            if (index == 0) {
                s = s.substring(index + 1);
                index = s.indexOf(ex);
                continue;
            }
            item = s.substring(0, index);
            res.addElement(item);
            s = s.substring(index + 1);
            index = s.indexOf(ex);
        }
        if (res.isEmpty() || index == -1) {
            if (!s.equals("")) {
                res.addElement(s);
            }
        }
        return toStringArray(res);
    }

    public static Vector getTab_Start(String source, String ex) {
        String[] Tab_Start = split(source, ex);
        Vector VLst = new Vector();
        for (int i = 0; i < Tab_Start.length; i++) {
            if (Tab_Start[i].equals(commonparameter.SEPARATEUR_ETOILE)) {
                VLst.add(i);
            }
        }
        return VLst;
    }

    /**
     * Split a String (first argument) into many parts of size
     * less or equal to the second argument each
     * @param source
     * @param partSize
     * @return
     */
    public static String[] split(String source, int partSize) {
        if (source == null) {
            return null;
        }
        if (partSize >= source.length()) {
            return new String[]{source};
        }
        String item;
        String s = source;
        Vector res = new Vector();
        while (s.length() > partSize) {
            item = s.substring(0, partSize);
            s = s.substring(partSize + 1);
            res.addElement(item);
        }
        res.addElement(s);
        return toStringArray(res);
    }

    /**
     * 
     * @param str
     * @param sep
     * @param maxNum
     * @return
     */
    public static String[] split(String str, char sep, int maxNum) {
        if (str == null || str.length() == 0) {  /* [1] */
            return new String[0];
        }

        /* [2] */
        Vector results = maxNum == 0 ? new Vector() : new Vector(maxNum);

        StringBuffer buf = new StringBuffer();
        for (int i = 0; i < str.length(); i++) { /* [3] */
            char c = str.charAt(i);

            if (c == sep) {
                if (maxNum != 0) { /* [4] */
                    if ((results.size() + 1) == maxNum) {
                        for (; i < str.length(); i++) {
                            buf.append(str.charAt(i));
                        }
                        break;
                    }
                }

                results.addElement(buf.toString());
                buf.setLength(0);
            } else {
                buf.append(c);
            }
        }

        if (buf.length() > 0) {
            results.addElement(buf.toString());
        }

        return toStringArray(results); /* [5] */
    }

    public static String[] toStringArray(Object[] obs) {

        if (obs == null) {
            return null;
        }
        String[] res = new String[obs.length];
        for (int i = 0; i < obs.length; i++) {
            res[i] = obs[i].toString();
        }
        return res;
    }

    /**
     * Transform a vector of String into an array of String
     * If the argument is null no exception will be thrown
     * but a null object will be returned
     * @param strings a vector of Strings
     * @return an Array of String
     */
    public static String[] toStringArray(Vector strings) {
        if (strings == null) {
            return null;
        }
        String[] result = new String[strings.size()];
        for (int i = 0; i < strings.size(); i++) {
            result[i] = strings.elementAt(i).toString();
        }
        return result;
    }

    /**
     * 
     * @param inStr
     * @return
     */
    public static String chomp(String inStr) {
        if (inStr == null || "".equals(inStr)) {
            return inStr;
        }

        char lastChar = inStr.charAt(inStr.length() - 1);
        if (lastChar == 13) {
            return inStr.substring(0, inStr.length() - 1);
        } else if (lastChar == 10) {
            String tmp = inStr.substring(0, inStr.length() - 1);
            if ("".equals(tmp)) {
                return tmp;
            }
            lastChar = tmp.charAt(tmp.length() - 1);
            if (lastChar == 13) {
                return tmp.substring(0, tmp.length() - 1);
            } else {
                return tmp;
            }
        } else {
            return inStr;
        }
    }

    public static Date toDate(String s) {
        Calendar c = Calendar.getInstance();
        String[] part = split(s, " ");
        String[] date = split(part[0], "-");
        String[] time = split(part[1], ":");
        int dy = Integer.parseInt(date[2]);
        int mt = Integer.parseInt(date[1]);
        int yr = Integer.parseInt(date[0]);
        c.set(Calendar.DATE, dy);
        c.set(Calendar.MONTH, mt);
        c.set(Calendar.YEAR, yr);

        int sc = Integer.parseInt(time[2]);
        int mn = Integer.parseInt(time[1]);
        int hr = Integer.parseInt(time[0]);
        c.set(Calendar.HOUR_OF_DAY, hr);
        c.set(Calendar.MINUTE, mn);
        c.set(Calendar.SECOND, sc);

        return c.getTime();
    }

    public static String toString(Object[] source, String delimiter) {

        if (source == null) {
            return null;
        }
        String res = " ";
        for (int i = 0; i < source.length; i++) {
            res += source[i].toString() + delimiter;
        }
        return res.substring(0, res.length() - 1);
    }

    public static String remove(String source, String s) {
        String res = null;
        if (s == null || s == null) {
            return source;
        }
        String[] ss = split(source, s);
        res = toString(ss, "");
        return res;
    }

    public static String replace(String source, String os, String ns) {
        if (source == null || ns == null || os == null) {
            return source;
        }
        return toString(split(source, os), ns);
    }

    public static boolean CheckNumberOfHorse(String str_combinaison, int sizeOf, String user_separateor) {
        boolean result = false;
        int temp_degres_correspondance = 0;
        Detailmessage = "";
        try {
            String[] Coll_combinaison_ref = null;
            Coll_combinaison_ref = str_combinaison.split(user_separateor);
            result = true;
            message = "";
            int temp_comb;
            for (int i = 0; i < Coll_combinaison_ref.length; i++) {
                if (Coll_combinaison_ref[i].contains(commonparameter.SEPARATEUR_ETOILE)) {
                } else {
                    try {
                        message = Coll_combinaison_ref[i];
                        temp_comb = new Integer(Coll_combinaison_ref[i]);

                    } catch (Exception er) {
                        er.printStackTrace();
                        new logger().OCategory.fatal(er.getMessage());
                        Detailmessage = "NUMERO DE CHEVAL INCORRECT ( " + message + " )";
                        TypeOfError = "3";
                        return false;
                    }

                }
            }

            for (int i = 0; i < Coll_combinaison_ref.length; i++) {
                if (Coll_combinaison_ref[i].contains(commonparameter.SEPARATEUR_ETOILE)) {
                } else if ((new Integer(Coll_combinaison_ref[i]) > sizeOf)) {
                    result = false;
                    if (i < 0) {
                        message = message + "-" + Coll_combinaison_ref[i];
                    } else {
                        message = Coll_combinaison_ref[i];
                    }
                } else if ((new Integer(Coll_combinaison_ref[i]) > sizeOf)) {
                    result = false;
                    if (i < 0) {
                        message = message + "-" + Coll_combinaison_ref[i];
                    } else {
                        message = Coll_combinaison_ref[i];
                    }
                } else {
                }
            }
            if (result) {
                int k = 0;
                for (int i = 0; i < Coll_combinaison_ref.length; i++) {
                    temp_degres_correspondance = 0;
                    for (int j = 0; j < Coll_combinaison_ref.length; j++) {
                        if ((Coll_combinaison_ref[i].equals(Coll_combinaison_ref[j])) && (!Coll_combinaison_ref[i].contains(commonparameter.SEPARATEUR_ETOILE))) {
                            temp_degres_correspondance++;
                            if ((temp_degres_correspondance == 2)) {
                                k++;
                                result = false;
                                if (k > 2) {
                                    message = message + "-" + Coll_combinaison_ref[j];
                                } else {
                                    message = Coll_combinaison_ref[j];
                                }
                            }
                        }
                    }
                }
                if (!result) {
                    Detailmessage = "LES CHEVEAUX ( " + message + " )  APPARAISSE PLUS D 'UNE FOIS";
                    TypeOfError = "1";
                }
            } else {
                Detailmessage = "NUMERO DE CHEVAL > AU NOMBRE DE PARTANT DE LA COURSE ( " + message + " )";
                TypeOfError = "2";
            }
        } catch (Exception ex) {
            return true;
        }
        return result;
    }

    public static int getNumberOfNonPartant(String str_combinaison_parieur, String str_combinaison_non_partant) {
        int degres_correspondance = 1;
        int temp_degres_correspondance = 0;
        try {

            String[] Coll_combinaison_ref = null;
            Coll_combinaison_ref = str_combinaison_parieur.split("-");


            String[] Coll_combinaison_to_evaluate = null;
            Coll_combinaison_to_evaluate = str_combinaison_non_partant.split("-");


            for (int i = 0; i < Coll_combinaison_ref.length; i++) {
                for (int j = 0; j < Coll_combinaison_to_evaluate.length; j++) {
                    if (Coll_combinaison_ref[i].equals(Coll_combinaison_to_evaluate[j])) {
                        temp_degres_correspondance++;
                    }
                }
            }
            if (temp_degres_correspondance == degres_correspondance) {
            }


        } catch (Exception ex) {
            new logger().oCategory.error(ex.getMessage());

        }
        return temp_degres_correspondance;
    }

    public static int getNumberOfHorseInArrive(String str_combinaison_parieur, String str_combinaison_arrive) {
        int degres_correspondance = 1;
        int temp_degres_correspondance = 0;
        try {

            String[] Coll_combinaison_ref = null;
            Coll_combinaison_ref = str_combinaison_parieur.split("-");


            String[] Coll_combinaison_to_evaluate = null;
            Coll_combinaison_to_evaluate = str_combinaison_arrive.split("-");


            for (int i = 0; i < Coll_combinaison_ref.length; i++) {
                for (int j = 0; j < Coll_combinaison_to_evaluate.length; j++) {
                    if (Coll_combinaison_ref[i].equals(Coll_combinaison_to_evaluate[j])) {
                        temp_degres_correspondance++;
                    }
                }
            }
            if (temp_degres_correspondance == degres_correspondance) {
            }


        } catch (Exception ex) {
            new logger().oCategory.error(ex.getMessage());

        }
        return temp_degres_correspondance;
    }

    public static boolean isExiste(String str_combinaison_ref, String str_combinaison_to_evaluate, int degres_correspondance) {
        boolean result = false;
        int temp_degres_correspondance = 0;
        try {

            String[] Coll_combinaison_ref = null;
            Coll_combinaison_ref = str_combinaison_ref.split("-");


            String[] Coll_combinaison_to_evaluate = null;
            Coll_combinaison_to_evaluate = str_combinaison_to_evaluate.split("-");


            for (int i = 0; i < Coll_combinaison_ref.length; i++) {
                for (int j = 0; j < Coll_combinaison_to_evaluate.length; j++) {
                    if (Coll_combinaison_ref[i].equals(Coll_combinaison_to_evaluate[j])) {
                        temp_degres_correspondance++;
                    }
                }
            }

            new logger().oCategory.info(temp_degres_correspondance);
            if (temp_degres_correspondance == degres_correspondance) {
                result = true;
            }


        } catch (Exception ex) {
            new logger().oCategory.error(ex.getMessage());

        }
        return result;
    }

    public static boolean isExiste(String str_combinaison_ref, String str_combinaison_non_partant_ref, String str_combinaison_to_evaluate, int degres_correspondance, int degres_correspondance_non_partant) {
        boolean result = false;
        int temp_degres_correspondance = 0;
        int temp_degres_correspondance_non_partant = 0;
        try {

            String[] Coll_combinaison_ref = null;
            Coll_combinaison_ref = str_combinaison_ref.split("-");


            String[] Coll_combinaison_non_partant_ref = null;
            Coll_combinaison_non_partant_ref = str_combinaison_non_partant_ref.split("-");

            String[] Coll_combinaison_to_evaluate = null;
            Coll_combinaison_to_evaluate = str_combinaison_to_evaluate.split("-");





            for (int i = 0; i < Coll_combinaison_ref.length; i++) {
                for (int j = 0; j < Coll_combinaison_to_evaluate.length; j++) {
                    if (Coll_combinaison_ref[i].equals(Coll_combinaison_to_evaluate[j])) {
                        temp_degres_correspondance++;
                    }
                }
            }


            for (int i = 0; i < Coll_combinaison_non_partant_ref.length; i++) {
                for (int j = 0; j < Coll_combinaison_to_evaluate.length; j++) {
                    if (Coll_combinaison_non_partant_ref[i].equals(Coll_combinaison_to_evaluate[j])) {
                        temp_degres_correspondance_non_partant++;
                    }
                }
            }


            new logger().oCategory.error(temp_degres_correspondance);
            new logger().oCategory.error(temp_degres_correspondance_non_partant);
            if (temp_degres_correspondance == degres_correspondance) {
                if (temp_degres_correspondance_non_partant == degres_correspondance_non_partant) {
                    result = true;
                }

            }



        } catch (Exception ex) {
            new logger().oCategory.error(ex.getMessage());

        }
        return result;
    }

    public static boolean isExiste(String str_combinaison_ref, String str_combinaison_non_partant_ref, String str_combinaison_to_evaluate, String str_combinaison_to_evaluate_non_partant, int degres_correspondance_non_partant) {
        boolean result = false;

        int temp_degres_correspondance_non_partant = 0;
        try {



            String[] Coll_combinaison_non_partant_ref = null;
            Coll_combinaison_non_partant_ref = str_combinaison_non_partant_ref.split("-");

            String[] Coll_combinaison_to_evaluate = null;
            Coll_combinaison_to_evaluate = str_combinaison_to_evaluate_non_partant.split("-");



            for (int i = 0; i < Coll_combinaison_non_partant_ref.length; i++) {
                for (int j = 0; j < Coll_combinaison_to_evaluate.length; j++) {
                    if (Coll_combinaison_non_partant_ref[i].equals(Coll_combinaison_to_evaluate[j])) {
                        temp_degres_correspondance_non_partant++;
                    }
                }
            }

            new logger().oCategory.error(temp_degres_correspondance_non_partant);

            if (str_combinaison_ref.equals(str_combinaison_to_evaluate)) {
                if (temp_degres_correspondance_non_partant == degres_correspondance_non_partant) {
                    result = true;
                }
            }




        } catch (Exception ex) {
            new logger().oCategory.error(ex.getMessage());

        }
        return result;
    }

    public static List<String> getNonPartantComb(String nonpartant) {
        String[] tab = nonpartant.split(commonparameter.SEPARATEUR_TRAIS_6);
        List<String> Lst = new ArrayList<String>();
        for (int j = 0; j < tab.length; j++) {
            for (int i = 0; i < tab.length; i++) {
                if (j != i) {
                    new logger().OCategory.info(tab[j] + '-' + tab[i]);
                    Lst.add(tab[j] + '-' + tab[i]);
                    // continue;
                } else {
                    continue;
                }
            }
        }
        return Lst;
    }

    public static boolean checkMultipleNonPartant(String npartant) {
        String[] np = npartant.split("-");
        new logger().OCategory.info(np.length);
        if (np.length == 1) {
            return true;
        } else {
            return false;
        }

    }

    public static boolean make_ArriveeSpecial(String arriveeString, String npartant, int lenght, String betString) {

        if (npartant.equals("")) {
            //new logger().OCategory.info("non partants :" + npartant);
            return false;
        } else {
            if (StringUtils.checkMultipleNonPartant(npartant)) {
                return false;
            } else {
                List<String> non_partant = StringUtils.getNonPartantComb(npartant);
                String arrivee = StringUtils.rebuildCombinaison(arriveeString, lenght);
                new logger().OCategory.info("arrivee :" + arrivee);
                new logger().OCategory.info("non_partant :" + non_partant);
                List<String> Lst = new ArrayList<String>();
                for (int i = 0; i < non_partant.size(); i++) {
                    String temp = arrivee + '-' + non_partant.get(i);
                    Lst.add(temp);
                }
                int j = 0, k = 0;
                while (!StringUtils.isCheckTransforme(Lst.get(j), betString, 0) && (j < Lst.size() - 1)) {
                    new logger().OCategory.info("resultat du parcours de la liste: " + StringUtils.isCheckTransforme(Lst.get(j), betString, 0));
                    j++;
                    k = j;
                }
                //new logger().OCategory.info(k);
                return StringUtils.isCheckTransforme(Lst.get(k), betString, 0);
            }
        }
        //return Lst;        
    }

    public static boolean isCheckTransforme(String arriveeString, String betString, int lenght) {
        String[] horses = StringUtils.rebuildCombinaison(betString, lenght).split(commonparameter.SEPARATEUR_TRAIS_6);
        String[] arriveeHorses = StringUtils.rebuildCombinaison(arriveeString, lenght).split(commonparameter.SEPARATEUR_TRAIS_6);
        Vector<String> arrivees = new Vector<String>(0);
        for (String horse : horses) {
            arrivees.add(horse);
        }
        for (String arriveeHorse : arriveeHorses) {
            if (!arrivees.contains(arriveeHorse)) {
                return false;
            }
        }
        return true;
    }

    public static boolean isExiste_Test(String str_combinaison_ref, String str_combinaison_non_partant_ref, String str_combinaison_to_evaluate, String str_combinaison_to_evaluate_non_partant, int degres_correspondance_non_partant) {
        boolean result = false;

        int temp_degres_correspondance_non_partant = 0;
        try {



            String[] Coll_combinaison_non_partant_ref = null;
            Coll_combinaison_non_partant_ref = str_combinaison_non_partant_ref.split("-");

            String[] Coll_combinaison_to_evaluate = null;
            Coll_combinaison_to_evaluate = str_combinaison_to_evaluate_non_partant.split("-");



            for (int i = 0; i < Coll_combinaison_non_partant_ref.length; i++) {
                for (int j = 0; j < Coll_combinaison_to_evaluate.length; j++) {
                    if (Coll_combinaison_non_partant_ref[i].equals(Coll_combinaison_to_evaluate[j])) {
                        temp_degres_correspondance_non_partant++;
                    }
                }
            }

            new logger().oCategory.error(temp_degres_correspondance_non_partant);

            if (str_combinaison_ref.equals(str_combinaison_to_evaluate)) {
                if (temp_degres_correspondance_non_partant == degres_correspondance_non_partant) {
                    result = true;
                }
            }




        } catch (Exception ex) {
            new logger().oCategory.error(ex.getMessage());

        }
        return result;
    }

    public static boolean isExisteNonPartant(String str_combinaison_ref, String str_combinaison_to_evaluate, int degres_correspondance) {
        boolean result = false;
        int temp_degres_correspondance = 0;
        try {

            String[] Coll_combinaison_ref = null;
            Coll_combinaison_ref = str_combinaison_ref.split("-");


            String[] Coll_combinaison_to_evaluate = null;
            Coll_combinaison_to_evaluate = str_combinaison_to_evaluate.split("-");


            for (int i = 0; i < Coll_combinaison_ref.length; i++) {
                for (int j = 0; j < Coll_combinaison_to_evaluate.length; j++) {
                    if (Coll_combinaison_ref[i].equals(Coll_combinaison_to_evaluate[j])) {
                        temp_degres_correspondance++;
                    }
                }
            }

            new logger().oCategory.error(temp_degres_correspondance);
            if (temp_degres_correspondance >= degres_correspondance) {

                result = true;
            }


        } catch (Exception ex) {
            new logger().oCategory.error(ex.getMessage());

        }
        return result;
    }

    public static boolean isExisteNonPartant(String str_combinaison_ref, String str_combinaison_to_evaluate, int degres_correspondance, String user_separator) {
        boolean result = false;
        temp_degres_correspondance = 0;
        try {

            String[] Coll_combinaison_ref = null;
            Coll_combinaison_ref = str_combinaison_ref.split(user_separator);
            List<String> Lstnonpartant = new ArrayList<String>();

            String[] Coll_combinaison_to_evaluate = null;
            Coll_combinaison_to_evaluate = str_combinaison_to_evaluate.split(user_separator);


            for (int i = 0; i < Coll_combinaison_ref.length; i++) {
                for (int j = 0; j < Coll_combinaison_to_evaluate.length; j++) {
                    if (Coll_combinaison_ref[i].equals(Coll_combinaison_to_evaluate[j])) {
                        temp_degres_correspondance++;
                        String Ononpartant = Coll_combinaison_to_evaluate[j];
                        Lstnonpartant.add(Ononpartant);
                    }
                }
            }


            for (int i = 0; i < Lstnonpartant.size(); i++) {
                if (i > 0) {
                    message = message + "-" + Lstnonpartant.get(i);
                } else {
                    message = Lstnonpartant.get(i);
                }
            }

            // new logger().oCategory.error("temp_degres_correspondance " + temp_degres_correspondance);
            if (temp_degres_correspondance >= degres_correspondance) {
                result = true;
                TypeOfError = Lstnonpartant.get(0);
                Detailmessage = "LES CHEVEAUX (  " + message + "  ) NON PARTANT";
            }
        } catch (Exception ex) {
            new logger().oCategory.error(ex.getMessage());
        }
        //  new logger().oCategory.error(Detailmessage +" "+str_combinaison_ref);
        return result;
    }

    public static String rebuildCombinaison(String Odata, int position) {
        String result = "";
        try {

            String[] Coll_Odata = null;
            if (position > 0) {
                Coll_Odata = Odata.split("-");
                for (int i = 0; i < position; i++) {
                    if (i > 0) {
                        result = result + "-" + Coll_Odata[i];
                    } else {
                        result = Coll_Odata[i];
                    }
                }
            } else {


                result = "";
                Coll_Odata = Odata.split("-");
                for (int i = (position * (-1)); i < Coll_Odata.length; i++) {
                    if (i > (position * (-1))) {
                        result = result + "-" + Coll_Odata[i];
                    } else {
                        result = Coll_Odata[i];
                    }
                }


            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    public static String rebuildComplexCombinaison(String Odata, String Parieur_separateur) {
        String result = "";
        String[] Coll_combinaison = Odata.split(Parieur_separateur);

        for (int i = 0; i < Coll_combinaison.length; i++) {
            if (Coll_combinaison[i].equals(commonparameter.SEPARATEUR_ETOILE)) {
            } else {

                if (i > 0) {
                    result = result + "-" + Coll_combinaison[i];
                } else {
                    result = Coll_combinaison[i];
                }

            }
        }

        return result;
    }

    public static String rebuildComplexCombinaison(String Odata, String Parieur_separateur, String Complex_separateur) {
        String result = "";





        String[] Coll_combinaison = Odata.split(Parieur_separateur);

        for (int i = 0; i < Coll_combinaison.length; i++) {
            if (Coll_combinaison[i].equals(Complex_separateur)) {
            } else {

                if (i > 0) {
                    result = result + "-" + Coll_combinaison[i];
                } else {
                    result = Coll_combinaison[i];
                }

            }
        }
        try {
            if (result.substring(0, 1).endsWith("-")) {
                //   new logger().OCategory.info("yes");
                result = result.substring(1);
            }
        } catch (Exception ex) {
        }
        return result;
    }

    public static String ExtractWinninCombinaison(String Parieur_Combinaison, String Winning_Combinaison) {
        String result = "";
        String Parieur_separateur = "-";
        String[] Coll_combinaison = Parieur_Combinaison.split(Parieur_separateur);
        String[] Coll_combinaison_winning = Winning_Combinaison.split(Parieur_separateur);
        for (int i = 0; i < Coll_combinaison.length; i++) {
            for (int j = 0; j < Coll_combinaison_winning.length; j++) {
                if (Coll_combinaison[i].equals(Coll_combinaison_winning[j])) {

                    if (i > 0) {
                        result = result + "-" + Coll_combinaison_winning[j];
                    } else {
                        result = Coll_combinaison_winning[j];
                    }

                }
            }
        }
        return result;
    }

    public static String rebuildCombinaison(String Parieur_Combinaison, String Parieur_separateur, String nonPartant, String Complement, int number_participant) {
        String[] Coll_combinaison = Parieur_Combinaison.split(Parieur_separateur);
        String[] Coll_combinaison_2 = new String[Coll_combinaison.length];
        String first_non_partant = nonPartant;
        isExisteNonPartant(Parieur_Combinaison, nonPartant, 1, Parieur_separateur);
        first_non_partant = TypeOfError;
        //  new logger().OCategory.error(message);
        // new logger().OCategory.error(Detailmessage);
        //new logger().OCategory.error(TypeOfError + "  " + first_non_partant);

        String[] Coll_nonPartant = message.split(Parieur_separateur);
        nonPartant = Coll_nonPartant[0];




        int k = 0;
        Coll_combinaison_2[Coll_combinaison.length - 1] = Complement;
        for (int i = 0; i < Coll_combinaison.length; i++) {
            if (nonPartant.equals(Coll_combinaison[i])) {
            } else {
                Coll_combinaison_2[k] = Coll_combinaison[i];
                k++;
            }
        }

        String StrFinal = Parieur_Combinaison;
        for (int i = 0; i < Coll_combinaison_2.length; i++) {
            if (i > 0) {
                StrFinal = StrFinal + "-" + Coll_combinaison_2[i];
            } else {
                StrFinal = Coll_combinaison_2[i];
            }
        }

        if (!CheckNumberOfHorse(StrFinal, number_participant, Parieur_separateur)) {
            //    new logger().OCategory.error(message);
            //   new logger().OCategory.error(Detailmessage);
            //   new logger().OCategory.error(TypeOfError);
            String first_non_partant_final = message;
            String[] Coll_final = StrFinal.split(Parieur_separateur);
            int indexNonpartant = Parieur_Combinaison.indexOf(first_non_partant);
            // new logger().OCategory.info(indexNonpartant);
            //Coll_final =
            for (int i = 0; i < Coll_final.length; i++) {
                if (i > 0) {
                    StrFinal = StrFinal + "-" + Coll_combinaison_2[i];
                } else {
                    StrFinal = Coll_combinaison_2[i];
                }
            }
            int indexNonpartant_final = StrFinal.indexOf(first_non_partant_final);

            //  new logger().OCategory.info(Parieur_Combinaison);
            //  new logger().OCategory.info("indexNonpartant " + indexNonpartant / 2);
            //   new logger().OCategory.info("indexNonpartant " + indexNonpartant_final / 2);

            Coll_final[indexNonpartant_final / 2] = first_non_partant;

            for (int i = 0; i < Coll_final.length; i++) {
                if (i > 0) {
                    StrFinal = StrFinal + "-" + Coll_final[i];
                } else {
                    StrFinal = Coll_final[i];
                }
            }


        }
        return StrFinal;
    }

    public static String rebuildCombinaisonForSpot(String Parieur_Combinaison, String Parieur_separateur, String combinaison_generated) {
        String StrFinal = "";
        try {
            Parieur_Combinaison = Parieur_Combinaison.replace("*", "@");
            String[] Coll_combinaison_ = Parieur_Combinaison.split(commonparameter.SEPARATEUR_AROBASE);
            String[] Coll_combinaison_generated = combinaison_generated.split(Parieur_separateur);
            String[] Coll_combinaison = Parieur_Combinaison.split(Parieur_separateur);

            int k = 0;
            for (int i = 0; i < Coll_combinaison.length; i++) {

                if (Coll_combinaison[i].equals(commonparameter.SEPARATEUR_AROBASE)) {
                    Coll_combinaison[i] = Coll_combinaison_generated[k];
                    k++;
                }
            }


            for (int i = 0; i < Coll_combinaison.length; i++) {
                if (i > 0) {
                    Parieur_Combinaison = Parieur_Combinaison + "-" + Coll_combinaison[i];
                } else {
                    Parieur_Combinaison = Coll_combinaison[i];
                }
            }


            return Parieur_Combinaison;
        } catch (Exception e) {
            new logger().OCategory.info(e.getMessage());
        }
        return "";
    }

    public static String getCombinaisonWithoutComplex(String Parieur_Combinaison, String Parieur_separateur) {
        String StrFinal = "";
        try {
            Parieur_Combinaison = Parieur_Combinaison.replace("*", "@");
            List<String> Coll_combinaison_generated = new ArrayList<String>();

            String[] Coll_combinaison = Parieur_Combinaison.split(commonparameter.SEPARATEUR_TRAIS_6);

            int k = 0;
            for (int i = 0; i < Coll_combinaison.length; i++) {

                if (!Coll_combinaison[i].equals(commonparameter.SEPARATEUR_AROBASE)) {
                    Coll_combinaison_generated.add(Coll_combinaison[i]);
                }
            }

            Parieur_Combinaison = "";
            for (int i = 0; i < Coll_combinaison_generated.size(); i++) {
                if (i > 0) {
                    Parieur_Combinaison = Parieur_Combinaison + "-" + Coll_combinaison_generated.get(i);
                } else {
                    Parieur_Combinaison = Coll_combinaison_generated.get(i);
                }
            }


            return Parieur_Combinaison;
        } catch (Exception e) {
            new logger().OCategory.info(e.getMessage());
        }
        return Parieur_Combinaison;
    }

    public static int getNbStart(String strText_base, String Parieur_Separateur) {
        String[] Coll_combinaison = strText_base.split(Parieur_Separateur);
        int nbStars = 0;
        for (int i = 0; i < Coll_combinaison.length; i++) {
            if (i > 0) {
                strText_base = strText_base + "-" + Coll_combinaison[i];
            } else {
                strText_base = Coll_combinaison[i];
            }
            if (Coll_combinaison[i].equals(commonparameter.SEPARATEUR_ETOILE)) {
                nbStars++;
            }
        }
        return nbStars;
    }

    public void loadseparator(String str_data) {
        char temp[] = str_data.toCharArray();
        int s = 0;
        String ts = "";
        int k = 0;
        for (int i = 0; i < temp.length; i++) {
            try {
                if (ts.equals("")) {
                    if (k == 1) {
                        ts = ts + "" + new Integer(temp[i] + "").toString();
                        k = 0;
                    } else {
                        ts = new Integer(temp[i] + "").toString();
                        k++;
                    }

                } else {

                    if (k == 1) {
                        ts = ts + "" + new Integer(temp[i] + "").toString();
                        k = 0;
                    } else {
                        ts = ts + commonparameter.SEPARATEUR_TRAIS_6 + new Integer(temp[i] + "").toString();
                        k++;
                    }


                }


            } catch (Exception e) {
                k = 0;
            }
        }
        new logger().OCategory.info(ts);
    }

    public static String getStringOccurence(String str_Data) {

        String StrNewData = "";
        String val = "";
        String val1 = "";
        int compteur = 0;

        String[] part = StringUtils.split(str_Data, commonparameter.SEPARATEUR_POINT_VIRGULE);
        for (int i = 0; i < part.length; i++) {
            val = part[i];
            for (int j = 0; j < part.length; j++) {
                val1=part[j];
                if (val.equals(val1)) {
                    compteur++;

                }

            }
            StrNewData += val + "(" + compteur + "),";
            compteur = 0;
        }

        new logger().OCategory.info("La new chaine " + StrNewData);
        return StrNewData;

    }
    
    public static String alignTextToPosition(String texte, int position) {
        return String.format("%"+position+"s", texte);
    }
    
    public static String generateString(String word, String complete, int number) {
        String result = "";
        for (int i = 0; i < number; i++) {
            result += complete;
        }
        result+=word;
        return result;
    }
}
