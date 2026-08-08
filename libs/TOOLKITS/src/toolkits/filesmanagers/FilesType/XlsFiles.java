/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package toolkits.filesmanagers.FilesType;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.util.List;

import toolkits.parameters.enumExtentionFiles;

/**
 *
 * @author User
 */
public class XlsFiles extends files implements Ifile {

    public XlsFiles() {
        this.setXtention(".xls");
    }

    public void InitFiles() {
        this.setExtention(enumExtentionFiles.TEXTE);

    }

   
  
    public void LoadFile(String path) {
        String fileName = "";   // The file name the user entered.
        fileName = path;
        int dotPos = fileName.lastIndexOf(".");
        this.setPath_input(path);
        this.setXtention(fileName.substring(dotPos));
    }

    public void LoadRessource() {
        throw new UnsupportedOperationException("Not supported yet.");
    }

    public void SaveToFile(List<String> Collection_data) {
        try {
            FileWriter fw = new FileWriter(this.getPath_outut());
            BufferedWriter bw = new BufferedWriter(fw);
            PrintWriter fichierSortie = new PrintWriter(bw);

            for (int i = 0; i < Collection_data.size(); i++) {
                fichierSortie.println(Collection_data.get(i).toString());
            }
            fichierSortie.close();
        } catch (Exception e) {
            System.out.println(e.toString());
        }
    }

    public void SaveToFile(String data) {
        try {
            FileWriter fw = new FileWriter(this.getPath_outut() + enumExtentionFiles.TEXTE);
            BufferedWriter bw = new BufferedWriter(fw);
            PrintWriter fichierSortie = new PrintWriter(bw);

            fichierSortie.println(data);

            fichierSortie.close();
        } catch (Exception e) {
            System.out.println(e.toString());
        }
    }

    public PrintWriter InitSaveToFile() {
        PrintWriter fichierSortie = null;
        try {
            FileWriter fw = new FileWriter(this.getPath_outut() + this.getXtention());
            BufferedWriter bw = new BufferedWriter(fw);
            fichierSortie = new PrintWriter(bw);
        } catch (Exception e) {
            System.out.println(e.toString());
        }
        return fichierSortie;
    }

    public void SaveToFile(PrintWriter fichierSortie, String data) {
        try {

            fichierSortie.println(data);


        } catch (Exception e) {
            System.out.println(e.toString());
        }
    }

    public void Close(PrintWriter fichierSortie) {
        try {

            fichierSortie.close();
        } catch (Exception e) {
            System.out.println(e.toString());
        }
    }

    public void Delete() {
        File f1 = new File(this.getPath_input());
        boolean success = f1.delete();
        if (!success) {
            System.out.println("Deletion failed.");
            //  System.exit(0);
        } else {
            System.out.println("File deleted.");
        }
    }

    public void MoveTo(String directoryname) {
        // File (or directory) to be moved
        File file = new File(this.getPath_input());

        // Destination directory
        File dir = new File(directoryname);

        // Move file to new directory
        boolean success = file.renameTo(new File(dir, file.getName()));
        if (!success) {
            // File was not successfully moved
        }

    }
}
