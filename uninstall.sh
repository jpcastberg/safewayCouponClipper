echo "Uninstalling recurring coupon clipping..."
varlaunchagentfile="/Users/"$(whoami)"/Library/LaunchAgents/com."$(whoami)".safewayCouponClipper.plist"
launchctl unload $varlaunchagentfile
rm $varlaunchagentfile
echo "Uninstall complete"