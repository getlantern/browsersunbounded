# broflake

# :compass: Table of contents
* [What is Broflake?](#question-what-is-broflake)
* [System components](#floppy_disk-system-components)
* [Quickstart for devs](#arrow_forward-quickstart-for-devs)
* [UI quickstart for devs](#nail_careart-ui-quickstart-for-devs)

# :skull: Warning
This is prototype-grade software!

# :question: What is Broflake?
Broflake is a system for distributed peer-to-peer proxying. The Broflake system includes a
browser-based client which enables volunteers to instantly provide proxying services just by
accessing a web page. However, Broflake is not just a web application! The Broflake system
introduces software libraries and protocol concepts designed to enable role-agnostic multi-hop p2p
proxying across the entire Lantern network.

Put another way, Broflake is a common language which enables Lantern users to describe, exchange,
and share the resource of internet access across network boundaries and runtime environments.


# :floppy_disk: System components
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
|ui     |embeddable web user interface                                                  |


# :arrow_forward: Quickstart for devs
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

8. Serve the browser widget with a permissive CORS policy: `cd client && ./serve.py`

9. Start Freddie: `cd freddie && go run freddie.go`

10. Start the egress server: `cd egress && go run egress.go`

11. Start the desktop client: `cd client/dist/bin && ./desktop`
  - See "Desktop Client Usage" section for run options

12. To start the wasm client in "headless" mode (no [embed ui](#nail_careart-ui-quickstart-for-devs)): Start **Google Chrome**. Navigate to `localhost:9000`. The web widget loads, accesses Freddie, finds your desktop client, signals, and establishes several WebRTC connections. Pop open the console
and you'll see all the things going on. Alternatively, to start the wasm client wrapped in the embed ui, follow the [UI quickstart](#nail_careart-ui-quickstart-for-devs).

13. Start **Mozilla Firefox**. Use the browser as you normally would, visiting all your favorite
websites. Your traffic is proxied in a chain: Firefox -> local HTTP proxy -> desktop client -> 
webRTC -> web widget executing in Chrome -> WebSocket -> egress server -> remote HTTP proxy -> the internet. 

### :nail_care::art: UI quickstart for devs

The UI is bootstrapped with [Create React App](https://github.com/facebook/create-react-app). Then "re-wired" to build one single js bundle using [rewire](https://www.npmjs.com/package/rewire). The React app will bind to a custom `lantern-p2p-proxy` DOM el and render based on settings passed to the `data-features` attribute via stringified JSON:

```html
<lantern-p2p-proxy data-features='{ "globe": true, "stats": true, "about": true, "toast": true }'></lantern-p2p-proxy>
<script defer="defer" src="https://devblog.getlantern.org/broflake/static/js/main.js"></script>
```

[Github pages live demo](https://devblog.getlantern.org/broflake)

1. Work from the ui dir: `cd ui`

2. Configure your .env file: `cp .env.example .env` 
   1. Set `REACT_APP_MOCK_DATA=false` to use the wasm widget as data source, or `true` to develop with mock "real-time" data.
   2. Set `REACT_APP_WIDGET_WASM_URL` to your intended hosted `widget.wasm` file. If you are serving it from `client` in [step #8](#arrow_forward-quickstart-for-devs), use [http://localhost:9000/widget.wasm](http://localhost:9000/widget.wasm). If you ran `./build_web.sh` ([step #7](#arrow_forward-quickstart-for-devs)) you can also use `/broflake/widget.wasm`. To config for prod point to a publicly hosted `widget.wasm` e.g. `https://devblog.getlantern.org/broflake/widget.wasm`. If you know you know, if not, you likely want to use `/broflake/widget.wasm`.

3. Install the dependencies: `yarn`

4. To start in developer mode with hot-refresh server (degraded performance): run `yarn start` and visit [http://localhost:3000/broflake](http://localhost:3000/broflake)

5. To build optimized for best performance run: `yarn build`

6. To serve a build:
   1. Install a simple server e.g. `npm install -g serve` (or your lightweight http server of choice)
   2. Serve the build dir e.g. `serve -s build -l 3000` and visit [http://localhost:3000/broflake](http://localhost:3000/broflake)

7. To deploy to Github pages: `yarn deploy`

8. Coming soon to a repo near you: `yarn test`

# Desktop Client Usage

Build the desktop client with `cd client && ./build.sh desktop`.

Run it with `cd client/dist/bin && ./desktop` and the following environment variables:

- `ENABLE_DOMAIN_FRONTING`
  - Values: `true` or `false`
  - Determines whether to domain-front requests to Freddie
  - True by default

# Gotchas

## Flashlight and Fronted dependency inside `./client`

Flashlight is only required in this project to enable domain-fronting. Broflake's `./client` code will be included **inside** flashlight at one point, and when that happens, we can remove this dependency. Same goes for "getlantern/fronted"
