import crypto from 'crypto';
import fs from 'fs';

// WireGuard keys = base64 of raw x25519 scalar/pub
const kp = crypto.generateKeyPairSync('x25519');
const privRaw = kp.privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32);
const pubRaw = kp.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
const b64 = b => b.toString('base64');
const priv = b64(privRaw), pub = b64(pubRaw);

// PresharedKey: 32 random bytes
const psk = b64(crypto.randomBytes(32));

const HUB_PUB = 'BB0xT1mJifO0Yc2MYr1uY+ilZGXntgts1vK7tbJUO1E=';
const NAS_ADDR = '10.13.13.3/32';

const out = {
  nasPrivateKey: priv,
  nasPublicKey: pub,
  presharedKey: psk,
};

fs.writeFileSync('nas-keys.json', JSON.stringify(out, null, 2));

console.log(`# NAS peer generated
# PublicKey (goes to hub): ${pub}
# Address on NAS side:    ${NAS_ADDR}

[Peer]
# cloud-storage-srv-1 (TrueNAS)
PublicKey = ${pub}
PresharedKey = ${psk}
AllowedIPs = 10.13.13.3/32
PersistentKeepalive = 25

=== NAS-side config template ===
[Interface]
Address = 10.13.13.3/32
PrivateKey = ${priv}
ListenPort = 51820

[Peer]
PublicKey = ${HUB_PUB}
PresharedKey = ${psk}
Endpoint = 172.235.145.77:51820
AllowedIPs = 10.13.13.0/24
PersistentKeepalive = 25
`);
