'use strict';

function log(message){
  var logArea = get("console");
  logArea.value += message + '\n';
  logArea.scrollTop = logArea.scrollHeight;
}

(function() {
  var omletrtc;
  if ('undefined' === typeof module) {
    omletrtc = this.omletrtc = {};
  } else {
    omletrtc = module.exports = {};
  }

  // Holds the STUN/ICE server to use for PeerConnections.
  omletrtc.SERVER = function() {
    if (navigator.mozGetUserMedia) {
      return {
        "iceServers": [{
          "url": "stun:23.21.150.121"
        }]
      };
    }
    return {
      "iceServers": [{
        "url": "stun:stun.l.google.com:19302"
      }]
    };
  };


  /*
  * Omlet document information - User defined
  */
  omletrtc.doc_info = {
    callback: "http://203.246.112.144:3310/video-calling-interface.html",
    applName: "OmletRTC",
    noun: "poll",
    displayTitle: "OmletRTC",
    displayThumbnailUrl: "http://203.246.112.144:3310/images/quikpoll.png",
    displayText: 'Real Time Video Chat! Click here to start!',
  };
  

  // Reference to the Omlet documents.
  omletrtc.documentApi;
  omletrtc.myDocId;
  omletrtc.chatDoc;

  // Reference to the lone PeerConnection instance.
  omletrtc.peerConnection;

  // PeerConnection configuration
  omletrtc.pc_constraints = {
    'optional': [{ 'DtlsSrtpKeyAgreement': true }],
    'mandatory': { googIPv6: true }
  };

  // Operate only once offer and answer
  omletrtc.flag = true;

  // Stream-related variables.
  omletrtc.localStream;
  omletrtc.remoteStream;
  omletrtc.localVideoSource = true;

  // media constraints
  omletrtc.constraints = {
    audio: false,
    video: omletrtc.localVideoSource
  };

  omletrtc.createPeerConnection = function (data, video) {
    try {
      log("[+] createPeerConnection()");
      omletrtc.peerConnection = new RTCPeerConnection(omletrtc.SERVER(), omletrtc.pc_constraints);
      log("[+] Attach local Stream.");
      omletrtc.peerConnection.addStream(localStream);
    } catch (e) {
      log('[-] Failed to create RTCPeerConnection: ' + e.message);
      return;
    }

    if(video) {
      omletrtc.peerConnection.onaddstream = function (event) {
        log('[+] Remote stream added.');
        attachMediaStream(remoteVideo, event.stream);
        log('[+] Remote stream attached.');
        omletrtc.remoteStream = event.stream;
      };
    }
  };

  omletrtc.createOffer = function () {
    var pc = omletrtc.peerConnection;
    log('[+] createOffer.');

    omletrtc.peerConnection.createOffer(function (sessionDescription) {
      omletrtc.peerConnection.setLocalDescription(sessionDescription, function () {
        var param_sdp = {
          sender : Omlet.getIdentity().name,
          sessionDescription : sessionDescription
        };
        omletrtc.documentApi.update(omletrtc.myDocId, addMessage, param_sdp, function () {
            omletrtc.documentApi.get(omletrtc.myDocId, function () {});
          }, function (error) {
          log("[-] setLocalSessionDescription-update: " + error);
        });
        omletrtc.peerConnection.onicecandidate = handleIceCandidate;
        omletrtc.peerConnection.oniceconnectionstatechange = handleIceCandidateChange;
      }, function (error) {
        log('[-] setLocalSessionDescription: ' + error);
      });
    }, function (error) {
      log('[-] createOffer: ' + error);
    }, sdpConstraints);
  };

  omletrtc.createAnswer = function () {
    var pc = omletrtc.peerConnection;

    log('[+] createAnswer.');
    omletrtc.peerConnection.createAnswer(function (sessionDescription) {
      omletrtc.peerConnection.setLocalDescription(sessionDescription, function () {
        var param_sdp = {
          sender : Omlet.getIdentity().name,
          sessionDescription : sessionDescription
        };
        omletrtc.documentApi.update(omletrtc.myDocId, addMessage, param_sdp, function () {
            omletrtc.documentApi.get(omletrtc.myDocId, function () {});
          }, function (error) {
          log("[-] setLocalSessionDescription-update: " + error);
        });
        // Sends ice candidates to the other peer
        log('[+] onicecandidate');
        omletrtc.peerConnection.onicecandidate = handleIceCandidate;
        omletrtc.peerConnection.oniceconnectionstatechange = handleIceCandidateChange;
      }, function (error) {
        log('[-] setLocalSessionDescription: ' + error);
      });
    }, function (error) {
      log('[-] createAnswer: ' + error);
    }, sdpConstraints);
  };

  omletrtc.handleUserMedia = function (stream) {
    log("creator!!!: "+ omletrtc.chatDoc.creator.name);

    omletrtc.localStream = stream;
    log('[+] attachMediaStream(localVideo, stream)');
    attachMediaStream(localVideo, stream);

    // both 
    omletrtc.createPeerConnection(false, true);

    // only callee
    if(omletrtc.chatDoc.creator.name !== Omlet.getIdentity().name) {
      var param_userJoin = {
        userJoin : true,
        sender : Omlet.getIdentity().name
      };
      omletrtc.documentApi.update(omletrtc.myDocId, addMessage, param_userJoin, function () {
        omletrtc.documentApi.get(omletrtc.myDocId, function () {});
      }, function (error) {
        log("[-] update-userJoin: " + error);
      });
    }
  };

  omletrtc.handleIceCandidate = function (event) {
    if (event.candidate) {
      log('[+] handleIceCandidate event.');

      var param_iceCandidate = {
        sender : Omlet.getIdentity().name,
        label : event.candidate.sdpMLineIndex,
        id : event.candidate.sdpMid,
        candidate : event.candidate.candidate
      };
      omletrtc.documentApi.update(omletrtc.myDocId, addMessage, param_iceCandidate , function () {
        omletrtc.documentApi.get(omletrtc.myDocId, function () {});
      },  function (error) {
        log('[-] handleIceCandidate-update: ' + error);
      });
    } else {
      log('[-] handleIceCandidate event.');
    }
  };

  omletrtc.handleIceCandidateChange = function (event) {
    var pc = omletrtc.peerConnection;
    log('[+] iceGatheringState: ' + pc.iceGatheringState + ', iceConnectionState: ' + pc.iceConnectionState);
  }

  omletrtc.sessionTerminated = function () {
    log('[+] Session terminated.');

    omletrtc.peerConnection.dispose();
    omletrtc.localStream.dispose();
    omletrtc.remoteStream.dispose();

    if (omletrtc.peerConnection) omletrtc.peerConnection.close();
    omletrtc.peerConnection = null;
  }



  //////////////////////////////////////////////////////////////////
  //
  //                Omlet Framework code
  //
  /////////////////////////////////////////////////////////////////

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

  /*
  *  Ignore everything below.
  */
  omletrtc.initDocumentAPI = function () {
    if (!Omlet.isInstalled())  {
      log("[-] Omlet is not installed." );
    }
    omletrtc.documentApi = Omlet.document;
    omletrtc._loadDocument();
  };
  
  omletrtc.DocumentCreated = function (doc) {
    var info = omletrtc.doc_info;
    var callbackurl = info.callback + "#/docId/" + omletrtc.myDocId;

    if(Omlet.isInstalled()) {
      var rdl = Omlet.createRDL({
        appName: info.applName,
        noun: info.noun,
        displayTitle: info.displayTitle,
        displayThumbnailUrl: info.displayThumbnailUrl,
        displayText: info.displayText,
        json: doc,
        callback: callbackurl
      });
      Omlet.exit(rdl);
    }
  };

  omletrtc._loadDocument = function () {
    if (omletrtc.hasDocument()) {
      omletrtc.myDocId = omletrtc.getDocumentReference();
      log("[+] Get documentReference id: " + omletrtc.myDocId );

      omletrtc.documentApi.watch(omletrtc.myDocId, function (chatDocId) {
        omletrtc.documentApi.get(chatDocId, omletrtc.handleMessage , function (error) {
          log('[-] updateCallback-get: ' + error);
        });
      }, function () {
        log("[+] Success to documentApi.watch.");
      }, function (error) {
        log('[-] _loadDocument-watch: ' + error);
      });

      omletrtc.documentApi.get(omletrtc.myDocId, function (doc) {
        omletrtc.ReceiveDoc(doc);
        if(window.location.href.indexOf("video-calling-interface.html")!=-1){
          joinAV();
        }
      }, function (error) {
        log('[-] _loadDocument-get: ' + error);
      });
    } else {
      log("[-] Document is not found." );
    }
  };

  omletrtc.updateCallback = function (chatDocId) {
    omletrtc.documentApi.get(chatDocId, omletrtc.handleMessage , function (error) {
      log('[-] updateCallback-get: ' + error);
  });
  };

  omletrtc.getDocumentReference = function () {
    var docIdParam = window.location.hash.indexOf("/docId/");
    if (docIdParam == -1) return false;

    var docId = window.location.hash.substring(docIdParam + 7);
    var end = docId.indexOf("/");

    if (end != -1)
      docId = docId.substring(0, end);

    return docId;
  };

  omletrtc.hasDocument = function () {
    var docIdParam = window.location.hash.indexOf("/docId/");
    return (docIdParam != -1);
  };
  
  omletrtc.ReceiveDoc = function (doc) {
    omletrtc.chatDoc = doc;
  };

  omletrtc.DocumentCleared = function (doc) {
    log("[+] Document cleared");
    log("[+] User in this conversation: " + doc.numOfUser);
  }

  omletrtc.Initialize = function (old, parameters) {
    return parameters;
  }
  
  omletrtc.errorCallback = function (error) {
    log("[-] " + error);
  }

}).call(this);



