# broflake

# :compass: Table of contents
* [What is Broflake?](#question-what-is-broflake)
* [System components](#floppy_disk-system-components)
* [Quickstart for devs](#arrow_forward-quickstart-for-devs)

### :question: What is Broflake?
Broflake is a system for distributed peer-to-peer proxying. The Broflake system includes a 
browser-based client which enables volunteers to instantly provide proxying services just by 
accessing a web page. However, Broflake is not just a web application! The Broflake system 
introduces software libraries and protocol concepts designed to enable role-agnostic multi-hop p2p 
proxying across the entire Lantern network.

Put another way, Broflake is a common language which enables Lantern users to describe, exchange,
and share the resource of internet access across network boundaries and runtime environments.


### :floppy_disk: System components
![system](https://user-images.githubusercontent.com/21117002/176231832-1c558546-8933-4e25-b8df-f60edb4ed6d5.png)

Broflake is a suite of several software applications. We have deployed some tricks to make 
Broflake's codebase as small as possible, and so the mapping between applications and modules isn't
perfectly straightforward.

|Module |Description                                                                                               |
|-------|-------------------------------------------------------------------------------|
|client |client software for native binary (desktop, mobile) **and** browser-based users|
|common |shared libraries                                                               |
|egress |egress server                                                                  |
|freddie|discovery server + signaling & matchmaking logic                               |


### :arrow_forward: Quickstart for devs
Just a heads up: these instructions were designed for the prototype as of November 5, 2022. If 
something's not working and it's been a while since 11/5, you might want to check with nelson.

1. Clone this repo.

2. You need access to a STUN server that's not on your LAN and which you are sure will not rate
limit you. (While developing Broflake, your computer will generate more STUN requests more quickly 
than most public STUN servers seem comfortable with). nelson has written a zero-dependency 
[STUN server](https://github.com/noahlevenson/ministun) that you can get running with 10 lines of JavaScript.  

3. You need to configure Broflake to use your STUN server. Currently, this requires you to modify
Broflake's source code. We're going to fix that. For now, though, open `client/go/client.go`, grep 
`stunSrv`, and swap in your server's address, making sure to include the port and preserve the
leading "stun:".

4. Configure **Mozilla Firefox** to use a local HTTP proxy. In settings, search "proxy". Select 
*Manual proxy configuration*. Enter address `127.0.0.1`, port `1080`, and check the box labeled 
*Also use this proxy for HTTPS*.

5. Build the native binary desktop client: `cd client && ./build.sh desktop`

6. Build the native binary widget: `cd client && ./build.sh widget`

7. Build the browser widget: `cd client && ./build_web.sh`

8. Serve the browser widget: `cd client/dist/public && python3 -m http.server 9000`

9. Start Freddie: `cd freddie && go run freddie.go`

10. Start the egress server: `cd egress && go run egress.go`

11. Start the desktop client: `cd dist/bin && ./desktop`

12. Start **Google Chrome**. Navigate to `localhost:9000`. The web widget loads, accesses Freddie, 
finds your desktop client, signals, and establishes several WebRTC connections. Pop open the console
and you'll see all the things going on.

13. Start **Mozilla Firefox**. Use the browser as you normally would, visiting all your favorite
websites. Your traffic is proxied in a chain: browser -> desktop client -> web widget -> egress server. 
