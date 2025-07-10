
const CURRENT_YEAR = new Date().getFullYear();
const LAST_THREE_YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR];
const   LABELS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aoùt', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const CHART_COLORS = {
    red: 'rgb(255, 99, 132)',
    orange: 'rgb(255, 159, 64)',
    yellow: 'rgb(255, 205, 86)',
    green: 'rgb(75, 192, 192)',
    blue: 'rgb(54, 162, 235)',
    purple: 'rgb(153, 102, 255)',
    grey: 'rgb(201, 203, 207)'
};
const CHART_COLORS_TRANSPARENT = {
    red: 'rgba(255, 99, 132,0.5)',
    orange: 'rgba(255, 159, 64,0.5)',
    yellow: 'rgba(255, 205, 86,0.5)',
    green: 'rgba(75, 192, 192,0.5)',
    blue: 'rgba(54, 162, 235,0.5)',
    purple: 'rgba(153, 102, 255,0.5)',
    grey: 'rgba(201, 203, 207,0.5)'
};
const  NAMED_COLORS = [
    CHART_COLORS.red,
    CHART_COLORS.orange,
    CHART_COLORS.yellow,
    CHART_COLORS.green,
    CHART_COLORS.blue,
    CHART_COLORS.purple,
    CHART_COLORS.grey,

    CHART_COLORS_TRANSPARENT.red,
    CHART_COLORS_TRANSPARENT.orange,
    CHART_COLORS_TRANSPARENT.yellow,
    CHART_COLORS_TRANSPARENT.green,
    CHART_COLORS_TRANSPARENT.blue,
    CHART_COLORS_TRANSPARENT.purple,
    CHART_COLORS_TRANSPARENT.grey
];

const COLORS = [
    '#4dc9f6',
    '#f67019',
    '#f53794',
    '#537bc4',
    '#acc236',
    '#166a8f',
    '#00a950',
    '#58595b',
    '#8549ba'
];
$(document).ready(function () {

    $.ajax({
        url: '../api/v1/balance/etat-annuel',
        method: "GET",
        dataType: "json"

    }).done(function (data) {

        buildChart($('#caChart'), $('#lineChart'), data);
    }).always(function () {
        $('#spinner1').hide();
        $('#spinner2').hide();
    });
});


const barChartData = (serverSideDate) => {
    return {
        labels: LABELS,
        datasets: [
            {
                label: LAST_THREE_YEARS[0],
                data: serverSideDate[0],
                borderColor: CHART_COLORS.red,
                backgroundColor: CHART_COLORS_TRANSPARENT.red
            },
            {
                label: LAST_THREE_YEARS[1],
                data: serverSideDate[1],
                borderColor: CHART_COLORS.blue,
                backgroundColor: CHART_COLORS_TRANSPARENT.blue
            }
            ,
            {
                label: LAST_THREE_YEARS[2],
                data: serverSideDate[2],
                borderColor: CHART_COLORS.yellow,
                backgroundColor: CHART_COLORS_TRANSPARENT.yellow
            }
        ]
    };
};
const barChartConfig = (data, type) => {

    return {
        type: type,
        data: barChartData(data),
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top'
                },
                title: {
                    display: true,
                    text: "Statistique CA sur 3ans(CFA)"
                }
            }
        }
    };
};

function buildChart(htmlEl, lineHtml, datas) {

    const currentYear = datas.currentYear;
    const yearMinusOne = datas.yearMinusOne;
    const yearMinusTwo = datas.yearMinusTwo;
    const currentYearData = [currentYear?.janvier,
        currentYear?.fevrier, currentYear?.mars, currentYear?.avril, currentYear?.mai, currentYear?.juin, currentYear?.juillet, currentYear?.aout, currentYear?.septembre, currentYear?.octobre, currentYear?.novembre, currentYear?.decembre];
    const yearMinusOneData = [yearMinusOne?.janvier,
        yearMinusOne?.fevrier, yearMinusOne?.mars, yearMinusOne?.avril, yearMinusOne?.mai, yearMinusOne?.juin, yearMinusOne?.juillet, yearMinusOne?.aout, yearMinusOne?.septembre, yearMinusOne?.octobre, yearMinusOne?.novembre, yearMinusOne?.decembre];
    const yearMinusTwoData = [yearMinusTwo?.janvier,
        yearMinusTwo?.fevrier, yearMinusTwo?.mars, yearMinusTwo?.avril, yearMinusTwo?.mai, yearMinusTwo?.juin, yearMinusTwo?.juillet, yearMinusTwo?.aout, yearMinusTwo?.septembre, yearMinusTwo?.octobre, yearMinusTwo?.novembre, yearMinusTwo?.decembre];
    const data = [yearMinusTwoData, yearMinusOneData, currentYearData];
    new Chart(htmlEl, barChartConfig(data, 'bar'));
    new Chart(lineHtml, barChartConfig(data, 'line'));
}