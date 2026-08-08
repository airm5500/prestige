/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package toolkits.utils.log;

import java.io.PrintWriter;
import java.util.Date;
import org.apache.commons.logging.Log;
import toolkits.filesmanagers.FilesType.TxtFiles;
import toolkits.filesmanagers.FilesType.files;
import toolkits.parameters.commonKeys;
import toolkits.parameters.enumExtentionFiles;
import toolkits.utils.date;
import toolkits.utils.jdom;

/**
 *
 * @author Administrator
 */
public class Category extends files implements Log {

    TxtFiles OTxtFiles = new TxtFiles();
    PrintWriter fichierSortie = null;
    date key = new date();
    private String DATA = "";

    public void debug(Object arg0) {
        if (arg0 == null) {
            System.out.println("LOGGER NULL");
        } else {
            arg0 = commonKeys.DEBUG + " " + key.DateToString(new Date(), key.formatterMysql) + "  " + arg0.toString();
            OTxtFiles.SaveToFile(fichierSortie, arg0.toString());
            System.out.println(arg0.toString());
            OTxtFiles.Close(fichierSortie);
        }
    }

    public void debug(Object arg0, Throwable arg1) {
        if (arg0 == null) {
            System.out.println("LOGGER NULL");
        } else {
            arg0 = commonKeys.DEBUG + " " + key.DateToString(new Date(), key.formatterMysql) + "  " + arg0.toString();
            OTxtFiles.SaveToFile(fichierSortie, arg0.toString());
            System.out.println(arg0.toString());
            OTxtFiles.Close(fichierSortie);
        }
    }

    public void info(Object arg0) {
        if (arg0 == null) {
            System.out.println("LOGGER NULL");
        } else {
            arg0 = commonKeys.INFO + " " + key.DateToString(new Date(), key.formatterMysql) + "  " + arg0.toString();
            OTxtFiles.SaveToFile(fichierSortie, arg0.toString());
            System.out.println(arg0.toString());
            OTxtFiles.Close(fichierSortie);
        }
    }

    @SuppressWarnings("static-access")
    public void error(Object arg0) {
        if (arg0 == null) {
            System.out.println("LOGGER NULL");
        } else {
            arg0 = commonKeys.FATAL_ERROR + " " + key.DateToString(new Date(), key.formatterMysql) + "  " + arg0.toString();
            OTxtFiles.SaveToFile(fichierSortie, arg0.toString());
            System.out.println(arg0.toString());
            OTxtFiles.Close(fichierSortie);
        }
    }

    public void error(Object arg0, Throwable arg1) {
        if (arg0 == null) {
            System.out.println("LOGGER NULL");
        } else {
            arg0 = commonKeys.FATAL_ERROR + " " + key.DateToString(new Date(), key.formatterMysql) + "  " + arg0.toString();
            OTxtFiles.SaveToFile(fichierSortie, arg1.toString());
            System.out.println(arg0.toString());
        }

    }

    public Category() {
        this.setExtention(enumExtentionFiles.LOG);
        this.setXtention(enumExtentionFiles.LOG);
        OTxtFiles.InitFiles();
        this.OTxtFiles.setName(key.getDate());
        OTxtFiles.setPath_outut(jdom.log_file + this.OTxtFiles.getName());
        OTxtFiles.setXtention(this.getExtention());
        fichierSortie = OTxtFiles.InitSaveToFile();
        this.setPath_outut(OTxtFiles.getPath_outut() + this.getExtention());
        this.setName(this.OTxtFiles.getName() + this.getExtention());
    }

    @Override
    protected Object clone() throws CloneNotSupportedException {
        return super.clone();
    }

    @Override
    public boolean equals(Object obj) {
        return super.equals(obj);
    }

    public void fatal(Object arg0) {
        if (arg0 == null) {
            System.out.println("LOGGER NULL");
        } else {
            arg0 = commonKeys.FATAL_ERROR + " " + key.DateToString(new Date(), key.formatterMysql) + "  " + arg0.toString();
            OTxtFiles.SaveToFile(fichierSortie, arg0.toString());
            System.out.println(arg0.toString());
            OTxtFiles.Close(fichierSortie);
        }
    }

    public void fatal(Object arg0, Throwable arg1) {
        if (arg0 == null) {
            System.out.println("LOGGER NULL");
        } else {
            arg0 = key.DateToString(new Date(), key.formatterMysql) + "  " + arg0.toString();
            OTxtFiles.SaveToFile(fichierSortie, arg0.toString());
            System.out.println(arg0.toString());
            OTxtFiles.Close(fichierSortie);
        }
    }

    @Override
    protected void finalize() throws Throwable {
        super.finalize();
    }

    @Override
    public int hashCode() {
        return super.hashCode();
    }

    public void info(Object arg0, Throwable arg1) {
        if (arg0 == null) {
            System.out.println("LOGGER NULL");
        } else {
            arg0 = commonKeys.INFO + " " + key.DateToString(new Date(), key.formatterMysql) + "  " + arg0.toString();
            OTxtFiles.SaveToFile(fichierSortie, arg0.toString());
            System.out.println(arg0.toString());
            OTxtFiles.Close(fichierSortie);
        }
    }

       public void errorDisplay(Object arg0) {
        if (arg0 == null) {
            System.out.println("LOGGER NULL");
        } else {
            arg0 = commonKeys.FATAL_ERROR + " " + key.DateToString(new Date(), key.formatterMysql) + "  " + arg0.toString();
            OTxtFiles.SaveToFile(fichierSortie, arg0.toString());
            System.out.println(arg0.toString());
            OTxtFiles.Close(fichierSortie);
        }
    }
    
    public boolean isDebugEnabled() {
        throw new UnsupportedOperationException("Not supported yet.");
    }

    public boolean isErrorEnabled() {
        throw new UnsupportedOperationException("Not supported yet.");
    }

    public boolean isFatalEnabled() {
        throw new UnsupportedOperationException("Not supported yet.");
    }

    public boolean isInfoEnabled() {
        throw new UnsupportedOperationException("Not supported yet.");
    }

    public boolean isTraceEnabled() {
        throw new UnsupportedOperationException("Not supported yet.");
    }

    public boolean isWarnEnabled() {
        throw new UnsupportedOperationException("Not supported yet.");
    }

    public void trace(Object arg0) {
        if (arg0 == null) {
            System.out.println("LOGGER NULL");
        } else {
            arg0 = commonKeys.TRACE + " " + key.DateToString(new Date(), key.formatterMysql) + "  " + arg0.toString();
            OTxtFiles.SaveToFile(fichierSortie, arg0.toString());
            System.out.println(arg0.toString());
        }
    }

    public void trace(Object arg0, Throwable arg1) {
        if (arg0 == null) {
            System.out.println("LOGGER NULL");
        } else {
            arg0 = commonKeys.TRACE + " " + key.DateToString(new Date(), key.formatterMysql) + "  " + arg0.toString();
            OTxtFiles.SaveToFile(fichierSortie, arg0.toString());
            System.out.println(arg0.toString());
            OTxtFiles.Close(fichierSortie);
        }
    }

    public void warn(Object arg0) {
        if (arg0 == null) {
            System.out.println("LOGGER NULL");
        } else {
            arg0 = commonKeys.WARNING + " " + key.DateToString(new Date(), key.formatterMysql) + "  " + arg0.toString();
            OTxtFiles.SaveToFile(fichierSortie, arg0.toString());
            System.out.println(arg0.toString());
            OTxtFiles.Close(fichierSortie);
        }
    }

    public void warn(Object arg0, Throwable arg1) {
        if (arg0 == null) {
            System.out.println("LOGGER NULL");
        } else {
            arg0 = commonKeys.WARNING + " " + key.DateToString(new Date(), key.formatterMysql) + "  " + arg0.toString();
            OTxtFiles.SaveToFile(fichierSortie, arg0.toString());
            System.out.println(arg0.toString());
            OTxtFiles.Close(fichierSortie);
        }
    }

    /**
     * @return the DATA
     */
    public String getDATA() {
        return DATA;
    }

    /**
     * @param DATA the DATA to set
     */
    public void setDATA(String DATA) {
        this.DATA = DATA;
    }

    public void printTrace(Throwable arg1) {
        if (arg1 == null) {
            System.out.println("LOGGER NULL");
        } else {
            Object arg0 = commonKeys.FATAL_ERROR + " " + key.DateToString(new Date(), key.formatterMysql) + "  " + arg1.getMessage();
            OTxtFiles.SaveToFile(fichierSortie, arg1.toString());
            System.out.println(arg0.toString());
            arg1.printStackTrace(fichierSortie);
            OTxtFiles.Close(fichierSortie);
        }

    }
}
