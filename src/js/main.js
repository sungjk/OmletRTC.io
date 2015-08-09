'use strict';

//////////////////////////////////////////////////////////////////
//
//                Variables 
//
/////////////////////////////////////////////////////////////////

// document id for omlet
var documentApi;
var myDocId;
var chatDoc;

var peerConnection;
var dataChannel;

// sessionDescription constraints
var sdpConstraints = {};


 /*****************************************
 *
 *  Elements for HTML5 (button & video)
 *
 *  @since  2015.07.23
 *
 *****************************************/
var createButton = get("createButton");
var clearButton = get("clearButton");
var getDocButton = get("getDocButton");
var joinDataButton = get("joinDataButton");
var joinAVButton = get("joinAVButton");

var localVideo = getQuery("#localVideo");
var remoteVideo = getQuery("#remoteVideo");


var isStarted = false;

// streams
var localStream;
var remoteStream;

// media constraints
var constraints = { 
  audio: false,
  video: true 
};

// PeerConnection ICE protocol configuration (either Firefox or Chrome)
var peerConnectionConfig = webrtcDetectedBrowser === 'Firefox' ? 
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
var param_userMedia = {
  message : 'userMedia'
};



 /****************************************************************
 *
 *  EventHandler for click button 
 *
 *  @since  2015.07.23
 *
 ****************************************************************/
createButton.onclick = create;
clearButton.onclick = clearDocument;
getDocButton.onclick = getDocument;
joinDataButton.onclick = joinData;
joinAVButton.onclick = joinAV;



//////////////////////////////////////////////////////////////////
//
//                Log console
//
/////////////////////////////////////////////////////////////////


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
    log('[+] createOffer.');
    peerConnection.createOffer(setLocalSessionDescription, function (error) {
      log('[-] createOffer: ' + error);
    }, sdpConstraints);


}


// Create Answer
function createAnswer() {
    log('[+] createAnswer.');
    peerConnection.createAnswer(setLocalSessionDescription, function (error) {
      log('[-] createAnswer: ' + error);
    }, sdpConstraints);
}


// Success handler for createOffer and createAnswer
function setLocalSessionDescription(sessionDescription) {
  log("[+] setLocalSessionDescription.");
  peerConnection.setLocalDescription(sessionDescription);

  var param_sdp = {
    message : 'sdp',
    sessionDescription : sessionDescription
  };
  documentApi.update(myDocId, addMessage, param_sdp, function () {
      documentApi.get(myDocId, function () {}); 
    }, function (error) {
    log("[-] setLocalSessionDescription-update: " + error);
  });
}


// ICE candidates management
function handleIceCandidate(event) {
  if (event.candidate) {
    log('[+] handleIceCandidate event.');

    var param_iceCandidate = {
      message : 'candidate',
      candidate : event.candidate.candidate,
      sdpMid : event.candidate.sdpMid,
      sdpMLineIndex : event.candidate.sdpMLineIndex
    };

    documentApi.update(myDocId, addMessage, param_iceCandidate , function () {
      documentApi.get(myDocId, function () {}); 
    },  function (error) {
      log('[-] handleIceCandidate-update: ' + error);
    });
  } 
  else {
    log('[-] End of candidates.');
  }
}

function handleIceCandidateChange(ice_state) {
  log('[+] iceGatheringState: ' + peerConnection.iceGatheringState + ', iceConnectionState: ' + peerConnection.iceConnectionState);
}




 /*****************************************
 *
 *  Handler for media & streaming
 *
 *  @since  2015.07.18
 *
 *****************************************/

// From this point on, execution proceeds based on asynchronous events getUserMedia() handlers
function handleUserMedia(stream) {
  log('[+] >>>>> handleUserMedia <<<<<');

  localStream = stream;
  log('[+] attachMediaStream(localVideo, stream)');
  attachMediaStream(localVideo, stream);

  documentApi.update(myDocId, addMessage, param_userMedia, function() { 
    documentApi.get(myDocId, addUser, function (error) {
      log('[-] handleUserMedia-update-get: ' + error);
    }); 
  }, function (error) {
    log('[-] handleUserMedia-update: ' + error);
  });

  if (chatDoc.creator.name === Omlet.getIdentity().name) {
    start(false, true);
  }
}


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
    log("[+] createPeerConnection()");
    peerConnection = new RTCPeerConnection(peerConnectionConfig, peerConnectionConstraints);
    log('[+] Created RTCPeerConnnection with:\n' + 'config: \'' + JSON.stringify(peerConnectionConfig) + '\';\n' + ' constraints: \'' + JSON.stringify(peerConnectionConstraints) + '\'.');

    log("[+] Attach local Stream.");
    peerConnection.addStream(localStream);
    log('[+] isStarted = true');
    isStarted = true;

    log('[+] onicecandidate');

    peerConnection.onicecandidate = handleIceCandidate;
    peerConnection.oniceconnectionstatechange = handleIceCandidateChange;
  }
  catch (e) {
    log('[-] Failed to create RTCPeerConnection: ' + e.message);
    return;
  }

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
}



//////////////////////////////////////////////////////////////////
//
//                Omlet Framework code
//
/////////////////////////////////////////////////////////////////

/*****************************************************************
 *
 * Omlet.document = {
 *   create: function(success, error),
 *   get: function(reference, success, error),
 *     // The successful result of get is the document itself.
 *   update: function(reference, func, parameters, success, error),
 *   watch: function(reference, onUpdate, success, error),
 *     // The updateCallback argument to watch is called every time the document changes, for example
 *     // because it is being updated by another user. It receives the new document as its only argument.
 *   unwatch: function(reference, success, error)
 * }
 *
 *****************************************************************/

function start(data, video) {
  log('[+] start()');

  if (!isStarted && typeof localStream != 'undefined' && chatDoc.channelReady) {
    log('[+] isStarted: ' + isStarted + ', localStream: ' + typeof localStream + ', channelReady: ' + chatDoc.channelReady);

    createPeerConnection(data, video);
    if (chatDoc.creator.name === Omlet.getIdentity().name) {
      createOffer();
    }
  }
}


function stop() {
  isStarted = false;

  if (dataChannel)    dataChannel.close();
  if (peerConnection) peerConnection.close();

  dataChannel = null;
  peerConnection = null;
}


function sessionTerminated() {
  log('[+] Session terminated.');

  peerConnection.dispose();
  localStream.dispose();
  remoteStream.dispose();

  stop();

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
    'channelReady' : false,
    'sessionDescription' : '',
    'candidate' : '',
    'sdpMid' : '',
    'sdpMLineIndex' : '',
    'timestamp' : Date.now()
  };

  return info;
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


  if (chatDoc.message === 'candidate' && isStarted) {
    log('[+] chatDoc.message === candidate')

    var candidate = new RTCIceCandidate({
      candidate : chatDoc.candidate,
      // sdpMid : chatDoc.sdpMid,
      sdpMLineIndex : chatDoc.sdpMLineIndex
    }, onAddIceCandidateSuccess, function (error) {
      log('[-] handleMessage-RTCIceCandidate: ' + error);
    });
    
    peerConnection.addIceCandidate(candidate);
  }
  else if (chatDoc.sessionDescription.type === 'answer' && chatDoc.creator.name === Omlet.getIdentity().name) { 
    log('[+] chatDoc.sessionDescription.type === answer')

    peerConnection.setRemoteDescription(new RTCSessionDescription(chatDoc.sessionDescription), function () {
      log('[+] handleMessage-setRemoteDescription-answer');
    }, function (error) {
      log('[-] handleMessage-setRemoteDescription-answer: ' + error);
    });
  } 
  else if (chatDoc.sessionDescription.type === 'offer' && chatDoc.creator.name !== Omlet.getIdentity().name) {
    log('[+] chatDoc.sessionDescription.type === offer');
    log('[+] isStarted: ' + isStarted);

    if (!isStarted) {
      start(false, true);
    }

    peerConnection.setRemoteDescription(new RTCSessionDescription(chatDoc.sessionDescription), function () {
      log('[+] handleMessage-setRemoteDescription-offer');
      createAnswer();
    }, function (error) {
      log('[-] handleMessage-setRemoteDescription-offer: ' + error);
    });
  }
  else if (chatDoc.message === 'userMedia' && chatDoc.creator.name === Omlet.getIdentity().name) {
    log('[+] chatDoc.message === userMedia'); 

    start(false, true);
  }
  else if (chatDoc.message === 'clear' && isStarted) { 
    log('[+] chatDoc.message === clear');

    sessionTerminated();
  }
}


/*****************************************
 *
 *  Callback function for documentApi
 *
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
 *  @since  2015.07.23
 *
 *****************************************/

function addMessage(old, parameters) {
  if (parameters.message !== 'undefined')  old.message = parameters.message;

  if (parameters.message === 'userMedia') {
    old.numOfUser = old.numOfUser + 1;
  }
  else if (parameters.message === 'channelReady') {
    old.channelReady = parameters.channelReady;
  }
  else if (parameters.message === 'candidate') {
    old.candidate = parameters.candidate;
    old.sdpMid = parameters.sdpMid;
    old.sdpMLineIndex = parameters.sdpMLineIndex;
  }
  else if (parameters.message === 'clear') {
    old.chatId = '';
    old.creator = '';
    old.numOfUser = 0;
    old.sessionDescription = '';
    old.candidate = '';
    old.sdpMLineIndex = '';
  }
  else if (parameters.message === 'sdp') {
    old.sessionDescription = parameters.sessionDescription; 
  }

  old.timestamp = Date.now();

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

    documentApi.create(function(d) {
      // create successCallback

      myDocId = d.Document;
      location.hash = "#/docId/" + myDocId;

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

    documentApi.update(myDocId, addMessage, param_clear, function() { 
      documentApi.get(myDocId, DocumentCleared, function (error) {
        log("[-] clearDocument-update-get: " + error);
      });
    }, function (error) {
      log("[-] clearDocument-update: " + error);
    });
  }
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


function joinAV() {
  // Caller
  if (chatDoc.creator.name === Omlet.getIdentity().name) {
    log("[+] " + Omlet.getIdentity().name + " creates the room.");

    isStarted = false;
    var param_channelReadyOff = {
      message : 'channelReady',
      channelReady : false
    };

    // param_channelReadyOff
    documentApi.update(myDocId, addMessage, param_channelReadyOff, function () {
      documentApi.get(myDocId, function () {}); 
    }, function (error) {
      log("[-] joinAV-update-channelReadyOff: " + error);
    });

    // Call getUserMedia()
    log('[+] getUserMedia.');
    navigator.getUserMedia(constraints, handleUserMedia, function (error) {
      log("[-] joinAV-getUserMedia-caller: " + error);
    });
  }
  else {  // Callee
    log("[+] " + Omlet.getIdentity().name + " joins the room.");
    isStarted = false;

    var param_channelReadyOn = {
      message : 'channelReady',
      channelReady : true
    };

    // param_channelReadyOn
    documentApi.update(myDocId, addMessage, param_channelReadyOn, function () {
      documentApi.get(myDocId, function () {}); 
    }, function (error) {
      log("[-] joinAV-update-channelReadyOn: " + error);
    });

    // Call getUserMedia()
    log('[+] getUserMedia.');
    navigator.getUserMedia(constraints, handleUserMedia, function (error) {
      log("[-] joinAV-getUserMedia-callee: " + error);
    });
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