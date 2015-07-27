//////////////////////////////////////////////////////////////////
//
//                Variables          
//
/////////////////////////////////////////////////////////////////

var RTCPeerConnection = null;
var getUserMedia = null;
var connectStreamToSrc = null;
var onMessage = null ;
var webrtcDetectedBrowser = null;
var attachMediaStream = null;

var width = screen.availWidth / 2;
var height = screen.availHeight / 2;

var attachMediaStream = null;


// default contraints object
var constraints = { 
    video: true, 
    audio: false 
};

// Constraints object for mobile size
var dynamicConstraints = {
    audio: false,
    video: {
        mandatory: {
            maxHeight: screen.availWidth / 2,
            maxWidth: screen.availWidth / 2
        }
    }
};

// Original constraints object for web app video
var srcConstraints = {
  audio: false,
  video: {
    mandatory: {
      //minFrameRate: 30,
      maxHeight: 240,
      maxWidth: 320
    }
  }
};

// Constraints object for low resolution video
var qvgaConstraints = { 
  audio: false,
  video: {
    mandatory: {
      maxWidth: 320,
      maxHeight: 240
    } 
  }
};

// Constraints object for standard resolution video
var vgaConstraints = { 
  audio: false,
  video: {
    mandatory: {
      maxWidth: 640,
      maxHeight: 480
    } 
  }
};

// Constraints object for high resolution video
var hdConstraints = { 
  audio: false,
  video: {
    mandatory: {
      maxWidth: 1280,
      maxHeight: 960
    } 
  }
};


if (navigator.getUserMedia) {
    // WebRTC standard
    RTCPeerConnection = RTCPeerConnection;
    getUserMedia = navigator.getUserMedia.bind(navigator);
} else if (navigator.mozGetUserMedia) {
    // early Firefox
    webrtcDetectedBrowser = "Firefox" ;
    RTCPeerConnection = mozRTCPeerConnection;
    RTCSessionDescription = mozRTCSessionDescription;
    RTCIceCandidate = mozRTCIceCandidate;
    getUserMedia = navigator.mozGetUserMedia.bind(navigator);
    onMessage = function (event) {
        var t_msg = time() ;
        var blob = event.data; // Firefox allows sending blobs directly
        if( typeof blob === "object" )
        {
            var reader = new window.FileReader();
            reader.readAsDataURL(blob);
            reader.onload = function (event) {
                var fileDataURL = event.target.result; // it is Data URL...can be saved to disk
                saveToDisk(fileDataURL, 'fake fileName');
            };
        }
        else
        {
            appendDIV(event.data);
            log("Text message received at " + t_msg.toString() ) ;
        }
    };
}
else if (navigator.webkitGetUserMedia) {
    webrtcDetectedBrowser = "Chrome" ;
    RTCPeerConnection = webkitRTCPeerConnection;
    getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
} else {
    alert("WebRTC is not supported.");
}

var videoSourceId = null ;
var audioSourceId = null ;

function gotSources(sourceInfos) {
    for (var i = 0; i != sourceInfos.length; ++i) {
        var sourceInfo = sourceInfos[i];
        if (sourceInfo.kind === 'audio') {
            //log('Audio ' + sourceInfo.label ) ;
            if( audioSourceId == null )
                audioSourceId = sourceInfo.id ;
        } else if (sourceInfo.kind === 'video') {
            //log('Video source found: ' + sourceInfo.label ) ;
            //if( sourceInfo.label.indexOf("facing back") != -1 )
            //{
                //videoSourceId  = sourceInfo.id ;
                //log("Found " + videoSourceId ) ;
            //}
        } else {
            log('Some other kind of source: ', sourceInfo);
        }
    }
}
if (webrtcDetectedBrowser == "Chrome") {
    MediaStreamTrack.getSources(gotSources);
}
var server = {
    "iceServers": [
    //{url:"stun:stun.services.mozilla.com"}//,
    //{url:"stun:203.246.112.144:3310"},
    {url:"stun:stun.l.google.com:19302"}]
};


// Look after different browser vendors' ways of calling the getUserMedia() API method:
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;



// attachMediaStream = function(element, stream) {
//   if (window.URL) element.src = window.URL.createObjectURL(stream);
//   else            element.src = stream;
  
//   element.autoplay = true;
//   element.play();  
// };







// /*
//  *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
//  *
//  *  Use of this source code is governed by a BSD-style license
//  *  that can be found in the LICENSE file in the root of the source
//  *  tree.
//  */

// /* More information about these options at jshint.com/docs/options */
// /* jshint browser: true, camelcase: true, curly: true, devel: true,
//    eqeqeq: true, forin: false, globalstrict: true, node: true,
//    quotmark: single, undef: true, unused: strict */
// /* global mozRTCIceCandidate, mozRTCPeerConnection, Promise,
// mozRTCSessionDescription, webkitRTCPeerConnection, MediaStreamTrack */
// /* exported trace,requestUserMedia */

// 'use strict';

// var getUserMedia = null;
// var attachMediaStream = null;
// var reattachMediaStream = null;
// var webrtcDetectedBrowser = null;
// var webrtcDetectedVersion = null;
// var webrtcMinimumVersion = null;

// function trace(text) {
//   // This function is used for logging.
//   if (text[text.length - 1] === '\n') {
//     text = text.substring(0, text.length - 1);
//   }
//   if (window.performance) {
//     var now = (window.performance.now() / 1000).toFixed(3);
//     log(now + ': ' + text);
//   } else {
//     log(text);
//   }
// }

// if (typeof window === 'undefined' || !window.navigator) {
//   log('This does not appear to be a browser');
//   webrtcDetectedBrowser = 'not a browser';
// } else if (navigator.mozGetUserMedia) {
//   log('This appears to be Firefox');

//   webrtcDetectedBrowser = 'firefox';

//   // the detected firefox version.
//   webrtcDetectedVersion = parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10);

//   // the minimum firefox version still supported by adapter.
//   webrtcMinimumVersion = 31;

//   // The RTCPeerConnection object.
//   window.RTCPeerConnection = function(pcConfig, pcConstraints) {
//     if (webrtcDetectedVersion < 38) {
//       // .urls is not supported in FF < 38.
//       // create RTCIceServers with a single url.
//       if (pcConfig && pcConfig.iceServers) {
//         var newIceServers = [];
//         for (var i = 0; i < pcConfig.iceServers.length; i++) {
//           var server = pcConfig.iceServers[i];
//           if (server.hasOwnProperty('urls')) {
//             for (var j = 0; j < server.urls.length; j++) {
//               var newServer = {
//                 url: server.urls[j]
//               };
//               if (server.urls[j].indexOf('turn') === 0) {
//                 newServer.username = server.username;
//                 newServer.credential = server.credential;
//               }
//               newIceServers.push(newServer);
//             }
//           } else {
//             newIceServers.push(pcConfig.iceServers[i]);
//           }
//         }
//         pcConfig.iceServers = newIceServers;
//       }
//     }
//     return new mozRTCPeerConnection(pcConfig, pcConstraints);
//   };

//   // The RTCSessionDescription object.
//   window.RTCSessionDescription = mozRTCSessionDescription;

//   // The RTCIceCandidate object.
//   window.RTCIceCandidate = mozRTCIceCandidate;

//   // getUserMedia constraints shim.
//   getUserMedia = (webrtcDetectedVersion < 38) ?
//       function(c, onSuccess, onError) {
//     var constraintsToFF37 = function(c) {
//       if (typeof c !== 'object' || c.require) {
//         return c;
//       }
//       var require = [];
//       Object.keys(c).forEach(function(key) {
//         var r = c[key] = (typeof c[key] === 'object') ?
//             c[key] : {ideal: c[key]};
//         if (r.exact !== undefined) {
//           r.min = r.max = r.exact;
//           delete r.exact;
//         }
//         if (r.min !== undefined || r.max !== undefined) {
//           require.push(key);
//         }
//         if (r.ideal !== undefined) {
//           c.advanced = c.advanced || [];
//           var oc = {};
//           oc[key] = {min: r.ideal, max: r.ideal};
//           c.advanced.push(oc);
//           delete r.ideal;
//           if (!Object.keys(r).length) {
//             delete c[key];
//           }
//         }
//       });
//       if (require.length) {
//         c.require = require;
//       }
//       return c;
//     };
//     log('spec: ' + JSON.stringify(c));
//     c.audio = constraintsToFF37(c.audio);
//     c.video = constraintsToFF37(c.video);
//     log('ff37: ' + JSON.stringify(c));
//     return navigator.mozGetUserMedia(c, onSuccess, onError);
//   } : navigator.mozGetUserMedia.bind(navigator);

//   navigator.getUserMedia = getUserMedia;

//   // Shim for mediaDevices on older versions.
//   if (!navigator.mediaDevices) {
//     navigator.mediaDevices = {getUserMedia: requestUserMedia,
//       addEventListener: function() { },
//       removeEventListener: function() { }
//     };
//   }
//   navigator.mediaDevices.enumerateDevices =
//       navigator.mediaDevices.enumerateDevices || function() {
//     return new Promise(function(resolve) {
//       var infos = [
//         {kind: 'audioinput', deviceId: 'default', label:'', groupId:''},
//         {kind: 'videoinput', deviceId: 'default', label:'', groupId:''}
//       ];
//       resolve(infos);
//     });
//   };

//   if (webrtcDetectedVersion < 41) {
//     // Work around http://bugzil.la/1169665
//     var orgEnumerateDevices =
//         navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
//     navigator.mediaDevices.enumerateDevices = function() {
//       return orgEnumerateDevices().catch(function(e) {
//         if (e.name === 'NotFoundError') {
//           return [];
//         }
//         throw e;
//       });
//     };
//   }
//   // Attach a media stream to an element.
//   attachMediaStream = function(element, stream) {
//     log('Attaching media stream');
//     element.mozSrcObject = stream;
//   };

//   reattachMediaStream = function(to, from) {
//     log('Reattaching media stream');
//     to.mozSrcObject = from.mozSrcObject;
//   };

// } else if (navigator.webkitGetUserMedia) {
//   log('This appears to be Chrome');

//   webrtcDetectedBrowser = 'chrome';

//   // the detected chrome version.
//   webrtcDetectedVersion =
//     parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2], 10);

//   // the minimum chrome version still supported by adapter.
//   webrtcMinimumVersion = 38;

//   // The RTCPeerConnection object.
//   window.RTCPeerConnection = function(pcConfig, pcConstraints) {
//     var pc = new webkitRTCPeerConnection(pcConfig, pcConstraints);
//     var origGetStats = pc.getStats.bind(pc);
//     pc.getStats = function(selector, successCallback, errorCallback) { // jshint ignore: line
//       // If selector is a function then we are in the old style stats so just
//       // pass back the original getStats format to avoid breaking old users.
//       if (typeof selector === 'function') {
//         return origGetStats(selector, successCallback);
//       }

//       var fixChromeStats = function(response) {
//         var standardReport = {};
//         var reports = response.result();
//         reports.forEach(function(report) {
//           var standardStats = {
//             id: report.id,
//             timestamp: report.timestamp,
//             type: report.type
//           };
//           report.names().forEach(function(name) {
//             standardStats[name] = report.stat(name);
//           });
//           standardReport[standardStats.id] = standardStats;
//         });

//         return standardReport;
//       };
//       var successCallbackWrapper = function(response) {
//         successCallback(fixChromeStats(response));
//       };
//       return origGetStats(successCallbackWrapper, selector);
//     };

//     return pc;
//   };

//   // add promise support
//   ['createOffer', 'createAnswer'].forEach(function(method) {
//     var nativeMethod = webkitRTCPeerConnection.prototype[method];
//     webkitRTCPeerConnection.prototype[method] = function() {
//       var self = this;
//       if (arguments.length < 1 || (arguments.length === 1 &&
//           typeof(arguments[0]) === 'object')) {
//         var opts = arguments.length === 1 ? arguments[0] : undefined;
//         return new Promise(function(resolve, reject) {
//           nativeMethod.apply(self, [resolve, reject, opts]);
//         });
//       } else {
//         return nativeMethod.apply(this, arguments);
//       }
//     };
//   });

//   ['setLocalDescription', 'setRemoteDescription',
//       'addIceCandidate'].forEach(function(method) {
//     var nativeMethod = webkitRTCPeerConnection.prototype[method];
//     webkitRTCPeerConnection.prototype[method] = function() {
//       var args = arguments;
//       var self = this;
//       return new Promise(function(resolve, reject) {
//         nativeMethod.apply(self, [args[0],
//             function() {
//               resolve();
//               if (args.length >= 2) {
//                 args[1].apply(null, []);
//               }
//             },
//             function(err) {
//               reject(err);
//               if (args.length >= 3) {
//                 args[2].apply(null, [err]);
//               }
//             }]
//           );
//       });
//     };
//   });

//   // getUserMedia constraints shim.
//   getUserMedia = function(c, onSuccess, onError) {
//     var constraintsToChrome = function(c) {
//       if (typeof c !== 'object' || c.mandatory || c.optional) {
//         return c;
//       }
//       var cc = {};
//       Object.keys(c).forEach(function(key) {
//         if (key === 'require' || key === 'advanced') {
//           return;
//         }
//         var r = (typeof c[key] === 'object') ? c[key] : {ideal: c[key]};
//         if (r.exact !== undefined && typeof r.exact === 'number') {
//           r.min = r.max = r.exact;
//         }
//         var oldname = function(prefix, name) {
//           if (prefix) {
//             return prefix + name.charAt(0).toUpperCase() + name.slice(1);
//           }
//           return (name === 'deviceId') ? 'sourceId' : name;
//         };
//         if (r.ideal !== undefined) {
//           cc.optional = cc.optional || [];
//           var oc = {};
//           if (typeof r.ideal === 'number') {
//             oc[oldname('min', key)] = r.ideal;
//             cc.optional.push(oc);
//             oc = {};
//             oc[oldname('max', key)] = r.ideal;
//             cc.optional.push(oc);
//           } else {
//             oc[oldname('', key)] = r.ideal;
//             cc.optional.push(oc);
//           }
//         }
//         if (r.exact !== undefined && typeof r.exact !== 'number') {
//           cc.mandatory = cc.mandatory || {};
//           cc.mandatory[oldname('', key)] = r.exact;
//         } else {
//           ['min', 'max'].forEach(function(mix) {
//             if (r[mix] !== undefined) {
//               cc.mandatory = cc.mandatory || {};
//               cc.mandatory[oldname(mix, key)] = r[mix];
//             }
//           });
//         }
//       });
//       if (c.advanced) {
//         cc.optional = (cc.optional || []).concat(c.advanced);
//       }
//       return cc;
//     };
//     log('spec:   ' + JSON.stringify(c)); // whitespace for alignment
//     c.audio = constraintsToChrome(c.audio);
//     c.video = constraintsToChrome(c.video);

//     log('chrome: ' + JSON.stringify(c));
//     return navigator.webkitGetUserMedia(c, onSuccess, onError);
//   };
//   navigator.getUserMedia = getUserMedia;

//   // Attach a media stream to an element.
//   attachMediaStream = function(element, stream) {
//     if (typeof element.srcObject !== 'undefined') {
//       element.srcObject = stream;
//     } else if (typeof element.src !== 'undefined') {
//       element.src = URL.createObjectURL(stream);
//     } else {
//       log('Error attaching stream to element.');
//     }
//   };

//   reattachMediaStream = function(to, from) {
//     to.src = from.src;
//   };

//   if (!navigator.mediaDevices) {
//     navigator.mediaDevices = {getUserMedia: requestUserMedia,
//                               enumerateDevices: function() {
//       return new Promise(function(resolve) {
//         var kinds = {audio: 'audioinput', video: 'videoinput'};
//         return MediaStreamTrack.getSources(function(devices) {
//           resolve(devices.map(function(device) {
//             return {label: device.label,
//                     kind: kinds[device.kind],
//                     deviceId: device.id,
//                     groupId: ''};
//           }));
//         });
//       });
//     }};
//     // in case someone wants to listen for the devicechange event.
//     navigator.mediaDevices.addEventListener = function() { };
//     navigator.mediaDevices.removeEventListener = function() { };
//   }
// } else if (navigator.mediaDevices && navigator.userAgent.match(
//     /Edge\/(\d+).(\d+)$/)) {
//   log('This appears to be Edge');
//   webrtcDetectedBrowser = 'edge';

//   webrtcDetectedVersion =
//     parseInt(navigator.userAgent.match(/Edge\/(\d+).(\d+)$/)[2], 10);

//   // the minimum version still supported by adapter.
//   webrtcMinimumVersion = 12;

//   attachMediaStream = function(element, stream) {
//     element.srcObject = stream;
//   };
//   reattachMediaStream = function(to, from) {
//     to.srcObject = from.srcObject;
//   };
// } else {
//   log('Browser does not appear to be WebRTC-capable');
// }

// // Returns the result of getUserMedia as a Promise.
// function requestUserMedia(constraints) {
//   return new Promise(function(resolve, reject) {
//     getUserMedia(constraints, resolve, reject);
//   });
// }

// if (typeof module !== 'undefined') {
//   var RTCPeerConnection;
//   if (typeof window !== 'undefined') {
//     RTCPeerConnection = window.RTCPeerConnection;
//   }
//   module.exports = {
//     RTCPeerConnection: RTCPeerConnection,
//     getUserMedia: getUserMedia,
//     attachMediaStream: attachMediaStream,
//     reattachMediaStream: reattachMediaStream,
//     webrtcDetectedBrowser: webrtcDetectedBrowser,
//     webrtcDetectedVersion: webrtcDetectedVersion,
//     webrtcMinimumVersion: webrtcMinimumVersion
//     //requestUserMedia: not exposed on purpose.
//     //trace: not exposed on purpose.
//   };
// } else if ((typeof require === 'function') && (typeof define === 'function')) {
//   // Expose objects and functions when RequireJS is doing the loading.
//   define([], function() {
//     return {
//       RTCPeerConnection: window.RTCPeerConnection,
//       getUserMedia: getUserMedia,
//       attachMediaStream: attachMediaStream,
//       reattachMediaStream: reattachMediaStream,
//       webrtcDetectedBrowser: webrtcDetectedBrowser,
//       webrtcDetectedVersion: webrtcDetectedVersion,
//       webrtcMinimumVersion: webrtcMinimumVersion
//       //requestUserMedia: not exposed on purpose.
//       //trace: not exposed on purpose.
//     };
//   });
// }