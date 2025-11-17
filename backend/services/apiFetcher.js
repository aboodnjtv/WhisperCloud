const Page = require('../models/page');
const axios = require('axios');

class ApiFetcher {
    /**
     * Fetch data from all pages (APIs)
     */
    async fetchAllPages() {
        try {
            const pages = await Page.find({});
            const results = [];
            
            for (const page of pages) {
                const data = await this.fetchPage(page);
                if (data) {
                    results.push(data);
                }
            }
            
            return results;
        } catch (error) {
            console.error('Error fetching all pages:', error);
            return [];
        }
    }

    /**
     * Fetch data from a single page
     */
    async fetchPage(page) {
        console.log(`Fetching data from: ${page.name}`);
        
        let content;
        
        try {
            const response = await axios.get(page.apiUrl, {
                headers: page.apiKey ? { 'Authorization': `Bearer ${page.apiKey}` } : {},
                timeout: 5000
            });
            
            content = this.extractContent(response.data, page.name);
            console.log(`✓ Fetched real data from ${page.name}`);
            
        } catch (apiError) {
            // API failed - use mock data for testing
            console.log(`⚠ API failed, using mock data for ${page.name}`);
            content = this.getMockContent(page.name);
        }
        
        try {
            // Update page with latest message
            const messageId = `page_${Date.now()}_${page._id}`;
            
            page.message = {
                messageId: messageId,
                content: content,
                timestamp: new Date()
            };
            
            await page.save();
            
            console.log(`✓ Updated ${page.name}`);
            
            return {
                pageId: page._id,
                pageName: page.name,
                messageId: messageId,
                content: content
            };
            
        } catch (error) {
            console.error(`Error updating ${page.name}:`, error.message);
            return null;
        }
    }

    /**
     * Extract relevant content from API response
     */
    extractContent(data, pageName) {
        if (typeof data === 'string') {
            return data.substring(0, 200);
        }
        
        if (data.message) {
            return data.message;
        }
        
        if (data.description) {
            return data.description;
        }
        
        return JSON.stringify(data).substring(0, 200);
    }

    /**
     * Generate mock content for testing (when API fails)
     */
    getMockContent(pageName) {
        const timestamp = new Date().toLocaleTimeString();
        const date = new Date().toLocaleDateString();
        
        const mockData = {
            'Tech News Headlines': `🚀 Breaking News: New AI breakthrough announced! Major tech companies form partnership. Quantum computing milestone reached. Innovation in renewable energy sector. (Mock data generated at ${timestamp} on ${date})`,
            
            'Stock Market Updates': `📈 Market Update: NASDAQ +${(Math.random() * 2).toFixed(2)}%, DOW +${(Math.random() * 1.5).toFixed(2)}%, S&P 500 +${(Math.random() * 1.8).toFixed(2)}%. Tech stocks lead gains. Trading volume: High. (Mock data at ${timestamp})`,
            
            'Bitcoin Price Feed': `₿ BTC/USD: $${(45000 + Math.random() * 2000).toFixed(2)} | 24h Change: ${(Math.random() * 10 - 5).toFixed(2)}% | Volume: $${(25 + Math.random() * 10).toFixed(1)}B | Market Cap: $880B (Mock data at ${timestamp})`,
            
            'Weather Updates': `☀️ Weather: Temperature ${(65 + Math.random() * 25).toFixed(0)}°F, Conditions: ${['Sunny', 'Cloudy', 'Partly Cloudy', 'Clear'][Math.floor(Math.random() * 4)]}, Humidity ${(40 + Math.random() * 40).toFixed(0)}%, Wind ${(5 + Math.random() * 15).toFixed(0)} mph (Mock data at ${timestamp})`
        };
        
        return mockData[pageName] || `📰 Mock update for ${pageName}: New content available. System is functioning normally. Last updated: ${timestamp} on ${date}`;
    }
}

module.exports = new ApiFetcher();