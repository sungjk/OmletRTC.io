var isFront = true;
var documentApi;
var myDocId;
var chatDoc;

var PeerConnection = window.PeerConnection || window.webkitPeerConnection00 || window.webkitRTCPeerConnection || window.mozRTCPeerConnection || window.RTCPeerConnection;





function log(message){
  var logArea = document.getElementById("console");
  logArea.value += message + '\n';
  logArea.scrollTop = logArea.scrollHeight;
}

function createStream(isFront) {
  if(isFront) {
    audioId = audioIds[1];
    videoId = videoIds[3];
    isFront = false;
  }
  else {
    audioId = audioIds[2];
    videoId = videoIds[4];
    isFront = true;
  }

  var opt = {
    "video": {
      "mandatory": {}, 
      "optional": videoId
    },
    "audio": {
      "optional": audioId
    }
  };

  if(PeerConnection) {
    rtc.createStream(videoId, function(stream) {
      document.getElementById('localVideo').src = URL.createObjectURL(stream);
      document.getElementById('localVideo').play();
    });
  } else {
    alert('Your browser is not supported or you have to turn on flags. In chrome you go to chrome://flags and turn on Enable PeerConnection remember to restart chrome');
  }
}

function init() {
  createStream(isFront);

  var room = window.location.hash.slice(1);

  rtc.connect("ws:" + window.location.href.substring(window.location.protocol.length).split('#')[0], room);

  rtc.on('add remote stream', function(stream, socketId) {
    log("ADDING REMOTE STREAM...");

    rtc.attachStream(stream, 'remoteVideo');
  });
  rtc.on('disconnect stream', function(data) {
    log('remove ' + data);
  });

  create();
}

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
  var callbackurl = "http://203.246.112.144:3310/video-calling-interface.html#/docId/" + myDocId;

  if(Omlet.isInstalled()) {
    var rdl = Omlet.createRDL({
      appName: "OmletRTC",
      noun: "poll",
      displayTitle: "OmletRTC",
      displayThumbnailUrl: "http://203.246.112.144:3310/images/quikpoll.png",
      displayText: 'Real Time Video Chat!\nClick here to start!\nMade by UCI_UROP',
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

function initConnectionInfo() {
  // Connection info
  var info = {
    'chatId' : 100, /* random */
    'creator' : null, /* Omlet.getIdentity() */
    'sender' : null,
    'message' : null,
    'numOfUser' : 0, /* initially it is 0 */
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

function addMessage(old, parameters) {
  return old;
}

var createButton = get("createButton");

createButton.onclick = create;

function get(id){
  return document.getElementById(id);
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