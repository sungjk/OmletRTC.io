// Application Code
function get(id){
  return document.getElementById(id);
}

function getQuery(id) {
  return document.querySelector(id);
}

var localVideo = getQuery("#localVideo");
var remoteVideo = getQuery("#remoteVideo");


/*
* Omlet document information - User defined
*/
omletrtc.doc_info = {
  callback: "http://203.246.112.144:3310/index.html",
  appName: "OmletRTC",
  noun: "poll",
  displayTitle: "OmletRTC",
  displayThumbnailUrl: "http://203.246.112.144:3310/images/quikpoll.png",
  displayText: 'Real Time Video Chat!\nClick here to start!',
};


function joinAV() {
  log("[+] joinAV");

  var documentApi = omletrtc.documentApi;

  documentApi.update(omletrtc.myDocId, omletrtc.addMessage, {}, function () {
    documentApi.get(omletrtc.myDocId, function () {});
  }, function (error) {
    log("[-] update-numOfUser: " + error);
  });

  // Caller
  if (omletrtc.chatDoc.numOfUser == 0){
  //if (chatDoc.creator.name === Omlet.getIdentity().name) {
    log("[+] " + Omlet.getIdentity().name + " creates the room.");
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
      log("creator22: "+ doc.creator.name);
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

Omlet.ready(function() {
  log("[+] Omlet is Ready.");
  log("UA", navigator.userAgent.toString());

  if (omletrtc.hasDocument()) {
    log("[+] Initializing DocumentAPI.");
    omletrtc.initDocumentAPI();
  } else {
    log("[-] Doc is not found.");
    omletrtc.initDocumentAPI();
  }
});
