// Client

// Fallbacks for vendor-specific variables until the spec is finalized.

var PeerConnection = (window.PeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection);
var URL = (window.URL || window.webkitURL || window.msURL || window.oURL);
var getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
var nativeRTCIceCandidate = (window.mozRTCIceCandidate || window.RTCIceCandidate);
var nativeRTCSessionDescription = (window.mozRTCSessionDescription || window.RTCSessionDescription); // order is very important: "RTCSessionDescription" defined in Nighly but useless

var sdpConstraints = {
  'mandatory': {
    'OfferToReceiveAudio': true,
    'OfferToReceiveVideo': true
  }
};

if (navigator.webkitGetUserMedia) {
  if (!webkitMediaStream.prototype.getVideoTracks) {
    webkitMediaStream.prototype.getVideoTracks = function() {
      return this.videoTracks;
    };
    webkitMediaStream.prototype.getAudioTracks = function() {
      return this.audioTracks;
    };
  }

  // New syntax of getXXXStreams method in M26.
  if (!webkitRTCPeerConnection.prototype.getLocalStreams) {
    webkitRTCPeerConnection.prototype.getLocalStreams = function() {
      return this.localStreams;
    };
    webkitRTCPeerConnection.prototype.getRemoteStreams = function() {
      return this.remoteStreams;
    };
  }
}

(function() {

  var omletrtc;
  if ('undefined' === typeof module) {
    omletrtc = this.omletrtc = {};
  } else {
    omletrtc = module.exports = {};
  }


  // Holds a connection to the server.
  omletrtc._socket = null;

  // Holds identity for the client
  omletrtc._me = null;

  // Holds callbacks for certain events.
  omletrtc._events = {};

  omletrtc.on = function(eventName, callback) {
    omletrtc._events[eventName] = omletrtc._events[eventName] || [];
    omletrtc._events[eventName].push(callback);
  };

  omletrtc.fire = function(eventName, _) {
    var events = omletrtc._events[eventName];
    var args = Array.prototype.slice.call(arguments, 1);

    if (!events) {
      return;
    }

    for (var i = 0, len = events.length; i < len; i++) {
      events[i].apply(null, args);
    }
  };

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


  // Reference to the lone PeerConnection instance.
  omletrtc.peerConnections = {};

  // Array of known peer socket ids
  omletrtc.connections = [];
  // Stream-related variables.
  omletrtc.streams = [];
  omletrtc.numStreams = 0;
  omletrtc.initializedStreams = 0;

  // PeerConnection configuration
  omletrtc.pc_constraints = {
    "optional": [{
      "DtlsSrtpKeyAgreement": true
    }]
  };


  /**
   * Connects to the websocket server.
   */
  omletrtc.connect = function(server, room) {
    room = room || ""; // by default, join a room called the blank string
    omletrtc._socket = new WebSocket(server);

    omletrtc._socket.onopen = function() {

      omletrtc._socket.send(JSON.stringify({
        "eventName": "join_room",
        "data": {
          "room": room
        }
      }));

      omletrtc._socket.onmessage = function(msg) {
        var json = JSON.parse(msg.data);
        omletrtc.fire(json.eventName, json.data);
      };

      omletrtc._socket.onerror = function(err) {
        console.error('onerror');
        console.error(err);
      };

      omletrtc._socket.onclose = function(data) {
        omletrtc.fire('disconnect stream', omletrtc._socket.id);
        delete omletrtc.peerConnections[omletrtc._socket.id];
      };

      omletrtc.on('get_peers', function(data) {
        omletrtc.connections = data.connections;
        omletrtc._me = data.you;
        // fire connections event and pass peers
        omletrtc.fire('connections', omletrtc.connections);
      });

      omletrtc.on('receive_ice_candidate', function(data) {
        var candidate = new nativeRTCIceCandidate(data);
        omletrtc.peerConnections[data.socketId].addIceCandidate(candidate);
        omletrtc.fire('receive ice candidate', candidate);
      });

      omletrtc.on('new_peer_connected', function(data) {
        omletrtc.connections.push(data.socketId);

        var pc = omletrtc.createPeerConnection(data.socketId);
        for (var i = 0; i < omletrtc.streams.length; i++) {
          var stream = omletrtc.streams[i];
          pc.addStream(stream);
        }
      });

      omletrtc.on('remove_peer_connected', function(data) {
        omletrtc.fire('disconnect stream', data.socketId);
        delete omletrtc.peerConnections[data.socketId];
      });

      omletrtc.on('receive_offer', function(data) {
        omletrtc.receiveOffer(data.socketId, data.sdp);
        omletrtc.fire('receive offer', data);
      });

      omletrtc.on('receive_answer', function(data) {
        omletrtc.receiveAnswer(data.socketId, data.sdp);
        omletrtc.fire('receive answer', data);
      });

      omletrtc.fire('connect');
    };
  };


  omletrtc.sendOffers = function() {
    for (var i = 0, len = omletrtc.connections.length; i < len; i++) {
      var socketId = omletrtc.connections[i];
      omletrtc.sendOffer(socketId);
    }
  };

  omletrtc.onClose = function(data) {
    omletrtc.on('close_stream', function() {
      omletrtc.fire('close_stream', data);
    });
  };

  omletrtc.createPeerConnections = function() {
    for (var i = 0; i < omletrtc.connections.length; i++) {
      omletrtc.createPeerConnection(omletrtc.connections[i]);
    }
  };

  omletrtc.createPeerConnection = function(id) {

    var config = omletrtc.pc_constraints;

    var pc = omletrtc.peerConnections[id] = new PeerConnection(omletrtc.SERVER(), config);
    pc.onicecandidate = function(event) {
      if (event.candidate) {
        omletrtc._socket.send(JSON.stringify({
          "eventName": "send_ice_candidate",
          "data": {
            "label": event.candidate.sdpMLineIndex,
            "candidate": event.candidate.candidate,
            "socketId": id
          }
        }));
      }
      omletrtc.fire('ice candidate', event.candidate);
    };

    pc.onopen = function() {
      // TODO: Finalize this API
      omletrtc.fire('peer connection opened');
    };

    pc.onaddstream = function(event) {
      // TODO: Finalize this API
      omletrtc.fire('add remote stream', event.stream, id);
    };

    return pc;
  };

  omletrtc.sendOffer = function(socketId) {
    var pc = omletrtc.peerConnections[socketId];

    var constraints = {
      "optional": [],
      "mandatory": {
        "MozDontOfferDataChannel": true
      }
    };
    // temporary measure to remove Moz* constraints in Chrome
    if (navigator.webkitGetUserMedia) {
      for (var prop in constraints.mandatory) {
        if (prop.indexOf("Moz") != -1) {
          delete constraints.mandatory[prop];
        }
      }
    }
    constraints = mergeConstraints(constraints, sdpConstraints);

    pc.createOffer(function(session_description) {
      session_description.sdp = preferOpus(session_description.sdp);
      pc.setLocalDescription(session_description);
      omletrtc._socket.send(JSON.stringify({
        "eventName": "send_offer",
        "data": {
          "socketId": socketId,
          "sdp": session_description
        }
      }));
    }, null, sdpConstraints);
  };

  omletrtc.receiveOffer = function(socketId, sdp) {
    var pc = omletrtc.peerConnections[socketId];
    omletrtc.sendAnswer(socketId, sdp);
  };

  omletrtc.sendAnswer = function(socketId, sdp) {
    var pc = omletrtc.peerConnections[socketId];
    pc.setRemoteDescription(new nativeRTCSessionDescription(sdp));
    pc.createAnswer(function(session_description) {
      pc.setLocalDescription(session_description);
      omletrtc._socket.send(JSON.stringify({
        "eventName": "send_answer",
        "data": {
          "socketId": socketId,
          "sdp": session_description
        }
      }));
      //TODO Unused variable!?
      var offer = pc.remoteDescription;
    }, null, sdpConstraints);
  };


  omletrtc.receiveAnswer = function(socketId, sdp) {
    var pc = omletrtc.peerConnections[socketId];
    pc.setRemoteDescription(new nativeRTCSessionDescription(sdp));
  };


  omletrtc.createStream = function(opt, onSuccess, onFail) {
    var options;
    onSuccess = onSuccess || function() {};
    onFail = onFail || function() {};

    options = {
      video: !! opt.video,
      audio: !! opt.audio
    };

    if (getUserMedia) {
      omletrtc.numStreams++;
      getUserMedia.call(navigator, options, function(stream) {

        omletrtc.streams.push(stream);
        omletrtc.initializedStreams++;
        onSuccess(stream);
        if (omletrtc.initializedStreams === omletrtc.numStreams) {
          omletrtc.fire('ready');
        }
      }, function() {
        alert("Could not connect stream.");
        onFail();
      });
    } else {
      alert('webRTC is not yet supported in this browser.');
    }
  };

  omletrtc.addStreams = function() {
    for (var i = 0; i < omletrtc.streams.length; i++) {
      var stream = omletrtc.streams[i];
      for (var connection in omletrtc.peerConnections) {
        omletrtc.peerConnections[connection].addStream(stream);
      }
    }
  };

  omletrtc.attachStream = function(stream, domId) {
    var element = document.getElementById(domId);
    if (navigator.mozGetUserMedia) {
      log("Attaching media stream");
      element.mozSrcObject = stream;
      element.play();
    } else {
      element.src = webkitURL.createObjectURL(stream);
    }
  };

  omletrtc.on('ready', function() {
    omletrtc.createPeerConnections();
    omletrtc.addStreams();
    omletrtc.sendOffers();
  });

}).call(this);

function preferOpus(sdp) {
  var sdpLines = sdp.split('\r\n');
  var mLineIndex = null;
  // Search for m line.
  for (var i = 0; i < sdpLines.length; i++) {
    if (sdpLines[i].search('m=audio') !== -1) {
      mLineIndex = i;
      break;
    }
  }
  if (mLineIndex === null) return sdp;

  // If Opus is available, set it as the default in m line.
  for (var j = 0; j < sdpLines.length; j++) {
    if (sdpLines[j].search('opus/48000') !== -1) {
      var opusPayload = extractSdp(sdpLines[j], /:(\d+) opus\/48000/i);
      if (opusPayload) sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], opusPayload);
      break;
    }
  }

  // Remove CN in m line and sdp.
  sdpLines = removeCN(sdpLines, mLineIndex);

  sdp = sdpLines.join('\r\n');
  return sdp;
}

function extractSdp(sdpLine, pattern) {
  var result = sdpLine.match(pattern);
  return (result && result.length == 2) ? result[1] : null;
}

function setDefaultCodec(mLine, payload) {
  var elements = mLine.split(' ');
  var newLine = [];
  var index = 0;
  for (var i = 0; i < elements.length; i++) {
    if (index === 3) // Format of media starts from the fourth.
    newLine[index++] = payload; // Put target payload to the first.
    if (elements[i] !== payload) newLine[index++] = elements[i];
  }
  return newLine.join(' ');
}

function removeCN(sdpLines, mLineIndex) {
  var mLineElements = sdpLines[mLineIndex].split(' ');
  // Scan from end for the convenience of removing an item.
  for (var i = sdpLines.length - 1; i >= 0; i--) {
    var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
    if (payload) {
      var cnPos = mLineElements.indexOf(payload);
      if (cnPos !== -1) {
        // Remove CN payload from m line.
        mLineElements.splice(cnPos, 1);
      }
      // Remove CN line in sdp
      sdpLines.splice(i, 1);
    }
  }

  sdpLines[mLineIndex] = mLineElements.join(' ');
  return sdpLines;
}

function mergeConstraints(cons1, cons2) {
  var merged = cons1;
  for (var name in cons2.mandatory) {
    merged.mandatory[name] = cons2.mandatory[name];
  }
  merged.optional.concat(cons2.optional);
  return merged;
}

function log(message){
  var logArea = document.getElementById("console");
  logArea.value += message + '\n';
  logArea.scrollTop = logArea.scrollHeight;
}