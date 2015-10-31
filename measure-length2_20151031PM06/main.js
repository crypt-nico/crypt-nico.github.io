
/// <reference path='typings/jquery/jquery.d.ts' />


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



var appName = 'measure-length2';
var appVer = '20151031PM06';


// 仮想キャンバス  ─<座標変換>→  HTML Canvas element coordinate

var widgetWidth_internal = 10.0;
var widgetHeight_internal = 10.0;

var barWidth_internal = 0.2;
var barAngle;
var boxWidth_internal;
var barLength_internal;
var boxWidth_canvas;
var barLength_canvas;
var boxWidth_physical;
var barLength_physical;










var difficultyTable = []; // IntelliSense 発動のため代入しておく
var currentLevel;
var currentSerialClearedCount;

var ratioOfLineSegments;

function initialize(){
  { // 難易度表を作成
    // 線分長比 x:y の2つの線分が与えられているときの、x:[ ] という穴埋め問題の難易度
    function difficulty(x, y){
      return x + 2.0*Math.abs(y-x)/x;
    }
    
    difficultyTable = [];
    for(var A = 1 ; A <= 100 ; A++){
      for(var B = 1 ; B <= 100 ; B++){
        if(Math.max(A, B) / Math.min(A, B) > 2) continue; // 長い方の線分 / 短い方の線分 が 2 を超えないように調整
        
        difficultyTable.push( [A, B, difficulty(A, B)] );
      }
    }
    difficultyTable.sort( function(a, b){ return (a[2] - b[2]); } );
  }
  
  // 初期レベルは 1
  currentLevel = 1;
  
  // 初期の連続正解数は 0
  currentSerialClearedCount = 0;
  
  { // DOMツリーをいじる
    $('input[type="text"]#answer_field').keydown(function (e) {
      function answer(){
        { // 1回でも解答したらチュートリアルを消去
          $('span#tutorial_label').text('');
        }
        
        var answeredInteger = parseInt( $('input[type="text"]#answer_field').val() );
        var isCorrect;
        
        if(isCorrect = (answeredInteger == ratioOfLineSegments[1])){ // 正誤判定
          currentSerialClearedCount++; // 正解していたら連続正解数を1増やす
        }else{
          currentSerialClearedCount = 0; // 正解していたら連続正解数を0にリセットする
        }
        
        if(currentSerialClearedCount == 10){ // 連続正解数が10に達していたら
          currentLevel++; // レベルを1上げて
          currentSerialClearedCount = 0; // 連続正解数を0にリセットする
        }
        
        { // DOMツリーをいじる
          $('input[type="text"]#answer_field').val(''); // 解答欄を空にする
          
          $('span#isCorrect_label').hide();
          $('span#isCorrect_label').text(
            (isCorrect ? '正解!' : 'ハズレ!')
            + ' （前問の答え: ' + ratioOfLineSegments[1] + '）'
          );
          $('span#isCorrect_label').fadeIn('fast');
          
          $('span#currentSerialClearedCount_label').hide();
          $('span#currentSerialClearedCount_label').text( '（現在の連続正解数: ' + currentSerialClearedCount + '）' );
          $('span#currentSerialClearedCount_label').fadeIn('fast');
        }
        
        func(); // 次の問題を出す
      }
      
      switch (e.keyCode) {
        case 13:
          // Key: Enter
          answer();
          break;
      }
    });
  }
}





function func(){
  { // 線分長比を選定
    // レベルを元にエントリをランダムに選定
    //
    // Level 1 なら difficultyTable[0] と difficultyTable[9] の間からランダムに1つ
    // Level 23 なら difficultyTable[220] と difficultyTable[229] の間からランダムに1つ
    function select(level){
      return difficultyTable[ 10*(level-1) + Math.floor(10.0 * Math.random()) ];
    }
    
    ratioOfLineSegments = select(currentLevel).slice(0, 2);
  }
  
  var lineSegmentA_Angle = 2.0 * Math.PI * Math.random();
  var lineSegmentB_Angle = 2.0 * Math.PI * Math.random();
  
  widgetWidth_internal = 10.0;
  widgetHeight_internal = 10.0;
  var minLengthOfShorterLS = 0.5; // 短い方の辺の最小値
  var minLengthOfLongerLS = 6.0; // 長い方の辺の最小値
  var lineSegmentWidth_internal = 0.1;
  
  var lineSegmentA_Position;
  var lineSegmentB_Position;
  {
    function getLineSegmentPositions(regionWidth, regionHeight, minimumLength, lineSegmentA_Angle, lineSegmentB_Angle, ratioOfLineSegments){
      var B_over_A = ratioOfLineSegments[1] / ratioOfLineSegments[0];
      var A_over_B = ratioOfLineSegments[0] / ratioOfLineSegments[1];
      
      var lineSegmentA_Position;
      var lineSegmentB_Position;
      { // 2つの線分それぞれの始点と終点を求める
        var lineSegmentA_Length;
        var lineSegmentB_Length;
        { // 2つの線分それぞれの長さを求める
          var lineSegmentA_PossibleRange;
          { // 線分 A の取りうる長さの範囲を求める
            var lineSegmentA_MaxLength;
            var lineSegmentB_MaxLength;
            {
              lineSegmentA_MaxLength = Math.min(
                regionWidth / Math.abs( Math.cos( lineSegmentA_Angle ) ),
                regionHeight / Math.abs( -Math.sin( lineSegmentA_Angle ) )
                );
              lineSegmentB_MaxLength = Math.min(
                regionWidth / Math.abs( Math.cos( lineSegmentB_Angle ) ),
                regionHeight / Math.abs( -Math.sin( lineSegmentB_Angle ) )
                );
            }
            
            // TODO: possible range が空だったら例外を吐く
            
            lineSegmentA_PossibleRange = [
                (ratioOfLineSegments[0] >= ratioOfLineSegments[1] ? // 線分Aが長い方か短い方かによって最小値を場合分け
                  Math.max(minLengthOfShorterLS*A_over_B, minLengthOfLongerLS)
                  :
                  Math.max(minLengthOfShorterLS, minLengthOfLongerLS*A_over_B)
                  ),
              Math.min(
                lineSegmentA_MaxLength,
                lineSegmentB_MaxLength*A_over_B
                ) 
              ];
          }
          
          lineSegmentA_Length = lineSegmentA_PossibleRange[0] + (lineSegmentA_PossibleRange[1]-lineSegmentA_PossibleRange[0])*Math.random()
          lineSegmentB_Length = lineSegmentA_Length * B_over_A;
        }
        
        {
          function randomPosition(regionWidth, regionHeight, length, angle){
            var start;
            var end;
            
            start = [
              ( regionWidth - length * Math.abs(Math.cos(angle)) ) * Math.random(),
              ( regionHeight - length * Math.abs(-Math.sin(angle)) ) * Math.random()
              ];
            if(angle >= 0 && angle < 0.5*Math.PI){
              start = [
                start[0],
                start[1] + length * Math.abs(-Math.sin(angle))
                ];
            }else if(angle >= 0.5*Math.PI && angle < 1.0*Math.PI){
              start = [
                start[0] + length * Math.abs(Math.cos(angle)),
                start[1] + length * Math.abs(-Math.sin(angle))
                ];
            }else if(angle >= 1.0*Math.PI && angle < 1.5*Math.PI){
              start = [
                start[0] + length * Math.abs(Math.cos(angle)),
                start[1]
                ];
            }else if(angle >= 1.5*Math.PI && angle < 2.0*Math.PI){
              start = [
                start[0],
                start[1]
                ];
            }else{
              // assert false;
            }
            end = [
              start[0] + length * Math.cos(angle),
              start[1] + length * -Math.sin(angle),
              ];
            
            return [start, end];
          }
        
          lineSegmentA_Position = randomPosition(regionWidth, regionHeight, lineSegmentA_Length, lineSegmentA_Angle);
          lineSegmentB_Position = randomPosition(regionWidth, regionHeight, lineSegmentB_Length, lineSegmentB_Angle);
        }
      }
      
      return [lineSegmentA_Position, lineSegmentB_Position];
    }

    {
      var tmp = getLineSegmentPositions(
        widgetWidth_internal * 0.96, // 線分に太さがあることを考慮して、線分が壁に密着しないようにする
        widgetHeight_internal * 0.96,
        0.5,
        lineSegmentA_Angle,
        lineSegmentB_Angle,
        ratioOfLineSegments
        );
      lineSegmentA_Position = tmp[0];
      lineSegmentB_Position = tmp[1];
    }
    lineSegmentA_Position = [
      [widgetWidth_internal*0.02 + lineSegmentA_Position[0][0], widgetHeight_internal*0.02 + lineSegmentA_Position[0][1]],
      [widgetWidth_internal*0.02 + lineSegmentA_Position[1][0], widgetHeight_internal*0.02 + lineSegmentA_Position[1][1]]
    ];
    lineSegmentB_Position = [
      [widgetWidth_internal*0.02 + lineSegmentB_Position[0][0], widgetHeight_internal*0.02 + lineSegmentB_Position[0][1]],
      [widgetWidth_internal*0.02 + lineSegmentB_Position[1][0], widgetHeight_internal*0.02 + lineSegmentB_Position[1][1]]
    ];
  }
  

  var mainCanvasHTMLElement = window.document.getElementById('main_canvas');
  
  var ratio_canvas_over_internal = mainCanvasHTMLElement.width / widgetWidth_internal;

  { // canvas に描画
    var ctx = mainCanvasHTMLElement.getContext('2d');
    
    {
      ctx.clearRect(0, 0, mainCanvasHTMLElement.width, mainCanvasHTMLElement.height);
      {
        ctx.lineWidth = lineSegmentWidth_internal * ratio_canvas_over_internal;
        ctx.lineCap = 'butt'; // 太い線分の端っこはバッサリ切る
        ctx.lineJoin = 'bevel'; // 太い線分同士の接続点では何も補完しない
      }
      { // 線分 A を描画
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        
        ctx.beginPath();
        ctx.moveTo( lineSegmentA_Position[0][0]*ratio_canvas_over_internal, lineSegmentA_Position[0][1]*ratio_canvas_over_internal );
        ctx.lineTo( lineSegmentA_Position[1][0]*ratio_canvas_over_internal, lineSegmentA_Position[1][1]*ratio_canvas_over_internal );
        ctx.stroke();
      }
      { // 線分 B を描画
        ctx.strokeStyle = 'rgba(231, 114, 166, 0.8)';
        
        ctx.beginPath();
        ctx.moveTo( lineSegmentB_Position[0][0]*ratio_canvas_over_internal, lineSegmentB_Position[0][1]*ratio_canvas_over_internal );
        ctx.lineTo( lineSegmentB_Position[1][0]*ratio_canvas_over_internal, lineSegmentB_Position[1][1]*ratio_canvas_over_internal );
        ctx.stroke();
      }
    }
  }
  
  { // DOMツリーをいじる
    $('span#level_label').text( 'Level ' + currentLevel );
    $('span#lineSegmentA_label').text( ratioOfLineSegments[0] );
  }
}




function func_old(){
  $('#answer_field').val('');
  $('#answer_field').removeAttr('disabled');
  $('#answer_button').removeAttr('disabled');
  $('#result').text('');

  var boxY_internal = 8.0;
  boxWidth_internal = 10.0 * (0.1 + 0.9 * Math.random());
  var barStart_internal = [widgetWidth_internal * (0.01 + 0.98 * Math.random()), boxY_internal * (0.01 + 0.98 * Math.random())];
  {
    var barEnd_internal;

    do{
        barAngle = 2.0 * Math.PI * Math.random()
        barLength_internal = (0.5 + 9.5 * Math.random());

        barEnd_internal = [
          barStart_internal[0]
          + barLength_internal * Math.cos(barAngle),
          barStart_internal[1]
          - barLength_internal * Math.sin(barAngle)
        ];
    }while(
      barEnd_internal[0] < 0.1
      || barEnd_internal[0] > 9.9
      || barEnd_internal[1] < 0.1
      || barEnd_internal[1] > boxY_internal - 0.1
    );
  }

  var ratio_physical_over_internal = 100.0 / boxWidth_internal;

  boxWidth_physical = boxWidth_internal * ratio_physical_over_internal;
  barLength_physical = barLength_internal * ratio_physical_over_internal;

  {
    var mainCanvasHTMLElement = window.document.getElementById('main_canvas');

    {
      var context = mainCanvasHTMLElement.getContext('2d');

      var ratio_canvas_over_internal = mainCanvasHTMLElement.width / widgetWidth_internal;

      var boxY_canvas = boxY_internal * ratio_canvas_over_internal;
      boxWidth_canvas = boxWidth_internal * ratio_canvas_over_internal;
      var barStart_canvas = barStart_internal.map( function(val, index, array){ return val * ratio_canvas_over_internal; } );
      barLength_canvas = barLength_internal * ratio_canvas_over_internal;


      context.clearRect(0, 0, mainCanvasHTMLElement.width, mainCanvasHTMLElement.height);

      context.lineWidth = barWidth_internal * ratio_canvas_over_internal;
      context.lineCap = 'butt'; // 太い線分の端っこはバッサリ切る
      context.lineJoin = 'bevel'; // 太い線分同士の接続点では何も補完しない

      context.beginPath();
      context.moveTo(
        (mainCanvasHTMLElement.width - boxWidth_canvas) / 2.0,
        boxY_canvas
        );
      context.lineTo(
        (mainCanvasHTMLElement.width - boxWidth_canvas) / 2.0 + boxWidth_canvas,
        boxY_canvas
        );
      context.stroke();

      context.font = "20px sans-serif";
      context.textAlign = 'center';
      context.fillText(
        '幅 ' + Math.round(boxWidth_physical) + ' cm', // 整数になってくれない場合があるので表示の際は丸めておく
        mainCanvasHTMLElement.width / 2.0,
        boxY_canvas + 25.0
        );

      context.beginPath();
      context.moveTo(barStart_canvas[0], barStart_canvas[1]);
      context.lineTo(
        barStart_canvas[0]
        + barLength_canvas * Math.cos(barAngle),
        barStart_canvas[1]
        - barLength_canvas * Math.sin(barAngle)
      );
      context.stroke();

      $('#answer_field').focus();
    }
  }
}

function answer_old(){
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
  var error = (answer / barLength_physical * 100.0) - 100.0;
  var readableError =  Math.round(error * 10.0) / 10.0;

  $('#result').text(
    'あなたの解答 = ' +  answer + ' cm'
  + ' / '
  + '正解 = ' + Math.round(barLength_physical*10.0)/10.0 + ' cm'
  + ' / '
  + '誤差 = ' + (readableError > 0 ? '+' : '') + readableError + '%'
  );

  $('#log').val(
    $('#log').val()
    + '--------------------------------' + '\n'
    + '[' + formatDate(new Date(), 'YYYY/MM/DD hh:mm:ss') + ']\n'
    + 'bar_angle[rad]=' + barAngle + '\n'
    + 'box_width(internal)=' + boxWidth_internal + '\n'
    + 'bar_length(internal)=' + barLength_internal + '\n'
    + 'box_width(on display)=' + boxWidth_canvas + '\n'
    + 'bar_length(on display)=' + barLength_canvas + '\n'
    + 'box_width(physical)=' + boxWidth_physical + '\n'
    + 'bar_length(physical)=' + barLength_physical + '\n'
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

$('#log').val(
  $('#log').val()
  + '['
  + formatDate(new Date(), 'YYYY/MM/DD hh:mm:ss')
  + ']'
  + ' '
  + appName
  + ' '
  + 'Ver.'
  + appVer
  + '\n' );

initialize();
func();
