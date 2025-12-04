require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const Page = require("../models/page");
require("../config/db");

const seedPages = async () => {
  try {
    await Page.deleteMany({});
    console.log("✅ Cleared existing pages");

    const pages = [
      {
        name: 'Tech News Headlines',
        description: 'Latest technology news and updates',
        apiUrl: 'https://hacker-news.firebaseio.com/v0/topstories.json',
        message: {
          messageId: `page_init_tech`,
          content: 'Initializing tech news feed...',
          timestamp: new Date()
        }
      },
      {
        name: 'Bitcoin Price Feed',
        description: 'Real-time cryptocurrency prices',
        apiUrl: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
        message: {
            messageId: `page_init_crypto`,
            content: 'Initializing crypto feed...',
            timestamp: new Date()
        }
    },
      {
        name: 'Weather Updates',
        description: 'Weather forecasts for San Jose',
        apiUrl: 'https://api.weather.gov/gridpoints/MTR/85,105/forecast', // Free, no key needed!
        message: {
          messageId: `page_init_weather`,
          content: 'Initializing weather feed...',
          timestamp: new Date()
        }
      },
      {
        name: 'Random Facts',
        description: 'Interesting random facts',
        apiUrl: 'https://uselessfacts.jsph.pl/api/v2/facts/random', // Free, no key needed!
        message: {
          messageId: `page_init_facts`,
          content: 'Initializing facts feed...',
          timestamp: new Date()
        }
      }
    ];

    await Page.insertMany(pages);
    console.log("✅ Pages seeded successfully!");
    console.log("\n📡 API Endpoints:");
    pages.forEach(p => console.log(`   - ${p.name}: ${p.apiUrl}`));
    
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding pages:", err);
    process.exit(1);
  }
};

seedPages();