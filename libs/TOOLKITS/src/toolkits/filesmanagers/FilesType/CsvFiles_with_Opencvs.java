/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package toolkits.filesmanagers.FilesType;


import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import com.opencsv.CSVReader;

import toolkits.utils.logger;

/**
 *
 * @author Session Pro
 */
public class CsvFiles_with_Opencvs {

    public CsvFiles_with_Opencvs() {
    }

    
    public List LoadDataWithPointVirgule(String filename, char delimiter) {
        List OListdata = new ArrayList();
        CSVReader reader = null;
        int count = 0;
        try {
            reader = new CSVReader(new FileReader(filename), delimiter);
            String[] nextLine;
            //Read one line at a time
            while ((nextLine = reader.readNext()) != null) {
                if (count == 0) {
                    String chaine = "";
                    for (String token : nextLine) {
                        //Print all tokens
                        chaine += token + delimiter;
                        // System.out.print(token + ";");
                    }
                    chaine = chaine.substring(0, chaine.length() - 1);
                    new logger().OCategory.info("chaine "+chaine);
                    OListdata.add(chaine);
                } else {
                    count++;
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            try {
                reader.close();
            } catch (IOException e) {
                e.printStackTrace();
            }
        }

        return OListdata;
    }
    //fin chargement des données d'un fichier csv en fonction d'un délimiter
}
