#!/bin/bash
sudo apt update

# Install Wireguard
sudo apt install wireguard || echo "Failed installing wireguard via apt"

# Create server public and server private keys
WG_PATH="/etc/wireguard"
sudo wg genkey | sudo tee ${WG_PATH}/server_publickey | sudo wg pubkey | sudo tee ${WG_PATH}/server_privatekey
