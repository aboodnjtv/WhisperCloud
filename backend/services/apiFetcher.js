const axios = require('axios');
const Page = require('../models/page');

class APIFetcher {
    async fetchAllPages() {
        console.log('\n========================================');
        console.log('🚀 STARTING API FETCH CYCLE');
        console.log('========================================\n');
        
        try {
            const pages = await Page.find({});
            console.log(`📄 Found ${pages.length} pages to fetch`);
            
            const updates = [];

            for (const page of pages) {
                console.log(`\n➡️  Processing: ${page.name}`);
                const update = await this.fetchPage(page);
                if (update) {
                    updates.push(update);
                    console.log(`✅ Added update for ${page.name}`);
                }
            }

            console.log(`\n✅ Fetch cycle complete: ${updates.length} updates\n`);
            return updates;

        } catch (error) {
            console.error('❌ Error in fetchAllPages:', error.message);
            return [];
        }
    }

    async fetchPage(page) {
        let content = null;
        
        try {
            console.log(`  📡 Calling API: ${page.apiUrl}`);
            
            const response = await axios.get(page.apiUrl, {
                timeout: 10000,
                validateStatus: (status) => status < 500
            });
            
            console.log(`  ✓ Response status: ${response.status}`);
            
            // Extract content based on page name
            content = await this.extractContent(page.name, response.data);
            
            if (content) {
                console.log(`  ✓ Extracted: "${content.substring(0, 80)}..."`);
            } else {
                throw new Error('No content extracted');
            }
            
        } catch (error) {
            console.log(`  ⚠️  API failed: ${error.message}`);
            console.log(`  🔄 Using mock data`);
            content = this.getMockContent(page.name);
        }

        if (!content) {
            console.log(`  ❌ No content generated!`);
            return null;
        }

        // Save to page
        const messageId = `page_${Date.now()}_${page._id}`;
        page.message = {
            messageId,
            content,
            timestamp: new Date()
        };
        
        await page.save();
        console.log(`  💾 Saved to database`);

        return {
            pageId: page._id,
            pageName: page.name,
            messageId,
            content,
            timestamp: new Date()
        };
    }

    async extractContent(pageName, data) {
        console.log(`    🔍 Extracting for: ${pageName}`);
        
        // ============================================
        // WEATHER UPDATES
        // ============================================
        if (pageName.includes('Weather')) {
            console.log(`    → Weather format detected`);
            
            if (data.properties && data.properties.periods) {
                const periods = data.properties.periods;
                
                if (periods.length > 0) {
                    const current = periods[0];
                    const next = periods[1] || null;
                    
                    let weather = `${current.name}: ${current.detailedForecast}`;
                    
                    if (next) {
                        weather += ` | ${next.name}: ${next.shortForecast}, ${next.temperature}°${next.temperatureUnit}`;
                    }
                    
                    console.log(`    ✓ Weather extracted successfully`);
                    return weather.substring(0, 300);
                }
            }
            
            console.log(`    ⚠️  Weather format not matched`);
        }
        
        // ============================================
        // RANDOM FACTS
        // ============================================
        if (pageName.includes('Facts')) {
            console.log(`    → Facts format detected`);
            
            if (data.text) {
                console.log(`    ✓ Fact extracted: "${data.text.substring(0, 50)}..."`);
                return data.text;
            }
            
            if (data.fact) {
                console.log(`    ✓ Fact extracted: "${data.fact.substring(0, 50)}..."`);
                return data.fact;
            }
            
            console.log(`    ⚠️  Facts format not matched`);
        }
        
        // ============================================
        // TECH NEWS / HACKER NEWS
        // ============================================
        if (pageName.includes('News') || pageName.includes('Headlines')) {
            console.log(`    → News format detected`);
            
            // Hacker News returns array of story IDs
            if (Array.isArray(data) && data.length > 0) {
                console.log(`    → Fetching top story details...`);
                
                try {
                    const topStoryId = data[0];
                    const storyResponse = await axios.get(
                        `https://hacker-news.firebaseio.com/v0/item/${topStoryId}.json`,
                        { timeout: 5000 }
                    );
                    
                    if (storyResponse.data && storyResponse.data.title) {
                        const story = storyResponse.data;
                        const result = `📰 ${story.title} (${story.score || 0} points) - ${story.url || `https://news.ycombinator.com/item?id=${topStoryId}`}`;
                        
                        console.log(`    ✓ Story extracted: "${story.title}"`);
                        return result.substring(0, 300);
                    }
                } catch (storyError) {
                    console.log(`    ⚠️  Story fetch failed: ${storyError.message}`);
                }
                
                // Fallback: just show IDs
                const result = `Top Stories: ${data.slice(0, 5).join(', ')} - Visit https://news.ycombinator.com/`;
                console.log(`    ✓ Using story IDs as fallback`);
                return result;
            }
            
            // NewsAPI format
            if (data.articles && data.articles.length > 0) {
                const article = data.articles[0];
                const result = `📰 ${article.title} - ${article.description || ''}`;
                console.log(`    ✓ NewsAPI article extracted`);
                return result.substring(0, 300);
            }
            
            console.log(`    ⚠️  News format not matched`);
        }
        
        // ============================================
        // BITCOIN / CRYPTO
        // ============================================
        if (pageName.includes('Bitcoin') || pageName.includes('Crypto')) {
            console.log(`    → Bitcoin format detected`);
            
            // CoinDesk format
            if (data.bpi && data.bpi.USD) {
                const price = data.bpi.USD.rate;
                const time = data.time.updated;
                const result = `₿ Bitcoin: $${price} USD (Updated: ${time})`;
                console.log(`    ✓ Bitcoin price extracted`);
                return result;
            }
            
            // CoinGecko format
            if (data.bitcoin) {
                const price = data.bitcoin.usd;
                const change = data.bitcoin.usd_24h_change.toFixed(2);
                const result = `₿ BTC: $${price.toLocaleString()} (24h: ${change > 0 ? '+' : ''}${change}%)`;
                console.log(`    ✓ CoinGecko price extracted`);
                return result;
            }
            
            console.log(`    ⚠️  Bitcoin format not matched`);
        }
        
        // ============================================
        // GENERIC FALLBACK
        // ============================================
        console.log(`    ⚠️  Using generic extraction`);
        
        // Try common properties
        if (data.content) return data.content;
        if (data.message) return data.message;
        if (data.text) return data.text;
        if (data.description) return data.description;
        if (data.title) return data.title;
        
        // Last resort: stringify
        const str = JSON.stringify(data);
        console.log(`    ⚠️  Stringifying response (${str.length} chars)`);
        return str.substring(0, 200) + (str.length > 200 ? '...' : '');
    }

    getMockContent(pageName) {
        const now = new Date().toLocaleTimeString();
        const mocks = {
            'Tech News Headlines': `📰 Mock Tech News: "AI Breakthrough Announced" - Researchers achieve 99% accuracy on benchmark (${now})`,
            'Weather Updates': `🌤️ Mock Weather: Sunny, 72°F, light breeze. Perfect day! (${now})`,
            'Bitcoin Price Feed': `₿ Mock Bitcoin: $45,234.56 (+2.3% today) - Updated ${now}`,
            'Random Facts': `💡 Mock Fact: The average person spends 6 months of their lifetime waiting for red lights. (${now})`
        };
        return mocks[pageName] || `Mock update for ${pageName} at ${now}`;
    }
}

module.exports = new APIFetcher();