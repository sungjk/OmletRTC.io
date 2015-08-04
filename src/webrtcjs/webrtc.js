/*
  //log('[+] my feedMembers: ' + JSON.stringify(Omlet.getFeedMembers()));
  //log('[+] my identify: ' + JSON.stringify(Omlet.getIdentity()));
  //log('[+] chat doc identify: ' + JSON.stringify(chatDoc.creator));
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
// var sdpConstraints = {};
var sdpConstraints = {
    mandatory: {
        OfferToReceiveAudio: true,
        OfferToReceiveVideo: true
    }
};

// attach video number
var attachVideoNumber = 0;



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
// var peerConnectionConfig = webrtcDetectedBrowser === 'Chrome' ? 
//     { 'iceServers': [{ 'url': 'stun:23.21.150.121' }] } : 
//     { 'iceServers': [{ 'url': 'stun:stun.l.google.com:19302' }] };

// var peerConnectionConstraints = {
//     'optional': [{ 'DtlsSrtpKeyAgreement': true }],
//     'mandatory': { googIPv6: true }
// };
var servers = {
  iceServers: [ {
    url : 'stun:stun.l.google.com:19302'
  } ]
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
    message : 'sessionDescription',
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


function onMessage(msg){
  log('[+] Received message: ' + msg.data); 
  receiveTextarea.value += msg.data + '\n';
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
    peerConnection = new webkitRTCPeerConnection(servers);
    // peerConnection = new RTCPeerConnection(peerConnectionConfig, peerConnectionConstraints);

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
  log('[+] start()');

  if (!isStarted && typeof localStream != 'undefined' && chatDoc.channelReady) {
    log('[+] isStarted: ' + isStarted + ', localStream: ' + typeof localStream + ', channelReady: ' + chatDoc.channelReady);

    createPeerConnection(data, video);
    if (chatDoc.creator.name === Omlet.getIdentity().name) {
      log('[+] createOffer.');
      peerConnection.createOffer(function (offer) {
          peerConnection.setLocalDescription(offer);
       
          var param_sdp = {
            message : 'offer',
            sessionDescription : offer
          };
          documentApi.update(myDocId, addMessage, param_sdp, function () {
              documentApi.get(myDocId, function () {}); 
            }, function (error) {
            log("[-] setLocalSessionDescription-update: " + error);
          });

      }, function (error) {
        log('[-] createOffer: ' + error);
      }, sdpConstraints);

      // createOffer();
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

  if (chatDoc.message === 'userMedia' && chatDoc.creator.name === Omlet.getIdentity().name) {
    log('[+] chatDoc.message === userMedia'); 

    start(false, true);
  }
  else if (chatDoc.message === 'offer' && chatDoc.creator.name !== Omlet.getIdentity().name) {
    log('[+] chatDoc.message === offer')
    log('[+] isStarted: ' + isStarted);

    if (!isStarted) {
      start(false, true);
    }

    peerConnection.setRemoteDescription(new RTCSessionDescription(chatDoc.sessionDescription), function () {
      log('[+] handleMessage-setRemoteDescription-offer');
      // createAnswer();

      log('[+] createAnswer.');
      peerConnection.createAnswer(function (answer) {
        peerConnection.setLocalDescription(answer);

        var param_sdp = {
          message : 'answer',
          sessionDescription : answer
        };
        documentApi.update(myDocId, addMessage, param_sdp, function () {
            documentApi.get(myDocId, function () {}); 
          }, function (error) {
          log("[-] setLocalSessionDescription-update: " + error);
        });
      }, function (error) {
        log('[-] createAnswer: ' + error);
      }, sdpConstraints);

    }, function (error) {
      log('[-] handleMessage-setRemoteDescription-offer: ' + error);
    });
  } 
  else if (chatDoc.message === 'answer' && chatDoc.creator.name === Omlet.getIdentity().name) { 
    log('[+] chatDoc.message === answer')
    
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
      // sdpMid : chatDoc.sdpMid,
      sdpMLineIndex : chatDoc.sdpMLineIndex
    }, onAddIceCandidateSuccess, function (error) {
      log('[-] handleMessage-RTCIceCandidate: ' + error);
    });
    
    peerConnection.addIceCandidate(candidate);
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

    // Call getUserMedia()
    log('[+] getUserMedia.');
    navigator.getUserMedia(constraints, handleUserMedia, function (error) {
      log("[-] joinAV-getUserMedia-caller: " + error);
    });

    start(false, true);    
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








// // Handle an incoming message on the announcement channel
// var handleAnnounceChannelMessage = function(snapshot) {
//   var message = snapshot.val();
//   if (message.id != id && message.sharedKey == sharedKey) {
//     console.log('Discovered matching announcement from ' + message.id);
//     remote = message.id;
//     initiateWebRTCState();
//     connect();
//   }
// };

// /* == Signal Channel Functions ==
//  * The signal channels are used to delegate the WebRTC connection between 
//  * two peers once they have found each other via the announcement channel.
//  * 
//  * This is done on Firebase as well. Once the two peers communicate the
//  * necessary information to 'find' each other via WebRTC, the signalling
//  * channel is no longer used and the connection becomes peer-to-peer.
//  */

// // Send a message to the remote client via Firebase
// var sendSignalChannelMessage = function(message) {
//   message.sender = id;
//   database.child('messages').child(remote).push(message);
// };

// // Handle a WebRTC offer request from a remote client
// var handleOfferSignal = function(message) {
//   running = true;
//   remote = message.sender;
//   initiateWebRTCState();
//   startSendingCandidates();
//   peerConnection.setRemoteDescription(new RTCSessionDescription(message));
//   peerConnection.createAnswer(function(sessionDescription) {
//     console.log('Sending answer to ' + message.sender);
//     peerConnection.setLocalDescription(sessionDescription);
//     sendSignalChannelMessage(sessionDescription);
//   });
// };

// // Handle a WebRTC answer response to our offer we gave the remote client
// var handleAnswerSignal = function(message) {
//   peerConnection.setRemoteDescription(new RTCSessionDescription(message));
// };

// // Handle an ICE candidate notification from the remote client
// var handleCandidateSignal = function(message) {
//   var candidate = new RTCIceCandidate(message);
//   peerConnection.addIceCandidate(candidate);
// };

// // This is the general handler for a message from our remote client
// // Determine what type of message it is, and call the appropriate handler
// var handleSignalChannelMessage = function(snapshot) {
//   var message = snapshot.val();
//   var sender = message.sender;
//   var type = message.type;
//   console.log('Recieved a \'' + type + '\' signal from ' + sender);
//   if (type == 'offer') handleOfferSignal(message);
//   else if (type == 'answer') handleAnswerSignal(message);
//   else if (type == 'candidate' && running) handleCandidateSignal(message);
// };

// /* == ICE Candidate Functions ==
//  * ICE candidates are what will connect the two peers
//  * Both peers must find a list of suitable candidates and exchange their list
//  * We exchange this list over the signalling channel (Firebase)
//  */

// // Add listener functions to ICE Candidate events
// var startSendingCandidates = function() {
//   peerConnection.oniceconnectionstatechange = handleICEConnectionStateChange;
//   peerConnection.onicecandidate = handleICECandidate;
// };

// // This is how we determine when the WebRTC connection has ended
// // This is most likely because the other peer left the page
// var handleICEConnectionStateChange = function() {
//   if (peerConnection.iceConnectionState == 'disconnected') {
//     console.log('Client disconnected!');
//     $('#status').addClass("disconnected").removeClass("connected").text("Not Connected");
//     sendAnnounceChannelMessage();
//   }
// };

// // Handle ICE Candidate events by sending them to our remote
// // Send the ICE Candidates via the signal channel
// var handleICECandidate = function(event) {
//   var candidate = event.candidate;
//   if (candidate) {
//     candidate.type = 'candidate';
//     console.log('Sending candidate to ' + remote);
//     sendSignalChannelMessage(candidate);
//   } else {
//     console.log('All candidates sent');
//   }
// };

//  == Data Channel Functions ==
//  * The WebRTC connection is established by the time these functions run
//  * The hard part is over, and these are the functions we really want to use
//  * 
//  * The functions below relate to sending and receiving WebRTC messages over
//  * the peer-to-peer data channels 
 

// // This is our receiving data channel event
// // We receive this channel when our peer opens a sending channel
// // We will bind to trigger a handler when an incoming message happens
// var handleDataChannel = function(event) {
//   event.channel.onmessage = handleDataChannelMessage;
// };

// // This is called on an incoming message from our peer
// // You probably want to overwrite this to do something more useful!
// var handleDataChannelMessage = function(event) {
//   console.log('Recieved Message: ' + event.data);
//   //$('#messages').append(event.data + "<br />");
// };

// // This is called when the WebRTC sending data channel is offically 'open'
// var handleDataChannelOpen = function() {
//   console.log('Data channel created!');
//   var msg = new Message('message', 'Hello! I am ' + id)
//   //dataChannel.send('Hello! I am ' + id);
//   dataChannel.send(JSON.stringify(msg));
//   $('#status').addClass("connected").removeClass("disconnected").text("Connected");
//   $('#startGameBox').hide();
//   $('#gameContent').show();
// };

// // Called when the data channel has closed
// var handleDataChannelClosed = function() {
//   console.log('The data channel has been closed!');
//   $('#status').css('color','red').text("Not Connected");
// };

// // Function to offer to start a WebRTC connection with a peer
// var connect = function() {
//   running = true;
//   startSendingCandidates();
//   peerConnection.createOffer(function(sessionDescription) {
//     console.log('Sending offer to ' + remote);
//     peerConnection.setLocalDescription(sessionDescription);
//     sendSignalChannelMessage(sessionDescription);
//   });
// };

// // Function to initiate the WebRTC peerconnection and dataChannel
// var initiateWebRTCState = function() {
//   peerConnection = new webkitRTCPeerConnection(servers);
//   peerConnection.ondatachannel = handleDataChannel;
//   dataChannel = peerConnection.createDataChannel('myDataChannel');
//   dataChannel.onmessage = handleDataChannelMessage;
//   dataChannel.onopen = handleDataChannelOpen;
// };

// // Message object to send
// var Message = function(type, data) {
//   this.type = type;
//   this.data = data;
// }

// var id;              // Our unique ID
// var sharedKey;       // Unique identifier for two clients to find each other
// var remote;          // ID of the remote peer -- set once they send an offer
// var peerConnection;  // This is our WebRTC connection
// var dataChannel;     // This is our outgoing data channel within WebRTC
// var running = false; // Keep track of our connection state

// // Use Google's public servers for STUN
// // STUN is a component of the actual WebRTC connection
// var servers = {
//   iceServers: [ {
//     url : 'stun:stun.l.google.com:19302'
//   } ]
// };

// // Generate this browser a unique ID
// // On Firebase peers use this unique ID to address messages to each other
// // after they have found each other in the announcement channel
// id = Math.random().toString().replace('.', '');

// // Unique identifier for two clients to use
// // They MUST share this to find each other
// // Each peer waits in the announcement channel to find its matching identifier
// // When it finds its matching identifier, it initiates a WebRTC offer with
// // that client. This unique identifier can be pretty much anything in practice.
// //sharedKey = prompt("Please enter a shared identifier");

// // Configure, connect, and set up Firebase
// // You probably want to replace the text below with your own Firebase URL
// var firebaseUrl = 'https://amber-torch-4774.firebaseio.com/';
// var database = new Firebase(firebaseUrl);
// var announceChannel = database.child('announce');
// var signalChannel = database.child('messages').child(id);
// signalChannel.on('child_added', handleSignalChannelMessage);
// announceChannel.on('child_added', handleAnnounceChannelMessage);

// // Send a message to the announcement channel
// // If our partner is already waiting, they will send us a WebRTC offer
// // over our Firebase signalling channel and we can begin delegating WebRTC
// //sendAnnounceChannelMessage();