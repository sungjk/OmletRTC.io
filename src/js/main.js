/*
  //log('[+] my feedMembers: ' + JSON.stringify(Omlet.getFeedMembers()));
  //log('[+] my identify: ' + JSON.stringify(Omlet.getIdentity()));
  //log('[+] chat doc identify: ' + JSON.stringify(chatDoc.creator));

  //log('[+] Created RTCPeerConnnection with:\n' + 'config: ' + JSON.stringify(peerConnectionConfig) 
  + '\nconstraints: ' + JSON.stringify(peerConnectionConstraints));
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
//                Variables 
//
/////////////////////////////////////////////////////////////////

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
 *  @author Seongjung Jeremy Kim
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

var isStarted = false;

var localStream;
var remoteStream;

// media constraints
var constraints = { 
  audio: false,
  video: true 
};

// PeerConnection ICE protocol configuration (either Firefox or Chrome)
var pc_config = webrtcDetectedBrowser === 'Chrome' ? 
    { 'iceServers': [{ 'url': 'stun:23.21.150.121' }] } : 
    { 'iceServers': [{ 'url': 'stun:stun.l.google.com:19302' }] };

var pc_constraints = {
    'optional': [{ 'DtlsSrtpKeyAgreement': true }],
    mandatory : { googIPv6: true }
};


 /****************************************************************
 *
 *  Parameters for documentApi.update: 
 *  update(reference, func, parameters, success, error)
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
var param_userMedia = {
  message : 'userMedia'
};
var param_channelReadyOn = {
  message : 'channelReady',
  channelReady : true
};

//////////////////////////////////////////////////////////////////
//
//                WebRTC Code         
//
/////////////////////////////////////////////////////////////////

function createPeerConnection(data, video) {
  try {
    log("[+] createPeerConnection()");
    peerConnection = new RTCPeerConnection(pc_config, pc_constraints);

    log("[+] Attach local Stream.");
    peerConnection.addStream(localStream);

    isStarted = true;
    log('[+] isStarted: ' + isStarted);

    log('[+] handleIceCandidate');
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

  if (chatDoc.creator.name === Omlet.getIdentity().name) {
    createOffer();
  }
}

function createOffer() {
    log('[+] createOffer.');

    peerConnection.createOffer(setLocalSessionDescription, function (error) {
      log('[-] createOffer: ' + error);
    }, sdpConstraints);
}

function createAnswer() {
    log('[+] createAnswer.');

    peerConnection.createAnswer(setLocalSessionDescription, function (error) {
      log('[-] createAnswer: ' + error);
    }, sdpConstraints);
}

// Success handler for createOffer and createAnswer
function setLocalSessionDescription(sessionDescription) {
  log("[+] setLocalSessionDescription.");

  peerConnection.setLocalDescription(sessionDescription, function () {
    var param_sdp = {
      message : 'sessionDescription',
      sessionDescription : sessionDescription,
    };
    documentApi.update(myDocId, addMessage, param_sdp, {}, function (error) {
      log("[-] setLocalSessionDescription-update: " + error);
    });
  }, function (error) {
    log("[-] setLocalSessionDescription: " + error);
  });
}


function handleIceCandidate(event) {
  log('[+] Call handleIceCandidate event.');

  if (event.candidate) {
    log('[+] Found candidate.');

    var param_iceCandidate = {
      message : 'candidate',
      candidate : event.candidate.candidate,
      sdpMid : event.candidate.sdpMid,
      sdpMLineIndex : event.candidate.sdpMLineIndex
    };
    documentApi.update(myDocId, addMessage, param_iceCandidate , {}, function (error) {
      log('[-] handleIceCandidate-update: ' + error);
    });
  } 
  else {
  }
}

function handleIceCandidateChange(ice_state) {
  log('[+] iceGatheringState: ' + peerConnection.iceGatheringState + ', iceConnectionState: ' + peerConnection.iceConnectionState);
}

function onAddIceCandidateSuccess() {
  log('[+] Success to AddIceCandidate.');
}

function onAddIceCandidateError(error) {
  log('[-] Failed to add Ice Candidate: ' + error.message);
}


 /*****************************************
 *
 *  Handler for media & streaming
 *
 *  @author Seongjung Jeremy Kim
 *  @since  2015.07.18
 *
 *****************************************/

// From this point on, execution proceeds based on asynchronous events getUserMedia() handlers
function handleUserMedia(stream) {
  log('[+] getUserMedia() success handler');

  localStream = stream;
  log('[+] attachMediaStream(localVideo, stream)');
  attachMediaStream(localVideo, stream);

  // update document message; 'userMedia'
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
    
  }
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

function Initialize(old, parameters) {
  return parameters;
}

function ReceiveDoc(doc) {
  chatDoc = doc;
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


/*
  'userMedia' : Caller에게만 핸들링되도록
  'offer' : Callee에게만 핸들링되도록
  'answer' : Caller에게만 핸들링되도록
  'candidate' : 
*/
function handleMessage(doc) {
  chatDoc = doc;

  if (chatDoc.numOfUser > 2)
    return ;

  if (chatDoc.message === 'userMedia' && chatDoc.creator.name === Omlet.getIdentity().name) {
    log('[+] chatDoc.message === userMedia'); 

    start(false, true);
  }
  else if (chatDoc.sessionDescription.type === 'offer' && chatDoc.creator.name !== Omlet.getIdentity().name) {
    log('[+] chatDoc.sessionDescription.type === offer')
    log('[+] isStarted: ' + isStarted);

    if (!isStarted) {
      start(false, true);

      log('[+] peerConnection.setRemoteDescription');
      peerConnection.setRemoteDescription(new RTCSessionDescription(chatDoc.sessionDescription), function () {
        log('[+] handleMessage-setRemoteDescription-offer');
      }, function (error) {
        log('[-] handleMessage-setRemoteDescription-offer: ' + error);
      }); 

      createAnswer();
    }
  } 
  else if (chatDoc.sessionDescription.type === 'answer' && isStarted && chatDoc.creator.name === Omlet.getIdentity().name) { 
    log('[+] chatDoc.sessionDescription.type === answer')
    
    log('[+] peerConnection.setRemoteDescription');
    peerConnection.setRemoteDescription(new RTCSessionDescription(chatDoc.sessionDescription), function () {
      log('[+] handleMessage-setRemoteDescription-answer');
    }, function (error) {
      log('[-] handleMessage-setRemoteDescription-answer: ' + error);
    });
  } 
  else if (chatDoc.message === 'candidate' && isStarted) {
    log('[+] chatDoc.message === candidate')

    var candidate = new RTCIceCandidate({
      candidate : chatDoc.candidate,
      sdpMLineIndex : chatDoc.sdpMLineIndex
    });
    peerConnection.addIceCandidate(candidate);
  }
  else if (chatDoc.message === 'sessionDescription') {
    log('[+] peerConnection.setRemoteDescription');
    peerConnection.setRemoteDescription(new RTCSessionDescription(chatDoc.sessionDescription), function () {
      if (chatDoc.sessionDescription.type == 'offer' && chatDoc.creator.name !== Omlet.getIdentity().name) {
        createAnswer();
      }
    }, function (error) {
      log('[-] handleMessage-setRemoteDescription-answer: ' + error);
    });
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
 *  @author Seongjung Jeremy Kim
 *  @since  2015.07.20
 *
 *****************************************/

// updateCallback for documentApi.watch
function updateCallback(chatDocId) {
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

// errorCallback for all of function
function errorCallback(error) {
  log("[-] " + error);
}



/*****************************************
 *
 *  Function for parameter handling documentApi.update: 
 *  update(reference, func, parameters, success, error)
 *
 *  @author Seongjung Jeremy Kim
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

function joinAV() {
  if (chatDoc.numOfUser > 2)
    return;

  // Caller
  if (chatDoc.creator.name === Omlet.getIdentity().name) {
    log("[+] " + Omlet.getIdentity().name + " creates the room.");

    log('[+] getUserMedia.');
    navigator.getUserMedia(constraints, handleUserMedia, function (error) {
      log("[-] joinAV-getUserMedia-caller: " + error);
    });

    start(false, true);
  }
  else {  // Callee
    log("[+] " + Omlet.getIdentity().name + " joins the room.");

    documentApi.update(myDocId, addMessage, param_channelReadyOn, {}, function (error) {
      log("[-] joinAV-update-channelReadyOn: " + error);
    });

    log('[+] getUserMedia.');
    navigator.getUserMedia(constraints, handleUserMedia, function (error) {
      log("[-] joinAV-getUserMedia-callee: " + error);
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
    initDocumentAPI();
    // No Doc --> Use traditional Style
  }
});










// function ReceiveUpdatedDoc(doc) {


//   chatDoc = doc;

//   log( "Updated Doc Fetched" );
//   log( "chat id: " + chatDoc.chatId ) ;
//   log( "people in this conversation: " + Object.keys(chatDoc.participants).length );

//   if( Object.keys(chatDoc.participants).length != 2 ) {
//     return ;
//   }


//     //log("Updated signals: " + JSON.stringify(processedSignals) ) ;

//     // Having two people
//     var caller = chatDoc.participants["caller"] ;
//     var callee = chatDoc.participants["callee"] ;

//     //log( "CALLER:" + JSON.stringify(caller));
//     // Callee Signal Handler - process signals generated by caller
//     for (var i = 0; i < caller.signals.length; i++) {

//       var signal = caller.signals[i];
//       if (signal.timestamp in processedSignals)
//         continue ;
//       processedSignals[signal.timestamp]  = 1 ;

//       if (signal.signal_type === "new_ice_candidate") {
//         log("PC2 is adding ICE.");
//         peerConnection2.addIceCandidate(
//           new RTCIceCandidate(signal.candidate),
//           onAddIceCandidateSuccess, onAddIceCandidateError
//           );
//       } else if (signal.signal_type === "new_description") {
//         log("PC2 is setting remote description");
//         peerConnection2.setRemoteDescription(
//           new RTCSessionDescription(signal.sdp),
//           function () {
//             log("PC2 is checking for offer.");
//             if (peerConnection2.remoteDescription.type == "offer") {
//               log("PC2 is creating answer.");
//               peerConnection2.createAnswer(onNewDescriptionCreated_2, logError);
//             }
//           }, logError);
//       }


//     }

//     //log("CALLEE:" + JSON.stringify(callee));
//     // Caller Signal Handler - process signals generated by callee
//     for (var i = 0; i < callee.signals.length; i++) {
//       var signal = callee.signals[i];
//       if (signal.timestamp in processedSignals)
//         continue ;
//       processedSignals[signal.timestamp]  = 1 ;

//       if (signal.signal_type === "callee_arrived") {

//         //  if( there ==0 ) {
//           log("Callee Arrived") ;
//           peerConnection.createOffer(
//             onNewDescriptionCreated,
//             logError
//             );
//         //  there =1 ;
//       //  }
//     }
//     else if (signal.signal_type === "new_ice_candidate") {
//       peerConnection.addIceCandidate(
//         new RTCIceCandidate(signal.candidate),
//         onAddIceCandidateSuccess, onAddIceCandidateError
//         );
//     } else if (signal.signal_type === "new_description") {
//       log(signal.sdp);
//       peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp), function () {}, logError);
//     }
//   }

// }



// function ReceiveUpdate(chatDocId) {
//   log( "Doc updated. Getting updated version..." );
//     //log( "chat id: " + chatDoc.chatId ) ;
//     //log( "people in this conversation: " + Object.keys(doc.participants).length );
//     documentApi.get(chatDocId, ReceiveUpdatedDoc , function(e) {
//       alert("error on getting doc: " + JSON.stringify(e));
//     });
//   }

//   function hasDocument() {
//     var docIdParam = window.location.hash.indexOf("/docId/");
//     return (docIdParam != -1);
//   }

//   function getDocumentReference() {
//     var docIdParam = window.location.hash.indexOf("/docId/");
//     if (docIdParam == -1) return false;
//     var docId = window.location.hash.substring(docIdParam+7);
//     var end = docId.indexOf("/");
//     if (end != -1)
//       docId = docId.substring(0, end);
//     return docId;
//   }

//   function _loadDocument() {
//     if (hasDocument()) {
//       myDocId = getDocumentReference();
//       log("Doc found with id#: " + myDocId );
//       documentApi.watch(myDocId, ReceiveUpdate);
//       log("Getting Doc...");
//       documentApi.get(myDocId, ReceiveDoc );
//         //watchDocument(myDocId, ReceiveUpdate);
//       } else {
//         log(" Doc ***NOT*** found " );
//       }
//     }


//     function initDocumentAPI() {
//       log("Initializating Document API");


//       if (!Omlet.isInstalled()) {
//         log(" NO OMLET for US " );

//       }

//       documentApi = Omlet.document;
//       log("Loading document") ;
//       _loadDocument();
//     }


//     function log(message){
//       var logArea = document.getElementById("console");
//       logArea.value += "\n" + message ;
//       logArea.scrollTop = logArea.scrollHeight;
//     }

//     function InitialDocument() {
//       var chatId = 100;
//       var identity = Omlet.getIdentity() ;
//       log('id:' + JSON.stringify(identity) );

//       // Particiapnat includes omlet id, connection info

//       var initValues = {
//         'chatId' : chatId ,
//         'creator':identity,
//         'participants':{}
//       };

//       return initValues;
//     }


//   function Initialize(old, params) {
//     return params;
//   }

//   function clear(old, params) {
//     processedSignals = {};
//     old.participants = {} ;
//     old.creator = '' ;
//     return old;
//   }

//   function addParticipant(old, params) {
//     old.participants[params.name] = params.value ;
//     //old.creator = '' ;
//     return old;
//   }


//   function addSignal(old, params) {
//   //log("Adding a signal" + params) ;
//   //log("Old: " + JSON.stringify(old)) ;
//   old.participants[params.name].signals.push(params.signal) ;
//   //old.creator =  ;
//   return old;
// }


// function DocumentCleared(doc) {
//   log("Document cleared");
//   log("people in this conversation: " + Object.keys(doc.participants).length );
// }


// function participantAdded(doc) {
//   log("Participant added");
//   //chatDoc = doc ;
//   //log( JSON.stringify(doc));
//   //log("Participant added");
//   //log( "people in this conversation: " + Object.keys(doc.participants).length );
// }


// function DocumentCreated(doc) {
//     //var callbackurl = window.location.href.replace("chat-maker.html" , "webrtc-data.html") ;
//     var callbackurl = "https://webrtcbench-dbh3099.rhcloud.com/chat-maker-media.html#/docId/" + myDocId;
//     log(callbackurl);

//     //if(Omlet.isInstalled()) {
//       var rdl = Omlet.createRDL({
//         appName: "webrtc-data",
//         noun: "poll",
//         displayTitle: "webrt-data",
//         displayThumbnailUrl: "https://dhorh0z3k6ro7.cloudfront.net/apps/quikpoll/images/quikpoll.png",
//         displayText: "WEBRTC CHATROOM",
//         json: doc,
//         callback: callbackurl
//       });
//       Omlet.exit(rdl);
//     //}
//   }


// //////////////////////////////////////////////
// /////////////// WebRTC Code //////////////////
// //////////////////////////////////////////////

// function onAddIceCandidateSuccess() {
//   log('AddIceCandidate success.');
// }

// function onAddIceCandidateError(error) {
//   log('Failed to add Ice Candidate: ' + error.toString());
// }

// function logError(error){
//   log("Log error: ", error);
// }


// function onNewDescriptionCreated(description) {
//   peerConnection.setLocalDescription(description, function () {
//     log("Caller Local Description Set");

//     // Send it to the other peer
//     if ( omletAsSignallingChannel ){
//       //TODO Update the Document
//       log("updating doc with id#:" + myDocId);

//         //documentApi.update(myDocId, addParticipant, {"name": "dummy" , "value" : {"signals":[]} }
//         //     , function() { documentApi.get(myDocId, participantAdded); }
//         //     , function(e) { alert("error: " + JSON.stringify(e)); }
//         //);

//     var des_obj = {"name": "caller" , "signal" : {"signal_type": "new_description","timestamp":Date.now(),  "sdp": description} }  ;
//         //var des_str = JSON.stringify( des_obj );



//         //log(des_str) ;
//         //str = JSON.stringify(description);
//         //str = '{"sdp": "v=0\r\n\o=- 368374678643784 2 IN IP4 12.3.3.3 \r\ns-=-\r\nt=0 0\r\na=msid-semantic:"}';
//         //str = 'Hello kitty' ;
//     documentApi.update(myDocId, addSignal, des_obj , function() { log("Signal added"); }
//      , function(e) { alert("error: " + JSON.stringify(e)); }
//      );

//         //documentApi.update(myDocId, addSignal
//         //    , {
//               //"name": "caller" ,
//               //"signal": {
//             //    "type": "new_description",
//             //    "sdp": description
//             //  }
//       //      }
//       //       , function() { log("sldpa signal added"); }
//       //       , function(e) { alert("error: " + JSON.stringify(e)); }
//       //  );

//     }
//     else {
//         // Other method
//     }
//   }, logError);
// }


// function onNewDescriptionCreated_2(description) {
//   peerConnection2.setLocalDescription(description, function () {
//     log("Callee Local Description Set");

//     // Send it to the other peer
//     if (omletAsSignallingChannel) {
//       //TODO Update the Document
//       var des_obj = {"name": "callee" , "signal" : {"signal_type": "new_description","timestamp":Date.now(),  "sdp": description} }  ;
//       documentApi.update(myDocId, addSignal, des_obj , function() { log("Signal added"); }
//          , function(e) { alert("error: " + JSON.stringify(e)); });
//     }
//     else {
//       signallingSocket.emit("message",
//         JSON.stringify({
//           channel: get('channelId').value,
//           signal_type: "new_description",
//           sdp: description
//         }));
//     }
//   }, logError);
// }



// function onIceCandidate(event){
//   log("New Ice Candidate Found");
//   if (event.candidate) {
//     if ( omletAsSignallingChannel ){
//       //TODO Update the Document
//       var des_obj = {"name": "caller" , "signal" : {"signal_type": "new_ice_candidate","timestamp":Date.now(), "candidate": event.candidate} }  ;
//       documentApi.update(myDocId, addSignal, des_obj , function() { log("NewICE Signal added"); }
//        , function(e) { alert("error: " + JSON.stringify(e)); }
//        );
//     } else {
//     }
//   }
// }

// function onIceCandidate2(event){
//   log("New Ice Candidate Found");
//   if (event.candidate) {
//     if ( omletAsSignallingChannel ){
//       //TODO Update the Document
//       var des_obj = {"name": "callee" , "signal" : {"signal_type": "new_ice_candidate","timestamp":Date.now(), "candidate": event.candidate} }  ;
//       documentApi.update(myDocId, addSignal, des_obj , function() { log("NewICE Signal added"); }
//        , function(e) { alert("error: " + JSON.stringify(e)); }
//        );
//     } else {
//     }
//   }
// }


// function tryParseJSON (jsonString){
//   try {
//     var o = JSON.parse(jsonString);

//         // Handle non-exception-throwing cases:
//         // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
//         // but... JSON.parse(null) returns 'null', and typeof null === "object",
//         // so we must check for that, too.
//         if (o && typeof o === "object" && o !== null) {
//           return o;
//         }
//       }
//       catch (exception) {
//         return false;
//       }
//     };

//     function onMessage (event) {
//       var t_msg = time();
//       var blob = event.data;
//     // TODO file transfer

//     var json = tryParseJSON(blob.toString()) ;
//     if ( json ){
//         //log( blob.toString() );
//         if( json.message === 'Ping' ){
//           dataChannel.send( JSON.stringify( { message:"Pong" , timestamp: time() }) );
//         } else if (json.message === 'Pong') {
//           log( blob.toString() + " received at " + time() );
//         } else if ( json.message  === 'File') {
//             //log( blob.toString() + " received at " + json.timestamp );
//             receivedFileInfo.name = json.name ;
//             receivedFileInfo.size = json.size;
//             receivedFileInfo.type = json.type ;
//             receivedFileInfo.receivedBytes = 0 ;
//           }
//         }
//         else {
//           log("text received at " + t_msg.toString());
//         //appendDIV(event.data);
//       }

//     };

//     function dataChannelOpened () {
//       log("Datachennel opened");

//       get('chatInput').disabled = false;
//       get('chatInput2').disabled = false;

//       get('chatInput').onkeypress = function (e) {
//         if (e.keyCode !== 13 || !this.value) return;
//         dataChannel.send("P1: " + this.value);
//         this.value = '';
//         this.focus();
//       };

//       get('chatInput2').onkeypress = function (e) {
//        if (e.keyCode !== 13 || !this.value) return;
//        dataChannel2.send("P2: " + this.value);
//        this.value = '';
//        this.focus();
//      };

//   //dataChannelOpened = true;
//   //get('sendbtn').onclick = sendFile ;
//   //get('pingbtn').onclick = function() { log("sending ping at " + time() ) ; dataChannel.send( JSON.stringify({message : 'Ping' , timestamp: time() }) ); };
// };

// function onMessage(msg){
//   log("DC1 received:" + msg.data) ;
// }

// function onMessage2(msg){
//   log("DC2 received:" + msg.data) ;
// }



// function streaming(stream) {
//   var localMedia = get("localVideo")
//   if (window.URL) {
//     localMedia.src = window.URL.createObjectURL(stream);
//   } else {
//     localMedia.src = stream;
//   }
//   localMedia.autoplay = true;
//   localMedia.play();

//   peerConnection.addStream(stream);
//   log("Stream attached to PC1") ;
// }



// function getMedia(){
//   navigator.getUserMedia(
//     {audio:false, video:true}
//     , streaming, logError);
// }


// /**
//  *
//  * @author Seongjung Jeremy Kim
//  * @since  2015.07.15
//  *
//  */

// // Original onstraints object for web app video
// var srcConstraints = {
//   "audio":false,
//   "video": {
//     mandatory: {
//       minFrameRate: 30,
//       maxHeight: 240,
//       maxWidth: 320
//     }
//   }
// };

// // Constraints object for low resolution video
// var qvgaConstraints = { video: {
//     mandatory: {
//       maxWidth: 320,
//       maxHeight: 240
// } }
// };

// // Constraints object for standard resolution video
// var vgaConstraints = { video: {
//     mandatory: {
//       maxWidth: 640,
//       maxHeight: 480
// } }
// };

// // Constraints object for high resolution video
// var hdConstraints = { video: {
//     mandatory: {
//       maxWidth: 1280,
//       maxHeight: 960
// } }
// };


// /**
//  *
//  * @author Seongjung Jeremy Kim
//  * @since  2015.07.15
//  *
//  */

// // Callback to be called in case of failure...
// function errorCallback(error){
//   log("[-] navigator.getUserMedia; " + error);
// }

// // Callback to be called in case of success...
// function successCallback(stream) {
//   localMedia = get("localVideo")

//   // Make the stream available to the console for introspection
//   window.stream = stream;
//   // Attach the returned stream to the <video> element in the HTML page
//   localMedia.src = window.URL.createObjectURL(stream);
//   // Set <video> element property
//   localMedia.autoplay = true;
//   // Start playing video
//   localMedia.play();

//   peerConnection.addStream(stream);
//   log("[+] Stream attached to PC1.") ;
// }


// /**
//  *
//  * @author Seongjung Jeremy Kim
//  * @since  2015.07.15
//  *
//  */
// // Simple wrapper for getUserMedia() with constraints object as an input parameter
// // function getMedia(constraints){
// //   if (!!localStream) {
// //     localMedia.src = null;
// //     localStream.stop();
// //   }

// //   navigator.getUserMedia(constraints, successCallback, errorCallback);
// // }


// //////////// Establishing Connection ////////////
// function initConnection(caller, data, video){
//   // Caller
//   if (caller) {
//     log("[+] Creating the first PeerConnection Object.");

//     var options = {
//       "optional": [
//       {DtlsSrtpKeyAgreement: true}
//             //,{RtpDataChannels: getData}
//             ],
//             mandatory: { googIPv6: true }
//           };
//           peerConnection = new RTCPeerConnection(null, options);

//     // Sends ice candidates to the other peer
//     peerConnection.onicecandidate = onIceCandidate;
//     peerConnection.oniceconnectionstatechange = function (ice_state) {
//       log("[+] PC1: " + peerConnection.iceGatheringState + " " + peerConnection.iceConnectionState);
//     }

//     if(data) {
//       log("[+] Creating data channel.");

//       var dataChannelOptions = {
//         ordered: true
//       };

//       dataChannel = peerConnection.createDataChannel("datachannel", dataChannelOptions);

//       dataChannel.onerror = logError ;
//       dataChannel.onmessage = onMessage;
//       dataChannel.onopen = dataChannelOpened;
//       dataChannel.onclose = function () {
//         log("[-] The Data Channel is closed.");
//       };
//     }

//     if(video) {
//       peerConnection.onaddstream = function (event) {
//         log('[+] PC1: Remote stream is arrived.');

//         //var media = get("");
//         //media.id = "remoteView0";
//         //media.src = webkitURL.createObjectURL(event.stream);
//         //media.autoplay = true;

//         // var media = get("localVideo");
//         // media.src = webkitURL.createObjectURL(event.stream);
//         // media.autoplay = true;
//         // media.play();
//       };

//       peerConnection.onremovestream = function (event) {
//         log('PC1: Remote stream removed.');
//       };

//       getMedia();
//     }
//   }
//   else {  // Callee
//     log("[+] Creating the second PeerConnection Object.");

//     var options = {
//       "optional": [
//         {DtlsSrtpKeyAgreement: true}
//         //,{RtpDataChannels: getData}
//       ],
//       mandatory: { googIPv6: true }
//     };

//     peerConnection2 = new RTCPeerConnection(null, options);

//     // Sends ice candidates to the other peer
//     peerConnection2.onicecandidate = onIceCandidate2;
//     peerConnection2.oniceconnectionstatechange = function (ice_state) {
//       log("[+] PC2: " + peerConnection2.iceGatheringState + " " + peerConnection2.iceConnectionState);
//     }

//     if (data){
//       peerConnection2.ondatachannel = function (e) {
//         // Data channle opened
//         log("Datachennel PC2-side opened");
//         dataChannel2 = e.channel;
//         dataChannel2.onerror = logError ;
//         dataChannel2.onmessage = onMessage2;
//         dataChannel2.onclose = function () {
//           log("The Data Channel is closed");
//         };
//       }
//     }

//     if(video) {
//       peerConnection2.onaddstream = function (event) {
//         log("[+] PC2: Remote stream arrived.");
//         //log(JSON.stringify(event));

//         var remoteMedia = get("remoteVideo");
//         if (window.URL) {
//           remoteMedia.src = window.URL.createObjectURL(event.stream);
//         } else {
//           remoteMedia.src = event.stream;
//         }
//         remoteMedia.autoplay = true;
//         remoteMedia.play() ;

//         peerConnection2.addStream(event.stream);        

//         log('[+] PC2: Remote stream is playing.');
//       };

//       peerConnection2.onremovestream = function (event) {
//         log('[+] PC2: Remote stream removed.');
//       };

//       //getMedia() ;
//     }
//   }
// }

// ///////////////////////////////////
// ///////// Utility /////////////////
// ///////////////////////////////////
// function log(message){
//   var logArea = this.get("console");
//   logArea.value += "\n" + message ;
//   logArea.scrollTop = logArea.scrollHeight;
// }

// function get(id){
//   return document.getElementById(id);
// }

// /////////////////////////////////////
// ///////////////  App ////////////////
// /////////////////////////////////////

// document.getElementById("createButton").addEventListener('click',function(){
//   if(!Omlet.isInstalled()) {
//     log("[-] Omlet is not installed.");
//   }
//   else {
//     log("[+] Omlet is installed.");
//     log("[+] DocumentAPI Obj:" + JSON.stringify(documentApi));

//     documentApi.create(function(d) {
//       log("[+] Function call: documentApi.create");

//       myDocId = d.Document;
//       location.hash = "#/docId/" + myDocId;

//       documentApi.update(myDocId, Initialize, InitialDocument(), function() {
//         documentApi.get(myDocId, DocumentCreated)
//       }, function(e) {
//           alert("[-] create-update; " + JSON.stringify(e));
//         });
//     }, function(e) {
//       alert("[-] create; " + JSON.stringify(e));
//     });
//   }
// });


// document.getElementById("clearButton").addEventListener('click',function(){
//   if(!Omlet.isInstalled()) {
//     log("[-] Omlet is not installed.");
//   }
//   else {
//     log("[+] Clearing Document.");

//     documentApi.update(myDocId, clear, {}
//      , function() { documentApi.get(myDocId, DocumentCleared); }
//      , function(e) { alert("[-] clear-update; " + JSON.stringify(e)); }
//      );
//   }
// });


// document.getElementById("getDocButton").addEventListener('click',function(){
//   if(!Omlet.isInstalled()) {
//     log("[-] Omlet is not installed.");
//   }
//   else {
//     log("[+] Getting Document.");
//     documentApi.get(myDocId, ReceiveDoc);
//   }
// });


// document.getElementById("joinDataButton").addEventListener('click',function() {
//   var caller = false;

//   log("[*] Check for other party");

//   if(Object.keys(chatDoc.participants).length  == 0){
//     initConnection(true, true, false);

//     try{
//       log("[+] Adding the caller.");

//       documentApi.update(myDocId, addParticipant, {"name": "caller" , "value" : {"signals":[]} }
//        , function() { documentApi.get(myDocId, participantAdded); }
//        , function(e) { alert("[-] Adding caller-update; " + JSON.stringify(e)); }
//       );
//       //documentApi.update(chatDocId, addParticipant, {"caller":true}, ReceiveUpdate);
//     }
//     catch(err){
//       log("[-] Adding caller; " + err.message);
//     }
//   }
//   else {
//     initConnection(false, true, false) ;

//     try {
//       log("[+] Adding the callee.");

//       documentApi.update(myDocId, addParticipant, {"name": "callee" , "value" : {"signals":[{"signal_type": "callee_arrived" , "timestamp": Date.now()}]} }
//        , function() { documentApi.get(myDocId, participantAdded); }
//        , function(e) { alert("[-] Adding callee-update; " + JSON.stringify(e)); }
//       );
//     }
//     catch(err) {
//       log("[-] Adding the callee; " + err.message);
//     }
//     //documentApi.update(chatDocId, addParticipant, {"caller":false}, ReceiveUpdate);
//   }
// });


// document.getElementById("joinAVButton").addEventListener('click',function(){
//   var caller = false;

//   log("[*] Check for other party.");

//   if(Object.keys(chatDoc.participants).length  == 0){
//     initConnection(true, false, true);

//     try{
//       log("[+] Adding the caller.");
//       documentApi.update(myDocId, addParticipant, {"name": "caller" , "value" : {"signals":[]} }
//        , function() { documentApi.get(myDocId, participantAdded); }
//        , function(e) { alert("[-] Adding caller-update; " + JSON.stringify(e)); }
//        );
//       //documentApi.update(chatDocId, addParticipant, {"caller":true}, ReceiveUpdate);
//     }
//     catch(err){
//       log("[-] Adding caller; " + err.message);
//     }
//   }
//   else {
//     initConnection(false, false, true) ;

//     log("[+] Adding the callee.");

//     documentApi.update(myDocId, addParticipant, {"name": "callee" , "value" : {"signals":[{"signal_type": "callee_arrived" , "timestamp": Date.now()}]} }
//      , function() { documentApi.get(myDocId, participantAdded); }
//      , function(e) { alert("[-] Adding callee-update; " + JSON.stringify(e)); }
//      );
//     //documentApi.update(chatDocId, addParticipant, {"caller":false}, ReceiveUpdate);
//   }
// });


// Omlet.ready(function() {
//   log("[+] Omlet is Ready.");

//   if (hasDocument()) {
//     log("[+] Initializing Document.");
//     initDocumentAPI();
//   }
//   else {
//     log("[-] Doc is not found.");
//     initDocumentAPI();
//     // No Doc --> Use traditional Style
//   }
// });
