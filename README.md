## OmletRTC

## Overview
WebRTCBench is a WebRTC benchmark developed at [Parallel Architectures and Systems Lab](http://www.ics.uci.edu/~sysarch/) at the University of California Irvine supported by a generous grant from Intel Corporation. It aims to provide a quantitative comparison of WebRTC implementations across browsers and devices.

WebRTC accomplishes three main tasks: Acquiring audio and video; Communicating Audio and Video; Communicating Arbitrary Data through JavaScript APIs. This benchmark captures most of WebRTC functionalities including initialization and call establishment performance between two peers in a WebRTC triangle [1] and performance of data channels and media engine during call .

### What Is Included ?
This release is composed of two components:
1. a web server based on socket.io [2]
+  a HTML5 WebRTC application

#####Webserver:
Benchmark comes with a Webserver which when run, allows clients to download the WebRTC application and perform the signaling. Furthermore, it is used to integrate a database.


#####WebRTCBench application:
An HTML5 application that can acquire streams, open peer connections, and both streams and data sharing. It can  perform testing and performance measuring of important functionalists of WebRTC implementation including call establishment and media engine.


### WebRTCBench 2
This version of WebRTCBench adds performance measuring of media engine pipeline and data channels(only Chromium). Support for different video codecs VP8, VP9(Chromium), H264 (Firefox) and media constraints are also provided.

### WebRTCBench 1
This version of WebRTCBench provides WebRTC call performance measurement including capturing media devices, creating WebRTC objects, signaling and hole punchings. It has an automated mechanism to collect experiment information from peers' browsers within text format and also in rational database. Collecting information is currently limited to connection between only two peers. Also, web server can provide a secure connection.
