var documentApi;
var myDocId;
var chatDoc;

var videos = [];
var PeerConnection = window.PeerConnection || window.webkitPeerConnection00 || window.webkitRTCPeerConnection || window.mozRTCPeerConnection || window.RTCPeerConnection;

function log(message){
  var logArea = document.getElementById("console");
  logArea.value += message + '\n';
  logArea.scrollTop = logArea.scrollHeight;
}

function getNumPerRow() {
  var len = videos.length;
  var biggest;

  // Ensure length is even for better division.
  if(len % 2 === 1) {
    len++;
  }

  biggest = Math.ceil(Math.sqrt(len));
  while(len % biggest !== 0) {
    biggest++;
  }
  return biggest;
}

function subdivideVideos() {
  var perRow = getNumPerRow();
  var numInRow = 0;
  for(var i = 0, len = videos.length; i < len; i++) {
    var video = videos[i];
    setWH(video, i);
    numInRow = (numInRow + 1) % perRow;
  }
}

function setWH(video, i) {
  var perRow = getNumPerRow();
  var perColumn = Math.ceil(videos.length / perRow);
  var width = Math.floor((window.innerWidth) / perRow);
  var height = Math.floor((window.innerHeight - 190) / perColumn);
  video.width = width;
  video.height = height;
  video.style.position = "absolute";
  video.style.left = (i % perRow) * width + "px";
  video.style.top = Math.floor(i / perRow) * height + "px";
}

function cloneVideo(domId, socketId) {
  var video = document.getElementById(domId);
  var clone = video.cloneNode(false);
  clone.id = "remote" + socketId;
  document.getElementById('videos').appendChild(clone);
  videos.push(clone);
  return clone;
}

function removeVideo(socketId) {
  var video = document.getElementById('remote' + socketId);
  if(video) {
    videos.splice(videos.indexOf(video), 1);
    video.parentNode.removeChild(video);
  }
}

function createDocument() {
  var button = document.getElementById("createDocument");
  button.addEventListener('click', function(event) {
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
  });
}


function init() {
  if(PeerConnection) {
    rtc.createStream({
      "video": {"mandatory": {}, "optional": []},
      "audio": true
    }, function(stream) {
      document.getElementById('you').src = URL.createObjectURL(stream);
      document.getElementById('you').play();
    });
  } else {
    alert('Your browser is not supported or you have to turn on flags. In chrome you go to chrome://flags and turn on Enable PeerConnection remember to restart chrome');
  }

  var room = window.location.hash.slice(1);

  rtc.connect("ws:" + window.location.href.substring(window.location.protocol.length).split('#')[0], room);

  rtc.on('add remote stream', function(stream, socketId) {
    log("ADDING REMOTE STREAM...");
    var clone = cloneVideo('you', socketId);
    document.getElementById(clone.id).setAttribute("class", "");
    rtc.attachStream(stream, clone.id);
    subdivideVideos();
  });
  rtc.on('disconnect stream', function(data) {
    log('remove ' + data);
    removeVideo(data);
  });
  createDocument();
}

window.onresize = function(event) {
  subdivideVideos();
};



/*
* Omlet Framework
*/

function initDocumentAPI() {
  if (!Omlet.isInstalled())  {
    log("[-] Omlet is not installed." );
  }

  documentApi = Omlet.document;
  _loadDocument();
}

function DocumentCreated(doc) {
  var callbackurl = "http://203.246.112.144:3310/proto.index.html#/docId/" + myDocId;

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

function ReceiveDoc(doc) {
  chatDoc = doc;
}

function _loadDocument() {
  if (hasDocument()) {
    myDocId = getDocumentReference();
    log("[+] Get documentReference id: " + myDocId );

    documentApi.watch(myDocId, updateCallback, watchSuccessCallback, function (error) {
      log('[-] _loadDocument-watch: ' + error);
    });

    // The successful result of get is the document itself.
    documentApi.get(myDocId, function (doc) {
      chatDoc = doc;
    }, function (error) {
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
  if (end != -1) docId = docId.substring(0, end);

  return docId;
}

function Initialize(old, parameters) {
  return parameters;
}

function hasDocument() {
  var docIdParam = window.location.hash.indexOf("/docId/");
  return (docIdParam != -1);
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
    'message' : null,
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

function addMessage(old, parameters) {

  if ('add remote stream') {

  }

  return old;
}

function handleMessage(doc) {
  chatDoc = doc;

  if (chatDoc.numOfUser > 2)
    return ;

  if (chatDoc.userJoin && chatDoc.creator.name === Omlet.getIdentity().name) {
    log('[+] sender: ' + chatDoc.sender + ', message: userJoin');
  }

  if (chatDoc.sessionDescription && flag) {
    log('[+] sender: ' + chatDoc.sender + ', message: ' + chatDoc.sessionDescription.type);
  }

  if (chatDoc.candidate && chatDoc.sender !== Omlet.getIdentity().name) {

  }

  if (chatDoc.message === 'clear' && isStarted) {

  }

  // script.js - on

  if ('add remote stream') {
    log("ADDING REMOTE STREAM...");
    var clone = cloneVideo('you', socketId);
    document.getElementById(clone.id).setAttribute("class", "");
    rtc.attachStream(stream, clone.id);
    subdivideVideos();
  }

  if ('disconnect stream') {
    log('remove ' + data);
    removeVideo(data);
  }

  // proto.webrtc.io.js - on
  if ('join_room') {
          soc.send(JSON.stringify({
        "eventName": "new_peer_connected",
        "data":{
          "socketId": socket.id
        }
      }), function(error) {
        if (error) {
          console.log(error);
        }
      });
  }

  if ('send_ice_candidate') {
    if (soc) {
      soc.send(JSON.stringify({
        "eventName": "receive_ice_candidate",
        "data": {
          "label": data.label,
          "candidate": data.candidate,
          "socketId": socket.id
        }
      }), function(error) {
        if (error) {
          console.log(error);
        }
      });
  }

  if ('send_offer') {
    soc.send(JSON.stringify({
      "eventName": "receive_offer",
      "data": {
        "sdp": data.sdp,
        "socketId": socket.id
    }
    }), function(error) {
      if (error) {
        console.log(error);
      }
    });
  }

  if ('send_answer') {
    soc.send(JSON.stringify({
      "eventName": "receive_answer",
      "data" : {
        "sdp": data.sdp,
        "socketId": socket.id
      }
    }), function(error) {
      if (error) {
        console.log(error);
      }
    });
  }

  // webrtc.io.js - on
  if ('ready') {
    createPeerConnections();
    addStreams();
    sendOffers();
  }
  
  if ('receive_ice_candidate') {
    var candidate = new nativeRTCIceCandidate(data);
    rtc.peerConnections[data.socketId].addIceCandidate(candidate);
    rtc.fire('receive ice candidate', candidate);
  }

  if ('new_peer_connected') {
    rtc.connections.push(data.socketId);

    var pc = rtc.createPeerConnection(data.socketId);
    for (var i = 0; i < rtc.streams.length; i++) {
      var stream = rtc.streams[i];
      pc.addStream(stream);
    }
  }

  if ('remove_peer_connected') {
    delete rtc.peerConnections[data.socketId]; 
  }

  if ('receive_offer') {
    rtc.receiveOffer(data.socketId, data.sdp);
  }

  if ('receive_answer') {
    rtc.receiveAnswer(data.socketId, data.sdp);
  }

  if ('') {

  }
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

function DocumentCleared(doc) {
  log("[+] Document cleared");
}

function addUser(doc) {
}

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
