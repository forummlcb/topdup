#!/bin/bash
name=${1}
vpn_ip="3.0.253.189"
vpn_port="51820"
if test -f ${name}.conf; then
  echo "${name} exist"
else
  server_public_key=$(ssh -i ~/.ssh/topdup-prod.pem ubuntu@${vpn_ip} -- "sudo cat /root/wireguard/publickey")
  current=$(ssh -i ~/.ssh/topdup-prod.pem ubuntu@${vpn_ip} -- "sudo wg show |grep "allowed"|tail -n1|awk \"{print $3}\" | cut -d . -f4 |cut -d / -f1")
  client_private=$(ssh -i ~/.ssh/topdup-prod.pem ubuntu@${vpn_ip} -- "sudo wg genkey")
  client_public=$(ssh -i ~/.ssh/topdup-prod.pem ubuntu@${vpn_ip} -- "echo \"${client_private}\" | sudo wg pubkey")
  next=$(expr ${current} + 1)
  echo "Generating WG config"
  cat > ${name}.conf <<EOF 
[Interface]
PrivateKey = ${client_private}
Address = 10.0.1.${next}/32
DNS = 1.1.1.1

[Peer]
PublicKey = ${server_public_key}
AllowedIPs = 0.0.0.0/0, ::/0
Endpoint = ${vpn_ip}:${vpn_port} 
PersistentKeepalive = 15
EOF

  echo "Update WG server config"
  cat >> server.conf <<EOF
# ${name} config
[Peer]
PublicKey = ${client_public}
AllowedIPs = 10.0.1.${next}/32
EOF
  read -r -d '' VAR << EOM
# ${name} config
[Peer]
PublicKey = ${client_public}
AllowedIPs = 10.0.1.${next}/32
EOM
  ssh -i ~/.ssh/topdup-prod.pem ubuntu@${vpn_ip} -- "sudo wg-quick down wg0"
  ssh -i ~/.ssh/topdup-prod.pem ubuntu@${vpn_ip} -- "sudo cp -rf /etc/wireguard/wg0.conf /etc/wireguard/wg0.conf.bk"
  ssh -i ~/.ssh/topdup-prod.pem ubuntu@${vpn_ip} -- "echo \"${VAR}\" | sudo tee -a /etc/wireguard/wg0.conf"
  ssh -i ~/.ssh/topdup-prod.pem ubuntu@${vpn_ip} -- "sudo wg-quick up wg0"
fi
