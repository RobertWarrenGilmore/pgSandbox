iptables -A INPUT -p tcp --dport 80 -j ACCEPT;
iptables -A PREROUTING -t nat -p tcp --dport 80 -j REDIRECT --to-port 8000;
iptables -A INPUT -p tcp --dport 443 -j ACCEPT;
iptables -A PREROUTING -t nat -p tcp --dport 443 -j REDIRECT --to-port 44300;
mkdir /etc/iptables;
iptables-save > /etc/iptables/rules.v4;
