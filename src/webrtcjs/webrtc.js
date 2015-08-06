/*
  //log('[+] my feedMembers: ' + JSON.stringify(Omlet.getFeedMembers()));
  //log('[+] my identify: ' + JSON.stringify(Omlet.getIdentity()));
  //log('[+] chat doc identify: ' + JSON.stringify(chatDoc.creator));
*/


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


// sessionDescription constraints
var sdpConstraints = {};

var peerConnection;  // This is our WebRTC connection
var dataChannel;     // dataChannel object
var running = false; // Keep track of our connection state



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


createButton.onclick = create;
clearButton.onclick = clearDocument;
getDocButton.onclick = getDocument;
joinDataButton.onclick = joinData;
joinAVButton.onclick = joinAV;



// streams
var localStream;
var remoteStream;

// media constraints
var constraints = { 
  audio: false,
  video: true 
};


// Use Google's public servers for STUN
// STUN is a component of the actual WebRTC connection
var peerConnectionConfig = webrtcDetectedBrowser === 'Chrome' ? 
    { 'iceServers': [{ 'url': 'stun:23.21.150.121' }] } : 
    { 'iceServers': [{ 'url': 'stun:stun.l.google.com:19302' }] 
};

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




///////// 시그널


// Handle a WebRTC offer request from a remote client
var handleOfferSignal = function(sdp) {
  running = true;
  log('[+] running = true;');
  initiateWebRTCState();
  startSendingCandidates();

  peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
  peerConnection.createAnswer(function(sessionDescription) {
    log('[+] Sending answer.');
    peerConnection.setLocalDescription(sessionDescription);

    var param_sdp = {
      message : 'sdp',
      sessionDescription : sessionDescription
    };

    documentApi.update(myDocId, addMessage, param_sdp, function () {
        documentApi.get(myDocId, function () {}); 
      }, function (error) {
        log("[-] handleOfferSignal-createAnswer-update: " + error);
    });
  });  
};

// Handle a WebRTC answer response to our offer we gave the remote client
var handleAnswerSignal = function(sdp) {
  peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
};

// Handle an ICE candidate notification from the remote client
var handleCandidateSignal = function(message) {
  var candidate = new RTCIceCandidate(message);
  peerConnection.addIceCandidate(candidate);
};






//////// 초기화 작업

// Function to initiate the WebRTC peerconnection and dataChannel
var initiateWebRTCState = function() {
  peerConnection = new RTCPeerConnection(peerConnectionConfig, peerConnectionConstraints);
  log('[+] Created RTCPeerConnnection with:\n' + 'config: \'' + JSON.stringify(peerConnectionConfig) + '\';\n' + ' constraints: \'' + JSON.stringify(peerConnectionConstraints) + '\'.');
  peerConnection.addStream(localStream);
  peerConnection.onaddstream = handleRemoteStreamAdded;
  peerConnection.onremovestream = handleRemoteStreamRemoved;
};





///////// 연결 (Connect)

// Function to offer to start a WebRTC connection with a peer
var connect = function() {
  running = true;
  log('[+] running = true;');

  startSendingCandidates();

  peerConnection.createOffer(function(sessionDescription) {
    log('[+] Sending offer.');
    peerConnection.setLocalDescription(sessionDescription);

    var param_sdp = {
      message : 'sdp',
      sessionDescription : sessionDescription
    };

    documentApi.update(myDocId, addMessage, param_sdp, function () {
        documentApi.get(myDocId, function () {}); 
      }, function (error) {
        log("[-] connect-createOffer-update: " + error);
    });
  });
};






/////////  ICE Candidate 리스너

// Add listener functions to ICE Candidate events
var startSendingCandidates = function() {
  peerConnection.onicecandidate = handleICECandidate;
  peerConnection.oniceconnectionstatechange = handleICEConnectionStateChange;
};

// This is how we determine when the WebRTC connection has ended
// This is most likely because the other peer left the page
var handleICEConnectionStateChange = function() {
  log('[+] iceGatheringState: ' + peerConnection.iceGatheringState + ', iceConnectionState: ' + peerConnection.iceConnectionState);

  if (peerConnection.iceConnectionState == 'disconnected') { 
  }
};


// Handle ICE Candidate events by sending them to our remote
// Send the ICE Candidates via the signal channel
var handleICECandidate = function(event) {
  if (event.candidate) {
    log('[+] Sending  candidate.');

    var param_iceCandidate = {
      message : 'candidate',
      candidate : event.candidate.candidate
      // message : 'candidate',
      // candidate : event.candidate.candidate,
      // sdpMid : event.candidate.sdpMid,
      // sdpMLineIndex : event.candidate.sdpMLineIndex
    };
    documentApi.update(myDocId, addMessage, param_iceCandidate , function () {
      documentApi.get(myDocId, function () {}); 
    },  function (error) {
      log('[-] handleICECandidate-update: ' + error);
    });
  } 
  else {
    log('[-] All candidates sent');
  }
};



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


function stop() {
  isStarted = false;

  if (dataChannel)    dataChannel.close();
  if (peerConnection) peerConnection.close();

  dataChannel = null;
  peerConnection = null;
}


function sessionTerminated() {
  log('[+] Session terminated.');
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





////////// param 핸들링


// This is the general handler for a message from our remote client
// Determine what type of message it is, and call the appropriate handler
var handleMessage = function(doc) {
  chatDoc = doc;

  if (chatDoc.numOfUser > 2)
    return ;

  var msg = chatDoc.message;
  // log('[+] Recieved a \'' + msg + '\' signal from ' + sender);

  if (chatDoc.message === 'clear') { 
    log('[+] chatDoc.message === clear');

    sessionTerminated();
  }
  else if (msg == 'candidate' && chatDoc.channelReady) {
    log('[+] chatDoc.message === candidate');

    var message = {
      candidate : chatDoc.candidate,
      sdpMLineIndex : chatDoc.sdpMLineIndex
    };
    handleCandidateSignal(message);
  }
  else if (chatDoc.sessionDescription.type === 'answer' && chatDoc.creator.name === Omlet.getIdentity().name) { 
    log('[+] chatDoc.sessionDescription.type === answer');

    handleAnswerSignal(chatDoc.sessionDescription);
  }
  else if (chatDoc.sessionDescription.type === 'offer' && chatDoc.creator.name !== Omlet.getIdentity().name) {
    log('[+] chatDoc.sessionDescription.type === offer');

    handleOfferSignal(chatDoc.sessionDescription);
  }
  else if (chatDoc.message === 'userMedia' && chatDoc.creator.name === Omlet.getIdentity().name) {
    log('[+] chatDoc.message === userMedia'); 

    if (chatDoc.channelReady) {
      initiateWebRTCState();
      connect();
    }
  }
};


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



// 여기에 message 핸들링을 넣어놓는 것도 고려해보면 굿
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
    // old.sdpMid = parameters.sdpMid;
    // old.sdpMLineIndex = parameters.sdpMLineIndex;
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
  else if (parameters.message === 'sdp') {
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

      // Document property is a document reference that can be serialized and can be passed to the other calls.
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
    running = false;
    log('[+] running = false;');

    // Call getUserMedia()
    log('[+] getUserMedia.');
    navigator.getUserMedia(constraints, handleUserMedia, function (error) {
      log("[-] joinAV-getUserMedia-caller: " + error);
    });
  }
  else {  // Callee
    log("[+] " + Omlet.getIdentity().name + " joins the room.");
    running = false;
    log('[+] running = false;');

    var param_channelReadyOn = {
      message : 'channelReady',
      channelReady : true
    };
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