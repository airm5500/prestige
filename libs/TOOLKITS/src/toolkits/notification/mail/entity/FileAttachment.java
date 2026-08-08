/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package toolkits.notification.mail.entity;

/**
 *
 * @author INFOTRONIQUE
 */
public class FileAttachment {

    private String fileName;
    private String Subject;

    public FileAttachment(String fileName, String Subject) {
        this.fileName = fileName;
        this.Subject = Subject;
    }

    
    
    
    
    /**
     * @return the fileName
     */
    public String getFileName() {
        return fileName;
    }

    /**
     * @param fileName the fileName to set
     */
    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    /**
     * @return the Subject
     */
    public String getSubject() {
        return Subject;
    }

    /**
     * @param Subject the Subject to set
     */
    public void setSubject(String Subject) {
        this.Subject = Subject;
    }
}
