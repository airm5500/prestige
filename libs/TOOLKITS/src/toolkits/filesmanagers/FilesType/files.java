/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package toolkits.filesmanagers.FilesType;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import toolkits.utils.logger;

/**
 *
 * @author Administrator
 */
public class files {

    private String message;
    private String name;
    public String name_no_ext;
    private String path_input;
    private String path_outut;
    public String extention;
    private int size;
    private String Xtention;

    public files() {
        name = "";
        extention = "";
        size = 0;
        path_input = "";
        path_outut = "";
    }

    public void LoadConfiguration() {
    }

    /**
     * @return the name
     */
    public String getName() {
        return name;
    }

    /**
     * @param name the name to set
     */
    public void setName(String name) {
        this.name = name;
    }

    /**
     * @return the extention
     */
    public String getExtention() {
        return extention;
    }

    public files(String name, String path_input, String path_outut, String extention, int size, String Xtention) {
        this.name = name;
        this.path_input = path_input;
        this.path_outut = path_outut;
        this.extention = extention;
        this.size = size;
        this.Xtention = Xtention;
    }

    /**
     * @param extention the extention to set
     */
    protected void setExtention(String extention) {
        this.extention = extention;
    }

    /**
     * @return the size
     */
    public int getSize() {
        return size;
    }

    /**
     * @param size the size to set
     */
    public void setSize(int size) {
        this.size = size;
    }

    /**
     * @return the Xtention
     */
    public String getXtention() {
        return Xtention;
    }

    /**
     * @param Xtention the Xtention to set
     */
    public void setXtention(String Xtention) {
        this.Xtention = Xtention;
    }

    /**
     * @return the path_input
     */
    public String getPath_input() {
        return path_input;
    }

    /**
     * @param path_input the path_input to set
     */
    public void setPath_input(String path_input) {
        this.path_input = path_input;
    }

    /**
     * @return the path_outut
     */
    public String getPath_outut() {
        return path_outut;
    }

    /**
     * @param path_outut the path_outut to set
     */
    public void setPath_outut(String path_outut) {
        this.path_outut = path_outut;
    }

    /**
     * @return the message
     */
    public String getMessage() {
        return message;
    }

    /**
     * @param message the message to set
     */
    public void setMessage(String message) {
        this.message = message;
    }

    public static List<File> loadDirectory(String path) {
        // Directory path here
        //String path = "D://SCANS//IMAGES//";
        String files;
        File folder = new File(path);
        File[] listOfFiles = folder.listFiles();
        List<File> listOfFilesReal = new ArrayList<File>();
        for (int i = 0; i < listOfFiles.length; i++) {
            if (listOfFiles[i].isFile()) {
                files = listOfFiles[i].getName();
                //System.out.println("ALL "+files);
                if (files.endsWith(".jpg") || files.endsWith(".JPG")) {
                    //  System.out.println(" GOD "+files);
                    listOfFilesReal.add(listOfFiles[i]);
                }
            }
        }
        return listOfFilesReal;
    }

    public static List<File> loadDirectoryAll(String path) {
        // Directory path here
        //String path = "D://SCANS//IMAGES//";
        String files;
        File folder = new File(path);
        File[] listOfFiles = folder.listFiles();
        List<File> listOfFilesReal = new ArrayList<File>();
        for (int i = 0; i < listOfFiles.length; i++) {
            if (listOfFiles[i].isFile()) {
                files = listOfFiles[i].getName();
                //System.out.println("ALL "+files);

                //  System.out.println(" GOD "+files);
                listOfFilesReal.add(listOfFiles[i]);

            }
        }
        return listOfFilesReal;
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

    public void Delete(String path) {
        File f1 = new File(path);
        boolean success = f1.delete();
        if (!success) {
            System.out.println("Deletion failed." + path);
            //  System.exit(0);
        } else {
            System.out.println("File deleted." + path);
        }
    }

    public boolean MoveTo(String str_Path_Of_File, String directoryname, String new_name_file) {

        new logger().OCategory.info("str_Path_Of_File : " + str_Path_Of_File);
        new logger().OCategory.info("directoryname : " + directoryname);
        new logger().OCategory.info("new_name_file : " + new_name_file);
        int mid = str_Path_Of_File.lastIndexOf(".");
        String fname = str_Path_Of_File.substring(0, mid);
        String ext = str_Path_Of_File.substring(mid + 1, str_Path_Of_File.length());
        //  System.out.println("File name =" + fname);
        // System.out.println("ext name =" + ext);

        // File (or directory) to be moved
        File file = new File(str_Path_Of_File);
        // Destination directory
        File dir = new File(directoryname);
        // Move file to new directory
        boolean success = file.renameTo(new File(dir, new_name_file + "." + ext));
        if (!success) {
            new logger().OCategory.fatal("File was not successfully moved");
            return false;
            // File was not successfully moved
        } else {
            name = new_name_file + "." + ext;
            this.path_outut = dir + "/" + name;
            new logger().OCategory.info("File was successfully moved as " + this.path_outut);
            // new files().Delete();
            return true;
        }

    }

    public String getlastfile(String Odata) {
        files Ofiles = new files();
        String fname = "";

        List<File> lst = Ofiles.loadDirectoryAll(Odata);
        for (int i = 0; i < lst.size(); i++) {
            int mid = lst.get(i).getName().lastIndexOf(".");
            fname = lst.get(i).getName().substring(0, mid);
        }
        new logger().OCategory.info("fname is : " + fname);
        return fname;
    }

    public boolean CopyTo(String str_Path_Of_File, String directoryname, String new_name_file) {

        new logger().OCategory.info("str_Path_Of_File : " + str_Path_Of_File);
        new logger().OCategory.info("directoryname : " + directoryname);
        new logger().OCategory.info("new_name_file : " + new_name_file);
        int mid = str_Path_Of_File.lastIndexOf(".");
        String fname = str_Path_Of_File.substring(0, mid);
        String ext = str_Path_Of_File.substring(mid + 1, str_Path_Of_File.length());
        //  System.out.println("File name =" + fname);
        // System.out.println("ext name =" + ext);

        // File (or directory) to be moved
        File file = new File(str_Path_Of_File);
        // Destination directory
        File dir = new File(directoryname);
        // Move file to new directory
        boolean success = false; //file.renameTo(new File(dir, new_name_file + "." + ext));

        try {
            String desTFile = dir + "//" + new_name_file;

            new logger().OCategory.info("File desTFile :" + desTFile);

            success = copyFile(str_Path_Of_File, desTFile + "." + ext);
        } catch (Exception e) {
            e.printStackTrace();
            new logger().OCategory.info(e.getMessage());
            success = false;
        }

        if (!success) {
            new logger().OCategory.fatal("File was not successfully copy");
            return false;
            // File was not successfully moved
        } else {
            name = new_name_file + "." + ext;
            this.path_outut = dir + "/" + name;
            new logger().OCategory.info("File was successfully copy as " + this.path_outut);
            // new files().Delete();
            return true;
        }

    }

    private boolean copyFile(String srcFile, String destFile) throws IOException {
        File file = new File(srcFile);
        if (file.exists()) {
            FileInputStream fis = new FileInputStream(file);
            FileOutputStream fos = new FileOutputStream(destFile);
            byte[] buff = new byte[fis.available()];
            fis.read(buff);
            fos.write(buff);

            new logger().OCategory.info(fos.toString() + "    destFile:" + destFile + "   srcFile :" + srcFile);
            return true;
        } else {
            new logger().OCategory.info("Fichier n'existe pas");
        }
        return false;
    }

    public void getStructFile(String str_Path_Of_File) {
        int mid = str_Path_Of_File.lastIndexOf(".");
        name_no_ext = str_Path_Of_File.substring(0, mid);
        extention = str_Path_Of_File.substring(mid + 1, str_Path_Of_File.length());

        // System.out.println("File name =" + name);
        // System.out.println("ext name =" + extention);
    }

    public String getLastFileCreated(String str_dir_path) {

        String fname = "";
        files Ofiles = new files();
        List<File> lst = Ofiles.loadDirectoryAll(str_dir_path);
        /*for (int i = 0; i < lst.size(); i++) {
         int mid = lst.get(i).getName().lastIndexOf(".");
         fname = lst.get(lst.size() - 1).getName().substring(0, mid);

         }*/
        int mid = lst.get(lst.size() - 1).getName().lastIndexOf(".");
        fname = lst.get(lst.size() - 1).getName().substring(0, mid);

        new logger().OCategory.info(" +++ le dernier fichier cree est +++ " + fname);
        return fname;

    }

    public String readFile(String link_file) {
        String data = "";
        /*BufferedReader br = null;
        try {
            String sCurrentLine;
            br = new BufferedReader(new FileReader(link_file));

            while ((sCurrentLine = br.readLine()) != null) {
                data +=sCurrentLine;
               // System.out.println(sCurrentLine);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }*/
        try {
            File f=new File(link_file);

        OutputStream oos = new FileOutputStream("test.pdf");

        byte[] buf = new byte[8192];

        InputStream is = new FileInputStream(f);

        int c = 0;

        while ((c = is.read(buf, 0, buf.length)) > 0) {
            oos.write(buf, 0, c);
            oos.flush();
        }

        oos.close();
        System.out.println("stop");
        is.close();
        } catch (Exception e) {
        }
        new logger().OCategory.info("data "+data);
        return data;
    }

}
