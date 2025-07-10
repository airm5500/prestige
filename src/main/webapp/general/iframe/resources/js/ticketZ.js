$(document).ready(function () {
    const today = new Date().toISOString().split('T')[0];
    $("#dtStart").val(today);
    $("#dtEnd").val(today);
    $("#spinner").hide();
    $.get('../api/v1/common/users', function (data, status) {
        const container = $('#userId');
        for (let u of data.data) {
            container.append($('<option>')
                    .val(u.lgUSERID).text(u.fullName));
        }

    });
    $("#afficher").bind("click", function () {
        $("#spinner").show();
        loadData();
    });
    $("#send-sms").bind("click", function () {
        $(this).prop('disabled', true);
        const html = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span><span class="visually-hidden" role="status">Imprimer...</span>';
        $(this).html(html);
        $.ajax({
            url: '../api/v1/caisse/send-sms',
            method: "POST",
            data: JSON.stringify(buildParams()),
            dataType: "json",
            contentType: 'application/json'

        }).done(function (data) {
            console.log("impression terminée");
        }).always(function () {
          
           $("#send-sms").text("Envoyer SMS");
            $("#send-sms").prop('disabled', false);

        });
    });

    $("#imprimer").bind("click", function () {
        $("#imprimer").prop('disabled', true);
        const html = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span><span class="visually-hidden" role="status">Imprimer...</span>';
        $("#imprimer").html(html);
        $.ajax({
            url: '../api/v1/caisse/tickez',
            method: "POST",
            data: JSON.stringify(buildParams()),
            dataType: "json",
            contentType: 'application/json'

        }).done(function (data) {
            console.log("impression terminée");
        }).always(function () {
            $("#imprimer").text("Imprimer");
            $("#imprimer").prop('disabled', false);

        });
    });

    loadData();
});

function buildParams() {
    const hrEnd = $("#hrEnd").val();
    const hrStart = $("#hrStart").val();
    const userId = $("#userId").val();
    const dtStart = $("#dtStart").val();
    const dtEnd = $("#dtEnd").val();
    const description = $("#description").val();
    return {hrEnd, description, dtEnd, dtStart, userId, hrStart};

}
function loadData() {
    const container = $('#ticket-container');
    const btnStat = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span><span class="visually-hidden" role="status">Recherche...</span>';
    const spinner = '<div class="spinner-border m-xxl-5 text-success" role="status" id="spinner"></div>';
    $("#afficher").prop('disabled', true);
    $("#afficher").html(btnStat);
    container.html(spinner);
    $.ajax({
        url: '../api/v1/caisse/fetch-tickez',
        method: "POST",
        data: JSON.stringify(buildParams()),
        dataType: "json",
        contentType: 'application/json'

    }).done(function (data) {
        const tickets = data.data;
        if (tickets) {

            const datas = tickets.datas;

            let html = '';
            if (datas) {
                for (let userData of datas) {
                    html += '<div class="col-md-3">';
                    const user = userData.user;
                    html += '<div class="card"> <div class="card-body"><h6 class="card-title">RECAPITULATIF DE  ' + user + '</h6> <table class="table table-striped table-sm"> <tbody>';
                    const modePaymentAmounts = userData.modePaymentAmounts;
                    for (let mode of modePaymentAmounts) {
                        html += ' <tr><td>' + mode.modeLibelle + '</td><td class="text-right text-black">' + mode.montant + '</td> </tr>';
                    }

                    const totaux = userData.totaux;
                    for (let g of totaux) {
                        html += ' <tr><th>' + g.modeLibelle + '</th><td class="text-right text-black">' + g.montant + '</td> </tr>';
                    }
                    html += '</tbody> </table></div> </div> </div>  ';
                }
            }


            const totauxGeneral = tickets.totaux;
            if (totauxGeneral) {
                html += '<div class="col-md-6"><div class="card"><div class="card-body"> <h6 class="card-title">TOTAL GENERAL</h6><table class="table table-striped table-sm"> <tbody>';
                for (let gr of totauxGeneral) {
                    html += ' <tr><td>' + gr.modeLibelle + '</td><td class="text-right text-black">' + gr.montant + '</td> </tr>';
                }
                html += '</tbody> </table></div> </div>  </div></div>';
                container.html(html);
            }

        }


    }).always(function () {
        $('#spinner').hide();
        $("#afficher").prop('disabled', false);
        $("#afficher").html("Afficher");

    });
}