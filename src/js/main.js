/*********************************************************************************
 *
 *  Procedure of function call (Omlet is not installed.)
 *
 *  1. [Omlet is Ready.]              Omlet.ready : Omlet Start
 *     [Doc is not found.]
 *     [Initializing DocumentAPI to use traditional style.]
 *  2. [Loading document]             _loadDocument() : get documentReference id
 *     [Document ***NOT*** found]
 *
 *********************************************************************************/

/*********************************************************************************
 *
 *  Procedure of function call (Omlet is installed.)
 *
 *  1. [Omlet is Ready.]              Omlet.ready : Omlet Start
 *  2. [Initializing DocumentAPI.]    initDocumentAPI() : get documentAPI
 *  3. [Loading document]             _loadDocument() : get documentReference id
 *     [Get documentReference id: ]
 *
 *  4. [Creating localPeerConnection Object.] initConnection() : Caller
 *  5. [Call local's getUserMedia.]           getLocalMedia)() : Caller
 *  6. [Adding the Caller]                    $("joinAVButton").addEventListener('click',function() : before called  documentApi.update() 
 *  7. [Participant added. docId: ]           participantAdded : documentAPI.get's success callback
 *  8. [Updated Doc Fetched]                  getSuccessCallback
 *     [chat id: ]
 *     [people in this conversation: ]
 *  9. [Add local peer stream.]               localStreaming() : after local addStream
 *
 *********************************************************************************/


//////////////////////////////////////////////////////////////////
//
//                Variables 
//
/////////////////////////////////////////////////////////////////

// document id for omlet
var documentApi;
var myDocId;

// update parameters for caller
var callerParameters = {
  "name" : "caller",
  "value" : {
    "signals": []
  }
};
var calleeParameters = {
  "name" : "callee",
  "value" : {
    "signals" : [{
      "signal_type" : "callee_arrived",
      "timestamp" : Date.now()
      }]
  }
};

var omletAsSignallingChannel = true ;
var orderedDataChannel = true;

var processedSignals = {} ;

// RTCPeerConnection object
var localPeerConnection;
var remotePeerConnection;

// dataChannel object
var dataChannel;
var dataChannel2;

// attach video number
var attachVideoNumber = 0;

// HTML5 <video> elements
var localVideo = get("localVideo");
var remoteVideo = get("remoteVideo");
var thirdVideo = get("thirdVideo");

// streams
var localStream;
var remoteStream;
var thirdStream;

var constraints = { 
  audio: false,
  video: true 
};

// PeerConnection ICE protocol configuration (either Firefox or Chrome)
var peerConnectionConfig = detectedBrowser === 'Chrome' ? 
    { 'iceServers': [{ 'url': 'stun:23.21.150.121' }] } : 
    { 'iceServers': [{ 'url': 'stun:stun.l.google.com:19302' }] };

var peerConnectionConstraints = {
    'optional': [{ 'DtlsSrtpKeyAgreement': true }],
    'mandatory': { googIPv6: true }
};




//////////////////////////////////////////////////////////////////
//
//                Log console
//
/////////////////////////////////////////////////////////////////

if (typeof console  != "undefined")
    if (typeof console.log != 'undefined')
        console.olog = console.log;
    else
        console.olog = function() {};

console.log = function(message) {
  console.olog(message);
  $('#debugDiv').append('<p>' + message + '</p>');
};

console.error = console.debug = console.info = console.log


function log(message){
  var logArea = get("console");
  logArea.value += "\n" + message ;
  logArea.scrollTop = logArea.scrollHeight;
}





//////////////////////////////////////////////////////////////////
//
//                WebRTC Code         
//
/////////////////////////////////////////////////////////////////

function onAddIceCandidateSuccess() {
  log('[+] AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  log('[-] Failed to add Ice Candidate: ' + error.toString());
}

function logError(error){
  log("[-] Log error: ", error);
}


function onNewDescriptionCreated(description) {
  localPeerConnection.setLocalDescription(description, function () {
    log("[+] Set local description.");

    // Send it to the other peer
    if ( omletAsSignallingChannel ){
      //TODO Update the Document
      log("[+] Updating doc with id#:" + myDocId);

      var des_obj = {
        "name": "caller" , 
        "signal" : {
          "signal_type": "new_description",
          "timestamp": Date.now(),  
          "sdp": description
        } 
      };

      documentApi.update(myDocId, addSignal, des_obj 
        , function() { log("[+] Add signal."); }
        , function(e) { alert("error: " + JSON.stringify(e)); }
      );
    }
    else {
        // Other method
    }
  }, logError);
}


function onNewDescriptionCreated_2(description) {
  remotePeerConnection.setLocalDescription(description, function () {
    log("[+] Set remote description.");

    // Send it to the other peer
    if (omletAsSignallingChannel) {
      //TODO Update the Document
      var des_obj = {
        "name": "callee" , 
        "signal" : {
          "signal_type": "new_description",
          "timestamp":Date.now(),  
          "sdp": description
        } 
      };

      documentApi.update(myDocId, addSignal, des_obj 
        , function() { log("[+] Add signal."); } 
        , function(e) { alert("error: " + JSON.stringify(e)); });
    }
    else {
      signallingSocket.emit("message",
        JSON.stringify({
          channel: get('channelId').value,
          signal_type: "new_description",
          sdp: description
        }));
    }
  }, logError);
}



function onIceCandidate(event){
  log("[+] local IceCanddidate is Found.");

  if (event.candidate) {
    if ( omletAsSignallingChannel ){
      //TODO Update the Document
      var des_obj = {
        "name": "caller" , 
        "signal" : {
          "signal_type": "new_ice_candidate",
          "timestamp":Date.now(), 
          "candidate": event.candidate
        } 
      };

      documentApi.update(myDocId, addSignal, des_obj , function() { log("[+] Add local ICE Signal."); }
       , function(e) { alert("error: " + JSON.stringify(e)); }
       );
    } else {
    }
  }
}

function onIceCandidate2(event){
  log("[+] Remote IceCandidate is Found.");

  if (event.candidate) {
    if ( omletAsSignallingChannel ){
      //TODO Update the Document
      var des_obj = {"name": "callee" , "signal" : {"signal_type": "new_ice_candidate","timestamp":Date.now(), "candidate": event.candidate} }  ;
      documentApi.update(myDocId, addSignal, des_obj , function() { log("[+] Add remote ICE Signal."); }
       , function(e) { alert("error: " + JSON.stringify(e)); }
       );
    } else {
    }
  }
}


function tryParseJSON (jsonString){
  try {
    var o = JSON.parse(jsonString);

        // Handle non-exception-throwing cases:
        // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
        // but... JSON.parse(null) returns 'null', and typeof null === "object",
        // so we must check for that, too.
        if (o && typeof o === "object" && o !== null) {
          return o;
        }
      }
      catch (exception) {
        return false;
      }
    };

    function onMessage (event) {
      var t_msg = time();
      var blob = event.data;
    // TODO file transfer

    var json = tryParseJSON(blob.toString()) ;
    if ( json ){
        //log( blob.toString() );
        if( json.message === 'Ping' ){
          dataChannel.send( JSON.stringify( { message:"Pong" , timestamp: time() }) );
        } else if (json.message === 'Pong') {
          log( blob.toString() + " received at " + time() );
        } else if ( json.message  === 'File') {
            //log( blob.toString() + " received at " + json.timestamp );
            receivedFileInfo.name = json.name ;
            receivedFileInfo.size = json.size;
            receivedFileInfo.type = json.type ;
            receivedFileInfo.receivedBytes = 0 ;
          }
        }
        else {
          log("text received at " + t_msg.toString());
        //appendDIV(event.data);
      }

    };

    function dataChannelOpened () {
      log("Datachennel opened");

      get('chatInput').disabled = false;
      get('chatInput2').disabled = false;

      get('chatInput').onkeypress = function (e) {
        if (e.keyCode !== 13 || !this.value) return;
        dataChannel.send("P1: " + this.value);
        this.value = '';
        this.focus();
      };

      get('chatInput2').onkeypress = function (e) {
       if (e.keyCode !== 13 || !this.value) return;
       dataChannel2.send("P2: " + this.value);
       this.value = '';
       this.focus();
     };

  //dataChannelOpened = true;
  //get('sendbtn').onclick = sendFile ;
  //get('pingbtn').onclick = function() { log("sending ping at " + time() ) ; dataChannel.send( JSON.stringify({message : 'Ping' , timestamp: time() }) ); };
};



function onMessage(msg){
  log("DC1 received:" + msg.data) ;
}

function onMessage2(msg){
  log("DC2 received:" + msg.data) ;
}



 /*****************************************
 *
 *  Function for media & streaming
 *
 *  @author Seongjung Jeremy Kim
 *  @since  2015.07.18
 *
 *****************************************/

function tempLocalStreaming(stream) {
  localStream = stream;
  attachMediaStream(localVideo, stream);
  console.log('Adding local stream.');
}


 // Function for local streaming
function localStreaming(stream) {
  var localMedia = get("localVideo")
  if (window.URL) localMedia.src = window.URL.createObjectURL(stream);
  else            localMedia.src = stream;
  
  localMedia.autoplay = true;
  localMedia.play();

  localPeerConnection.addStream(stream);
  log("[+] Add local peer stream.") ;
}

// Function for remote streaming
function remoteStreaming(stream) {
  var remoteMedia = get("remoteVideo");

  if (window.URL) remoteMedia.src = window.URL.createObjectURL(stream);
  else            remoteMedia.src = stream;

  remoteMedia.autoplay = true;
  remoteMedia.play();

  remotePeerConnection.addStream(stream);
  log("[+] Add remote peer stream.");
}

// Function for local getUserMedia
function getLocalMedia(){
  log("[+] Call local's getUserMedia.");

  navigator.getUserMedia({ 
    audio: false, 
    video: true
  }, localStreaming, mediaErrorCallback);
  //navigator.getUserMedia(srcConstraints, localStreaming, logError);
}

// Function for remote getUserMedia
function getRemoteMedia() {
  log("[+] Call remote's getUserMedia.");

  navigator.getUserMedia({
    audio: false,
    video: true
  }, remoteStreaming, mediaErrorCallback);
  //navigator.getUserMedia(srcConstraints, remoteStreaming, logError);
}

// Handler to be called in case of adding stream
function handleAddRemoteStream(event) {
    console.log('[+] Added stream.');

    if (attachVideoNumber == 0) {
        attachMediaStream(remoteVideo, event.stream);
        console.log('Remote stream attached!!.');
        remoteStream = event.stream;
        attachVideoNumber++;
    }
    else if (attachVideoNumber == 1) {
        attachMediaStream(thirdVideo, event.stream);
        console.log('Third stream attached!!.');
        thirdStream = event.stream;
        attachVideoNumber++;
    }
    // else if (attachVideoNumber == 2) {
    //     attachMediaStream(forthVideo, event.stream);
    //     console.log('Forth stream attached!!.');
    //     forthStream = event.stream;
    //     attachVideoNumber++;
    // } else if (attachVideoNumber == 3) {
    //     attachMediaStream(fifthVideo, event.stream);
    //     console.log('Forth stream attached!!.');
    //     fifthStream = event.stream;
    //     attachVideoNumber++;
    // }
}

// Handler to be called in case of removing stream
function handleRemoveStream() {
    log('[+] Removed stream.');
}

// Callback to be called in case of failure
function mediaErrorCallback(error){
  log("[-] navigator.getUserMedia; " + error);
}


/*****************************************
 *
 *  Function for establishing Connection
 *
 *****************************************/
function initConnection(caller, data, video) {
  // Caller
  if (caller) {
    log("[+] Creating localPeerConnection Object.");

    localPeerConnection = new RTCPeerConnection(peerConnectionConfig, peerConnectionConstraints);

    // Sends ice candidates to the other peer
    localPeerConnection.onicecandidate = onIceCandidate;
    localPeerConnection.oniceconnectionstatechange = function (ice_state) {
      log("[+] localPC: " + localPeerConnection.iceGatheringState + " " + localPeerConnection.iceConnectionState);
    }

    if(data) {
      log("[+] Creating data channel.");

      var dataChannelOptions = {
        ordered: true
      };

      dataChannel = localPeerConnection.createDataChannel("datachannel", dataChannelOptions);

      dataChannel.onerror = logError ;
      dataChannel.onmessage = onMessage;
      dataChannel.onopen = dataChannelOpened;
      dataChannel.onclose = function () {
        log("[-] The Data Channel is closed.");
      };
    }

    if(video) {
      //getLocalMedia();
      navigator.getUserMedia(constraints, tempLocalStreaming, errorCallback);
      localPeerConnection.addStream(localStream);




      // localPeerConnection.onaddstream = function (event) {
      //   var remoteMedia = get("remoteVideo");

      //   if (window.URL) remoteMedia.src = window.URL.createObjectURL(event.stream);
      //   else            remoteMedia.src = event.stream;

      //   remoteMedia.autoplay = true;
      //   remoteMedia.play();

      //   remotePeerConnection.addStream(event.stream);

      //   log("[+] localPeerConnection.onaddstream");
      // };
      localPeerConnection.onaddstream = handleAddRemoteStream;
      localPeerConnection.onremovestream = handleRemoveStream;
    }
  }
  else {  // Callee
    log("[+] Creating remotePeerConnection Object.");

    remotePeerConnection = new RTCPeerConnection(peerConnectionConfig, peerConnectionConstraints);

    // Sends ice candidates to the other peer
    remotePeerConnection.onicecandidate = onIceCandidate2;
    remotePeerConnection.oniceconnectionstatechange = function (ice_state) {
      log("[+] PC2: " + remotePeerConnection.iceGatheringState + " " + remotePeerConnection.iceConnectionState);
    }

    if (data){
      remotePeerConnection.ondatachannel = function (e) {
        // Data channle opened
        log("Datachennel PC2-side opened");
        dataChannel2 = e.channel;
        dataChannel2.onerror = logError ;
        dataChannel2.onmessage = onMessage2;

        dataChannel2.onclose = function () {
          log("The Data Channel is closed");
        };
      }
    }

    if(video) {
      //getLocalMedia();
      navigator.getUserMedia(constraints, tempLocalStreaming, errorCallback);
      remotePeerConnection.addStream(localStream);




      // remotePeerConnection.onaddstream = function (event) {
      //   var remoteMedia = get("remoteVideo");

      //   if (window.URL) remoteMedia.src = window.URL.createObjectURL(event.stream);
      //   else            remoteMedia.src = event.stream;

      //   remoteMedia.autoplay = true;
      //   remoteMedia.play();

      //   remotePeerConnection.addStream(event.stream);
      //   log("[+] remotePeerConnection.onaddstream");
      // };
      remotePeerConnection.onaddstream = handleAddRemoteStream;
      remotePeerConnection.onremovestream = handleRemoveStream;
    }
  }
}






//////////////////////////////////////////////////////////////////
//
//                Omlet Framework code
//
/////////////////////////////////////////////////////////////////

/*
Omlet.document = {
  create: function(success, error),
  get: function(reference, success, error),
  update: function(reference, func, parameters, success, error),
  watch: function(reference, onUpdate, success, error),
  unwatch: function(reference, success, error)
}
*/

function initDocumentAPI() {
  if (!Omlet.isInstalled())  {
    log("[-] Omlet is not installed." );
  }

  documentApi = Omlet.document;
  log("[+] Loading document") ;
  _loadDocument();
}


function _loadDocument() {
  if (hasDocument()) {
    myDocId = getDocumentReference();
    log("[+] Get documentReference id: " + myDocId );

    // watch: function(reference, onUpdate, success, error)
    // The updateCallback argument to watch is called every time the document changes, for example
    // because it is being updated by another user. It receives the new document as its only argument.
    documentApi.watch(myDocId, updateCallback, watchSuccessCallback, errorCallback);

    // The successful result of get is the document itself.
    documentApi.get(myDocId, ReceiveDoc);
    //watchDocument(myDocId, updateCallback);
  } 
  else {
    log("[-] Document is not found." );
  }
}

function InitialDocument() {
  var chatId = 100;
  var identity = Omlet.getIdentity();
  log('id:' + JSON.stringify(identity));

  // Particiapnat includes omlet id, connection info
  var initValues = {
    'chatId' : chatId ,
    'creator':identity,
    'participants':{}
  };

  return initValues;
}


function Initialize(old, params) {
  return params;
}


function hasDocument() {
  var docIdParam = window.location.hash.indexOf("/docId/");
  return (docIdParam != -1);
}


function getDocumentReference() {
  var docIdParam = window.location.hash.indexOf("/docId/");
  if (docIdParam == -1) return false;

  var docId = window.location.hash.substring(docIdParam+7);
  var end = docId.indexOf("/");

  if (end != -1)
    docId = docId.substring(0, end);
  return docId;
}


function watchDocument(docref, OnUpdate) {
  documentApi.watch(docref, function(updatedDocRef) {
    if (updatedDocRef != chatDocId) {
      log("[-] Wrong document.");
    }
    else {
      //  The successful result of get is the document itself.
      documentApi.get(updatedDocRef, OnUpdate);
    }
  }, function(result) {
    var timestamp = result.Expires;
    var expires = timestamp - new Date().getTime();
    var timeout = 0.8 * expires;

    setTimeout(function() {
      watchDocument(docref, OnUpdate);
    }, timeout);
  }, Error);
}


function ReceiveDoc(doc) {
  chatDoc = doc;
}


function getSuccessCallback(doc) {
  chatDoc = doc;

  log("[+] Updated Doc Fetched" );
  log("[+] chat id: " + chatDoc.chatId ) ;
  log("[+] people in this conversation: " + Object.keys(chatDoc.participants).length);

  if(Object.keys(chatDoc.participants).length != 2)
    return ;

  // Having two people
  var caller = chatDoc.participants["caller"];
  var callee = chatDoc.participants["callee"];

  // log( "CALLER:" + JSON.stringify(caller));
  // Callee Signal Handler - process signals generated by caller
  for (var i = 0; i < caller.signals.length; i++) {
    var signal = caller.signals[i];

    if (signal.timestamp in processedSignals)
      continue;

    processedSignals[signal.timestamp] = 1;

    if (signal.signal_type === "new_ice_candidate") {
      log("[+] Remote peer is adding ICE.");
      remotePeerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate), onAddIceCandidateSuccess, onAddIceCandidateError);
    } 
    else if (signal.signal_type === "new_description") {
      log("[+] Remote peer is setting remote description");
      remotePeerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp), function () {
          log("[+] Remote peer is checking for offer.");
          
          if (remotePeerConnection.remoteDescription.type == "offer") {
            log("[+] Remote peer is creating answer.");
            remotePeerConnection.createAnswer(onNewDescriptionCreated_2, logError);
          }
        }, logError);
    }
  }

  //log("CALLEE:" + JSON.stringify(callee));
  // Caller Signal Handler - process signals generated by callee
  for (var i = 0; i < callee.signals.length; i++) {
    var signal = callee.signals[i];
    if (signal.timestamp in processedSignals)
      continue ;
    processedSignals[signal.timestamp]  = 1 ;

    if (signal.signal_type === "callee_arrived") {
        log("[+] Callee is arrived") ;
        localPeerConnection.createOffer(onNewDescriptionCreated, logError);
    }
    else if (signal.signal_type === "new_ice_candidate") {
      log("[+] localPeerConnection.addIceCandidate.") ;
      localPeerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate), onAddIceCandidateSuccess, onAddIceCandidateError);
    } 
    else if (signal.signal_type === "new_description") {
      log("[+] localPeerConnection.setRemoteDescription.");
      localPeerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp), function () {}, logError);
    }
  }
}


/*****************************************
 *
 *  Callback function for documentApi
 *
 *  @author Seongjung Jeremy Kim
 *  @since  2015.07.20
 *
 *****************************************/

// updateCallback for documentApi.watch
function updateCallback(chatDocId) {
  //  The successful result of get is the document itself.
  documentApi.get(chatDocId, getSuccessCallback , errorCallback);
}

// successCallback for documentApi.watch
function watchSuccessCallback() {
  log("[+] watchSuccessCallback.");
}

// errorCallback for all of function
function errorCallback(error) {
  log("[-] " + error);
}


function addParticipant(old, params) {
  old.participants[params.name] = params.value ;

  return old;
}


function addSignal(old, params) {
  old.participants[params.name].signals.push(params.signal) ;
  //old.creator =  ;

  return old;
}


function clear(old, params) {
  processedSignals = {};
  old.participants = {} ;
  old.creator = '' ;

  return old;
}


function DocumentCleared(doc) {
  log("[+] Document cleared");
  log("[+] people in this conversation: " + Object.keys(doc.participants).length );
}


function participantAdded(doc) {
  log("[+] Participant added. docId: " + doc.chatId);
  //chatDoc = doc ;
  //log( JSON.stringify(doc));
  //log( "people in this conversation: " + Object.keys(doc.participants).length );
}


function DocumentCreated(doc) {
    //var callbackurl = window.location.href.replace("chat-maker.html" , "webrtc-data.html") ;
    var callbackurl = "http://203.246.112.144:3310/index.html#/docId/" + myDocId;

    if(Omlet.isInstalled()) {
      var rdl = Omlet.createRDL({
        appName: "OmletRTC",
        noun: "poll",
        displayTitle: "OmletRTC",
        displayThumbnailUrl: "http://203.246.112.144:3310/images/quikpoll.png",
        displayText: 'Client: ' + ip() + '\nServer:' + location.host,
        json: doc,
        callback: callbackurl
      });

      Omlet.exit(rdl);
    }
}






//////////////////////////////////////////////////////////////////
//
//             Application Code for event handling
//
/////////////////////////////////////////////////////////////////

function get(id){
  return document.getElementById(id);
}


document.getElementById("createButton").addEventListener('click', function() {
  if(!Omlet.isInstalled()) {
    log("[-] Omlet is not installed.");
  }
  else {
    log("[+] Omlet is installed.");
    log("[+] DocumentAPI Obj:" + JSON.stringify(documentApi));

    documentApi.create(function(d) {
      // create successCallback

      // Document property is a document reference that can be serialized and can be passed to the other calls.
      myDocId = d.Document;
      location.hash = "#/docId/" + myDocId;

      // update: function(reference, func, parameters, success, error)
      // The func argument to update is called to generate the document or to update it with the new parameters. 
      // It is passed the old document as the first argument, and the app specified parameters as the second.
      documentApi.update(myDocId, Initialize, InitialDocument(), function() {
        // update successCallback
        documentApi.get(myDocId, DocumentCreated, errorCallback);
      }, errorCallback);
    }, errorCallback);
  }
});


document.getElementById("clearButton").addEventListener('click', function() {
  if(!Omlet.isInstalled()) {
    log("[-] Omlet is not installed.");
  }
  else {
    log("[+] Clearing Document.");

    documentApi.update(myDocId, clear, {}, function() { documentApi.get(myDocId, DocumentCleared); }
    , function(e) { alert("[-] clear-update; " + JSON.stringify(e)); }
    );
  }
});


document.getElementById("getDocButton").addEventListener('click', function() {
  if(!Omlet.isInstalled()) {
    log("[-] Omlet is not installed.");
  }
  else {
    log("[+] Getting Document.");
    documentApi.get(myDocId, ReceiveDoc);
  }
});


document.getElementById("joinDataButton").addEventListener('click',function() {
  if(Object.keys(chatDoc.participants).length  == 0) {
    initConnection(true, true, false);

    log("[+] Adding the caller.");

    documentApi.update(myDocId, addParticipant, callerParameters, function() { documentApi.get(myDocId, participantAdded); }
    , errorCallback);
  }
  else {
    initConnection(false, true, false);

    log("[+] Adding the callee.");

    // update: function(reference, func, parameters, success, error),
    documentApi.update(myDocId, addParticipant, calleeParameters, function() { documentApi.get(myDocId, participantAdded); }
    , errorCallback);
  }
});


document.getElementById("joinAVButton").addEventListener('click',function(){
  if(Object.keys(chatDoc.participants).length  == 0) {
    // Caller connection (audio: false, video: true)
    initConnection(true, false, true);

    log("[+] Adding the caller.");
    documentApi.update(myDocId, addParticipant, callerParameters, function() { documentApi.get(myDocId, participantAdded); }
    , errorCallback);
  }
  else {
    // Callee connection (audio: false, video: true)
    initConnection(false, false, true) ;

    log("[+] Adding the callee.");
    documentApi.update(myDocId, addParticipant, calleeParameters, function() { documentApi.get(myDocId, participantAdded); }
    , errorCallback);
  }
});



//////////////////////////////////////////////////////////////////
//
//                Omlet start
//
/////////////////////////////////////////////////////////////////

Omlet.ready(function() {
  log("[+] Omlet is Ready.");

  if (hasDocument()) {
    log("[+] Initializing DocumentAPI.");
    initDocumentAPI();
  }
  else {
    log("[-] Doc is not found.");
    log("[+] Initializing DocumentAPI to use traditional style.");
    initDocumentAPI();
    // No Doc --> Use traditional Style
  }
});