//////////////////////////////////////////////////////////////////
//
//                Omlet User Definded code
//
/////////////////////////////////////////////////////////////////

var config = require('../js/config');
var callbackUrl = config.ws.url + "/index.html";
var thumbnailUrl = config.ws.url + "/images/quikpoll.png";

omletrtc.doc_info = {
  callback: callbackUrl,
  appName: "OmletRTC",
  noun: "poll",
  displayTitle: "OmletRTC",
  displayThumbnailUrl: thumbnailUrl,
  displayText: 'Real Time Video Chat!\nClick here to start!',
};

omletrtc.initConnection = function () {
  var chatId = 100;
  var identity = null;
  var numOfUser = 0;

  // Connection info
  var info = {
    'chatId' : chatId,
    'creator' : null,
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
};

/*
 * Function for parameter handling documentApi.update:
 * function(reference, func, parameters, success, error)
 */
omletrtc.addMessage = function (old, parameters) {
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
  if (old.numOfUser == 0){
    old.numOfUser = old.numOfUser+1;
  }
  if (parameters.creator){
    old.creator = parameters.creator;
  }
  old.timestamp = Date.now();

  return old;
};

omletrtc.handleMessage = function (doc) {
  omletrtc.chatDoc = doc;
  var chatDoc = omletrtc.chatDoc;

  if (chatDoc.numOfUser > 2)
    return ;

  if (chatDoc.userJoin && chatDoc.creator.name === Omlet.getIdentity().name) {
    log('[+] sender: ' + chatDoc.sender + ', message: userJoin');

    var param_userJoin = {
      userJoin : false,
      sender : Omlet.getIdentity().name
    };
    omletrtc.documentApi.update(omletrtc.myDocId, omletrtc.addMessage, param_userJoin, function () {
      omletrtc.documentApi.get(omletrtc.myDocId, function () {});
      omletrtc.createOffer();
    }, function (error) {
      log("[-] upate-userJoin: " + error);
    });
  }

  if (chatDoc.sessionDescription && omletrtc.flag) {
    if (chatDoc.sessionDescription.type === 'answer' && chatDoc.creator.name === Omlet.getIdentity().name) {
      omletrtc.peerConnection.setRemoteDescription(new RTCSessionDescription(chatDoc.sessionDescription), function () {
        log('[+] setRemoteSDP_Answer.');
      }, function (error) {
        log('[-] setRemoteSDP_Answer: ' + error);
      });

      omletrtc.flag = false;
    } else if (chatDoc.sessionDescription.type === 'offer' && chatDoc.creator.name !== Omlet.getIdentity().name) {
      omletrtc.peerConnection.setRemoteDescription(new RTCSessionDescription(chatDoc.sessionDescription), function () {
        log('[+] setRemoteSDP_Offer.');
        if (omletrtc.peerConnection.remoteDescription.type === 'offer') {
          omletrtc.createAnswer();
        }
      }, function (error) {
        log('[-] setRemoteSDP_Offer: ' + error);
      });

      omletrtc.flag = false;
    }
  }

  if (chatDoc.candidate && chatDoc.sender !== Omlet.getIdentity().name) {
    log('[+] sender: ' + chatDoc.sender + ', candidate: ' + chatDoc.candidate);

    var candidate = new RTCIceCandidate({
      candidate : chatDoc.candidate,
      sdpMLineIndex : chatDoc.label
    }, function () {
      log('[+] Success to AddIceCandidate.');
    }, function (error) {
      log('[-] handleMessage-RTCIceCandidate: ' + error);
    });

    log('[+] addIceCandidate.');
    omletrtc.peerConnection.addIceCandidate(candidate);
  }
};


Omlet.ready(function() {
  log("[+] Omlet is Ready.");
  // log("UA", navigator.userAgent.toString());

  if (omletrtc.hasDocument()) {
    log("[+] Initializing DocumentAPI.");
    omletrtc.initDocumentAPI();
  } else {
    log("[-] Doc is not found.");
    omletrtc.initDocumentAPI();
  }
});



// Application Code

function get(id){
  return document.getElementById(id);
}

function getQuery(id) {
  return document.querySelector(id);
}

function log(message){
  var logArea = get("console");
  logArea.value += message + '\n';
  logArea.scrollTop = logArea.scrollHeight;
}


var localVideo = getQuery("#localVideo");
var remoteVideo = getQuery("#remoteVideo");

function joinAV() {
  var documentApi = omletrtc.documentApi;

  documentApi.update(omletrtc.myDocId, omletrtc.addMessage, {}, function () {
    documentApi.get(omletrtc.myDocId, function () {});
  }, function (error) {
    log("[-] update-numOfUser: " + error);
  });

  // Caller
  if (omletrtc.chatDoc.numOfUser == 0){
    var identity = Omlet.getIdentity();
    var param_creator = {
      creator : identity
    };
    documentApi.update(omletrtc.myDocId, omletrtc.addMessage, param_creator, function () {
      documentApi.get(omletrtc.myDocId, function () {});
    }, function (error) {
      log("[-] update-creator: " + error);
    });
    documentApi.get(omletrtc.myDocId, function (doc) {
      omletrtc.chatDoc = doc;
      navigator.getUserMedia(omletrtc.constraints, omletrtc.handleUserMedia, function (error) {
        log("[-] joinAV-getUserMedia-caller: " + error);
      });
    });
  } else {  // Callee
    log("[+] " + Omlet.getIdentity().name + " joins the room.");
    navigator.getUserMedia(omletrtc.constraints, omletrtc.handleUserMedia, function (error) {
      log("[-] joinAV-getUserMedia-callee: " + error);
    });
  }
}