/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package toolkits.utils;

import java.io.PrintWriter;
import toolkits.filesmanagers.FilesType.TxtFiles;
import toolkits.filesmanagers.FilesType.files;
import toolkits.utils.log.Category;

/**
 *
 * @author Administrator
 */
public class logger extends files {

    TxtFiles OTxtFiles = new TxtFiles();
    PrintWriter fichierSortie = null;
    public Category OCategory = new Category();
     public Category oCategory = new Category();
    date key = new date();

    public logger() {
        
        
    }

}
