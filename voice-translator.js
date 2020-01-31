

function babel_stop() {
  document.getElementById("stop_button").src = "./icons/blurstopbutton.png";
  document.getElementById("start_button").src = "./icons/startbutton.png";

  document.getElementById("stop_button").classList.remove('clickableimage');
  document.getElementById("start_button").classList.add('clickableimage');

  stopTranslator();
}

function babel_start() {
  document.getElementById("stop_button").src = "./icons/stopbutton.png";
  document.getElementById("start_button").src = "./icons/blurstartbutton.png";

  document.getElementById("stop_button").classList.add('clickableimage');
  document.getElementById("start_button").classList.remove('clickableimage');

  startTranslator();
}


/*
Usage:
audioNode = createAudioMeter(audioContext,clipLevel,averaging,clipLag);

audioContext: the AudioContext you're using.
clipLevel: the level (0 to 1) that you would consider "clipping".
   Defaults to 0.98.
averaging: how "smoothed" you would like the meter to be over time.
   Should be between 0 and less than 1.  Defaults to 0.95.
clipLag: how long you would like the "clipping" indicator to show
   after clipping has occured, in milliseconds.  Defaults to 750ms.

Access the clipping through node.checkClipping(); use node.shutdown to get rid of it.
*/

// Code to detect voice intencity
var audioContext = null;
var meter = null;
var mediaStreamSource = null;
var AudioContext = window.AudioContext || window.webkitAudioContext;
var canvasContext = null;
var WIDTH = 10;
var HEIGHT = 50;
var rafID = null;
var epochTime = Number(new Date());
var recordingState = false;
function startTranslator() {
  // grab our canvas
  canvasContext = document.getElementById("meterVolue");
  if (audioContext) {
    audioContext.resume().then(() => {
      console.log('Playback resumed successfully');
    });
  } else {
    audioContext = new AudioContext();
  }
  // Attempt to get audio input
  try {
    // monkeypatch getUserMedia
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    // ask for an audio input
    navigator.getUserMedia(
      {
        "audio": {
          "mandatory": {
            "googEchoCancellation": "true",
            "googAutoGainControl": "false",
            "googNoiseSuppression": "true",
            "googHighpassFilter": "true"
          },
          "optional": []
        },
      }, gotStream, didntGetStream);
  } catch (e) {
    alert('getUserMedia threw exception :' + e);
  }
}

function didntGetStream() {
  alert('Stream generation failed.');
}

function gotStream(stream) {
  // Create an AudioNode from the stream.
  mediaStreamSource = audioContext.createMediaStreamSource(stream);
  // Create a new volume meter and connect it.
  meter = createAudioMeter(audioContext);
  mediaStreamSource.connect(meter);
  startRecording()
}

function createAudioMeter(audioContext, clipLevel, averaging, clipLag) {
  console.log('inside createAudioMeter');
  var processor = audioContext.createScriptProcessor(512);
  processor.onaudioprocess = volumeAudioProcess;
  processor.clipping = false;
  processor.lastClip = 0;
  processor.volume = 0;
  processor.clipLevel = clipLevel || 0.98;
  processor.averaging = averaging || 0.95;
  processor.clipLag = clipLag || 750;
  // this will have no effect, since we don't copy the input to the output,
  // but works around a current Chrome bug.
  processor.connect(audioContext.destination);
  processor.checkClipping =
    function () {
      if (!this.clipping)
        return false;
      if ((this.lastClip + this.clipLag) < window.performance.now())
        this.clipping = false;
      return this.clipping;
    };
  processor.shutdown =
    function () {
      this.disconnect();
      this.onaudioprocess = null;
    };
  return processor;
}


volumeAudioProcess = (event) => {
  var buf = event.inputBuffer.getChannelData(0);
  var bufLength = buf.length;
  var sum = 0;
  var x;
  // Do a root-mean-square on the samples: sum up the squares...
  for (var i = 0; i < bufLength; i++) {
    x = buf[i];
    if (Math.abs(x) >= this.clipLevel) {
      this.clipping = true;
      this.lastClip = window.performance.now();
    }
    sum += x * x;
  }
  // ... then take the square root of the sum.
  var rms = Math.sqrt(sum / bufLength);
  // console.log('rms', rms);
  setVolumeInte(parseInt(String(rms * 100)));
  // Now smooth this out with the averaging factor applied
  // to the previous sample - take the max here because we
  // want "fast attack, slow release."
  this.volume = Math.max(rms, this.volume * this.averaging);
}


function setVolumeInte(meterVolume) {
  // console.log('meterVolume', meterVolume);
  var currentEpochTime = Number(new Date())
  document.getElementById("meterVolue").value = meterVolume;
  // console.log('EpochTime', epochTime, 'meterVolume', meterVolume);
  if( meterVolume >= 2 ||  (currentEpochTime < (epochTime + 1500) && recordingState == true)){
    if(meterVolume >=2) {epochTime = currentEpochTime;}
    if(recordingState == false){
      recordingState = true;
      startRecording()
    }
  }else{
    if(recordingState == true){
      recordingState = false;
      stopRecording()
    }
  }

}

function stopTranslator() {
  console.log('Inside Stop Recording');
  meter.shutdown();
}



// Define variables for audio recorder
var recorder;
var recordedInputId= [];


function stopRecording(){
  console.log('Inside stopRecording');
  // Stop recording with Recorder.js object
  recorder.stop();
  // Stop microphone and get recorded audio
  // mediaStreamSource.getAudioTracks()[0].stop();
  // Pass blob with audio data to callback
  recorder.exportWAV(sentStreamData)

}


// Record audio with device microphone
function startRecording() {
  console.log('Inside startRecording');
  try{
    recorder = new Recorder(mediaStreamSource, { numChannels: 1 })
    recorder.record()
  } catch ( e){
    console.log('error while recording', e);
  };
}



function sentStreamData(blob){
  console.log('blob', blob);
  uploadAudioRecording(blob)
}


// Code to send data AWS
// AWS configuration
var awsRegion = 'us-east-1';
var requestId;

AWS.config.update({
  region: awsRegion,
  credentials: new AWS.CognitoIdentityCredentials({
    IdentityPoolId: IdentityPoolId
  })
});

// S3 object for storing input and output audio
var s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  params: { Bucket: bucketName },
  region: awsRegion
});


// Generate unique identifiers
function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

// Check if URL returns HTTP 200 OK
function urlExists(url) {
  var http = new XMLHttpRequest();
  http.open('HEAD', url, false);
  http.send();
  return http.status == 200;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function  recallTextData(audioId){
  await sleep(2000);
  fetchTextData(audioId);
}

window.onload = function () {
  // fetchTextData('hi1579996547695');
}

function fetchTextData(audioId){
  fetch('https://voicetranslatorapp-voicetranslatorbucket-1j99heu6kidrg.s3.amazonaws.com/output/'+ audioId + '.json')
  .then(response => {
    if (!response.ok) {
        throw new Error("HTTP error " + response.status);
    }
    return response.json();
  })
  .then(text => {
      console.log(text);
      $('<p>'+text['TranslatedText']+'</p>').appendTo('#translatedData');
  })
  .catch(function (err) {
      console.log('err', err);
      recallTextData(audioId);
  })
}




// Polling for result
function pollData(fn, timeout, interval) {
  var endTime = Number(new Date()) + (timeout || 2000);
  interval = interval || 100;
  var checkCondition = function (resolve, reject) {
    // If the condition is met, we're done!
    var result = fn();
    if (result) {
      resolve(result);
    }
    // If the condition isn't met but the timeout hasn't elapsed, go again
    else if (Number(new Date()) < endTime) {
      setTimeout(checkCondition, interval, resolve, reject);
    }
    // Didn't match and too much time, reject!
    else {
      reject(new Error('timed out for ' + fn + ': ' + arguments));
    }
  };
  return new Promise(checkCondition);
}



function uploadAudioRecording(blob) {
  // Generate unique ID for upload audio file request
  requestId = 'ar'+ String(Number(new Date())) //guid();
  fetchTextData(requestId);
  // Create key for S3 object and upload input audio file
  const inputKey = 'input/' + requestId + '.wav'
  s3.upload({
    Key: inputKey,
    Body: blob
  }, function (err, data) {
    if (err) {
      return alert('There was an error uploading your recording: ', err.message);
    } else {
      recordedInputId.push(requestId);
      var lambda = new AWS.Lambda({ region: awsRegion, apiVersion: '2015-03-31' });
      var input = {
        FunctionName: lambdaFunction,
        InvocationType: 'RequestResponse',
        LogType: 'None',
        Payload: JSON.stringify({ "bucket": bucketName, "key": requestId })
      };
      lambda.invoke(input, function (err, data) {
        if (err) {
          console.log(err);
          alert("There was a problem with Lambda function!!! ");
        } else {
          // var resultUrl = data.Payload.replace(/['"]+/g, '');
          // resetView();
          // document.getElementById('audio-output').innerHTML = '<audio controls autoplay><source src="' + resultUrl + // '" type="audio/mpeg"></audio><br/>';
        }
      });
    }
  });
}