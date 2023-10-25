#!/usr/bin/env bash
# XXX: We assume this script was executed from unbounded/cmd!

set -e
set -u

# Details for the VM where we're hosting builds
REMOTE_IP="666.666.666.666"
REMOTE_PORT="22"
REMOTE_USERNAME="root"
REMOTE_BASE_DIR="/usr/share/nginx/html"

# XXX: Relative to unbounded/cmd!
BUILD_PATH="/dist/wmaker"

# Don't mess with these
UNIX_TIME=$(date +%s)
CWD=$(pwd)
OUTPUT_DIR="$(pwd)${BUILD_PATH}/${UNIX_TIME}"

# UI environment variables
# XXX: If stuff's broken, make sure that these reflect the current and complete set of environment 
# variables defined by the UI. See the .env files in /unbounded/ui!
# export REACT_APP_WIDGET_WASM_URL="/widget.wasm"
# export PUBLIC_URL="/"
# export REACT_APP_STORAGE_URL="/storage.html"
export REACT_APP_GEO_LOOKUP_URL="https://geo.getiantem.org/lookup"
export REACT_APP_DISCOVERY_SRV="https://freddie-subgraph-575320e16b61.herokuapp.com"
export REACT_APP_DISCOVERY_ENDPOINT="/v1/signal"
export REACT_APP_EGRESS_ADDR="wss://bf-egress.herokuapp.com"
export REACT_APP_EGRESS_ENDPOINT="/ws"

function prompt_for_ui_config() {
#  echo "REACT_APP_WIDGET_WASM_URL (or just hit enter for ${REACT_APP_WIDGET_WASM_URL}):"
#  read type
#
#  if [[ $type != "" ]]; then
#    export REACT_APP_WIDGET_WASM_URL=$type
#  fi

  export REACT_APP_WIDGET_WASM_URL="/${UNIX_TIME}/widget.wasm"

#  echo "PUBLIC_URL (or just hit enter for ${PUBLIC_URL}):"
#  read type
#
#  if [[ $type != "" ]]; then
#    export PUBLIC_URL=$type
#  fi

  export PUBLIC_URL="/${UNIX_TIME}"

  echo "REACT_APP_GEO_LOOKUP_URL (or just hit enter for ${REACT_APP_GEO_LOOKUP_URL}):"
  read type

  if [[ $type != "" ]]; then
    export REACT_APP_GEO_LOOKUP_URL=$type
  fi

#  echo "REACT_APP_STORAGE_URL (or just hit enter for ${REACT_APP_STORAGE_URL}):"
#  read type
#
#  if [[ $type != "" ]]; then
#    export REACT_APP_STORAGE_URL=$type
#  fi

  export REACT_APP_STORAGE_URL="/${UNIX_TIME}/storage.html"

  echo "REACT_APP_DISCOVERY_SRV (or just hit enter for ${REACT_APP_DISCOVERY_SRV}):"
  read type

  if [[ $type != "" ]]; then
    export REACT_APP_DISCOVERY_SRV=$type
  fi

  echo "REACT_APP_DISCOVERY_ENDPOINT (or just hit enter for ${REACT_APP_DISCOVERY_ENDPOINT}):"
  read type

  if [[ $type != "" ]]; then
    export REACT_APP_DISCOVERY_ENDPOINT=$type
  fi

  echo "REACT_APP_EGRESS_ADDR (or just hit enter for ${REACT_APP_EGRESS_ADDR}):"
  read type

  if [[ $type != "" ]]; then
    export REACT_APP_EGRESS_ADDR=$type
  fi

  echo "REACT_APP_EGRESS_ENDPOINT (or just hit enter for ${REACT_APP_EGRESS_ENDPOINT}):"
  read type

  if [[ $type != "" ]]; then
    export REACT_APP_EGRESS_ENDPOINT=$type
  fi
}

# Regular colors
COL_BLACK='\e[0;30m'
COL_RED='\e[0;31m'
COL_GREEN='\e[0;32m'
COL_YELLOW='\e[0;33m'
COL_BLUE='\e[0;34m'
COL_PURPLE='\e[0;35m'
COL_CYAN='\e[0;36m'
COL_WHITE='\e[0;37m'

# High intensity colors
COL_IBLACK='\e[0;90m'

COL_IRED='\e[0;91m'
COL_IGREEN='\e[0;92m'
COL_IYELLOW='\e[0;93m'
COL_IBLUE='\e[0;94m'

COL_IPURPLE='\e[0;95m'
COL_ICYAN='\e[0;96m'
COL_IWHITE='\e[0;97m'

# Other effects
COL_BLINK_IRED='\e[0;5;91m';

function prompt_for_deploy() {
  echo -e "Shall we deploy this build to ${COL_GREEN}${REMOTE_USERNAME}@${REMOTE_IP}:${REMOTE_PORT}${REMOTE_BASE_DIR}/${UNIX_TIME}${COL_WHITE} Y/N?"
  read type 

  if [[ $type == "Y" ]] || [[ $type == "y" ]]; then
    echo ""
    echo "OK, deploying now!"
    DEPLOY=true
    deploy
  elif [[ $type == "N" ]] || [[ $type == "n" ]]; then
    echo ""
    echo "OK, we won't deploy."
    DEPLOY=false
  else
    echo ""
    echo "Sorry, I didn't understand that."
    prompt_for_deploy
  fi
}

function deploy() {
  scp -r -P ${REMOTE_PORT} ${OUTPUT_DIR} ${REMOTE_USERNAME}@${REMOTE_IP}:${REMOTE_BASE_DIR}
}

# Collect a lil info about the state of the repo so we can bring it to the user's attention
cd ..
BROFLAKE_COMMIT_HASH=`git log -n1 --format=format:"%H"`

if [ -z "$(git status --porcelain)" ]; then 
  BROFLAKE_COMMIT_STATUS="clean"
  BROFLAKE_COMMIT_COLOR="${COL_IGREEN}"
else 
  BROFLAKE_COMMIT_STATUS="dirty"
  BROFLAKE_COMMIT_COLOR="${COL_IRED}"
fi

echo "                                                                                 kkkkkkkk                                                "
echo "                                                                                 k::::::k                                                "
echo "                                                                                 k::::::k                                                "
echo "                                                                                 k::::::k                                                "
echo "wwwwwww           wwwww           wwwwwww mmmmmmm    mmmmmmm     aaaaaaaaaaaaa    k:::::k    kkkkkkk eeeeeeeeeeee    rrrrr   rrrrrrrrr   "
echo " w:::::w         w:::::w         w:::::wmm:::::::m  m:::::::mm   a::::::::::::a   k:::::k   k:::::kee::::::::::::ee  r::::rrr:::::::::r  "
echo "  w:::::w       w:::::::w       w:::::wm::::::::::mm::::::::::m  aaaaaaaaa:::::a  k:::::k  k:::::ke::::::eeeee:::::eer:::::::::::::::::r "
echo "   w:::::w     w:::::::::w     w:::::w m::::::::::::::::::::::m           a::::a  k:::::k k:::::ke::::::e     e:::::err::::::rrrrr::::::r"
echo "    w:::::w   w:::::w:::::w   w:::::w  m:::::mmm::::::mmm:::::m    aaaaaaa:::::a  k::::::k:::::k e:::::::eeeee::::::e r:::::r     r:::::r"
echo "     w:::::w w:::::w w:::::w w:::::w   m::::m   m::::m   m::::m  aa::::::::::::a  k:::::::::::k  e:::::::::::::::::e  r:::::r     rrrrrrr"
echo "      w:::::w:::::w   w:::::w:::::w    m::::m   m::::m   m::::m a::::aaaa::::::a  k:::::::::::k  e::::::eeeeeeeeeee   r:::::r            "
echo "       w:::::::::w     w:::::::::w     m::::m   m::::m   m::::ma::::a    a:::::a  k::::::k:::::k e:::::::e            r:::::r            "
echo "        w:::::::w       w:::::::w      m::::m   m::::m   m::::ma::::a    a:::::a k::::::k k:::::ke::::::::e           r:::::r            "
echo "         w:::::w         w:::::w       m::::m   m::::m   m::::ma:::::aaaa::::::a k::::::k  k:::::ke::::::::eeeeeeee   r:::::r            "
echo "          w:::w           w:::w        m::::m   m::::m   m::::m a::::::::::aa:::ak::::::k   k:::::kee:::::::::::::e   r:::::r            "
echo "           www             www         mmmmmm   mmmmmm   mmmmmm  aaaaaaaaaa  aaaakkkkkkkk    kkkkkkk eeeeeeeeeeeeee   rrrrrrr            "
echo ""
echo "Welcome to wmaker... The Fastest Way to Create and Deploy a Test Build of the Browsers Unbounded Widget!™"
echo ""
echo "We'll build a widget from the current branch..."
echo ""
echo -e "-->  unbounded: ${COL_IPURPLE}$(pwd)${COL_WHITE} (${BROFLAKE_COMMIT_HASH}, ${BROFLAKE_COMMIT_COLOR}${BROFLAKE_COMMIT_STATUS}${COL_WHITE})"
echo ""
echo -e "Build ${COL_IYELLOW}# ${UNIX_TIME} ${COL_WHITE}will output to:"
echo ""
echo -e "-->  ${COL_IBLUE}${OUTPUT_DIR}${COL_WHITE}"

if [[ ! -d "${CWD}${BUILD_PATH}" ]]; then
  echo ""
  echo "Error: build directory ${CWD}${BUILD_PATH} not found!"
  exit 1
fi

if [[ -d "${OUTPUT_DIR}" ]]; then
  echo ""
  echo "Error: output directory ${OUTPUT_DIR} already exists!"
  exit 1 
fi

# Create the build directory
echo ""
echo -e "${COL_ICYAN}Creating directory structure...${COL_WHITE}"
mkdir -v ${OUTPUT_DIR}

# Build the wasm engine
echo ""
echo -e "${COL_ICYAN}Building wasm engine...${COL_WHITE}"
cd cmd
${CWD}/build_web.sh

# Configure and build the UI
echo ""
echo -e "${COL_ICYAN}Let's configure the UI...${COL_WHITE}"
prompt_for_ui_config

# Build the UI
echo -e "${COL_ICYAN}Building the UI...${COL_WHITE}"
cd ../ui
export GENERATE_SOURCEMAP=false 
node ./scripts/build.js

# Copy to destination
echo -e "${COL_ICYAN}Copying to destination...${COL_WHITE}"
cp build/* -rv ${OUTPUT_DIR}

# Deploy
echo ""
echo -e "${COL_ICYAN}Deployment time...${COL_WHITE}"
prompt_for_deploy

# Wrap it up!
echo ""
echo -e "${COL_ICYAN}Done!${COL_WHITE}"
echo -e "${COL_IWHITE}${OUTPUT_DIR}${COL_WHITE}"

if [[ $DEPLOY == true ]]; then
  echo -e "${COL_IYELLOW}http://${REMOTE_IP}/${UNIX_TIME}${COL_WHITE}"
fi