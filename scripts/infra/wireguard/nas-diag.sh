echo ===HOST-PING-WAN===
ping -c 2 -W 2 172.235.145.77 2>&1 | tail -1
echo ===HOST-ROUTES===
ip route
echo ===WG-NETMODE===
docker inspect -f {{.HostConfig.NetworkMode}} cloud_wg_client
echo ===EDGE-AGENT-EGRESS===
docker exec portainer_edge_agent wget -qO- -T 5 http://ip.dnsexit.com 2>/dev/null || echo EDGE-EGRESS-FAIL
echo ===DONE===