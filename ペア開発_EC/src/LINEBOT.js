// アクセストークン
var token = '';
  // LINE developersのメッセージ送受信設定に記載のアクセストークン
var ss = SpreadsheetApp.openById("");
var usersheet = ss.getSheetByName('');


function doPost(e) {
  // WebHookで受信した応答用Token
  var replyToken = JSON.parse(e.postData.contents).events[0].replyToken;
  // ユーザーのメッセージを取得
  var userMessage = JSON.parse(e.postData.contents).events[0].message.text;
  // ユーザーID
  var userId = JSON.parse(e.postData.contents).events[0].source.userId;
  // ユーザーIDが存在するかの確認と、その行の取得、なければ挿入する
  var row = exitId(userId);
  // 応答メッセージ用のAPI URL
  var url = 'https://api.line.me/v2/bot/message/reply';
  var apiUrl = 'http://api.aitc.jp/jmardb-api/search?';
  if(userMessage == "オン"){
    var sendMsg = "災害情報の通知をオンにしました";
    input_value(row,"オン");
    UrlFetchApp.fetch(url, {
      'headers': {
        'Content-Type': 'application/json; charset=UTF-8',
        'Authorization': 'Bearer ' + token,
      },
      'method': 'post',
      'payload': JSON.stringify({
        'replyToken': replyToken,
        'messages': [{
          'type': 'text',
          'text': sendMsg,
        }],
      }),
    });
  }else if(userMessage == "オフ"){
    var sendMsg = "災害情報の通知をオフにしました";
    input_value(row,"オフ");
    UrlFetchApp.fetch(url, {
      'headers': {
        'Content-Type': 'application/json; charset=UTF-8',
        'Authorization': 'Bearer ' + token,
      },
      'method': 'post',
      'payload': JSON.stringify({
        'replyToken': replyToken,
        'messages': [{
          'type': 'text',
          'text': sendMsg,
        }],
      }),
    });

  }else{
    var sendMsg = "災害情報を通知したい場合はオン、通知しない場合はオフと入力してください";
    UrlFetchApp.fetch(url, {
      'headers': {
        'Content-Type': 'application/json; charset=UTF-8',
        'Authorization': 'Bearer ' + token,
      },
      'method': 'post',
      'payload': JSON.stringify({
        'replyToken': replyToken,
        'messages': [{
          'type': 'text',
          'text': sendMsg,
        }],
      }),
    });

  }
  return ContentService.createTextOutput(JSON.stringify({'content': 'post ok'})).setMimeType(ContentService.MimeType.JSON);
}

// 気象庁防災情報XMLフォーマット形式電文の公開（PULL型）の高頻度フィード(随時)を取得
// see: http://www.data.jma.go.jp/developer/xmlpull.html
function pullMeteoHeadline() {
  var url = 'http://www.data.jma.go.jp/developer/xml/feed/extra.xml';
  var xml = UrlFetchApp.fetch(url).getContentText();
  var xmlDoc = XmlService.parse(xml);
  var rootDoc = xmlDoc.getRootElement();

  var nsDefault = XmlService.getNamespace("", 'http://www.w3.org/2005/Atom');

  var entries = rootDoc.getChildren("entry", nsDefault);

  var length = entries.length;

  var currentDate = new Date().getTime();

  var title, updated, date, author, content;
  var headlines = "";
  // 最長で10分後に更新される
  var past10Min = 5 * 60 * 1000;

  // 10分以内に更新された東京都の気象警報のみ取得
  for(var i=0; i < length; i++) {
    title = entries[i].getChildText("title", nsDefault);
//    if(title != "気象特別警報・警報・注意報") continue;
//    Logger.log(title);

    updated = entries[i].getChildText("updated", nsDefault);
    date = new Date(updated).getTime();
    if(currentDate - date > past10Min){
      Logger.log('clock error');
      //本番環境では下のコードのコメントを外す
      continue;
    }

    author = entries[i].getChild("author", nsDefault).getChildText("name", nsDefault);
//    if(author != "気象庁予報部") continue;

    content = entries[i].getChildText("content", nsDefault);
    if(content.indexOf('福岡') === -1){
//      alert('content error');
      Logger.log('content error');
      continue;
    }
    Logger.log(content);

    //実際の出力テキスト
    headlines += Utilities.formatString('[%s]\n%s\n%s\n', title, toLocalDate(updated), content);
  }
  if(headlines !== "")
  {
    var array = sendFlg();
    Logger.log(headlines);
    for(var i=0;i<array.length;i++){
      pushMessage(headlines,array[i]);
    }
  }
}

function toLocalDate(dateString)
{
  var date = new Date(dateString);
  var formattedDate = Utilities.formatDate( date, 'Asia/Tokyo', 'yyyy年M月d日 HH時');
  return formattedDate;
}

function exitId(userId){
  var targetRow;
  var flag = false;
  var col = "A";
  var last_row = usersheet.getLastRow();
  var range = usersheet.getRange(1,1,last_row,1);
  var values = range.getValues();
  for(var i = 0;i < values.length; i++){
    if(values[i][0] == userId){
      flag = true;
      targetRow = i+1;
    }
  }
  if(flag == false){
    insert = usersheet.getRange(last_row+1,1).setValue(userId);
    targetRow = last_row + 1;
  }
  return targetRow;
}

function input_value(row,text){
  usersheet.getRange(row, 2).setValue(text);
}

function pushMessage(text,userId) {
    //deleteTrigger();
  var postData = {
    "to": userId,
    "messages": [{
      "type": "text",
      "text": text,
    }]
  };

  var url = "https://api.line.me/v2/bot/message/push";
  var headers = {
    "Content-Type": "application/json",
    'Authorization': 'Bearer ' + token,
  };

  var options = {
    "method": "post",
    "headers": headers,
    "payload": JSON.stringify(postData)
  };
  var response = UrlFetchApp.fetch(url, options);
}

function sendFlg(){
  var array = [];
  var last_row = usersheet.getLastRow();
  var range = usersheet.getRange(2,1,last_row,2);
  var values = range.getValues();
  for(var i = 0;i < values.length; i++){
    if(values[i][1] == "オン"){
      array.push(values[i][0]);
    }
  }
  return array;
}


function test(){
  var row = exitId("sota");
  input_value(row,"オン");
}

function test2(){
  var array = sendFlg();
  Logger.log(array)
}

//function input_value(userId){
// var key = userId;
// var col = "A";
// var row = get_row(key, col, usersheet);
// sh.getRange(row, 2).setValue("ここ");
//}
//
//function get_row(key, col, sh){
// var array = get_array(sh, col);
// var row = array.indexOf(key) + 1;
// return row;
//}
//
//function get_array(sh, col) {
//  var last_row = sh.getLastRow();
//  var range = sh.getRange(col + "1:" + col + last_row)
//  var values = range.getValues();
//  var array = [];
//  for(var i = 0; i < values.length; i++){
//    array.push(values[i][0]);
//  }
//  return array;
//}
