<%@page import="dal.TAyantDroit"%>
<%@page import="bll.configManagement.clientManagement"%>
<%@page import="dal.TCompteClient"%>
<%@page import="dal.dataManager"  %>
<%@page import="dal.TRole"  %>
<%@page import="dal.TClient"  %>
<%@page import="java.util.*"  %>
<%@page import="multilangue.Translate"  %>
<%@page import="toolkits.utils.date"  %>
<%@page import="toolkits.parameters.commonparameter"  %>
<%@page import="toolkits.web.json"  %>
<%@page import="org.json.JSONObject"  %>          
<%@page import="org.json.JSONArray"  %> 
<%@page import="dal.TUser"  %>
<%@page import="toolkits.utils.jdom"  %>
<%@page import="toolkits.utils.logger"  %>
<%@page import="java.text.SimpleDateFormat"  %>

<jsp:useBean id="Os_Search_poste" class="services.Search"  scope="session"/>
<jsp:useBean id="Os_Search_poste_data" class="services.ShowDataBean" scope="session" />


<%
    dataManager OdataManager = new dataManager();
    List<TClient> lstTClient = new ArrayList<TClient>();

%>



<%   
     new logger().OCategory.info("dans ws data client ");
     String search_value = "", lg_TYPE_CLIENT_ID = "%%";
     int start = 0, limit = jdom.int_size_pagination, total = 0;
     
     if (request.getParameter("start") != null) {
      start = Integer.parseInt(request.getParameter("start"));
        new logger().OCategory.info("start " + start);
    } 
     
        
     if (request.getParameter("limit") != null) {
      limit = Integer.parseInt(request.getParameter("limit"));
        new logger().OCategory.info("limit " + limit);
    } 
     
     
    if (request.getParameter("search_value") != null) {
      search_value = request.getParameter("search_value");
        new logger().OCategory.info("search_value " + search_value);
    } 
    
    if (request.getParameter("lg_TYPE_CLIENT_ID") != null && !request.getParameter("lg_TYPE_CLIENT_ID").equals("")) {
        lg_TYPE_CLIENT_ID = request.getParameter("lg_TYPE_CLIENT_ID");
        new logger().OCategory.info("lg_TYPE_CLIENT_ID " + lg_TYPE_CLIENT_ID);
    }
    OdataManager.initEntityManager();
    clientManagement OclientManagement = new clientManagement(OdataManager);
    /*lstTClient = OdataManager.getEm().createQuery("SELECT t FROM TClient t WHERE t.lgCLIENTID LIKE ?1 AND t.strFIRSTNAME LIKE ?2 AND t.strSTATUT LIKE ?3 ").
     setParameter(1, lg_CLIENT_ID)
     .setParameter(2, Os_Search_poste.getOvalue())
     .setParameter(3, commonparameter.statut_enable)
     .getResultList();*/
    lstTClient = OclientManagement.showOnorAllClientByType(search_value, lg_TYPE_CLIENT_ID, commonparameter.statut_enable, start, limit);
    total = OclientManagement.showOnorAllClientByType(search_value, lg_TYPE_CLIENT_ID, commonparameter.statut_enable).size();
%>


<%    JSONArray arrayObj = new JSONArray();


    for(TClient OTClient : lstTClient) {
        String lg_CATEGORIE_AYANTDROIT_ID = "";
        String lg_RISQUE_ID = "";
        try {

            OdataManager.getEm().refresh(OTClient);

            Iterator iteraror = OTClient.getTAyantDroitCollection().iterator();
            while (iteraror.hasNext()) {

                Object el = iteraror.next();
                OdataManager.getEm().refresh((TAyantDroit) el);
                OdataManager.getEm().refresh(((TAyantDroit) el).getLgAYANTSDROITSID());

                lg_CATEGORIE_AYANTDROIT_ID = lg_CATEGORIE_AYANTDROIT_ID + " " + ((TAyantDroit) el).getLgCATEGORIEAYANTDROITID().getStrLIBELLECATEGORIEAYANTDROIT();
                lg_RISQUE_ID = lg_RISQUE_ID + " " + ((TAyantDroit) el).getLgRISQUEID().getStrLIBELLERISQUE();
                
                OdataManager.getEm().refresh(lg_CATEGORIE_AYANTDROIT_ID);
            }
        } catch (Exception Ex) {

        }

        JSONObject json = new JSONObject();

        new logger().OCategory.info("info compte " + OTClient.getTCompteClientCollection().size());
        Collection<TCompteClient> CollTCompteClient = OTClient.getTCompteClientCollection();
        Iterator iterarorTCompteClient = CollTCompteClient.iterator();
        Double dbl_SOLDE = 0.0;
        Double dbl_CAUTION = 0.0;
        Double dbl_QUOTA_CONSO_MENSUELLE = 0.0;
        String lg_COMPTE_CLIENT_ID = "";
        while (iterarorTCompteClient.hasNext()) {
            Object elTCompteClient = iterarorTCompteClient.next();
            TCompteClient OTCompteClient = (TCompteClient) elTCompteClient;

            OdataManager.getEm().refresh(OTCompteClient);
         //   dbl_SOLDE += OTCompteClient.getDblSOLDE();
            dbl_CAUTION += OTCompteClient.getDblCAUTION();
            dbl_QUOTA_CONSO_MENSUELLE += OTCompteClient.getDblQUOTACONSOMENSUELLE();
            lg_COMPTE_CLIENT_ID = OTCompteClient.getLgCOMPTECLIENTID();
        }
        new logger().OCategory.info("dbl_SOLDE " + dbl_SOLDE + " dbl_CAUTION " + dbl_CAUTION + " dbl_QUOTA_CONSO_MENSUELLE " + dbl_QUOTA_CONSO_MENSUELLE);
        json.put("dbl_SOLDE", dbl_SOLDE);
        json.put("dbl_CAUTION", dbl_CAUTION);
        json.put("dbl_QUOTA_CONSO_MENSUELLE", dbl_QUOTA_CONSO_MENSUELLE);
        json.put("lg_COMPTE_CLIENT_ID", lg_COMPTE_CLIENT_ID);
        // lg_CLIENT_ID
        json.put("lg_CLIENT_ID", OTClient.getLgCLIENTID());
        // str_CODE_INTERNE
        json.put("str_CODE_INTERNE", OTClient.getStrCODEINTERNE());
        // str_FIRST_NAME
        json.put("str_FIRST_NAME", OTClient.getStrFIRSTNAME());
        // str_LAST_NAME
        json.put("str_LAST_NAME", OTClient.getStrLASTNAME());
        json.put("str_FIRST_LAST_NAME", OTClient.getStrFIRSTNAME() + " " + OTClient.getStrLASTNAME());
        // str_NUMERO_SECURITE_SOCIAL
        json.put("str_NUMERO_SECURITE_SOCIAL", OTClient.getStrNUMEROSECURITESOCIAL());
        // dt_NAISSANCE
        json.put("dt_NAISSANCE", (OTClient.getDtNAISSANCE() != null ? date.DateToString(OTClient.getDtNAISSANCE(), date.formatterShort) : ""));
        // str_SEXE
        json.put("str_SEXE", OTClient.getStrSEXE());
        // str_ADRESSE
        json.put("str_ADRESSE", OTClient.getStrADRESSE());
        // str_DOMICILE
        json.put("str_DOMICILE", OTClient.getStrDOMICILE());
        // str_AUTRE_ADRESSE
        json.put("str_AUTRE_ADRESSE", OTClient.getStrAUTREADRESSE());
        // str_CODE_POSTAL
        json.put("str_CODE_POSTAL", OTClient.getStrCODEPOSTAL());
        // str_COMMENTAIRE
        json.put("str_COMMENTAIRE", OTClient.getStrCOMMENTAIRE());
        // lg_RISQUE_ID
        json.put("lg_RISQUE_ID", lg_RISQUE_ID); 
        // lg_VILLE_ID
        json.put("lg_VILLE_ID", OTClient.getLgVILLEID()!=null?OTClient.getLgVILLEID().getStrName():"");
        // lg_CATEGORIE_AYANTDROIT_ID
        json.put("lg_CATEGORIE_AYANTDROIT_ID", lg_CATEGORIE_AYANTDROIT_ID);
        
        json.put("lg_TYPE_CLIENT_ID", OTClient.getLgTYPECLIENTID().getStrNAME());

        arrayObj.put(json);
    }
    
    String result = "({\"total\":\"" + lstTClient.size() + " \",\"results\":" + arrayObj.toString() + "})";
    new logger().OCategory.info("result   ----  " + result);
%>

<%= result%>