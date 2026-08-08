/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package toolkits.utils;

import java.io.BufferedReader;
import java.io.IOException;
import java.util.Scanner;



/**
 *
 * @author Administrator
 */
public class outPutReader {

    private String data;

    public outPutReader() {
    }

    /**
     * @return the data
     */
    public String getData() {
        return data;
    }

    public void ReaderKeyBoard() {
        try{
       Scanner lectureClavier = new Scanner(System.in);
        data = lectureClavier.next();
        }catch(Exception ex){

        }
    }

    /**
     * @param data the data to set
     */
    public void setData(String data) {
        this.data = data;
    }
}
