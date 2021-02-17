function Doconnexion(str_LOGIN, Str_PASSWORD) {
    //  alert(str_LOGIN);
    $("#loader").show();

    jQuery.get("../webservices/usermanagement/ws_login.jsp?str_LOGIN=" + str_LOGIN + "&Str_PASSWORD=" + Str_PASSWORD, function (json, textStatus) {
        // alert(json);
        var obj = jQuery.parseJSON(json);
        if (obj[0].code_statut == "1") {
            if (Modernizr.localstorage) {
//                alert(obj[0].lg_EMPLACEMENT_ID);
                var xtypeuser = obj[0].xtypeuser;
                localStorage.setItem("xtypeuser", xtypeuser);
                localStorage.setItem("OFFICINE", obj[0].OFFICINE);
                localStorage.setItem("str_PIC", obj[0].str_PIC);
                localStorage.setItem("lg_EMPLACEMENT_ID", obj[0].lg_EMPLACEMENT_ID);

                window.location.replace("../general/");
            }

            //    window.location.replace("../general/");
        } else {
            alert(obj[0].desc_statut);

        }
        $("#loader").hide();
    });

}

function authenticate(str_LOGIN, Str_PASSWORD) {
    //  alert(str_LOGIN);
    $("#loader").show();
    jQuery.ajax(
            {
                type: "POST",
                url: "../api/v1/user/auth",
                dataType: 'json',
                contentType: 'application/json',
                data: JSON.stringify({"login": str_LOGIN, "password": Str_PASSWORD}),
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }, success: function (data) {
                    console.log(data.success);
                    if (data.success) {
                         console.log(data.success);
                        if (Modernizr.localstorage) {
                            var xtypeuser = data.xtypeuser;
                            localStorage.setItem("xtypeuser", xtypeuser);
                            localStorage.setItem("OFFICINE", data.OFFICINE);
                            localStorage.setItem("str_PIC", data.str_PIC);
                            localStorage.setItem("lg_EMPLACEMENT_ID", data.lg_EMPLACEMENT_ID);

                            window.location.replace("../general/");
                        }
                    }else{
                        alert("Erreur de connexion. Veuillez  ressayer"); 
                    }
                  
                }
            }
    );/*
     jQuery.post("../api/v1/user/auth", {"login": str_LOGIN, "password": Str_PASSWORD}, function (json, textStatus) {
     console.log(json);
     console.log(textStatus);
     var obj = jQuery.parseJSON(json);
     if (obj.success) {
     if (Modernizr.localstorage) {
     //                alert(obj[0].lg_EMPLACEMENT_ID);
     var xtypeuser = obj.xtypeuser;
     localStorage.setItem("xtypeuser", xtypeuser);
     localStorage.setItem("OFFICINE", obj.OFFICINE);
     localStorage.setItem("str_PIC", obj.str_PIC);
     localStorage.setItem("lg_EMPLACEMENT_ID", obj.lg_EMPLACEMENT_ID);
     
     window.location.replace("../general/");
     }
     
     //    window.location.replace("../general/");
     } else {
     alert(obj[0].desc_statut);
     
     }
     $("#loader").hide();
     });
     */
}
