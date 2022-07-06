const URL = "https://mediakit.iportal.ru/our-team";

const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');

function to_csv(list){
    let csvContent = list.map(e => e.join(",")).join("\n");
    fs.writeFile("result.csv", csvContent, function(err) {
        if(err) {
            return console.log(err);
        }})
}
function correction(list){
    for (let i = 0;i < list.length;i++){
        if (!list[i][2]) list[i][2] = '-';
        if (list[i][0] == "Самара" || list[i][0] == "Иркутск") [list[i][1],list[i+1][1]] = [list[i+1][1],list[i][1]]
    }
        return list
}
function to_simpl_list(list){
    let s_list = [];
    for (k in list){
        let t = [];
        for (i in list[k]) t.push(list[k][i]);
        s_list.push(t);
    }
    return(s_list)
}
function parse(err, res, body) {
    if (err) { throw err};
    const $ = cheerio.load(body);
    let names = [];
    let mails = [];
    let rows = $("div.t396__elem[data-elem-type='text']")
    names = rows.text().split('  \n');
    rows.contents().contents('a').filter('a').each(function (i, elem) {
        mails.push($(this).text());
      });
    let citys = new Set(rows.filter("[data-field-top-value='1'],[data-field-top-value='0']").text().split('  \n').slice(1));

    let ext_desc = [];
    let ext_name = [];
    let ext_email = [];
      //блок с дополнительными работниками
    $('div .t544__title ,div .t524__persname').each(function (i, elem) {
        ext_name.push($(this).text());
      });
    $('div .t544__descr,div .t524__persdescr').each(function (i, elem) {
        ext_desc.push($(this).text());
      });
    $('div .t527__persname').each(function (i, elem) {
        ext_name.push($(this).text());
      });
    $('div .t527__persdescr').each(function (i, elem) {
        ext_desc.push($(this).text());
      });  
    $('div .t544__text,div .t524__perstext').contents().contents().each(function (i, elem) { let temp = $(this).text();if (temp[0] != '@' && temp[0] != ' ')
        ext_email.push(temp);
      });

      for (let i = 0;i<=ext_name.length-ext_email.length;i++) ext_email.push('-')

    let v1 = automate(citys,names,mails);
    let v2 = make_ext(ext_name,ext_desc,ext_email);
    v1 = correction(to_simpl_list(v1.concat(v2)));
    to_csv(v1);

}
function make_ext(name,desc,email){
    csv_models = [];
    for (n in name){
        csv_models.push({city:"-",name:name[n],post:desc[n],email:email[n]});
    }
    return csv_models;
}


//автомат состояний,парсящий хаотичный набор значений
function automate(citys,names,mails){
    let status_quaue = [0]
    let status;
    csv_models = []
    for (let n = 0;n<names.length;n++){
        status = status_quaue.shift()
        if (names[n] == 'Андрей Затирко') n+=2; //призрак
        else if (names[n] == '') n++;
        if (status == 0){ //город
            if (citys.has(names[n])) {csv_models.push({city:names[n]});status_quaue.push(1);continue;}
            status_quaue.push(0);
            continue;
        }
        if (status == 1){ //имя
            if (citys.has(names[n])) {csv_models.push({city:names[n]});status_quaue.push(3);continue;}
            csv_models[csv_models.length-1].name = names[n];
            status_quaue.push(2);
            continue;
        }
        if (status == 2){ //почта
            if (citys.has(names[n])) {csv_models.push({city:names[n]});status_quaue.push(5);continue;}
            csv_models[csv_models.length-1].post = names[n];
            csv_models[csv_models.length-1].email = mails[csv_models.length-1]
            status_quaue.push(0);
            continue;
        }
        if (status == 3){
            n--;
            status_quaue.push(1,2,4)
            continue
        }
        if (status == 4){
            n--;
            status_quaue = [];
            csv_models[csv_models.length-1].email = mails[csv_models.length-2];
            [csv_models[csv_models.length-1], csv_models[csv_models.length-2]] = [csv_models[csv_models.length-2], csv_models[csv_models.length-1]];
            status_quaue.push(1)
        }
        if (status == 5){
            n--
            status_quaue.push(1)
            csv_models[csv_models.length-2].post = '-'
            temp = csv_models[csv_models.length-2].name
            csv_models[csv_models.length-2].email = csv_models[csv_models.length-3].email
            csv_models[csv_models.length-3].post = temp
            csv_models[csv_models.length-3].email = mails[csv_models.length-2]
            csv_models[csv_models.length-2].name = '-'
        }
    }
    csv_models.forEach(to_normal);
    return csv_models;
    }
//нормализация обьекта
function to_normal(object){
    if (!object.post) return;
    ind = object.post.indexOf(object.email);
    if (ind < 0) {[object.post,object.name] = [object.name,object.post];ind = object.post.indexOf(object.email);}
    ind2 = object.post.indexOf('8');
    if (ind2 != -1) ind = ind2;
    object.post = object.post.slice(0,ind);
    for (k in object){
        object[k] = object[k].trimStart()
        object[k] = object[k].trimEnd()
    }
}
request(URL, parse);