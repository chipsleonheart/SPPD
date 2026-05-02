#!/bin/bash
# Create user if it doesn't exist
USER_NAME="deployer"
id -u $USER_NAME &>/dev/null || useradd -m -s /bin/bash $USER_NAME

# Set up SSH for the new user
mkdir -p /home/$USER_NAME/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJEF0n0IQN0Dwt0JtW/nlpKHM70oXaeWGidVJVzEEvPn wongg@Ciptadi" > /home/$USER_NAME/.ssh/authorized_keys
chown -R $USER_NAME:$USER_NAME /home/$USER_NAME/.ssh
chmod 700 /home/$USER_NAME/.ssh
chmod 600 /home/$USER_NAME/.ssh/authorized_keys

# Allow the user to run commands without password via sudo (needed for restarting services)
echo "$USER_NAME ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/$USER_NAME
chmod 440 /etc/sudoers.d/$USER_NAME

echo "------------------------------------------------"
echo "✅ User '$USER_NAME' created and SSH key added!"
echo "------------------------------------------------"
echo "Mencari lokasi aplikasi SPPD..."
APP_PATH=$(find / -name 'server.prod.js' -type f 2>/dev/null | head -n 1 | xargs dirname)

if [ -n "$APP_PATH" ]; then
    echo "Ditemukan aplikasi di: $APP_PATH"
    chown -R $USER_NAME:$USER_NAME "$APP_PATH"
    echo "Ownership folder sudah diberikan ke $USER_NAME."
else
    echo "⚠️ Folder aplikasi tidak ditemukan secara otomatis."
    echo "Silakan jalankan secara manual: chown -R $USER_NAME:$USER_NAME /path/to/sppd"
fi
