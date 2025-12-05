// ============================================
// DISTRIBUTED GOSSIP PROTOCOL - CLIENT-SIDE
// ============================================
if (window.user && window.user.type ==="peer") 
{
    const TTL = 7;
    const FANOUT = 2;
    const CHECK_INTERVAL_MS = 5000;
    const LEADER_FETCH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

    let processedMessages = new Set();

    // ============================================
    // CHECK IF CURRENT USER IS LEADER
    // ============================================
    async function checkIfLeader() {
        try {
            const response = await fetch('/gossip/am-i-leader', {
                credentials: 'same-origin'  // ← ADDED
            });
            const data = await response.json();
            return data.isLeader;
        } catch (error) {
            console.error('[GOSSIP] Error checking leader status:', error);
            return false;
        }
    }

    // ============================================
    // LEADER: FETCH FROM PAGES
    // ============================================
    async function leaderFetchFromPages() {
        try {
            console.log('[LEADER] Fetching from pages...');
            
            const response = await fetch('/gossip/leader-fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin'  // ← ADDED
            });
            
            const data = await response.json();
            
            if (data.success) {
                if (data.messagesCount > 0) {
                    console.log(`[LEADER] Fetched ${data.messagesCount} new page updates`);
                } else {
                    console.log('[LEADER] No new messages to fetch');
                }
            }
        } catch (error) {
            console.error('[LEADER] Error fetching from pages:', error);
        }
    }

    // ============================================
    // GET MY MESSAGES
    // ============================================
    async function getMyMessages() {
        try {
            const response = await fetch('/gossip/my-messages', {
                credentials: 'same-origin'  // ← ADDED
            });
            const data = await response.json();
            return data.messages || [];
        } catch (error) {
            console.error('[GOSSIP] Error fetching my messages:', error);
            return [];
        }
    }

    // ============================================
    // GET MY CONNECTED PEERS
    // ============================================
    async function getMyPeers() {
        try {
            const response = await fetch('/gossip/my-peers', {
                credentials: 'same-origin'  // ← ADDED
            });
            const data = await response.json();
            return data.peers || [];
        } catch (error) {
            console.error('[GOSSIP] Error fetching peers:', error);
            return [];
        }
    }

    // ============================================
    // SELECT RANDOM PEERS (FANOUT)
    // ============================================
    function selectRandomPeers(peers, count) {
        const shuffled = peers.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    // ============================================
    // SEND MESSAGE TO PEER
    // ============================================
    async function sendMessageToPeer(peerId, messageId, content, ttl, pageName) {
        try {
            const response = await fetch('/gossip/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',  // ← ADDED
                body: JSON.stringify({
                    receiverId: peerId,
                    messageId,
                    content,
                    ttl,
                    pageName
                })
            });
            
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error(`[GOSSIP] Error sending to peer ${peerId}:`, error);
            return false;
        }
    }

    // ============================================
    // GOSSIP TO RANDOM PEERS
    // ============================================
    async function gossipToRandomPeers() {
        try {
            const myMessages = await getMyMessages();
            
            const newMessages = myMessages.filter(msg => 
                msg.ttl > 0 && !processedMessages.has(msg.messageId)
            );
            
            if (newMessages.length === 0) {
                return;
            }
            
            console.log(`[GOSSIP] Found ${newMessages.length} new messages to propagate`);
            
            const allPeers = await getMyPeers();
            
            if (allPeers.length === 0) {
                console.log('[GOSSIP] No peers to gossip to');
                return;
            }
            
            console.log(`[GOSSIP] Found ${allPeers.length} connected peers`);
            
            for (const message of newMessages) {
                const selectedPeers = selectRandomPeers(allPeers, FANOUT);
                
                console.log(`[GOSSIP] Gossiping message ${message.messageId.substring(0, 20)}... to ${selectedPeers.length} peers`);
                
                for (const peer of selectedPeers) {
                    const success = await sendMessageToPeer(
                        peer._id,
                        message.messageId,
                        message.content,
                        message.ttl - 1,
                        message.pageName
                    );
                    
                    if (success) {
                        console.log(`[GOSSIP] ✓ Gossiped to peer ${peer.name}`);
                    }
                }
                
                processedMessages.add(message.messageId);
            }
            
        } catch (error) {
            console.error('[GOSSIP] Error in gossip protocol:', error);
        }
    }

    // ============================================
    // UPDATE LAST SEEN (HEARTBEAT)
    // ============================================
    async function updateLastSeen() {
        try {
            await fetch('/check-last-seen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin' 
            });
        } catch (error) {
            // Silent failure - not critical
        }
    }

    // ============================================
    // START GOSSIP PROTOCOL
    // ============================================
    async function startGossipProtocol() {
        console.log('\n╔══════════════════════════════════════════╗');
        console.log('║  DISTRIBUTED GOSSIP PROTOCOL STARTED    ║');
        console.log('╚══════════════════════════════════════════╝\n');
        console.log(`📊 Configuration:`);
        console.log(`   TTL: ${TTL}`);
        console.log(`   FANOUT: ${FANOUT}`);
        console.log(`   Gossip Interval: ${CHECK_INTERVAL_MS / 1000}s`);
        console.log(`   Leader Fetch Interval: ${LEADER_FETCH_INTERVAL_MS / 1000 / 60 / 60}h\n`);
        
        const isLeader = await checkIfLeader();
        
        if (isLeader) {
            console.log('👑 LEADER MODE ACTIVATED');
            console.log('   Role: Fetch from external APIs');
            console.log('   Interval: Every 1 hour\n');
            
            await leaderFetchFromPages();
            
            const nextFetchTime = new Date(Date.now() + LEADER_FETCH_INTERVAL_MS);
            console.log(`⏰ Next API fetch scheduled for: ${nextFetchTime.toLocaleString()}\n`);
            
            setInterval(async () => {
                console.log('\n⏰ 2-HOUR INTERVAL REACHED');
                console.log('══════════════════════════════════════════');
                await leaderFetchFromPages();
                
                const nextFetch = new Date(Date.now() + LEADER_FETCH_INTERVAL_MS);
                console.log(`⏰ Next fetch: ${nextFetch.toLocaleString()}\n`);
            }, LEADER_FETCH_INTERVAL_MS);
        } else {
            console.log('📡 PEER MODE');
            console.log('   Role: Receive and propagate updates');
            console.log('   Method: Gossip protocol\n');
        }
        
        console.log('🔄 Starting gossip loop...\n');
        
        setInterval(async () => {
            await gossipToRandomPeers();
        }, CHECK_INTERVAL_MS);
        
        setInterval(async () => {
            await updateLastSeen();
        }, 10000);
    }

    // ============================================
    // START ON PAGE LOAD
    // ============================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startGossipProtocol);
    } else {
        startGossipProtocol();
    }
}
