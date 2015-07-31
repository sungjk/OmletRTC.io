/*

1. initConnectionInfo() 에서 info value 수정
//  initialize 할 떄 numOfUser를 1로 바꿔주게 되면
//  joinAV 핸들링 할 때 first person을 chatDoc.numOfUser == 1로 바꿔줘야할듯

2. joinAV() 에서 first person, second person 핸들링 값 수정
//  connection Info에서 numOfUser값을 
//  document 생성할 때 +1 해주기.
//  numOfUser = 0  -->  numOfUser = 1


- 둘 다 조인한 후 한쪽에서 joinAV누르면 둘 다 getUserMedia 실행되는지 원본 소스와 비교하기

*/



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


'use strict';

// // Look after different browser vendors' ways of calling the getUserMedia() API method:
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;


//////////////////////////////////////////////////////////////////
//
//                Variables 
//
/////////////////////////////////////////////////////////////////

// document id for omlet
var documentApi;
var myDocId;
var chatDoc;

// RTCPeerConnection object
var peerConnection;

// dataChannel object
var dataChannel;
var receiveChannel;

// sessionDescription constraints
var sdpConstraints = {};

// attach video number
var attachVideoNumber = 0;



 /*****************************************
 *
 *  Elements for HTML5 (button & video)
 *
 *  @author Seongjung Jeremy Kim
 *  @since  2015.07.23
 *
 *****************************************/
var createButton = get("createButton");
var clearButton = get("clearButton");
var getDocButton = get("getDocButton");
//var joinDataButton = get("joinDataButton");
var joinAVButton = get("joinAVButton");

// var localVideo = get("localVideo");
// var remoteVideo = get("remoteVideo");

var localVideo = getQuery("#localVideo");
var remoteVideo = getQuery("#remoteVideo");

var joinDataButton = get("joinDataButton");
// var sendTextarea = get("dataChannelSend");
// var receiveTextarea = get("dataChannelReceive");


// Flags...
var isInitiator = false;
var isStarted = false;
var isChannelReady = false;

// streams
var localStream;
var remoteStream;

// media constraints
var constraints = { 
  audio: false,
  video: true 
};

// PeerConnection ICE protocol configuration (either Firefox or Chrome)
var peerConnectionConfig = webrtcDetectedBrowser === 'Chrome' ? 
    { 'iceServers': [{ 'url': 'stun:23.21.150.121' }] } : 
    { 'iceServers': [{ 'url': 'stun:stun.l.google.com:19302' }] };

var peerConnectionConstraints = {
    'optional': [{ 'DtlsSrtpKeyAgreement': true }],
    'mandatory': { googIPv6: true }
};



 /****************************************************************
 *
 *  Parameters for documentApi.update: 
 *  function(reference, func, parameters, success, error)
 *
 *  @author Seongjung Jeremy Kim
 *  @since  2015.07.23
 *
 ****************************************************************/

var param_create = {
  message : 'create'
};
var param_join = {
  message : 'join'
};
var param_clear = {
  message : 'clear'
};
var param_usermedia = {
  message : 'usermedia'
};




 /****************************************************************
 *
 *  EventHandler for click button 
 *
 *  @author Seongjung Jeremy Kim
 *  @since  2015.07.23
 *
 ****************************************************************/
createButton.onclick = create;
clearButton.onclick = clearDocument;
getDocButton.onclick = getDocument;
//joinDataButton.onclick = joinData;
//joinDataButton.onclick = sendData;
joinAVButton.onclick = joinAV;



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
  logArea.value += message + '\n';
  logArea.scrollTop = logArea.scrollHeight;
}





//////////////////////////////////////////////////////////////////
//
//                WebRTC Code         
//
/////////////////////////////////////////////////////////////////

function onAddIceCandidateSuccess() {
  log('[+] Success to AddIceCandidate.');
}

function onAddIceCandidateError(error) {
  log('[-] Failed to add Ice Candidate: ' + error.message);
}



// Create Offer
function createOffer() {
    log('[+] Creating Offer.');
    peerConnection.createOffer(setLocalSessionDescription, function (error) {
      log('[-] createOffer: ' + error);
    }, sdpConstraints);
}


// Create Answer
function createAnswer() {
    log('[+] Creating Answer to peer.');
    peerConnection.createAnswer(setLocalSessionDescription, function (error) {
      log('[-] createAnswer: ' + error);
    }, sdpConstraints);
}


// Success handler for createOffer and createAnswer
function setLocalSessionDescription(sessionDescription) {
  log("[+] Set LocalSessionDescription.");
  peerConnection.setLocalDescription(sessionDescription);

  var param_sdp = {
    message : 'sessionDescription',
    sessionDescription : sessionDescription
  };
  documentApi.update(myDocId, addMessage, param_sdp, updateSuccessCallback, function (error) {
    log("[-] setLocalSessionDescription-update: " + error);
  });
}


// ICE candidates management
function handleIceCandidate(event) {
  log('[+] handleIceCandidate event: ' + event.candidate);

  var param_iceCandidate = {
    message : 'candidate',
    sdpMLineIndex : event.candidate.sdpMLineIndex,
    candidate : event.candidate.candidate
  };

  if (event.candidate) {
    // update: function(reference, func, parameters, success, error)
    documentApi.update(myDocId, addSignal, param_iceCandidate , updateSuccessCallback, function (error) {
      log('[-] handleIceCandidate-update: ' + error);
    });
  } 
  else {
    log('[-] End of candidates.');
    isStarted = false;
  }
}

function handleIceCandidateChange(ice_state) {
  log('[+] iceGatheringState: ' + peerConnection.iceGatheringState + ', iceConnectionState: ' + peerConnection.iceConnectionState);
}


function onMessage(msg){
  log('[+] Received message: ' + msg.data); 
  receiveTextarea.value += msg.data + '\n';
}


function gotReceiveChannel(event) {
  log("[+] data received: " + msg.data) ;

  receiveChannel = event.channel;
  receiveChannel.onmessage = handleMessage; 
  receiveChannel.onopen = handleReceiveChannelStateChange; 
  receiveChannel.onclose = handleReceiveChannelStateChange;
}


function handleDataChannelStateChange() {
  var readyState = dataChannel.readyState;
  log('[+] DataChannel state is: ' + readyState);

  // If channel ready, enable user's input
  if (readyState == "open") {
    dataChannelSend.disabled = false;
    dataChannelSend.focus();
    dataChannelSend.placeholder = "";
    joinDataButton.disabled = false;
  } 
  else {
    dataChannelSend.disabled = true;
    joinDataButton.disabled = true;
  }
}



function handleReceiveChannelStateChange() {
  var readyState = receiveChannel.readyState; 
  trace('Receive channel state is: ' + readyState); // If channel ready, enable user's input
  
  if (readyState == "open") {
    dataChannelSend.disabled = false; 
    dataChannelSend.focus(); 
    dataChannelSend.placeholder = ""; 
    joinDataButton.disabled = false;
  } 
  else {
    dataChannelSend.disabled = true;
    joinDataButton.disabled = true; 
  }
}


 /*****************************************
 *
 *  Function for media & streaming
 *
 *  @author Seongjung Jeremy Kim
 *  @since  2015.07.18
 *
 *****************************************/


// From this point on, execution proceeds based on asynchronous events getUserMedia() handlers
function handleUserMedia(stream) {
  log('[+] >>>>> handleUserMedia <<<<<');

  localStream = stream;
  attachMediaStream(localVideo, stream);
  
  log('[+] Adding local stream.');

  // update document message; 'usermedia'
  documentApi.update(myDocId, addMessage, param_usermedia, function() { 
    documentApi.get(myDocId, addUser, function (error) {
      log('[-] handleUserMedia-update-get: ' + error);
    }); 
  }, function (error) {
    log('[-] handleUserMedia-update: ' + error);
  });
}



 /*****************************************
 *
 *  Handler for add/remove streaming
 *
 *  @author Seongjung Jeremy Kim
 *  @since  2015.07.22
 *
 *****************************************/

// Handler to be called in case of adding remote stream
function handleRemoteStreamAdded(event) { 
  log('[+] Remote stream added.'); 
  attachMediaStream(remoteVideo, event.stream); 
  log('[+] Remote stream attached.'); 
  remoteStream = event.stream;
}

// Handler to be called in case of removing remote stream
function handleRemoteStreamRemoved(event) {
  log('[+] Remote stream removed. Event: ', event);
}



// PeerConnection management
function createPeerConnection(data, video) {
  try {
    peerConnection = new RTCPeerConnection(peerConnectionConfig, peerConnectionConstraints);
    peerConnection.addStream(localStream);
    peerConnection.onicecandidate = handleIceCandidate;
    peerConnection.oniceconnectionstatechange = handleIceCandidateChange;

    log('[+] Created RTCPeerConnnection with:\n' + 'config: ' + JSON.stringify(peerConnectionConfig) + '\nconstraints: ' + JSON.stringify(peerConnectionConstraints));
  }
  catch (e) {
    log('[-] Failed to create RTCPeerConnection: ' + e.message);
    return;
  }

  // 원래 내꺼 소스

  // video: true
  if(video) {
    peerConnection.onaddstream = handleRemoteStreamAdded;
    peerConnection.onremovestream = handleRemoteStreamRemoved;
  }

  // data: true
  if(data) {
    log("[+] Creating data channel.");

    var dataChannelOptions = {
      ordered: true
    };
    try {
      dataChannel = peerConnection.createDataChannel("datachannel", dataChannelOptions);
      dataChannel.onerror = errorCallback;
      dataChannel.onmessage = onMessage;
      dataChannel.onopen = handleDataChannelState;
      dataChannel.onclose = handleDataChannelState;

    }
    catch (e) {
      log('[-] Failed to create data channel.\n' + e.message);
      return;
    }
  }



  // peerConnection.onaddstream = handleRemoteStreamAdded;
  // peerConnection.onremovestream = handleRemoteStreamRemoved;

  // if (isInitiator) { 
  //   try {
  //     // Create a reliable data channel
  //     dataChannel = peerConnection.createDataChannel("datachannel", {reliable: true});
  //   } 
  //   catch (e) {
  //     log('[-] Failed to create data channel.\n' + e.message);
  //     return;
  //   }

  //   dataChannel.onopen = handleDataChannelStateChange;
  //   dataChannel.onmessage = onMessage;
  //   dataChannel.onclose = handleDataChannelStateChange;
  // } 
  // else { // Joiner
  //   peerConnection.ondatachannel = gotReceiveChannel;
  // }

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



function start(data, video) {
  log('[+] <<<<< start >>>>>>');
  log('[+] data: ' + data + ', video: ' + video);
  log('[+] isStarted: ' + isStarted);
  log('[+] localStream: ' + typeof localStream);
  log('[+] isChannelReady: ' + isChannelReady);

  if (!isStarted && typeof localStream != 'undefined' && isChannelReady) {
    createPeerConnection(data, video);
    isStarted = true;

    if (isInitiator) {
      createOffer();
    }
  }
}


function stop() {
  isStarted = false;
  if (dataChannel)    dataChannel.close();
  if (peerConnection) peerConnection.close();

  dataChannel
  peerConnection = null;

  // joinDataButton.disabled = true;
  // joinAVButton.disabled = true;
}


function sessionTerminated() {
  log('[+] Session terminated.');
  stop();

  // 이부분도 수정 예정. isInitiator는 dataChannel용임
  isInitiator = false;
}



function initDocumentAPI() {
  if (!Omlet.isInstalled())  {
    log("[-] Omlet is not installed." );
  }

  documentApi = Omlet.document;
  log("[+] Loading document") ;
  _loadDocument();
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


function _loadDocument() {
  if (hasDocument()) {
    myDocId = getDocumentReference();
    log("[+] Get documentReference id: " + myDocId );

    // watch: function(reference, onUpdate, success, error)
    // The updateCallback argument to watch is called every time the document changes, for example
    // because it is being updated by another user. It receives the new document as its only argument.
    documentApi.watch(myDocId, updateCallback, watchSuccessCallback, function (error) {
      log('[-] _loadDocument-watch: ' + error);
    });

    // The successful result of get is the document itself.
    documentApi.get(myDocId, ReceiveDoc, function (error) {
      log('[-] _loadDocument-get: ' + error);
    });
  } 
  else {
    log("[-] Document is not found." );
  }
}


function getDocumentReference() {
  var docIdParam = window.location.hash.indexOf("/docId/");
  if (docIdParam == -1) return false;

  var docId = window.location.hash.substring(docIdParam + 7);
  var end = docId.indexOf("/");

  if (end != -1)
    docId = docId.substring(0, end);

  return docId;
}



//
//
//  connection Info에서 numOfUser값을 
//  document 생성할 때 +1 해주기.
//  numOfUser = 0  -->  numOfUser = 1
//
function initConnectionInfo() {
  var chatId = 100;
  var identity = Omlet.getIdentity();
  var numOfUser = 0;

  // Connection info
  var info = {
    'chatId' : chatId,
    'creator' : identity,
    'message' : '',
    'numOfUser' : numOfUser,
    'sessionDescription' : '',
    'candidate' : '',
    'sdpMLineIndex' : '',
    'timestamp' : Date.now()
  };

  return info;
}



function Initialize(old, parameters) {
  return parameters;
}


function hasDocument() {
  var docIdParam = window.location.hash.indexOf("/docId/");
  return (docIdParam != -1);
}


function watchDocument(docref, OnUpdate) {
  documentApi.watch(docref, function(updatedDocRef) {
    if (updatedDocRef != chatDocId) {
      log("[-] Wrong document.");
    }
    else {
      //  The successful result of get is the document itself.
      documentApi.get(updatedDocRef, OnUpdate, errorCallback);
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



function handleMessage(doc) {
  chatDoc = doc;

  if (chatDoc.numOfUser > 2)
    return ;



  if (chatDoc.message === 'create') {
    log('[+] chatDoc.message === create');

    isInitiator = true;

    // Call getUserMedia()
    navigator.getUserMedia(constraints, handleUserMedia, function (error) {
      log("[-] handleMessage-getUserMedia-create: " + error);
    });
    log('Getting user media with constraints.');

    start(false, true);
  }
  else if (chatDoc.message === 'join') {
    log('[+] chatDoc.message === join');
    isChannelReady = true;

    // Call getUserMedia()
    navigator.getUserMedia(constraints, handleUserMedia, function (error) {
      log("[-] handleMessage-getUserMedia-join: " + error);
    });
    log('[+] Getting user media with constraints.');
  }

  if (chatDoc.message === 'usermedia') {
    log('[+] chatDoc.message === usermedia'); 

    start(false, true);
  }
  else if (chatDoc.sessionDescription.type === 'offer') {
    log('[+] chatDoc.sessionDescription.type === offer')

    log('[+] isStarted: ' + isStarted);
    log('[+] isInitiator: ' + isInitiator);

    if (!isStarted && !isInitiator) { 
      //checkAndStart(); // dataChannel인지 AV인지
      // 일단 AV로 돌려
      start(false, true);
    }

    // The setRemoteDescription() method instructs the RTCPeerConnection to apply the supplied RTCSessionDescription 
    // as the remote offer or answer. This API changes the local media state. When the method is invoked, 
    // the user agent must follow the processing model of setLocalDescription(), with the following additional conditions:
    peerConnection.setRemoteDescription(new RTCSessionDescription(chatDoc.sessionDescription));
    // peerConnection.setRemoteDescription(new RTCSessionDescription(chatDoc.sessionDescription), function () {
    //   log('[+] handleMessage-setRemoteDescription-offer');
    // }, function (error) {
    //   log('[-] handleMessage-setRemoteDescription-offer: ' + error);
    // }); 
    createAnswer();
  } 
  else if (chatDoc.sessionDescription.type === 'answer' && isStarted) { 
    log('[+] chatDoc.sessionDescription.type === answer')
    peerConnection.setRemoteDescription(new RTCSessionDescription(chatDoc.sessionDescription));
    // peerConnection.setRemoteDescription(new RTCSessionDescription(chatDoc.sessionDescription), function () {
    //   log('[+] handleMessage-setRemoteDescription-answer');
    // }, function (error) {
    //   log('[-] handleMessage-setRemoteDescription-answer: ' + error);
    // });
  } 
  else if (chatDoc.message === 'candidate' && isStarted) {
    log('[+] chatDoc.message === candidate')

    var candidate = new RTCIceCandidate({
      sdpMLineIndex : chatDoc.sdpMLineIndex, 
      candidate : chatDoc.candidate
    });


    // var candidate = new RTCIceCandidate({
    //   sdpMLineIndex : chatDoc.sdpMLineIndex, 
    //   candidate : chatDoc.candidate
    // }, onAddIceCandidateSuccess, function (error) {
    //   log('[-] handleMessage-RTCIceCandidate: ' + error);
    // });
    
    peerConnection.addIceCandidate(candidate);
  } 
  else if (chatDoc.message === 'clear' && isStarted) { 
    log('[+] chatDoc.message === clear')

    sessionTerminated();
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
  documentApi.get(chatDocId, handleMessage , function (error) {
    log('[-] updateCallback-get: ' + error);
  });
}

// successCallback for documentApi.watch
function watchSuccessCallback() {
  log("[+] Success to documentApi.watch.");
}

// updateSuccessCallback for documentApi.update
function updateSuccessCallback() {
  log("[+] Success to documentApi.update.");
}

// simple success log 
function successCallback() {
  log("[+] Success!!!!!!.");
}

// errorCallback for all of function
function errorCallback(error) {
  log("[-] " + error);
}



/*****************************************
 *
 *  Function for parameter handling documentApi.update: 
 *  function(reference, func, parameters, success, error)
 *
 *  @author Seongjung Jeremy Kim
 *  @since  2015.07.23
 *
 *****************************************/


    // var param_sdp = {
    //   message : 'sessionDescription',
    //   sessionDescription : sessionDescription
    // };

// 여기에 message 핸들링을 넣어놓는 것도 고려해보면 굿
function addMessage(old, parameters) {
  if (parameters.message !== 'undefined')  old.message = parameters.message;

  // if (parameters.message === 'usermedia')
  //   continue;
  if (parameters.message === 'create') {// || parameters.message === 'join') {
    old.numOfUser = old.numOfUser + 1;
  }
  else if (parameters.message === 'join') {
    old.numOfUser = old.numOfUser + 1;
  }
  else if (parameters.message === 'candidate') {
    old.candidate = parameters.candidate;
    old.sdpMLineIndex = parameters.sdpMLineIndex;
  }
  else if (parameters.message === 'clear') {
    old.chatId = chatId;
    old.creator = identity;
    old.message = '';
    old.numOfUser = 0;
    old.sessionDescription = '';
    old.candidate = '';
    old.sdpMLineIndex = '';
  }
  else if (parameters.message === 'sessionDescription') {
    old.sessionDescription = parameters.sessionDescription; 
  }

  old.timestamp = Date.now();

  return old;
}



// Message for clear document.
function msgClear(old, parameters) {
  old.chatId = '';
  old.creator = '';
  old.numOfUser = 0;
  old.message = 'clear';

  return old;
}



function DocumentCleared(doc) {
  log("[+] Document cleared");
  log("[+] User in this conversation: " + doc.numOfUser);
}


function addUser(doc) {
  log("[+] docId: " + doc.chatId + ', numOfUser: ' + doc.numOfUser);
}





//////////////////////////////////////////////////////////////////
//
//             Application Code for event handling
//
/////////////////////////////////////////////////////////////////

/*
  var createButton = get("createButton");
  var getDocButton = get("getDocButton");
  var clearButton = get("clearButton");
  var joinDataButton = get("joinDataButton");
  var joinAVButton = get("joinAVButton");
  createButton.onclick = create;
  clearButton.onclick = clearDocument;
  getDocButton.onclick = getDocument;
  joinDataButton.onclick = joinData;
  joinAVButton.onclick = joinAV;
*/


// Clean-up function: collect garbage before unloading browser's window
window.onbeforeunload = clearDocument;

function get(id){
  return document.getElementById(id);
}

function getQuery(id) {
  return document.querySelector(id);
}


function create() {
  if(!Omlet.isInstalled()) {
    log("[-] Omlet is not installed.");
  }
  else {
    log("[+] Omlet is installed.");
    log("[+] DocumentAPI Obj:" + JSON.stringify(documentApi));


    // change disabled property 
    // joinDataButton.disabled = false;
    // joinAVButton.disabled = false;

    documentApi.create(function(d) {
      // create successCallback

      // Document property is a document reference that can be serialized and can be passed to the other calls.
      myDocId = d.Document;
      location.hash = "#/docId/" + myDocId;

      // update: function(reference, func, parameters, success, error)
      // The func argument to update is called to generate the document or to update it with the new parameters. 
      // It is passed the old document as the first argument, and the app specified parameters as the second.
      documentApi.update(myDocId, Initialize, initConnectionInfo(), function() {
        // update successCallback
        documentApi.get(myDocId, DocumentCreated, errorCallback);
      }, errorCallback);
    }, errorCallback);
  }
}


function clearDocument() {
  if(!Omlet.isInstalled()) {
    log("[-] Omlet is not installed.");
  }
  else {
    log("[+] Clearing Document.");
    stop();

    documentApi.update(myDocId, addMessage, param_clear, function() { documentApi.get(myDocId, DocumentCleared
      , function (error) {
        log("[-] clearDocument-update-get: " + error);
      });
    }, function (error) {
      log("[-] clearDocument-update: " + error);
    });
  }
}


function joinData() {
  // if(Object.keys(chatDoc.participants).length  == 0) {
  //   initConnection(true, true, false);

  //   log("[+] Adding the caller.");
  //   var param_join = {
  //     "name" : "caller",
  //     "value" : {
  //       "signals": []
  //     }
  //   };

  //   documentApi.update(myDocId, addParticipant, param_join, function() { documentApi.get(myDocId, participantAdded, errorCallback); }
  //   , errorCallback);
  // }
  // else {
  //   initConnection(false, true, false);

  //   log("[+] Adding the callee.");
  //   var param_join = {
  //     "name" : "callee",
  //     "value" : {
  //       "signals" : [{
  //         "signal_type" : "callee_arrived",
  //         "timestamp" : Date.now()
  //         }]
  //     }
  //   };

  //   // update: function(reference, func, parameters, success, error),
  //   documentApi.update(myDocId, addParticipant, param_join, function() { documentApi.get(myDocId, participantAdded, errorCallback); }
  //   , errorCallback);
  // }
}


function getDocument() {
  if(!Omlet.isInstalled()) {
    log("[-] Omlet is not installed.");
  }
  else {
    documentApi.get(myDocId, ReceiveDoc, errorCallback);
    log("[+] Getting Document. DocId: " + myDocId);
  }
}





//////////////////////////////////////////////////////////////////
//
//             edit 
//
/////////////////////////////////////////////////////////////////

// // Data channel management
// function sendData() {
//   var data = sendTextarea.value; 

//   if(isInitiator) dataChannel.send(data); 
//   else            receiveChannel.send(data); 

//   log("[+] Sent data: " + data);
// }


//////////////////////////////////////////////////////////////////
//
//             edit
//
/////////////////////////////////////////////////////////////////




// document.getElementById("joinDataButton").addEventListener('click',function() {
//   var caller = false;

//   if(Object.keys(chatDoc.participants).length  == 0) {
//     initConnection(true, true, false);

//     log("[+] Adding the caller.");

//     documentApi.update(myDocId, addParticipant, callerParameters, function() { documentApi.get(myDocId, participantAdded); }
//     , errorCallback);
//   }
//   else {
//     initConnection(false, true, false);

//     log("[+] Adding the callee.");

//     documentApi.update(myDocId, addParticipant, calleeParameters, function() { documentApi.get(myDocId, participantAdded); }
//      , errorCallback);
//   }
// });


//
//  initialize 할 떄 numOfUser를 1로 바꿔주게 되면
//  joinAV 핸들링 할 때 first person을 chatDoc.numOfUser == 1로 바꿔줘야할듯
//
function joinAV() {
  if (Object.keys(chatDoc.numOfUser) == 0) { // first person
    log('[+] Create a room.');

    documentApi.update(myDocId, addMessage, param_create, function() { 
      documentApi.get(myDocId, {}, function (error) {
        log("[-] joinAV-update-get-1: " + error);
      }); 
    }, function (error) {
      log("[-] joinAV-update-1: " + error);
    });
  }
  else if (Object.keys(chatDoc.numOfUser) == 1 && !isStarted) {  // second person
    log('[+] Another peer made join room.');

    documentApi.update(myDocId, addMessage, param_join, function() { 
      documentApi.get(myDocId, {}, function (error) {
        log("[-] joinAV-update-get-2: " + error);
      }); 
    }, function (error) {
      log("[-] joinAV-update-2: " + error);
    });  
  }
  else {
    log('[-] Channel is full.');
    return;
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
