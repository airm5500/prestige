/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.TUser;
import java.io.Serializable;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 *
 * @author kkoffi
 */
public class GenererFactureDTO implements Serializable {
    private static final long serialVersionUID = 1L;
    private List<String> datas = new ArrayList<>();
    private LocalDate dtStart, dtEnd;
    private String organismeId;
    private TUser operateur;
    private Mode mode;
    String groupTp, typetp, tpid, codegroup, query;
    private boolean all;

    public List<String> getDatas() {
        return datas;
    }

    public boolean isAll() {
        return all;
    }

    public void setAll(boolean all) {
        this.all = all;
    }

    public String getQuery() {
        return query;
    }

    public void setQuery(String query) {
        this.query = query;
    }

    public String getGroupTp() {
        return groupTp;
    }

    public void setGroupTp(String groupTp) {
        this.groupTp = groupTp;
    }

    public String getTypetp() {
        return typetp;
    }

    public void setTypetp(String typetp) {
        this.typetp = typetp;
    }

    public String getTpid() {
        return tpid;
    }

    public void setTpid(String tpid) {
        this.tpid = tpid;
    }

    public String getCodegroup() {
        return codegroup;
    }

    public void setCodegroup(String codegroup) {
        this.codegroup = codegroup;
    }

    public void setDatas(List<String> datas) {
        this.datas = datas;
    }

    public LocalDate getDtStart() {
        return dtStart;
    }

    public TUser getOperateur() {
        return operateur;
    }

    public GenererFactureDTO setOperateur(TUser operateur) {
        this.operateur = operateur;
        return this;
    }

    public void setDtStart(LocalDate dtStart) {
        this.dtStart = dtStart;
    }

    public LocalDate getDtEnd() {
        return dtEnd;
    }

    public void setDtEnd(LocalDate dtEnd) {
        this.dtEnd = dtEnd;
    }

    public String getOrganismeId() {
        return organismeId;
    }

    public void setOrganismeId(String organismeId) {
        this.organismeId = organismeId;
    }

    public Mode getMode() {
        return mode;
    }

    public void setMode(Mode mode) {
        this.mode = mode;
    }

}
