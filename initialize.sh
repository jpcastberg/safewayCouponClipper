SCRIPTPATH="$( cd "$(dirname "$0")" ; pwd -P )"

echo "Welcome to safewayCouponClipper!"
echo "Checking dependencies..."


if [ -z $(which node) ]; then
    echo "Node not installed. Installing now..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash && nvm install node 11.12.0
fi

if [ ! -d $SCRIPTPATH/node_modules ]; then
    echo "Node modules not installed. Installing now..."
    npm install
fi

read -p "Please enter your Safeway email address: " varemail
read -sp "Please enter your Safeway password: " varpassword

# Create credentials file
if [ -f $SCRIPTPATH/credentials.js ]; then
    rm $SCRIPTPATH/credentials.js
fi
touch $SCRIPTPATH/credentials.js
printf "module.exports = { username: "\'$varemail\'", password: "\'$varpassword\'" }" >> credentials.js

# Exit if launchctl is not an available command.
if [ -z $(which launchctl) ]; then
    echo "Launchctl is not available on this machine, so this program cannot be automated. You can still clip your coupons by running `npm start` in this directory."
    echo "Thanks for using safewayCouponClipper!"
    exit 0
fi

# Create file for launch agent
varlaunchagentfile="/Users/"$(whoami)"/Library/LaunchAgents/com."$(whoami)".safewayCouponClipper.plist"
if [ -f $varlaunchagentfile ]; then
    rm $varlaunchagentfile
fi

touch $varlaunchagentfile

printf "<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">
<plist version=\"1.0\">
<dict>
    <key>Label</key>
    <string>com."$(whoami)".safewayCouponClipper</string>
    <key>ProgramArguments</key>
    <array>
        <string>"$(which node)"</string>
        <string>"$SCRIPTPATH"/safewayCouponClipper.js</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>0</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
</dict>
</plist>" >> $varlaunchagentfile

# Load launch file
launchctl load $varlaunchagentfile


read -p "Installation complete! Clip coupons now? (y/n) " varclipnow

if [ $varclipnow == "y" ]; then
  launchctl start "com."$(whoami)".safewayCouponClipper"
fi

echo "Thanks for using safewayCouponClipper!"
