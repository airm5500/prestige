<%@page import="toolkits.utils.logger"  %>
<%@page import="dal.dataManager"  %>
<%@page import="dal.TUser"  %>
<%@page import="dal.TRole"  %>
<%@page import="bll.bllBase"  %>
<%@page import="java.util.*"  %>
<%@page import="multilangue.Translate"  %>
<%@page import="toolkits.utils.date"  %>
<%@page import="bll.userManagement.privilege"  %>
<%@page import="toolkits.parameters.commonparameter"  %>
<%@page import="java.math.BigInteger"  %>
<%@page import="bll.userManagement.*"  %>



<%
    Translate oTranslate = new Translate();
    dataManager OdataManager = new dataManager();
    date key = new date();
    privilege Oprivilege = new privilege();

    List<TUser> lstTUserLogin = new ArrayList<TUser>();

%>




<%  String str_FIRST_NAME = "", str_STATUT = "", str_LAST_NAME = "", lg_ROLE_ID = "", lg_USER_ID = "", str_PASSWORD = "", str_LOGIN = "", str_FUNCTION = "", lg_SKIN_ID = "", lg_Language_ID = "", str_LIEU_TRAVAIL = "", str_PHONE = "", str_TYPE = commonparameter.PARAMETER_CUSTOMER;
    date str_LAST_CONNECTION_DATE;
    int str_IDS = 1;
    String user_id = "";
    String lg_IMPRIMANTE_ID = "", str_NAME = "";
    if (request.getParameter("lg_IMPRIMANTE_ID") != null) {
        lg_IMPRIMANTE_ID = request.getParameter("lg_IMPRIMANTE_ID");
        new logger().oCategory.info("lg_IMPRIMANTE_ID : " + lg_IMPRIMANTE_ID);
    }
    if (request.getParameter("str_NAME") != null) {
        str_NAME = request.getParameter("str_NAME");
    }
    if (request.getParameter("str_FIRST_NAME") != null) {
        str_FIRST_NAME = request.getParameter("str_FIRST_NAME");
    }
    //str_IDS
    if (request.getParameter("str_IDS") != null) {
        str_IDS = Integer.parseInt(request.getParameter("str_IDS"));
        new logger().oCategory.info("str_IDS : " + str_IDS);
    }
    if (request.getParameter("str_STATUT") != null) {
        str_STATUT = request.getParameter("str_STATUT");
    }
    if (request.getParameter("str_LAST_NAME") != null) {
        str_LAST_NAME = request.getParameter("str_LAST_NAME");
    }
    if (request.getParameter("str_LIEU_TRAVAIL") != null) {
        str_LIEU_TRAVAIL = request.getParameter("str_LIEU_TRAVAIL");
        new logger().OCategory.info("str_LIEU_TRAVAIL " + str_LIEU_TRAVAIL);
    }

    if (request.getParameter("lg_USER_ID") != null) {
        lg_USER_ID = request.getParameter("lg_USER_ID");
    }
    if (request.getParameter("str_LOGIN") != null) {
        str_LOGIN = request.getParameter("str_LOGIN");
        new logger().oCategory.info("LOGIN   " + str_LOGIN);
    }
    if (request.getParameter("str_FUNCTION") != null) {
        str_FUNCTION = request.getParameter("str_FUNCTION");
    }

    if (request.getParameter("lg_Language_ID") != null) {
        lg_Language_ID = request.getParameter("lg_Language_ID");
    }
    // lg_ROLE_ID
    if (request.getParameter("lg_ROLE_ID") != null) {
        lg_ROLE_ID = request.getParameter("lg_ROLE_ID");
        new logger().OCategory.info("lg_ROLE_ID" + lg_ROLE_ID);
    }

    if (request.getParameter("str_PASSWORD") != null) {
        str_PASSWORD = request.getParameter("str_PASSWORD");
    }
    if (request.getParameter("str_PHONE") != null) {
        str_PHONE = request.getParameter("str_PHONE");
    }

    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    OdataManager.initEntityManager();
    TUser user = OdataManager.getEm().find(TUser.class, OTUser.getLgUSERID());
    bllBase ObllBase = new bllBase();
    ObllBase.setOTUser(user);
    ObllBase.LoadDataManger(OdataManager);
    ObllBase.LoadMultilange(oTranslate);
    ObllBase.setMessage(commonparameter.PROCESS_FAILED);
    user Ouser = new user(OdataManager);
    ObllBase.setDetailmessage("PAS D'ACTION");
    new logger().oCategory.info("le mode : " + request.getParameter("mode"));
    new logger().oCategory.info("ID " + request.getParameter("lg_USER_ID"));
    new logger().oCategory.info("ID connecté " + OTUser.getLgUSERID());
    if (request.getParameter("mode") != null) {

        if (request.getParameter("mode").toString().equals("create")) {
            new logger().oCategory.info("Dans create user   ");

            try {

                // List<TUser> lstTUserLogin = new ArrayList<TUser>();
                OdataManager.initEntityManager();
                lstTUserLogin = OdataManager.getEm().createQuery("SELECT t FROM TUser t WHERE t.strLOGIN LIKE ?1  AND t.strSTATUT LIKE ?2")
                        .setParameter(1, request.getParameter("str_LOGIN").toString())
                        .setParameter(2, commonparameter.statut_enable).getResultList();

                new logger().oCategory.info("Resultat " + lstTUserLogin.size());

                if (lstTUserLogin.size() == 0) {
                    Ouser.createUser(str_LOGIN, str_PASSWORD, str_IDS, str_FIRST_NAME, str_LAST_NAME, lg_ROLE_ID, lg_Language_ID, str_LIEU_TRAVAIL, str_TYPE);
                    new logger().oCategory.info("User creer avec succès   " + str_FIRST_NAME + " " + str_LAST_NAME);
                    ObllBase.setMessage(Ouser.getMessage());
                    ObllBase.setDetailmessage(Ouser.getDetailmessage());
                } else {
                    ObllBase.setMessage("0");
                    ObllBase.setDetailmessage("Desolé Login " + request.getParameter("str_LOGIN") + "Deja Utilise");
                }

            } catch (Exception e) {

                new logger().oCategory.info("ERROR   ");
            }

        } else if (request.getParameter("mode").toString().equals("update")) {

            Ouser.updateMyUser(lg_USER_ID, str_LOGIN, str_IDS, str_FIRST_NAME, str_LAST_NAME, lg_Language_ID, str_LIEU_TRAVAIL, lg_ROLE_ID);
            ObllBase.setMessage(Ouser.getMessage());
            ObllBase.setDetailmessage(Ouser.getDetailmessage());

        } else if (request.getParameter("mode").toString().equals("updatepassword")) {
            Ouser.updatePassword(lg_USER_ID, str_PASSWORD);

            ObllBase.setMessage(Ouser.getMessage());
            ObllBase.setDetailmessage(Ouser.getDetailmessage());

        } else if (request.getParameter("mode").toString().equals("delete")) {

            Ouser.deleteUser(lg_USER_ID, user);
            ObllBase.setMessage(Ouser.getMessage());
            ObllBase.setDetailmessage(Ouser.getDetailmessage());
            /* OTUser.setStrSTATUT(commonparameter.statut_delete);
             ObllBase.persiste(OTUser);

             new logger().oCategory.info("Suppression de user " + request.getParameter("lg_USER_ID").toString());*/

        }
        /*else if (request.getParameter("mode").toString().equals("createUserImprimante")) {
            Ouser.createUserImprimante(lg_USER_ID, lg_IMPRIMANTE_ID);
            ObllBase.setDetailmessage(Ouser.getDetailmessage());
            ObllBase.setMessage(Ouser.getMessage());
        } else if (request.getParameter("mode").toString().equals("deleteUserImprimante")) {
            Ouser.deleteUserImprimante(lg_USER_ID, lg_IMPRIMANTE_ID);
            ObllBase.setDetailmessage(Ouser.getDetailmessage());
            ObllBase.setMessage(Ouser.getMessage());
        }*/

    }

    String result;

    if (ObllBase.getMessage()
            .equals(commonparameter.PROCESS_SUCCESS)) {
        result = "{success:\"" + ObllBase.getMessage() + "\", errors_code: \"" + ObllBase.getMessage() + "\", errors: \"" + ObllBase.getDetailmessage() + "\", LG_USER_ID: \"" + user_id + "\"}";

    } else {
        result = "{success:\"" + ObllBase.getMessage() + "\", errors_code: \"" + ObllBase.getMessage() + "\", errors: \"" + ObllBase.getDetailmessage() + "\"}";
    }

    new logger().OCategory.info("JSON " + result);


%>
<%=result%>