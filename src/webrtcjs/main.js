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

/* unuse function
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
*/

/* unuse functions
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
*/

/* do not need this because there are only two peers
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
    videos.splice(videos.indexOf(video), 1); // find the index and remove it from the array
    video.parentNode.removeChild(video); // remove from its parent tag
  }
}
*/

/* duplicated with "function create()"
function createDocument() {
  // do not need to let you click, just run the code 

  //var button = document.getElementById("createDocument");
  //button.addEventListener('click', function(event) {
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
  //});
}
*/

function init() {
  if(PeerConnection) {
    rtc.createStream({
      "video": {"mandatory": {}, "optional": []},
      "audio": true
    }, function(stream) {
      document.getElementById('localVideo').src = URL.createObjectURL(stream);
      document.getElementById('localVideo').play();
    });
  } else {
    alert('Your browser is not supported or you have to turn on flags. In chrome you go to chrome://flags and turn on Enable PeerConnection remember to restart chrome');
  }


  var room = window.location.hash.slice(1);

  rtc.connect("ws:" + window.location.href.substring(window.location.protocol.length).split('#')[0], room);

  rtc.on('add remote stream', function(stream, socketId) {
    log("ADDING REMOTE STREAM...");
    /* do not need to clone video due to it is only two peers
    var clone = cloneVideo('you', socketId);
    document.getElementById(clone.id).setAttribute("class", "");
    rtc.attachStream(stream, clone.id);
    */

    rtc.attachStream(stream, 'remoteVideo');

    //subdivideVideos(); // don't need to calculate its width and height again
  });
  rtc.on('disconnect stream', function(data) {
    log('remove ' + data);
    //removeVideo(data);
  });
  // createDocument(); // duplicated with "function create()"
  create();
}

/* useless
window.onresize = function(event) {
  subdivideVideos();
};
*/

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
  //callbackurl = "http://203.246.112.144:3310/proto.index.html#/docId/" + myDocId; // duplicated

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

function initConnectionInfo() {
  //var chatId = 100;
  //var identity = Omlet.getIdentity();
  //var numOfUser = 0;

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

  if (chatDoc.candidate && chatDoc.sender !== Omlet.getIdentity().name) {

  }

  if (chatDoc.message === 'clear' && isStarted) {

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

function DocumentCleared(doc) {
  log("[+] Document cleared");
}

function addUser(doc) {
}

var createButton = get("createButton");
//var clearButton = get("clearButton");
//var getDocButton = get("getDocButton");
//var joinDataButton = get("joinDataButton");

createButton.onclick = create;
//clearButton.onclick = clearDocument;
//getDocButton.onclick = getDocument;
//joinDataButton.onclick = joinData;

//window.onbeforeunload = clearDocument;


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

/*
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
*/
/*
function getDocument() {
  if(!Omlet.isInstalled()) {
    log("[-] Omlet is not installed.");
  }
  else {
    documentApi.get(myDocId, ReceiveDoc, errorCallback);
    log("[+] Getting Document. DocId: " + myDocId);
  }
}
/*/
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