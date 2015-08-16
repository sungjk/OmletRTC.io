'use strict';

function log(message){
  var logArea = get("console");
  logArea.value += message + '\n';
  logArea.scrollTop = logArea.scrollHeight;
}

var documentApi;
var myDocId;
var chatDoc;
var peerConnection;
var dataChannel;
var sdpConstraints = {};

var localVideo = getQuery("#localVideo");
var remoteVideo = getQuery("#remoteVideo");

var isStarted = false;
var isCandidate = false;
var flag = true;

// streams
var localStream;
var remoteStream;

// video side
var localVideoSource = true;

// media constraints
var constraints = {
  audio: false,
  video: localVideoSource
};

// PeerConnection ICE protocol configuration (either Firefox or Chrome)
var peerConnectionConfig = webrtcDetectedBrowser === 'Chrome' ?
    { 'iceServers': [{ 'url': 'stun:23.21.150.121' }] } :
    { 'iceServers': [{ 'url': 'stun:stun.l.google.com:19302' }] };

var peerConnectionConstraints = {
    'optional': [{ 'DtlsSrtpKeyAgreement': true }],
    'mandatory': { googIPv6: true }
};

window.onerror = function(message, url, line)  {
    log(message);
    return true;
};


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

function createOffer() {
  log('[+] createOffer.');

  peerConnection.createOffer(function (sessionDescription) {
    peerConnection.setLocalDescription(sessionDescription, function () {
      var param_sdp = {
        sender : Omlet.getIdentity().name,
        sessionDescription : sessionDescription
      };
      documentApi.update(myDocId, addMessage, param_sdp, function () {
          documentApi.get(myDocId, function () {});
        }, function (error) {
        log("[-] setLocalSessionDescription-update: " + error);
      });
      peerConnection.onicecandidate = handleIceCandidate;
      peerConnection.oniceconnectionstatechange = handleIceCandidateChange;
    }, function (error) {
      log('[-] setLocalSessionDescription: ' + error);
    });
  }, function (error) {
    log('[-] createOffer: ' + error);
  }, sdpConstraints);
}

// Create Answer
function createAnswer() {
  log('[+] createAnswer.');
  peerConnection.createAnswer(function (sessionDescription) {
    peerConnection.setLocalDescription(sessionDescription, function () {
      var param_sdp = {
        sender : Omlet.getIdentity().name,
        sessionDescription : sessionDescription
      };
      documentApi.update(myDocId, addMessage, param_sdp, function () {
          documentApi.get(myDocId, function () {});
        }, function (error) {
        log("[-] setLocalSessionDescription-update: " + error);
      });
      // Sends ice candidates to the other peer
      log('[+] onicecandidate');
      peerConnection.onicecandidate = handleIceCandidate;
      peerConnection.oniceconnectionstatechange = handleIceCandidateChange;
    }, function (error) {
      log('[-] setLocalSessionDescription: ' + error);
    });
  }, function (error) {
    log('[-] createAnswer: ' + error);
  }, sdpConstraints);
}

function handleIceCandidate(event) {
  if (event.candidate) {
    log('[+] handleIceCandidate event.');

    var param_iceCandidate = {
      sender : Omlet.getIdentity().name,
      label : event.candidate.sdpMLineIndex,
      id : event.candidate.sdpMid,
      candidate : event.candidate.candidate
    };
    documentApi.update(myDocId, addMessage, param_iceCandidate , function () {
      documentApi.get(myDocId, function () {});
    },  function (error) {
      log('[-] handleIceCandidate-update: ' + error);
    });
  } else {
    log('[-] handleIceCandidate event.');
  }
}

function handleIceCandidateChange(ice_state) {
  log('[+] iceGatheringState: ' + peerConnection.iceGatheringState + ', iceConnectionState: ' + peerConnection.iceConnectionState);
}

function handleIceGatheringChange(event) {
  log('[+] handleIceGatheringChange.');

  if (event.currentTarget && event.currentTarget.iceGatheringState === 'complete') {
    
  }
}

function handleUserMedia(stream) {
  localStream = stream;
  log('[+] attachMediaStream(localVideo, stream)');
  attachMediaStream(localVideo, stream);

  // both 
  createPeerConnection(false, true);

  // only callee
  if(chatDoc.creator.name !== Omlet.getIdentity().name) {
    var param_userJoin = {
      userJoin : true,
      sender : Omlet.getIdentity().name
    };
    documentApi.update(myDocId, addMessage, param_userJoin, function () {
      documentApi.get(myDocId, function () {});
    }, function (error) {
      log("[-] update-userJoin: " + error);
    });
  }
}

function handleRemoteStreamAdded(event) {
  log('[+] Remote stream added.');
  attachMediaStream(remoteVideo, event.stream);
  log('[+] Remote stream attached.');
  remoteStream = event.stream;
}

function handleRemoteStreamRemoved(event) {
  log('[+] Remote stream removed. Event: ', event);
}

function createPeerConnection(data, video) {
  try {
    log("[+] createPeerConnection()");
    peerConnection = new RTCPeerConnection(peerConnectionConfig, peerConnectionConstraints);
    log("[+] Attach local Stream.");
    peerConnection.addStream(localStream);
  } catch (e) {
    log('[-] Failed to create RTCPeerConnection: ' + e.message);
    return;
  }

  if(video) {
    peerConnection.onaddstream = handleRemoteStreamAdded;
    peerConnection.onremovestream = handleRemoteStreamRemoved;
  }
}

function sessionTerminated() {
  log('[+] Session terminated.');

  peerConnection.dispose();
  localStream.dispose();
  remoteStream.dispose();

  if (peerConnection) peerConnection.close();
  peerConnection = null;
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

function initDocumentAPI() {
  if (!Omlet.isInstalled())  {
    log("[-] Omlet is not installed." );
  }
  documentApi = Omlet.document;
  _loadDocument();
}


function DocumentCreated(doc) {
  var callbackurl = "http://203.246.112.144:3310/video-calling-interface.html#/docId/" + myDocId;

  if(Omlet.isInstalled()) {
    var rdl = Omlet.createRDL({
      appName: "OmletRTC",
      noun: "poll",
      displayTitle: "OmletRTC",
      displayThumbnailUrl: "https://webrtcbench-dbh3099.rhcloud.com/images/quikpoll.png",
      displayText: 'Client: ' + ip() + '\nServer:' + location.host,
      json: doc,
      callback: callbackurl
    });

    Omlet.exit(rdl);
  }
}

function ReceiveDoc(doc) {
  chatDoc = doc;
}
function _loadDocument() {
  if (hasDocument()) {
    myDocId = getDocumentReference();
    log("[+] Get documentReference id: " + myDocId );

    documentApi.watch(myDocId, function (chatDocId) {
      documentApi.get(chatDocId, handleMessage , function (error) {
        log('[-] updateCallback-get: ' + error);
      });
    }, watchSuccessCallback, function (error) {
      log('[-] _loadDocument-watch: ' + error);
    });

    documentApi.get(myDocId, function (doc) {
      chatDoc = doc;
      if(window.location.href.indexOf("video-calling-interface.html")!=-1){
        joinAV();
      }
    }, function (error) {
      log('[-] _loadDocument-get: ' + error);
    });
  } else {
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
    'sender' : null,
    'numOfUser' : numOfUser,
    'userJoin' : false,
    'sessionDescription' : null,
    'candidate' : null,
    'id' : null,
    'label' : null,
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
    } else {
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

  if (chatDoc.userJoin && chatDoc.creator.name === Omlet.getIdentity().name) {
    log('[+] sender: ' + chatDoc.sender + ', message: userJoin');

    var param_userJoin = {
      userJoin : false,
      sender : Omlet.getIdentity().name
    };
    documentApi.update(myDocId, addMessage, param_userJoin, function () {
      documentApi.get(myDocId, function () {});
      createOffer();
    }, function (error) {
      log("[-] upate-userJoin: " + error);
    })
  }

  if (chatDoc.sessionDescription && flag) {
    if (chatDoc.sessionDescription.type === 'answer' && chatDoc.creator.name === Omlet.getIdentity().name) {
      peerConnection.setRemoteDescription(new RTCSessionDescription(chatDoc.sessionDescription), function () {
        log('[+] setRemoteSDP_Answer.');
      }, function (error) {
        log('[-] setRemoteSDP_Answer: ' + error);
      });

      flag = false;
    } else if (chatDoc.sessionDescription.type === 'offer' && chatDoc.creator.name !== Omlet.getIdentity().name) {
      peerConnection.setRemoteDescription(new RTCSessionDescription(chatDoc.sessionDescription), function () {
        log('[+] setRemoteSDP_Offer.');
        if (peerConnection.remoteDescription.type === 'offer') {
          createAnswer();
        }
      }, function (error) {
        log('[-] setRemoteSDP_Offer: ' + error);
      });

      flag = false;
    }
  }

  if (chatDoc.candidate && chatDoc.sender !== Omlet.getIdentity().name) {
    log('[+] sender: ' + chatDoc.sender + ', candidate: ' + chatDoc.candidate);

    var candidate = new RTCIceCandidate({
      candidate : chatDoc.candidate,
      // sdpMid : chatDoc.id,
      sdpMLineIndex : chatDoc.label
    }, onAddIceCandidateSuccess, function (error) {
      log('[-] handleMessage-RTCIceCandidate: ' + error);
    });

    log('[+] addIceCandidate.');
    peerConnection.addIceCandidate(candidate);
  }

  /*
  if (chatDoc.message === 'clear' && isStarted) {
    log('[+] chatDoc.message === clear');

    sessionTerminated();
  }
  */
}

function updateCallback(chatDocId) {
  documentApi.get(chatDocId, handleMessage , function (error) {
    log('[-] updateCallback-get: ' + error);
  });
}

function watchSuccessCallback() {
  log("[+] Success to documentApi.watch.");
}

function errorCallback(error) {
  log("[-] " + error);
}


/*
 * Function for parameter handling documentApi.update:
 * function(reference, func, parameters, success, error)
 */
function addMessage(old, parameters) {
  if (parameters.userJoin) {
    old.sender = parameters.sender;
    old.userJoin = true;
  } else {
    old.sender = parameters.sender;
    old.userJoin = false;
  }

  if (parameters.sessionDescription) {
    old.sender = parameters.sender;
    old.sessionDescription = parameters.sessionDescription;
  }
  if (parameters.candidate) {
    old.sender = parameters.sender;
    old.candidate = parameters.candidate;
    old.id = parameters.id;
    old.label = parameters.label;
  }
  /*
  if (parameters.message === 'clear') {
    old.message = parameters.message;
    old.chatId = '';
    old.creator = '';
    old.numOfUser = 0;
    old.sessionDescription = '';
    old.candidate = '';
    old.sdpMLineIndex = '';
  }
  */
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

function get(id){
  return document.getElementById(id);
}

function getQuery(id) {
  return document.querySelector(id);
}

function joinAV() {
  log("creator name: "+chatDoc.creator.name);
  // Caller
  if (chatDoc.creator.name === Omlet.getIdentity().name) {
    log("[+] " + Omlet.getIdentity().name + " creates the room.");
    navigator.getUserMedia(constraints, handleUserMedia, function (error) {
      log("[-] joinAV-getUserMedia-caller: " + error);
    });
  } else {  // Callee
    log("[+] " + Omlet.getIdentity().name + " joins the room.");
    navigator.getUserMedia(constraints, handleUserMedia, function (error) {
      log("[-] joinAV-getUserMedia-callee: " + error);
    });
  }
}

Omlet.ready(function() {
  log("[+] Omlet is Ready.");
  log("UA", navigator.userAgent.toString());

  if (hasDocument()) {
    log("[+] Initializing DocumentAPI.");
    initDocumentAPI();
  } else {
    log("[-] Doc is not found.");
    initDocumentAPI();
    // No Doc --> Use traditional Style
  }
});