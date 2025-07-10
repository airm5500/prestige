<%-- 
    Document   : ws_zone
    Created on : 29 juin 2017, 00:27:26
    Author     : KKOFFI
--%>


<%@page import="dal.TPreenregistrementCompteClientTiersPayent"%>
<%@page import="dal.TTiersPayant"%>
<%@page import="dal.TGroupeTierspayant"%>
<%@page import="bll.configManagement.GroupeTierspayantController"%>

<%@page import="java.util.Date"%>
<%@page import="toolkits.utils.date"%>

<%@page import="dal.dataManager"%>


<%@page import="org.json.JSONObject"%>
<%@page import="org.json.JSONArray"%>

<%@page import="java.util.ArrayList"%>

<%@page import="java.util.List"%>

<%
    dataManager OdataManager = new dataManager();
    int lg_GROUPE_ID = 0;
    OdataManager.initEntityManager();
    GroupeTierspayantController groupeCtl = new GroupeTierspayantController(OdataManager.getEmf());
    String search_value = "",lgTP_ID="",dt_start=date.formatterMysqlShort.format(new Date()),dt_end=date.formatterMysqlShort.format(new Date());
   JSONArray listArray=new JSONArray();
     if (request.getParameter("dt_start") != null && !"".equals(request.getParameter("dt_start"))) {
        dt_start = request.getParameter("dt_start");
    }
      if (request.getParameter("tierspayantarray") != null && !"".equals(request.getParameter("tierspayantarray"))) {
        listArray = new JSONArray(request.getParameter("tierspayantarray"));
    }
    if (request.getParameter("dt_end") != null && !"".equals(request.getParameter("dt_end"))) {
        dt_end = request.getParameter("dt_end");
    }
    
    
    
    if (request.getParameter("lg_GROUPE_ID") != null && !"".equals(request.getParameter("lg_GROUPE_ID"))) {
        lg_GROUPE_ID =  Integer.valueOf(request.getParameter("lg_GROUPE_ID"));
    }
    if (request.getParameter("lgTP_ID") != null && !"".equals(request.getParameter("lgTP_ID"))) {
        lgTP_ID = request.getParameter("lgTP_ID");
    }
    if (request.getParameter("search_value") != null && !"".equals(request.getParameter("search_value"))) {
        search_value = request.getParameter("search_value");
    }
    if (request.getParameter("query") != null && !"".equals(request.getParameter("query"))) {
        search_value = request.getParameter("query");
    }
    int start = Integer.valueOf(request.getParameter("start"));
    int limit = Integer.valueOf(request.getParameter("limit"));
    int pager = Integer.valueOf(request.getParameter("page")); 
    JSONArray arrayObj = new JSONArray();

    //List<TPreenregistrementCompteClientTiersPayent> lis = groupeCtl.getGroupeBons(false, dt_start, dt_end, start, limit, lgTP_ID, lg_GROUPE_ID, search_value);
    List<TPreenregistrementCompteClientTiersPayent> lis = groupeCtl.getSelectedTpBons(listArray,dt_start, dt_end,search_value); 
   // int count = groupeCtl.getGroupeBonsCount(dt_start, dt_end,  lgTP_ID, lg_GROUPE_ID, search_value);
   int count=0;
   if(lis.size()>(limit*pager)){
    count=(limit*pager);
  } else{
      count=lis.size();
  }
   for (int idx = start;  idx < count; idx++) {
          JSONObject json = new JSONObject();
        json.put("lg_PCMT_ID", lis.get(idx).getLgPREENREGISTREMENTCOMPTECLIENTPAYENTID());
        json.put("REFBON", lis.get(idx).getStrREFBON());
        json.put("AMOUNT", lis.get(idx).getIntPRICE());
       json.put("isChecked", false);
       
        arrayObj.put(json);
           
       }
   
   
   
  

    JSONObject data = new JSONObject();

    data.put("data", arrayObj);
    data.put("total", lis.size());
%>

<%= data%>