/*
 * Procedure of function call (Omlet is not installed.)
 *  1. [Omlet is Ready.]              Omlet.ready : Omlet Start
 *     [Doc is not found.]
 *     [Initializing DocumentAPI to use traditional style.]
 *  2. [Loading document]             _loadDocument() : get documentReference id
 *     [Document ***NOT*** found]
 */


/*
 * Procedure of function call (Omlet is installed.)
 *  1. [Omlet is Ready.]              Omlet.ready : Omlet Start
 *  2. [Initializing DocumentAPI.]    initDocumentAPI() : get documentAPI
 *  3. [Loading document]             _loadDocument() : get documentReference id
 *     [Get documentReference id: ]
 *
 *  4. [Check for other party.]               click eventListener for "joinAVButton"
 *  5. [Creating localPeerConnection Object.] initConnection() : Caller
 *     [Adding the Caller]
 *  6. [Getting updated version.]             ReceiveUpdate() : _loadDocument() -> documentApi.watch(myDocId, ReceiveUpdate);
 *  7. [Participant added]                    participantAdded : documentAPI.get's success callback
 *  8. [Updated Doc Fetched]                  ReceiveUpdatedDoc
 *     [chat id: ]
 *     [people in this conversation: ]
 *
 *  9. [Add local peer stream.]             getLocalMedia() -> localStreaming()
 */



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
//                Variables 
//
/////////////////////////////////////////////////////////////////

// document id for omlet
var documentApi;
var myDocId ;

// RTCPeerConnection object
var localPeerConnection;
var remotePeerConnection;

// dataChannel object
var dataChannel;
var dataChannel2;

var omletAsSignallingChannel = true ;
var orderedDataChannel = true;

var processedSignals = {} ;

// HTML5 <video> elements
var localVideo = get("localVideo");
var remoteVideo = get("remoteVideo");

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
      } ;

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



/*
 * Function for media & streaming
 *
 * @author Seongjung Jeremy Kim
 * @since  2015.07.18
 *
 */
function localStreaming(stream) {
  var localMedia = get("localVideo")
  if (window.URL) localMedia.src = window.URL.createObjectURL(stream);
  else            localMedia.src = stream;
  
  localMedia.autoplay = true;
  localMedia.play();

  localPeerConnection.addStream(stream);
  log("[+] Add local peer stream.") ;
}

function remoteStreaming(stream) {
  var remoteMedia = get("remoteVideo");

  if (window.URL) remoteMedia.src = window.URL.createObjectURL(stream);
  else            remoteMedia.src = stream;

  remoteMedia.autoplay = true;
  remoteMedia.play();

  remotePeerConnection.addStream(stream);
  log("[+] Add remote peer stream.");
}


function getLocalMedia(){
  log("[+] Call local's getUserMedia.");

  navigator.getUserMedia({ 
    audio: false, 
    video: true
  }, localStreaming, mediaErrorCallback);
  //navigator.getUserMedia(srcConstraints, localStreaming, logError);
}


function getRemoteMedia() {
  log("[+] Call remote's getUserMedia.");

  navigator.getUserMedia({
    audio: false,
    video: true
  }, remoteStreaming, mediaErrorCallback);
  //navigator.getUserMedia(srcConstraints, remoteStreaming, logError);
}


function handleRemoteStreamRemoved() {
    log('[+] Remote remote stream');
}


// Callback to be called in case of failure...
function mediaErrorCallback(error){
  log("[-] navigator.getUserMedia; " + error);
}


//////////// Establishing Connection ////////////
function initConnection(caller, data, video) {
  // Caller
  if (caller) {
    log("[+] Creating localPeerConnection Object.");

    // var options = {
    //   "optional": [{DtlsSrtpKeyAgreement: true}
    //         //,{RtpDataChannels: getData}
    //   ], mandatory: { googIPv6: true }
    // };
    
    localPeerConnection = new RTCPeerConnection(peerConnectionConfig, peerConnectionConstraints);

    // Sends ice candidates to the other peer
    localPeerConnection.onicecandidate = onIceCandidate;
    localPeerConnection.oniceconnectionstatechange = function (ice_state) {
      log("[+] PC1: " + localPeerConnection.iceGatheringState + " " + localPeerConnection.iceConnectionState);
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
      getLocalMedia();

      localPeerConnection.onaddstream = function (event) {
        var remoteMedia = get("remoteVideo");

        if (window.URL) remoteMedia.src = window.URL.createObjectURL(event.stream);
        else            remoteMedia.src = event.stream;

        remoteMedia.autoplay = true;
        remoteMedia.play();

        remotePeerConnection.addStream(event.stream);

        log("[+] localPeerConnection.onaddstream") ;
      };

      localPeerConnection.onremovestream = handleRemoteStreamRemoved;
    }
  }
  else {  // Callee
    log("[+] Creating remotePeerConnection Object.");

    // var options = {
    //   "optional": [
    //     {DtlsSrtpKeyAgreement: true}
    //     //,{RtpDataChannels: getData}
    //   ],
    //   mandatory: { googIPv6: true }
    // };
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
      getLocalMedia();

      remotePeerConnection.onaddstream = function (event) {
        var remoteMedia = get("remoteVideo");

        if (window.URL) remoteMedia.src = window.URL.createObjectURL(event.stream);
        else            remoteMedia.src = event.stream;

        remoteMedia.autoplay = true;
        remoteMedia.play();

        remotePeerConnection.addStream(event.stream);
        log("[+] remotePeerConnection.onaddstream");
      };
      remotePeerConnection.onremovestream = handleRemoteStreamRemoved;
    }
  }
}



//////////////////////////////////////////////////////////////////
//
//                Appication Code for event
//
/////////////////////////////////////////////////////////////////

function get(id){
  return document.getElementById(id);
}


document.getElementById("createButton").addEventListener('click',function(){
  if(!Omlet.isInstalled()) {
    log("[-] Omlet is not installed.");
  }
  else {
    log("[+] Omlet is installed.");
    log("[+] DocumentAPI Obj:" + JSON.stringify(documentApi));

    documentApi.create(function(d) {
      log("[+] Function call: documentApi.create");

      myDocId = d.Document;
      location.hash = "#/docId/" + myDocId;

      documentApi.update(myDocId, Initialize, InitialDocument(), function() {
          // update successCallback
          log("[+] update successCallback, initialize.toString(): " + Initialize.toString());
          documentApi.get(myDocId, DocumentCreated, function(e) {
            log("[-] update->get errorCallback: " + e);
          });
        }, function(e) {
          // update errorCallback
          log("[-] update errorCallback: " + JSON.stringify(e));
        });
    }, function(e) {
      // create errorCallback
      log("[-] create errorCallback: " + JSON.stringify(e));
    });
  }
});


document.getElementById("clearButton").addEventListener('click',function(){
  if(!Omlet.isInstalled()) {
    log("[-] Omlet is not installed.");
  }
  else {
    log("[+] Clearing Document.");

    documentApi.update(myDocId, clear, {}
     , function() { documentApi.get(myDocId, DocumentCleared); }
     , function(e) { alert("[-] clear-update; " + JSON.stringify(e)); }
     );
  }
});


document.getElementById("getDocButton").addEventListener('click',function(){
  if(!Omlet.isInstalled()) {
    log("[-] Omlet is not installed.");
  }
  else {
    log("[+] Getting Document.");
    documentApi.get(myDocId, ReceiveDoc);
  }
});


document.getElementById("joinDataButton").addEventListener('click',function() {
  var caller = false;

  log("[*] Check for other party");

  if(Object.keys(chatDoc.participants).length  == 0){
    initConnection(true, true, false);

    try{
      log("[+] Adding the caller.");

      documentApi.update(myDocId, addParticipant, {"name": "caller" , "value" : {"signals":[]} }
       , function() { documentApi.get(myDocId, participantAdded); }
       , function(e) { alert("[-] Adding caller-update; " + JSON.stringify(e)); }
      );
    }
    catch(err){
      log("[-] Adding caller; " + err.message);
    }
  }
  else {
    initConnection(false, true, false) ;

    try {
      log("[+] Adding the callee.");

      documentApi.update(myDocId, addParticipant, {"name": "callee" , "value" : {"signals":[{"signal_type": "callee_arrived" , "timestamp": Date.now()}]} }
       , function() { documentApi.get(myDocId, participantAdded); }
       , function(e) { alert("[-] Adding callee-update; " + JSON.stringify(e)); }
      );
    }
    catch(err) {
      log("[-] Adding the callee; " + err.message);
    }
  }
});


document.getElementById("joinAVButton").addEventListener('click',function(){
  var caller = false;
  log("[*] Check for other party.");

  if(Object.keys(chatDoc.participants).length  == 0) {
    initConnection(true, false, true);

    try {
      log("[+] Adding the caller.");
      documentApi.update(myDocId, addParticipant, {"name": "caller" , "value" : {"signals":[]} }
       , function() { documentApi.get(myDocId, participantAdded); }
       , function(e) { alert("[-] Adding caller-update; " + JSON.stringify(e)); }
       );
    }
    catch(err){
      log("[-] Adding caller; " + err.message);
    }
  }
  else {
    initConnection(false, false, true) ;

    log("[+] Adding the callee.");

    documentApi.update(myDocId, addParticipant, {"name": "callee" , "value" : {"signals":[{"signal_type": "callee_arrived" , "timestamp": Date.now()}]} }
     , function() { documentApi.get(myDocId, participantAdded); }
     , function(e) { alert("[-] Adding callee-update; " + JSON.stringify(e)); }
    );
  }
});



/*
 * Procedure of function call (Omlet is installed.)
 *  1. [Omlet is Ready.]              Omlet.ready : Omlet Start
 *  2. [Initializing DocumentAPI.]    initDocumentAPI() : get documentAPI
 *  3. [Loading document]             _loadDocument() : get documentReference id
 *     [Get documentReference id: ]
 *
 *  4. [Check for other party.]               click eventListener for "joinAVButton"
 *  5. [Creating localPeerConnection Object.] initConnection() : Caller
 *     [Adding the Caller]
 *  6. [Getting updated version.]             ReceiveUpdate() : _loadDocument() -> documentApi.watch(myDocId, ReceiveUpdate);
 *  7. [Participant added]                    participantAdded : documentAPI.get's success callback
 *  8. [Updated Doc Fetched]                  ReceiveUpdatedDoc
 *     [chat id: ]
 *     [people in this conversation: ]
 *
 *  9. [Add local peer stream.]             getLocalMedia() -> localStreaming()
 */
//////////////////////////////////////////////////////////////////
//
//                Omlet Framework code
//
/////////////////////////////////////////////////////////////////

function initDocumentAPI() {
  if (!Omlet.isInstalled())  {
    log("[-] Omlet is not installed." );
  }

  documentApi = Omlet.document;
  log("[+] Loading document") ;
  _loadDocument();
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


function _loadDocument() {
  if (hasDocument()) {
    myDocId = getDocumentReference();
    log("[+] Get documentReference id: " + myDocId );

    documentApi.watch(myDocId, updateCallback, responseCallback, errorCallback);
    documentApi.get(myDocId, ReceiveDoc);
  } 
  else {
    log("[-] Document is not found." );
  }
}


function watchDocument(docref, OnUpdate) {
  documentApi.watch(docref, function(updatedDocRef) {
    if (updatedDocRef != chatDocId) {
      log("[-] Wrong document.");
    }
    else {
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

    processedSignals[signal.timestamp] = 1 ;

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
      log(signal.sdp);
      localPeerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp), function () {}, logError);
    }
  }
}


/*
 *  Handler for callback
 */

function updateCallback(chatDocId) {
  log("[+] updateCallback. chatDocId: " + chatDocId);

  documentApi.get(chatDocId, getSuccessCallback , function(e) {
    alert("[-] Error on getting doc: " + JSON.stringify(e));
  });
}


function responseCallback() {
  log("[+] responseCallback.");
}


function errorCallback(error) {
  log("[-] " + error);
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


function addParticipant(old, params) {
  old.participants[params.name] = params.value ;

  return old;
}


function addSignal(old, params) {
  old.participants[params.name].signals.push(params.signal) ;
  //old.creator =  ;

  //log("[+] Add signal: " + params.signal);    // error: "InvalidMessageTransform"
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
  log("[+] Participant added");
  //chatDoc = doc ;
  //log( JSON.stringify(doc));
  //log( "people in this conversation: " + Object.keys(doc.participants).length );
}


function DocumentCreated(doc) {
    //var callbackurl = window.location.href.replace("chat-maker.html" , "webrtc-data.html") ;
    var callbackurl = "http://203.246.112.144:3310/chat-maker-media.html#/docId/" + myDocId;
    log(callbackurl);

    if(Omlet.isInstalled()) {
      var rdl = Omlet.createRDL({
        appName: "OmletRTC",
        noun: "poll",
        displayTitle: "OmletRTC",
        displayThumbnailUrl: "http://203.246.112.144:3310/images/quikpoll.png",
        displayText: 'Client: ' + ip() + '\n' + 'Server:' + location.host,
        json: doc,
        callback: callbackurl
      });

      Omlet.exit(rdl);
    }
}



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