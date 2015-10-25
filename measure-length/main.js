
/// <reference path='typings/jquery/jquery.d.ts' />
/// <reference path='typings/canvasjs/canvasjs.d.ts' />


/**
  * 日付をフォーマットする
  * @param  {Date}   date     日付
  * @param  {String} [format] フォーマット
  * @return {String}          フォーマット済み日付
  * 
  * @see http://qiita.com/osakanafish/items/c64fe8a34e7221e811d0
  */
function formatDate(date, format) {
  if (!format) format = 'YYYY-MM-DD hh:mm:ss.SSS';
  format = format.replace(/YYYY/g, date.getFullYear());
  format = format.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2));
  format = format.replace(/DD/g, ('0' + date.getDate()).slice(-2));
  format = format.replace(/hh/g, ('0' + date.getHours()).slice(-2));
  format = format.replace(/mm/g, ('0' + date.getMinutes()).slice(-2));
  format = format.replace(/ss/g, ('0' + date.getSeconds()).slice(-2));
  if (format.match(/S/g)) {
    var milliSeconds = ('00' + date.getMilliseconds()).slice(-3);
    var length = format.match(/S/g).length;
    for (var i = 0; i < length; i++) format = format.replace(/S/, milliSeconds.substring(i, i + 1));
  }
  return format;
}



// 仮想キャンバス  ─<座標変換>→  HTML Canvas element coordinate

var 仮想キャンバスの幅 = 10.0;
var 仮想キャンバスの高さ = 10.0;

var 箱の仮想キャンバスにおける長さ;
var 太さ0の棒の仮想キャンバスにおける長さ;
var 箱のCanvasElementCoordinateにおける長さ;
var 太さ0の棒のCanvasElementCoordinateにおける長さ;
var 箱の物理空間における長さ;
var 太さ0の棒の物理空間における長さ;

function func(){
  $('#answer_field').val('');
  $('#answer_field').removeAttr('disabled');
  $('#answer_button').removeAttr('disabled');
  $('#result').text('');
  
  var 箱の仮想キャンバスにおける縦位置 = 8.0;
  箱の仮想キャンバスにおける長さ = 10.0 * (0.1 + 0.9 * Math.random());
  var 太さ0の棒の仮想キャンバスにおける始点 = [仮想キャンバスの幅 / 2.0, 仮想キャンバスの高さ / 2.0];
  var 太さ0の棒の仮想キャンバスにおける伸長方向 = 2.0 * Math.PI * Math.random();
  太さ0の棒の仮想キャンバスにおける長さ = 5.0 * (0.1 + 0.9 * Math.random());
  
  var rate_物理空間_divide_仮想キャンバス = 100.0 / 箱の仮想キャンバスにおける長さ;
  
  箱の物理空間における長さ = 箱の仮想キャンバスにおける長さ * rate_物理空間_divide_仮想キャンバス;
  太さ0の棒の物理空間における長さ = 太さ0の棒の仮想キャンバスにおける長さ * rate_物理空間_divide_仮想キャンバス;
  
  {
    var mainCanvasHTMLElement = window.document.getElementById('main_canvas');
    
    {
      var context = mainCanvasHTMLElement.getContext('2d');
      
      var rate = mainCanvasHTMLElement.width / 仮想キャンバスの幅;
  
      var 箱のCanvasElementCoordinateにおける縦位置 = 箱の仮想キャンバスにおける縦位置 * rate;
      箱のCanvasElementCoordinateにおける長さ = 箱の仮想キャンバスにおける長さ * rate;
      var 太さ0の棒のCanvasElementCoordinateにおける始点 = 太さ0の棒の仮想キャンバスにおける始点.map( function(val, index, array){ return val * rate; } );
      var 太さ0の棒のCanvasElementCoordinateにおける伸長方向 = 太さ0の棒の仮想キャンバスにおける伸長方向 * rate;
      太さ0の棒のCanvasElementCoordinateにおける長さ = 太さ0の棒の仮想キャンバスにおける長さ * rate;
          
      
      context.clearRect(0, 0, mainCanvasHTMLElement.width, mainCanvasHTMLElement.height);
      
      context.beginPath();
      context.rect(
        (mainCanvasHTMLElement.width - 箱のCanvasElementCoordinateにおける長さ) / 2.0,
        箱のCanvasElementCoordinateにおける縦位置,
        箱のCanvasElementCoordinateにおける長さ,
        mainCanvasHTMLElement.height
      )
      context.stroke();
      
      context.font = "20px sans-serif";
      context.textAlign = 'center';
      context.fillText(
        '幅 ' + Math.round(箱の物理空間における長さ) + ' cm', // 整数になってくれない場合があるので表示の際は丸めておく
        mainCanvasHTMLElement.width / 2.0,
        箱のCanvasElementCoordinateにおける縦位置 + 25.0
        );
      
      context.beginPath();
      context.moveTo(太さ0の棒のCanvasElementCoordinateにおける始点[0], 太さ0の棒のCanvasElementCoordinateにおける始点[1]);
      context.lineTo(
        太さ0の棒のCanvasElementCoordinateにおける始点[0]
        + 太さ0の棒のCanvasElementCoordinateにおける長さ * Math.cos(太さ0の棒のCanvasElementCoordinateにおける伸長方向),
        太さ0の棒のCanvasElementCoordinateにおける始点[1]
        - 太さ0の棒のCanvasElementCoordinateにおける長さ * Math.sin(太さ0の棒のCanvasElementCoordinateにおける伸長方向)
      );
      context.stroke();
      
      $('#answer_field').focus();
    }
  }
}

function answer(){
  if($('#answer_field').val() == ''){
    return;
  }
  
  try{
    var answer = parseFloat($('#answer_field').val());
  }catch(e){
    return;
  }
  
  $('#answer_field').attr('disabled', 'disabled');
  $('#answer_button').attr('disabled', 'disabled');
  
  //誤差判定
  var error = (answer / 太さ0の棒の物理空間における長さ * 100.0) - 100.0;
  var readableError =  Math.round(error * 10.0) / 10.0;
  
  $('#result').text(
    'あなたの解答 = ' +  answer + ' cm'
  + ' / '
  + '正解 = ' + Math.round(太さ0の棒の物理空間における長さ*10.0)/10.0 + ' cm'
  + ' / '
  + '誤差 = ' + (readableError > 0 ? '+' : '') + readableError + '%'
  );
  
  $('#log').val(
    $('#log').val()
    + '--------------------------------' + '\n'
    + '[' + formatDate(new Date(), 'YYYY/MM/DD hh:mm:ss') + ']\n'
    + 'box_width(internal)=' + 箱の仮想キャンバスにおける長さ + '\n'
    + 'bar_length(internal)=' + 太さ0の棒の仮想キャンバスにおける長さ + '\n'
    + 'box_width(on display)=' + 箱のCanvasElementCoordinateにおける長さ + '\n'
    + 'bar_length(on display)=' + 太さ0の棒のCanvasElementCoordinateにおける長さ + '\n'
    + 'box_width(physical)=' + 箱の物理空間における長さ + '\n'
    + 'bar_length(physical)=' + 太さ0の棒の物理空間における長さ + '\n'
    + 'answer(physical)=' + answer + '\n'
    + 'error=' + error + '\n'
    );
}

// ニーモニックキーを設定
$(window.document).keydown(function (e) {
  switch (e.keyCode) {
    case 78:
      // Key: n
      func();
      break;
    //case 13:
      // Key: Enter
      //break;
  }
});

$('#log').val( '[' + formatDate(new Date(), 'YYYY/MM/DD hh:mm:ss') + ']\n' );

func();
