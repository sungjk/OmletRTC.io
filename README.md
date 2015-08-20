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


### License
Copyright (C) 2015 UCI-UROP-FELLOWS [Seongjung Kim](https://github.com/SungjungKim), [Seulgi Choi](https://github.com/cs09g), [Donguk Lee](https://github.com/ldu1225)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
