<%@page import="bll.common.Parameter"%>
<%@page import="bll.migration.MigrationManager"%>
<%@page import="dal.TFamilleStock"%>
<%@page import="toolkits.utils.jdom"%>
<%@page import="java.io.File"%>
<%@page import="org.apache.commons.fileupload.FileItem"%>
<%@page import="org.apache.commons.fileupload.DiskFileUpload"%>
<%@page import="org.apache.commons.fileupload.FileUpload"%>
<%@page import="bll.commandeManagement.suggestionManagement"%>
<%@page import="bll.configManagement.familleGrossisteManagement"%>
<%@page import="dal.TOrderDetail"%>
<%@page import="bll.commandeManagement.bonLivraisonManagement"%>
<%@page import="dal.TFamille"%>
<%@page import="dal.TGrossiste"%>
<%@page import="dal.TFamilleGrossiste"%>
<%@page import="bll.warehouse.WarehouseManager"%>
<%@page import="dal.TOrder"%>
<%@page import="dal.TTypeRemise"%>
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
<%@page import="bll.configManagement.familleManagement"  %>

<%
    Translate oTranslate = new Translate();
    dataManager OdataManager = new dataManager();
   

%>


<%   
    String table_name = "", str_TYPE_TRANSACTION = commonparameter.ACCOUNT_BALANCE_MESSAGE, lg_GROSSISTE_ID = Parameter.DEFAUL_GROSSISTE;
    
    if (request.getParameter("table_name") != null) {
        table_name = request.getParameter("table_name");
        new logger().oCategory.info("table_name : " + table_name);
    }

    
    TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
    OdataManager.initEntityManager();
 TUser user = OdataManager.getEm().find(TUser.class, OTUser.getLgUSERID());
    bllBase ObllBase = new bllBase();
    ObllBase.setOTUser(user);
    ObllBase.LoadDataManger(OdataManager);
    ObllBase.LoadMultilange(oTranslate);
    

    MigrationManager OMigrationManager = new MigrationManager(OdataManager, user);

    // Meme controle que le menu 'Importation' de la fiche article : privilege
    // obligatoire cote serveur pour l'import des articles.
    List<dal.TPrivilege> lstPrivImport = (List<dal.TPrivilege>) session.getAttribute(commonparameter.USER_LIST_PRIVILEGE);
    boolean bImportArticleAutorise = lstPrivImport != null
            && util.DateConverter.hasAuthorityByName(lstPrivImport, util.Constant.P_BTN_IMPORT_ARTICLE);

    if ((Parameter.TABLE_FAMILLE.equals(table_name) || Parameter.TABLE_MISEAJOUR_STOCKDEPOT.equals(table_name))
            && !bImportArticleAutorise) {
        ObllBase.setMessage(commonparameter.PROCESS_FAILED);
        ObllBase.setDetailmessage("Vous n'avez pas le privilège requis pour importer des articles");
    } else if (request.getParameter("mode") != null) {
        if (request.getParameter("mode").equals("importfile")) {

            try {

                //code gestion uoload
                boolean isMultipart = FileUpload.isMultipartContent(request);
                if (!isMultipart) {
                    //request.setAttribute("msg", "Request was not multipart!");
                    //request.getRequestDispatcher("msg.jsp").forward(request, response);
                    new logger().OCategory.info("Erreur d'imporation");
                    return;
                }
                DiskFileUpload upload = new DiskFileUpload();
                List items = upload.parseRequest(request);
                Iterator itr = items.iterator();
                while (itr.hasNext()) {
                    FileItem item = (FileItem) itr.next();
                    if (item.isFormField()) {
                        String fieldName = item.getFieldName();
                        new logger().OCategory.info("fieldName " + fieldName + "value " + item.getString());
                       /* if (fieldName.equalsIgnoreCase("lg_GROSSISTE_ID")) {
                            lg_GROSSISTE_ID = item.getString();
                            new logger().OCategory.info("lg_GROSSISTE_ID"+lg_GROSSISTE_ID); 
                        }*/
                        if (fieldName.equalsIgnoreCase("str_TYPE_TRANSACTION_IMPORT")) {
                            str_TYPE_TRANSACTION = item.getString();
                            new logger().OCategory.info("str_TYPE_TRANSACTION:"+str_TYPE_TRANSACTION); 
                        }
                    } else {
                        String fileName = "";   // The file name the user entered.
                        String extension = "";  // The extension.

                        fileName = item.getName();
                        int dotPos = fileName.lastIndexOf(".");
                        extension = fileName.substring(dotPos);
                        if (extension.equalsIgnoreCase(".csv") || extension.equalsIgnoreCase(".xls") || extension.equalsIgnoreCase(".xlsx")) {
                            try {
                                File fullFile = new File(item.getName());
                                String New_Name_Of_File = fullFile.getName();
                                new logger().OCategory.info("nom fichier " + jdom.path_file_generate_absolute_imported + "csv\\" + New_Name_Of_File);
                                File savedFile = new File(jdom.path_file_generate_absolute_imported + "csv/", New_Name_Of_File);
                                item.write(savedFile);
                                String file_final_name = jdom.path_file_generate_absolute_imported + "csv/" + New_Name_Of_File;

                                OMigrationManager.ImportDataToDataBase(table_name, file_final_name, extension, str_TYPE_TRANSACTION);
                                ObllBase.setDetailmessage(OMigrationManager.getDetailmessage());
                                ObllBase.setMessage(OMigrationManager.getMessage());
                            } catch (Exception e) {
                                ObllBase.setDetailmessage("Erreur lors du deplacement du fichier");
                                new logger().OCategory.info("Erreur lors du deplacement du fichier");
                                e.printStackTrace();
                                ObllBase.setMessage(commonparameter.PROCESS_FAILED);
                            }
                        } else {
                            new logger().OCategory.info("Extension du fichier  " + extension);
                        }
                    }
                }

            } catch (Exception e) {

                new logger().OCategory.info("Error  : " + e.toString());

            }

        }
    }

    String result;
    if (ObllBase.getMessage().equals(commonparameter.PROCESS_SUCCESS)) {
        result = "{success:\"" + ObllBase.getMessage() + "\", errors: \"" + ObllBase.getDetailmessage() + "\"}";

    } else {
        result = "{success:\"" + ObllBase.getMessage() + "\", errors: \"" + ObllBase.getDetailmessage() + "\"}";
    }
   

%>
<%=result%>