/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.TEventLog;
import dal.TUser;
import java.io.Serializable;
import java.text.SimpleDateFormat;
import java.time.LocalDateTime;
import util.DateConverter;

/**
 *
 * @author DICI
 */
public class LogDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private final SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy");
    private final SimpleDateFormat heureFormat = new SimpleDateFormat("HH:mm");
    private String dtCREATED, HEURE, strDESCRIPTION, typeLog, userFullName, strTYPELOG;
    /** Retours du 10/10 : poste, adresse IP, application et detail avant / apres. */
    private String poste, ip, application, detail;

    public String getPoste() {
        return poste;
    }

    public String getIp() {
        return ip;
    }

    public String getApplication() {
        return application;
    }

    public String getDetail() {
        return detail;
    }

    private int order;
    private LocalDateTime operationDate;

    public String getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(String dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    public String getHEURE() {
        return HEURE;
    }

    public void setHEURE(String HEURE) {
        this.HEURE = HEURE;
    }

    public String getStrDESCRIPTION() {
        return strDESCRIPTION;
    }

    public void setStrDESCRIPTION(String strDESCRIPTION) {
        this.strDESCRIPTION = strDESCRIPTION;
    }

    public String getTypeLog() {
        return typeLog;
    }

    public void setTypeLog(String typeLog) {
        this.typeLog = typeLog;
    }

    public String getUserFullName() {
        return userFullName;
    }

    public void setUserFullName(String userFullName) {
        this.userFullName = userFullName;
    }

    public String getStrTYPELOG() {
        return strTYPELOG;
    }

    public void setStrTYPELOG(String strTYPELOG) {
        this.strTYPELOG = strTYPELOG;
    }

    public int getOrder() {
        return order;
    }

    public void setOrder(int order) {
        this.order = order;
    }

    public LogDTO(int order, String strDESCRIPTION) {
        this.strDESCRIPTION = strDESCRIPTION;
        this.order = order;
    }

    public LogDTO() {
    }

    public LogDTO(TEventLog eventLog) {
        this.dtCREATED = dateFormat.format(eventLog.getDtCREATED());
        this.HEURE = heureFormat.format(eventLog.getDtCREATED());
        this.strDESCRIPTION = eventLog.getStrDESCRIPTION();
        try {
            this.typeLog = eventLog.getTypeLog().getValue();
        } catch (Exception e) {
            this.typeLog = eventLog.getStrTYPELOG();
        }
        TUser u = eventLog.getLgUSERID();
        this.userFullName = u.getStrFIRSTNAME() + " " + u.getStrLASTNAME();
        this.strTYPELOG = eventLog.getStrTYPELOG();
        this.operationDate = DateConverter.convertDateToLocalDateTime(eventLog.getDtCREATED());
        this.poste = eventLog.getRemoteHost() == null ? "" : eventLog.getRemoteHost();
        this.ip = eventLog.getRemoteAddr() == null ? "" : eventLog.getRemoteAddr();
        this.application = eventLog.getStrAPPLICATION() == null ? "" : eventLog.getStrAPPLICATION();
        this.detail = eventLog.getStrDETAIL() == null ? "" : eventLog.getStrDETAIL();
    }

    public LocalDateTime getOperationDate() {
        return operationDate;
    }

    public void setOperationDate(LocalDateTime operationDate) {
        this.operationDate = operationDate;
    }

}
