# OmletRTC.io

## Overview
WebRTC is a open source project aiming to enable the web with Real Time Communication (RTC) capabilities.<br>
We're going to accomplish three main tasks: Acquiring audio and video; Communicating Audio and Video; Communicating Arbitrary Data through JavaScript APIs.

## What is WebRTC?
![alt img](https://github.com/UCIUROP2015/UCI_UROP_WEBRTC/blob/master/images/logo-webrtc.png)<br>
  WebRTC stands for Web Real-Time Communication and it was drafted by W3C. It is an open source project to allow real-time communication through web browser with simple JavaScript API. It can be used for real-time video and voice chatting or sharing data with only have a web browser. <br>
  This is a significant evolution in the web application world, since it enables, for the first time, web developers to build real-time multimedia applications with no need for proprietary plug-ins. <br>
  
## What Is Included ?
This release is composed of three components:
1. Web server based on express for URL redirection
2. HTML5 WebRTC application
3. Omelt API for web apps

## Device Support
* Android 5.0+ (for using Omlet API)

## Browser Support
* Chrome 25.0+ (28.0+ for best performance)
* Firefox 22.0+
* Chrome 29.0+ on Android


## Example code

### Client

```html
<video id="localVideo" autoplay="autoplay"></video>
<video id="remoteVideo" autoplay="autoplay"></video>

<script src="/omletrtc.io.js"></script>
<script>

</script>
```

### Server

```javascript
var omletrtc = require('omletrtc.io');
//then a bunch of callbacks are available
```


### Reference
* [Developers - Omlet](http://www.omlet.me/developers/)<br>
* [WebRTC 1.0: Real-time Communication Between Browsers](http://www.w3.org/TR/2015/WD-webrtc-20150210/)
