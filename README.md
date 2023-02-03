# broflake
![protocols](https://user-images.githubusercontent.com/21117002/208517779-e86683e7-08c9-4c5f-8784-2e406a5b57c9.png)

# :compass: Table of contents
* [What is Broflake?](#question-what-is-broflake)
* [System components](#floppy_disk-system-components)
* [Quickstart for devs](#arrow_forward-quickstart-for-devs)
* [Observing networks with netstate](#spider_web)
* [UI quickstart for devs](#nail_careart-ui-quickstart-for-devs)

### :skull: Warning
This is prototype-grade software!

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

| Module     | Description                                                                         |
|------------|-------------------------------------------------------------------------------------|
| clientcore | library exposing Broflake's high level client API                                   |
| cmd        | driver code for operationalizing Broflake outside of a controlling process          |   
| common     | data structures and functionality shared across Broflake modules                    |
| egress     | egress server                                                                       |
| freddie    | discovery, signaling, and matchmaking server                                        |
| netstate   | network topology observability tool                                                 |
| ui         | embeddable web user interface                                                       |

### :arrow_forward: Quickstart for devs
Instructions last updated February 1, 2023. If something's not working and it's been a while since 
2/1, you might want to check with nelson.

1. Clone this repo.

2. Configure **Mozilla Firefox** to use a local HTTP proxy. In settings, search "proxy". Select 
*Manual proxy configuration*. Enter address `127.0.0.1`, port `1080`, and check the box labeled 
*Also use this proxy for HTTPS*.

3. Build the native binary desktop client: `cd cmd && ./build.sh desktop`

4. Build the native binary widget: `cd cmd && ./build.sh widget`

5. Build the browser widget: `cd cmd && ./build_web.sh`

6. Start Freddie: `cd freddie && PORT=9000 go run freddie.go`

7. Start the egress server: `cd egress && PORT=8000 go run egress.go`

8. Start a desktop client: `cd cmd/dist/bin && FREDDIE=http://localhost:9000 
EGRESS=http://localhost:8000 ./desktop`

9. Decision point: do you want to run a **native binary** widget or a **browser** widget? To start 
a native binary widget: `cd cmd/dist/bin && FREDDIE=http://localhost:9000 EGRESS=http://localhost:8000 
./widget`. Alternatively, to start a browser widget, follow the 
[UI quickstart](#nail_careart-ui-quickstart-for-devs).

_The widget and desktop client find each other via the discovery server, execute a signaling step,
and establish several WebRTC connections._

10. Start **Mozilla Firefox**. Use the browser as you normally would, visiting all your favorite
websites. Your traffic is proxied in a chain: Firefox -> local HTTP proxy -> desktop client -> 
webRTC -> widget -> WebSocket -> egress server -> remote HTTP proxy -> the internet. 

### :spider_web: Observing networks with netstate
The netstate module is a work-in-progress tool for observing Broflake networks. netstate currently 
visualizes network topology, labeling each Broflake node with an arbitrary, user-defined "tag" which
may be injected at runtime.

`netstated` is a distributed state machine which collects and processes state changes from Broflake
clients. It serves a network visualization on port 8080.

In the example below, we assume that Freddie is at `http://localhost:9000` and the egress server
is at `http://localhost:8000`:

1. Start `netstated`: `cd netstate/d && PORT=7000 go run netstated.go`

2. Start a widget as user Alice: `cd cmd/dist/bin && NETSTATED=http://localhost:7000/exec TAG=Alice
FREDDIE=http://localhost:9000 egress=http://localhost:8000 ./widget`

3. Start a desktop client as user Bob: `cd cmd/dist/bin && NETSTATED=http://localhost:7000/exec 
TAG=Bob FREDDIE=http://localhost:9000 egress=http://localhost:8000 ./desktop`

4. Open a web browser and navigate to `http://localhost:8080`. As Alice and Bob complete the 
signaling process and establish connection(s) to one another, you should see the network you have
created. You must refresh the page to update the visualization.

### :nail_care::art: UI quickstart for devs
The UI is bootstrapped with [Create React App](https://github.com/facebook/create-react-app). Then "re-wired" to build one single js bundle entry using [rewire](https://www.npmjs.com/package/rewire). The React app will bind to a custom `<lantern-network>` DOM el and render based on settings passed to the [dataset](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset):

```html
<lantern-network
   data-layout="banner"
   data-theme="dark"
   data-globe="true"
   data-exit="true"
   data-donate="true"
   data-mobile-bg="false"
   data-desktop-bg="true"
   data-editor="false"
   data-branding="true"
   style='width: 100%;'
></lantern-network>
<script defer="defer" src="https://embed.lantern.io/static/js/main.js"></script>
```

| Data-set  | Description                             | Default |
|-----------|-----------------------------------------|---------|
| layout    | string "banner" or "panel" layout       | banner  |
| theme     | string "dark" or "light" theme          | light   |
| globe     | boolean to include webgl globe          | true    |
| exit      | boolean to include toast on exit intent | true    |
| donate    | boolean to include donate link          | true    |
| mobile-bg | boolean to run on mobile background     | false   |
| mobile-bg | boolean to run on desktop background    | true    |
| editor    | boolean to include debug dataset editor | false   |
| branding  | boolean to include logos                | true    |

[Github pages sandbox](https://embed.lantern.io)
[Lantern Network website](https://network.lantern.io)

1. Work from the ui dir: `cd ui`

2. Configure your .env file: `cp .env.example .env` 
   1. Set `REACT_APP_MOCK_DATA=false` to use the wasm widget as data source, or `true` to develop with mock "real-time" data.
   2. Set `REACT_APP_WIDGET_WASM_URL` to your intended hosted `widget.wasm` file. If you are serving it from `client` in [step #8](#arrow_forward-quickstart-for-devs), use [http://localhost:9000/widget.wasm](http://localhost:9000/widget.wasm). If you ran `./build_web.sh` ([step #7](#arrow_forward-quickstart-for-devs)) you can also use `/widget.wasm`. To config for prod point to a publicly hosted `widget.wasm` e.g. `https://embed.lantern.io/widget.wasm`. If you know you know, if not, you likely want to use `/widget.wasm`.
   3. Set `REACT_APP_GEO_LOOKUP` to your intended geo lookup service. Most likely `https://geo.getiantem.org/lookup` or `http://localhost:<PORT>/lookup` if testing geo lookups locally
   4. Set `REACT_APP_IFRAME_SRC` to your intended iframe html for local storage of widget state and analytics. Most likely `https://embed.lantern.io/iframe.html` or `/iframe.html` if testing locally

3. Install the dependencies: `yarn`

4. To start in developer mode with hot-refresh server (degraded performance): run `yarn start` and visit [http://localhost:3000](http://localhost:3000)

5. To build optimized for best performance run: `PUBLIC_URL=/ yarn build`

6. To serve a build:
   1. Install a simple server e.g. `npm install -g serve` (or your lightweight http server of choice)
   2. Serve the build dir e.g. `serve -s build -l 3000` and visit [http://localhost:3000](http://localhost:3000)

7. To deploy to Github pages: `yarn deploy`

8. Coming soon to a repo near you: `yarn test`
